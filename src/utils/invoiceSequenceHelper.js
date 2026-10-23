/**
 * Financial Year & Sequential Invoice Tracking Helper
 * Across both Vatta Wood Business and Mahogany & Manjiyam Business
 *
 * Rules:
 * - Indian Financial Year runs from April 1 to March 31.
 * - On April 1st, invoice numbering refreshes/starts from A-1.
 * - Invoice numbers follow continuous series within the FY across loads (e.g. A-15 -> A-16).
 */

import { getSavedVattaInvoices } from '../data/vattaInvoiceSettings.js'
import { getSavedInvoices as getSavedTimberInvoices } from '../data/invoiceSettings.js'

/**
 * Determine the Financial Year label for a given date (default current date)
 * e.g. 2026-10-10 -> "2026-27"
 * e.g. 2026-02-15 -> "2025-26"
 */
export function getFinancialYear(dateInput = new Date()) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return ''
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
    vattaInvoices.forEach((inv) => {
      const data = inv.invoiceData || {}
      if (data.invoiceNo) {
        all.push({
          type: 'VATTA',
          typeLabel: 'Vatta Wood',
          id: inv.id,
          invoiceNo: data.invoiceNo.trim(),
          invoiceDate: data.invoiceDate || '',
          receiverName: data.receiverName || '',
          grandTotal: inv.grandTotal || inv.totals?.grandTotal || 0,
          savedAt: inv.savedAt || ''
        })
      }
    })
  } catch (err) {
    console.warn('Error reading Vatta invoices for sequence tracking:', err)
  }

  // 2. Timber / Mahogany & Manjiyam Invoices
  try {
    const timberInvoices = getSavedTimberInvoices()
    if (Array.isArray(timberInvoices)) {
      timberInvoices.forEach((inv) => {
        const invNo = inv.invoiceNo || inv.invoiceData?.invoiceNo
        if (invNo) {
          all.push({
            type: 'TIMBER',
            typeLabel: 'Mahogany & Manjiyam',
            id: inv.id || `timber_${Date.now()}`,
            invoiceNo: invNo.trim(),
            invoiceDate: inv.invoiceDate || inv.date || '',
            receiverName: inv.customerName || inv.receiverName || '',
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
 * Baseline last invoice benchmark: A-21 (Last recorded load of current FY)
 */
const BASELINE_LAST_INVOICE = {
  type: 'TIMBER',
  typeLabel: 'Mahogany & Manjiyam',
  invoiceNo: 'A-21',
  invoiceDate: '10-10-2026',
  receiverName: 'Sree Amman Traders',
  grandTotal: 125175
}

/**
 * Get the latest invoice and suggest the next consecutive invoice number
 * for the current Financial Year.
 *
 * Current FY Rule:
 * - A-21 was the last invoice sent.
 * - Next invoice defaults to A-22.
 * - If user saves A-22, it seamlessly rolls over to A-23, A-24, etc.
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

  // Baseline is A-21 as confirmed by user
  let maxNum = 21
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
