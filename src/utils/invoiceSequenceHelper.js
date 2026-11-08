/**
 * Financial Year & Sequential Invoice Tracking Helper
 * Across both Vatta Wood Business and Mahogany & Manjiyam Business
 *
 * Rules:
 * - Indian Financial Year runs from April 1 to March 31.
 * - On April 1st, invoice numbering refreshes/starts from A-1.
 * - Invoice numbers follow continuous series within the FY across loads (e.g. A-15 -> A-16).
 * - Duplicate Detection: No two documents can have the same invoice number in a Financial Year.
 */

import { getSavedVattaInvoices } from '../data/vattaInvoiceSettings.js'
import { getSavedInvoices as getSavedTimberInvoices } from '../data/invoiceSettings.js'
import { getSavedCreditNotes } from '../data/creditNoteSettings.js'
import { getSavedDebitNotes } from '../data/debitNoteSettings.js'
import { getSavedVatBills } from '../data/vatSettings.js'

/**
 * Flexible Date Parser:
 * Accurately parses DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, and Date objects.
 * Prevents standard JavaScript bug where "01-10-2026" is wrongly parsed as January 10th instead of October 1st.
 */
export function parseDateFlexible(dateInput) {
  if (!dateInput) return new Date()
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput
  const str = String(dateInput).trim()
  if (!str) return new Date()

  // 1. Matches YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10)
    const m = parseInt(ymdMatch[2], 10) - 1
    const d = parseInt(ymdMatch[3], 10)
    return new Date(y, m, d)
  }

  // 2. Matches DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10)
    const m = parseInt(dmyMatch[2], 10) - 1
    const y = parseInt(dmyMatch[3], 10)
    return new Date(y, m, d)
  }

  // 3. Fallback
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) return parsed
  return new Date()
}

/**
 * Convert any date into ISO YYYY-MM-DD (standard for <input type="date"> and Postgres DATE columns)
 */
export function formatToYmd(dateInput) {
  if (!dateInput) return ''
  const d = parseDateFlexible(dateInput)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Convert any date into Indian standard DD-MM-YYYY (used in timber invoices & display)
 */
export function formatToDmy(dateInput) {
  if (!dateInput) return ''
  const d = parseDateFlexible(dateInput)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}-${m}-${y}`
}

/**
 * Determine the Financial Year label for a given date (default current date)
 * e.g. 2026-10-10 -> "2026-27"
 * e.g. 01-10-2026 -> "2026-27"
 * e.g. 2026-02-15 -> "2025-26"
 */
export function getFinancialYear(dateInput = new Date()) {
  const d = parseDateFlexible(dateInput)
  const month = d.getMonth() + 1 // 1 to 12
  const year = d.getFullYear()
  const startYear = month >= 4 ? year : year - 1
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0')
  return `${startYear}-${endYearShort}`
}

/**
 * Retrieve all saved invoices across modules
 */
export function getAllSavedInvoices() {
  const all = []

  // 1. Vatta Invoices
  try {
    const vattaInvoices = getSavedVattaInvoices()
    if (Array.isArray(vattaInvoices)) {
      vattaInvoices.forEach((inv) => {
        const data = inv.invoiceData || inv
        const invNo = data.invoiceNo || inv.invoice_no || inv.docNo
        if (invNo) {
          all.push({
            type: 'VATTA',
            typeLabel: 'Vatta Wood Invoice',
            id: inv.id,
            invoiceNo: String(invNo).trim(),
            invoiceDate: data.invoiceDate || inv.invoice_date || '',
            receiverName: data.receiverName || inv.receiver_name || '',
            grandTotal: inv.grandTotal || inv.totals?.grandTotal || 0,
            savedAt: inv.savedAt || ''
          })
        }
      })
    }
  } catch (err) {
    console.warn('Error reading Vatta invoices for sequence tracking:', err)
  }

  // 2. Timber / Mahogany & Manjiyam Invoices
  try {
    const timberInvoices = getSavedTimberInvoices()
    if (Array.isArray(timberInvoices)) {
      timberInvoices.forEach((inv) => {
        const invNo = inv.invoiceNo || inv.invoiceData?.invoiceNo || inv.invoice_no
        if (invNo) {
          all.push({
            type: 'TIMBER',
            typeLabel: 'Mahogany & Manjiyam Invoice',
            id: inv.id || `timber_${Date.now()}`,
            invoiceNo: String(invNo).trim(),
            invoiceDate: inv.invoiceDate || inv.invoice_date || inv.date || '',
            receiverName: inv.customerName || inv.receiverName || inv.receiver_name || '',
            grandTotal: inv.grandTotal || 0,
            savedAt: inv.savedAt || ''
          })
        }
      })
    }
  } catch (err) {
    console.warn('Error reading Timber invoices for sequence tracking:', err)
  }

  return all
}

/**
 * Parse numeric suffix from invoice number like "A-20" -> 20, "A20" -> 20, "20" -> 20
 */
export function parseInvoiceNumber(invoiceNoStr) {
  if (!invoiceNoStr) return { prefix: 'A-', num: 0 }
  const match = String(invoiceNoStr).trim().match(/^([A-Za-z]+[-_/]?)?(\d+)$/)
  if (match) {
    return {
      prefix: match[1] || 'A-',
      num: parseInt(match[2], 10)
    }
  }
  return { prefix: 'A-', num: 0 }
}

/**
 * Baseline last invoice benchmark: A-23 (Last recorded load of current FY October)
 */
const BASELINE_LAST_INVOICE = {
  type: 'TIMBER',
  typeLabel: 'Mahogany & Manjiyam',
  invoiceNo: 'A-23',
  invoiceDate: '31-10-2026',
  receiverName: 'Sree Amman Traders',
  grandTotal: 165200
}

/**
 * Get the latest invoice and suggest the next consecutive invoice number
 * for the current Financial Year.
 *
 * Current FY Rule:
 * - A-23 was the last invoice sent.
 * - Next invoice defaults to A-24.
 * - If user saves A-24, it seamlessly rolls over to A-25, A-26, etc.
 * - On April 1st of a fresh FY, series refreshes to A-1.
 */
export function getNextSuggestedInvoice(targetDate = new Date()) {
  const currentFy = getFinancialYear(targetDate)
  const allInvoices = getAllSavedInvoices()

  // Filter invoices belonging to current financial year
  const fyInvoices = allInvoices.filter((inv) => {
    if (!inv.invoiceDate) return true // include if date unknown
    return getFinancialYear(inv.invoiceDate) === currentFy
  })

  // Baseline is A-23 as confirmed by user
  let maxNum = 23
  let lastInvoice = BASELINE_LAST_INVOICE

  fyInvoices.forEach((inv) => {
    const parsed = parseInvoiceNumber(inv.invoiceNo)
    if (parsed.num >= maxNum) {
      maxNum = parsed.num
      lastInvoice = inv
    }
  })

  const nextNum = maxNum + 1
  const suggestedInvoiceNo = `A-${nextNum}`

  return {
    currentFy,
    lastInvoice,
    maxNum,
    nextNum,
    suggestedInvoiceNo
  }
}

/**
 * DUPLICATE INVOICE VALIDATION
 * Rule: No two documents can have the same invoice number within a Financial Year.
 *
 * @param {Object} params
 * @param {string} params.invoiceNo - User-entered invoice number
 * @param {string|Date} params.invoiceDate - Invoice date
 * @param {string} [params.currentId] - Current invoice ID being edited (allows re-saving same doc)
 * @param {string} [params.docTypeLabel='Invoice'] - e.g. 'Invoice', 'Vatta Invoice', 'Timber Invoice'
 * @returns {{ isDuplicate: boolean, message?: string, existingDoc?: Object, currentFy?: string }}
 */
export function checkDuplicateInvoiceNumber({
  invoiceNo,
  invoiceDate,
  currentId = null,
  docTypeLabel = 'Invoice'
}) {
  if (!invoiceNo || !String(invoiceNo).trim()) {
    return { isDuplicate: false }
  }

  const cleanNo = String(invoiceNo).trim().toUpperCase()
  const targetFy = getFinancialYear(invoiceDate || new Date())
  if (!targetFy) return { isDuplicate: false }

  const allInvoices = getAllSavedInvoices()

  const duplicate = allInvoices.find((inv) => {
    // If it's the exact same document being edited/re-saved, ignore
    if (currentId && inv.id === currentId) {
      return false
    }

    const existingNo = String(inv.invoiceNo || '').trim().toUpperCase()
    if (existingNo !== cleanNo) {
      return false
    }

    // Compare Financial Year
    const existingFy = getFinancialYear(inv.invoiceDate || new Date())
    return existingFy === targetFy
  })

  if (duplicate) {
    const formattedDate = formatToDmy(duplicate.invoiceDate) || 'Existing Date'
    return {
      isDuplicate: true,
      existingDoc: duplicate,
      fy: targetFy,
      message: `Duplicate Invoice Number: "${cleanNo}" already exists in FY ${targetFy} (${duplicate.typeLabel || 'Document'} - ${duplicate.receiverName || 'Saved Document'} dated ${formattedDate}). Two documents cannot share the same invoice number in a financial year.`
    }
  }

  return { isDuplicate: false, currentFy: targetFy }
}

/**
 * DUPLICATE CREDIT NOTE VALIDATION
 */
export function checkDuplicateCreditNote({
  creditNoteNo,
  creditNoteDate,
  currentId = null
}) {
  if (!creditNoteNo || !String(creditNoteNo).trim()) return { isDuplicate: false }
  const cleanNo = String(creditNoteNo).trim().toUpperCase()
  const targetFy = getFinancialYear(creditNoteDate || new Date())

  try {
    const all = getSavedCreditNotes()
    const duplicate = all.find(cn => {
      if (currentId && cn.id === currentId) return false
      const no = String(cn.creditNoteNo || cn.credit_note_no || '').trim().toUpperCase()
      if (no !== cleanNo) return false
      const fy = getFinancialYear(cn.creditNoteDate || cn.credit_note_date || new Date())
      return fy === targetFy
    })

    if (duplicate) {
      return {
        isDuplicate: true,
        message: `Duplicate Credit Note Number: "${cleanNo}" already exists in FY ${targetFy}. Duplicate numbers are not permitted in the same financial year.`
      }
    }
  } catch (err) {
    console.warn('Error checking credit note duplicate:', err)
  }

  return { isDuplicate: false }
}

/**
 * DUPLICATE DEBIT NOTE VALIDATION
 */
export function checkDuplicateDebitNote({
  debitNoteNo,
  debitNoteDate,
  currentId = null
}) {
  if (!debitNoteNo || !String(debitNoteNo).trim()) return { isDuplicate: false }
  const cleanNo = String(debitNoteNo).trim().toUpperCase()
  const targetFy = getFinancialYear(debitNoteDate || new Date())

  try {
    const all = getSavedDebitNotes()
    const duplicate = all.find(dn => {
      if (currentId && dn.id === currentId) return false
      const no = String(dn.debitNoteNo || dn.debit_note_no || '').trim().toUpperCase()
      if (no !== cleanNo) return false
      const fy = getFinancialYear(dn.debitNoteDate || dn.debit_note_date || new Date())
      return fy === targetFy
    })

    if (duplicate) {
      return {
        isDuplicate: true,
        message: `Duplicate Debit Note Number: "${cleanNo}" already exists in FY ${targetFy}. Duplicate numbers are not permitted in the same financial year.`
      }
    }
  } catch (err) {
    console.warn('Error checking debit note duplicate:', err)
  }

  return { isDuplicate: false }
}

/**
 * DUPLICATE KERALA VAT BILL VALIDATION
 */
export function checkDuplicateVatBill({
  billNo,
  billDate,
  currentId = null
}) {
  if (!billNo || !String(billNo).trim()) return { isDuplicate: false }
  const cleanNo = String(billNo).trim().toUpperCase()
  const targetFy = getFinancialYear(billDate || new Date())

  try {
    const all = getSavedVatBills()
    const duplicate = all.find(b => {
      if (currentId && b.id === currentId) return false
      const no = String(b.billNo || b.bill_no || '').trim().toUpperCase()
      if (no !== cleanNo) return false
      const fy = getFinancialYear(b.billDate || b.bill_date || new Date())
      return fy === targetFy
    })

    if (duplicate) {
      return {
        isDuplicate: true,
        message: `Duplicate Kerala VAT Delivery Bill Number: "${cleanNo}" already exists in FY ${targetFy}. Duplicate numbers are not permitted in the same financial year.`
      }
    }
  } catch (err) {
    console.warn('Error checking VAT bill duplicate:', err)
  }

  return { isDuplicate: false }
}
