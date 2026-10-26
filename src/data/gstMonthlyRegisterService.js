/**
 * GST Monthly Invoices & Filing Register Service
 * G.K. Sawmill - Industrial Timber & Invoicing Suite
 *
 * Consolidates all generated GST documents across:
 * 1. Vatta GST Invoices (B2B Tax Invoices)
 * 2. Mahogany & Manjiyam Timber Invoices (B2B Tax Invoices)
 * 3. Credit Notes (CDNR)
 * 4. Debit Notes (CDNR)
 * 5. Kerala VAT Delivery Bills (Cross-reference)
 *
 * Provides monthly folder organization, GSTR-1 / GSTR-3B tax calculations,
 * and standard export formats for tax filing.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { getSavedVattaInvoices, deleteVattaInvoiceRecord, DEFAULT_VATTA_BUSINESS_SETTINGS, calculateVattaInvoiceTotals } from './vattaInvoiceSettings.js'
import { getSavedInvoices as getSavedTimberInvoices, deleteInvoiceRecord } from './invoiceSettings.js'
import { getSavedCreditNotes, deleteCreditNoteRecord } from './creditNoteSettings.js'
import { getSavedDebitNotes, deleteDebitNoteRecord } from './debitNoteSettings.js'
import { getSavedVatBills, deleteVatBillRecord } from './vatSettings.js'

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

/**
 * Format a Date or date string to YYYY-MM
 */
export function getYearMonthKey(dateInput) {
  if (!dateInput) return ''
  const str = String(dateInput).trim()
  // Handles 'YYYY-MM-DD' or ISO string
  const match = str.match(/^(\d{4})-(\d{1,2})/)
  if (match) {
    const y = match[1]
    const m = match[2].padStart(2, '0')
    return `${y}-${m}`
  }
  // Handles 'DD-MM-YYYY' or 'DD/MM/YYYY'
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    const y = dmyMatch[3]
    const m = dmyMatch[2].padStart(2, '0')
    return `${y}-${m}`
  }
  const d = new Date(dateInput)
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }
  return ''
}

/**
 * Get human readable Month Year label (e.g. "October 2026")
 */
export function getMonthYearLabel(yearMonthKey) {
  if (!yearMonthKey) return ''
  const parts = yearMonthKey.split('-')
  if (parts.length < 2) return yearMonthKey
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (m >= 1 && m <= 12) {
    return `${MONTH_NAMES[m - 1]} ${y}`
  }
  return yearMonthKey
}

/**
 * Get the next month (filing due month) for a given year-month key
 * e.g. "2026-10" (October 2026) -> "November 2026"
 */
export function getFilingDueMonthLabel(yearMonthKey) {
  if (!yearMonthKey) return ''
  const parts = yearMonthKey.split('-')
  if (parts.length < 2) return ''
  let y = parseInt(parts[0], 10)
  let m = parseInt(parts[1], 10) // 1..12
  m += 1
  if (m > 12) {
    m = 1
    y += 1
  }
  return `${MONTH_NAMES[m - 1]} ${y}`
}

/**
 * Determine Financial Year for a given YYYY-MM key (e.g. "2026-10" -> "FY 2026-27")
 */
export function getFinancialYearFromKey(yearMonthKey) {
  if (!yearMonthKey) return ''
  const parts = yearMonthKey.split('-')
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const startYear = m >= 4 ? y : y - 1
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0')
  return `FY ${startYear}-${endYearShort}`
}

/**
 * Normalizes a Vatta invoice into a standardized GST document record
 */
function normalizeVattaInvoice(inv) {
  const data = inv.invoiceData || inv
  const totals = inv.totals || {}
  const rawDate = data.invoiceDate || inv.invoice_date || ''
  const yearMonth = getYearMonthKey(rawDate)

  const taxable = Number(totals.taxableValue ?? data.taxable_value ?? 0)
  const igst = Number(totals.igstAmount ?? data.igst_amount ?? 0)
  const cgst = Number(totals.cgstAmount ?? data.cgst_amount ?? 0)
  const sgst = Number(totals.sgstAmount ?? data.sgst_amount ?? 0)
  const grandTotal = Number(inv.grandTotal ?? totals.grandTotal ?? data.grand_total ?? (taxable + igst + cgst + sgst))

  return {
    id: inv.id || `vatta_${data.invoiceNo || Date.now()}`,
    sourceType: 'VATTA',
    sourceLabel: 'Vatta Wood Invoice',
    gstDocType: 'Tax Invoice (B2B)',
    docNo: data.invoiceNo || inv.invoice_no || 'Draft',
    docDate: rawDate,
    yearMonth,
    receiverName: data.receiverName || inv.receiver_name || 'Hindustan Pencils Pvt Ltd',
    receiverGstin: data.receiverGstin || inv.receiver_gstin || '24AAACH0401R1ZT',
    receiverState: data.receiverState || inv.receiver_state || 'GUJARAT',
    receiverStateCode: data.receiverStateCode || inv.receiver_state_code || '24',
    placeOfSupply: data.placeOfSupply || inv.place_of_supply || 'GUJARAT',
    hsnCode: '44219140',
    description: 'Vatta Slat Wood (8-ply, 7-ply, 6-ply)',
    quantity: `${totals.totalBags || data.total_bags || 0} Bags`,
    taxableAmount: taxable,
    taxTreatment: data.taxTreatment || inv.tax_treatment || 'IGST',
    gstRate: Number(data.gstRate || inv.gst_rate || 5),
    igstAmount: igst,
    cgstAmount: cgst,
    sgstAmount: sgst,
    totalTax: igst + cgst + sgst,
    grandTotal: grandTotal,
    ewayBillNo: data.ewayBillNo || inv.eway_bill_no || '',
    vehicleNo: data.vehicleNo || inv.vehicle_no || '',
    reverseCharge: data.reverseCharge || inv.reverse_charge || 'No',
    referenceNo: data.purchaseOrderNo || inv.purchase_order_no || '',
    rawRecord: inv
  }
}

/**
 * Normalizes a Timber invoice (Mahogany & Manjiyam)
 */
function normalizeTimberInvoice(inv) {
  const rawDate = inv.invoiceDate || inv.invoice_date || inv.date || ''
  const yearMonth = getYearMonthKey(rawDate)

  const mahoganyTaxable = Number(inv.mahoganyTaxableValue ?? inv.mahogany_taxable ?? 0)
  const manjiyamTaxable = Number(inv.manjiyamTaxableValue ?? inv.manjiyam_taxable ?? 0)
  const taxable = Number(inv.taxableValue ?? inv.taxable_value ?? (mahoganyTaxable + manjiyamTaxable))

  const gstRate = Number(inv.gstRate ?? inv.gst_rate ?? 5)
  const isInterstate = String(inv.placeOfSupply || inv.receiverState || '').toUpperCase().includes('TAMIL') ||
    String(inv.placeOfSupply || inv.receiverState || '').toUpperCase().includes('GUJARAT') ||
    String(inv.placeOfSupply || inv.receiverState || '').toUpperCase().includes('MAHARASHTRA')

  let igst = Number(inv.igstAmount ?? inv.igst_amount ?? 0)
  let cgst = Number(inv.cgstAmount ?? inv.cgst_amount ?? 0)
  let sgst = Number(inv.sgstAmount ?? inv.sgst_amount ?? 0)

  if (taxable > 0 && igst === 0 && cgst === 0 && sgst === 0) {
    if (isInterstate) {
      igst = Math.round(taxable * (gstRate / 100) * 100) / 100
    } else {
      cgst = Math.round(taxable * (gstRate / 200) * 100) / 100
      sgst = cgst
    }
  }

  const grandTotal = Number(inv.grandTotal ?? inv.grand_total ?? (taxable + igst + cgst + sgst))
  const cftTotal = Number(inv.totalCft ?? inv.total_cft ?? (Number(inv.mahoganyCft || 0) + Number(inv.manjiyamCft || 0)))

  return {
    id: inv.id || `timber_${inv.invoiceNo || Date.now()}`,
    sourceType: 'TIMBER',
    sourceLabel: 'Mahogany & Manjiyam',
    gstDocType: 'Tax Invoice (B2B)',
    docNo: inv.invoiceNo || inv.invoice_no || 'Draft',
    docDate: rawDate,
    yearMonth,
    receiverName: inv.receiverName || inv.customerName || inv.receiver_name || 'Timber Customer',
    receiverGstin: inv.receiverGstin || inv.receiver_gstin || '',
    receiverState: inv.receiverState || inv.receiver_state || 'Kerala',
    receiverStateCode: inv.receiverStateCode || inv.state_code || '32',
    placeOfSupply: inv.placeOfSupply || inv.place_of_supply || inv.receiverState || 'Kerala',
    hsnCode: '4407',
    description: 'Mahogany & Manjiyam Sawn Timber',
    quantity: `${cftTotal.toFixed(2)} CFT`,
    taxableAmount: taxable,
    taxTreatment: isInterstate ? 'IGST' : 'CGST_SGST',
    gstRate: gstRate,
    igstAmount: igst,
    cgstAmount: cgst,
    sgstAmount: sgst,
    totalTax: igst + cgst + sgst,
    grandTotal: grandTotal,
    ewayBillNo: inv.ewayBillNo || inv.eway_bill_no || '',
    vehicleNo: inv.vehicleNo || inv.vehicle_no || '',
    reverseCharge: inv.reverseCharge || inv.reverse_charge || 'No',
    referenceNo: '',
    rawRecord: inv
  }
}

/**
 * Normalizes a Credit Note
 */
function normalizeCreditNote(cn) {
  const rawDate = cn.creditNoteDate || cn.credit_note_date || ''
  const yearMonth = getYearMonthKey(rawDate)

  const taxable = Number(cn.taxableAmount ?? cn.taxable_amount ?? 0)
  const igst = Number(cn.igstAmount ?? cn.igst_amount ?? 0)
  const cgst = Number(cn.cgstAmount ?? cn.cgst_amount ?? 0)
  const sgst = Number(cn.sgstAmount ?? cn.sgst_amount ?? 0)
  const netValue = Number(cn.netValue ?? cn.net_value ?? (taxable + igst + cgst + sgst))

  const origInvNo = cn.originalInvoiceNo || cn.original_invoice_no || ''
  const origInvDate = cn.originalInvoiceDate || cn.original_invoice_date || ''
  const refText = origInvNo ? `${origInvNo}${origInvDate ? ` (${origInvDate})` : ''}` : ''

  return {
    id: cn.id || `cn_${cn.creditNoteNo || Date.now()}`,
    sourceType: 'CREDIT_NOTE',
    sourceLabel: 'Credit Note',
    gstDocType: 'Credit Note (CDNR)',
    docNo: cn.creditNoteNo || cn.credit_note_no || 'Draft-CN',
    docDate: rawDate,
    yearMonth,
    receiverName: cn.receiverName || cn.receiver_name || '',
    receiverGstin: cn.receiverGstin || cn.receiver_gstin || '',
    receiverState: cn.receiverState || cn.receiver_state || 'GUJARAT',
    receiverStateCode: cn.receiverStateCode || cn.receiver_state_code || '24',
    placeOfSupply: cn.placeOfSupply || cn.receiverState || 'GUJARAT',
    hsnCode: cn.hsnCode || cn.hsn_code || '44219140',
    description: cn.goodsDescription || cn.goods_description || cn.creditReason || 'Credit Note - Rejection / Price Diff',
    quantity: cn.totalBags ? `${cn.totalBags} Bags` : '-',
    taxableAmount: taxable,
    taxTreatment: cn.taxTreatment || cn.tax_treatment || 'IGST',
    gstRate: Number(cn.gstRate || cn.gst_rate || 5),
    igstAmount: igst,
    cgstAmount: cgst,
    sgstAmount: sgst,
    totalTax: igst + cgst + sgst,
    grandTotal: netValue,
    ewayBillNo: '',
    vehicleNo: '',
    reverseCharge: 'No',
    referenceNo: refText,
    rawRecord: cn
  }
}

/**
 * Normalizes a Debit Note
 */
function normalizeDebitNote(dn) {
  const rawDate = dn.debitNoteDate || dn.debit_note_date || ''
  const yearMonth = getYearMonthKey(rawDate)

  const taxable = Number(dn.totalTaxable ?? dn.taxable_amount ?? 0)
  const gstAmount = Number(dn.totalGst ?? dn.gst_amount ?? 0)
  const grandTotal = Number(dn.totalDnAmt ?? dn.total_dn_amount ?? (taxable + gstAmount))

  const items = dn.items || dn.items_payload || []
  let refText = ''
  if (items.length > 0 && items[0].billNo) {
    refText = items.map(i => `${i.billNo}${i.billDate ? ` (${i.billDate})` : ''}`).filter(Boolean).join(', ')
  }

  return {
    id: dn.id || `dn_${dn.debitNoteNo || Date.now()}`,
    sourceType: 'DEBIT_NOTE',
    sourceLabel: 'Debit Note',
    gstDocType: 'Debit Note (CDNR)',
    docNo: dn.debitNoteNo || dn.debit_note_no || 'Draft-DN',
    docDate: rawDate,
    yearMonth,
    receiverName: dn.receiverName || dn.receiver_name || '',
    receiverGstin: dn.receiverGstin || dn.receiver_gstin || '',
    receiverState: dn.receiverState || dn.receiver_state || 'MAHARASHTRA',
    receiverStateCode: dn.receiverStateCode || dn.receiver_state_code || '27',
    placeOfSupply: dn.receiverState || 'MAHARASHTRA',
    hsnCode: dn.hsnCode || dn.hsn_code || '44219140',
    description: dn.goodsDescription || dn.goods_description || 'Annual Bonus / Incentive',
    quantity: dn.totalBags ? `${dn.totalBags} Bags` : '-',
    taxableAmount: taxable,
    taxTreatment: dn.taxTreatment || dn.tax_treatment || 'IGST',
    gstRate: Number(dn.gstRate || dn.gst_rate || 5),
    igstAmount: gstAmount, // Default to IGST for interstate
    cgstAmount: 0,
    sgstAmount: 0,
    totalTax: gstAmount,
    grandTotal: grandTotal,
    ewayBillNo: '',
    vehicleNo: '',
    reverseCharge: 'No',
    referenceNo: refText,
    rawRecord: dn
  }
}

/**
 * Normalizes a Kerala VAT Delivery Bill
 */
function normalizeVatBill(bill) {
  const rawDate = bill.billDate || bill.bill_date || ''
  const yearMonth = getYearMonthKey(rawDate)

  return {
    id: bill.id || `vat_${bill.billNo || Date.now()}`,
    sourceType: 'KERALA_VAT',
    sourceLabel: 'Kerala VAT Delivery Bill',
    gstDocType: 'Delivery Bill (VAT)',
    docNo: bill.billNo || bill.bill_no || 'Draft-VAT',
    docDate: rawDate,
    yearMonth,
    receiverName: bill.consigneeName || bill.consignee_name || '',
    receiverGstin: bill.consigneeTinGst || bill.consignee_tin_gst || '',
    receiverState: 'KERALA',
    receiverStateCode: '32',
    placeOfSupply: 'KERALA',
    hsnCode: '44219140',
    description: 'Vatta Wood Slats (Delivery Bill)',
    quantity: `${bill.totalBags || 0} Bags`,
    taxableAmount: Number(bill.totalEstimatedValue || 0),
    taxTreatment: 'NONE',
    gstRate: 0,
    igstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    totalTax: 0,
    grandTotal: Number(bill.totalEstimatedValue || 0),
    ewayBillNo: bill.ewayBillNo || bill.eway_bill_no || '',
    vehicleNo: bill.vehicleNo || bill.vehicle_no || '',
    reverseCharge: 'No',
    referenceNo: '',
    rawRecord: bill
  }
}

/**
 * Fetch all documents across all 5 tables from both Supabase & LocalStorage,
 * deduplicating and sorting chronologically.
 */
export async function fetchAllGstDocuments() {
  const docMap = new Map()

  // 1. Load LocalStorage First (Instant Cache)
  try {
    getSavedVattaInvoices().forEach(inv => {
      const norm = normalizeVattaInvoice(inv)
      docMap.set(`VATTA_${norm.id}`, norm)
    })
  } catch (e) {
    console.warn('Error reading local vatta invoices:', e)
  }

  try {
    const timberList = getSavedTimberInvoices()
    if (Array.isArray(timberList)) {
      timberList.forEach(inv => {
        const norm = normalizeTimberInvoice(inv)
        docMap.set(`TIMBER_${norm.id}`, norm)
      })
    }
  } catch (e) {
    console.warn('Error reading local timber invoices:', e)
  }

  try {
    getSavedCreditNotes().forEach(cn => {
      const norm = normalizeCreditNote(cn)
      docMap.set(`CN_${norm.id}`, norm)
    })
  } catch (e) {
    console.warn('Error reading local credit notes:', e)
  }

  try {
    getSavedDebitNotes().forEach(dn => {
      const norm = normalizeDebitNote(dn)
      docMap.set(`DN_${norm.id}`, norm)
    })
  } catch (e) {
    console.warn('Error reading local debit notes:', e)
  }

  try {
    getSavedVatBills().forEach(bill => {
      const norm = normalizeVatBill(bill)
      docMap.set(`VAT_${norm.id}`, norm)
    })
  } catch (e) {
    console.warn('Error reading local vat bills:', e)
  }

  // 2. Fetch Live Supabase Cloud Data if online & configured
  if (isSupabaseConfigured && supabase) {
    try {
      const [vattaRes, timberRes, cnRes, dnRes, vatRes] = await Promise.all([
        supabase.from('vatta_invoices').select('*'),
        supabase.from('timber_invoices').select('*'),
        supabase.from('credit_notes').select('*'),
        supabase.from('debit_notes').select('*'),
        supabase.from('kerala_vat_bills').select('*')
      ])

      if (vattaRes.data) {
        vattaRes.data.forEach(inv => {
          const fullPayload = inv.full_payload || inv
          const norm = normalizeVattaInvoice(fullPayload)
          norm.id = inv.id
          docMap.set(`VATTA_${inv.id}`, norm)
        })
      }

      if (timberRes.data) {
        timberRes.data.forEach(inv => {
          const fullPayload = inv.full_payload || inv
          const norm = normalizeTimberInvoice(fullPayload)
          norm.id = inv.id
          docMap.set(`TIMBER_${inv.id}`, norm)
        })
      }

      if (cnRes.data) {
        cnRes.data.forEach(cn => {
          const fullPayload = cn.full_payload || cn
          const norm = normalizeCreditNote(fullPayload)
          norm.id = cn.id
          docMap.set(`CN_${cn.id}`, norm)
        })
      }

      if (dnRes.data) {
        dnRes.data.forEach(dn => {
          const fullPayload = dn.full_payload || dn
          const norm = normalizeDebitNote(fullPayload)
          norm.id = dn.id
          docMap.set(`DN_${dn.id}`, norm)
        })
      }

      if (vatRes.data) {
        vatRes.data.forEach(bill => {
          const fullPayload = bill.full_payload || bill
          const norm = normalizeVatBill(fullPayload)
          norm.id = bill.id
          docMap.set(`VAT_${bill.id}`, norm)
        })
      }
    } catch (cloudErr) {
      console.warn('Supabase fetch notice in monthly register:', cloudErr)
    }
  }

  const allDocs = Array.from(docMap.values())

  // Sort descending by date, then by docNo
  allDocs.sort((a, b) => {
    const da = a.docDate || ''
    const db = b.docDate || ''
    if (da !== db) return db.localeCompare(da)
    return (b.docNo || '').localeCompare(a.docNo || '')
  })

  return allDocs
}

/**
 * Returns all unique months with document counts and filing details.
 * Always ensures the current active calendar month is present!
 */
export function getAvailableMonths(allDocuments = []) {
  const currentKey = getYearMonthKey(new Date()) // e.g. "2026-10"
  const monthMap = new Map()

  // Always ensure current month exists
  monthMap.set(currentKey, {
    key: currentKey,
    label: getMonthYearLabel(currentKey),
    shortLabel: `${SHORT_MONTH_NAMES[parseInt(currentKey.split('-')[1], 10) - 1]} ${currentKey.split('-')[0]}`,
    financialYear: getFinancialYearFromKey(currentKey),
    filingDueMonth: getFilingDueMonthLabel(currentKey),
    isCurrentMonth: true,
    docCount: 0,
    invoiceCount: 0,
    creditNoteCount: 0,
    debitNoteCount: 0,
    taxableTotal: 0
  })

  allDocuments.forEach(doc => {
    const key = doc.yearMonth || currentKey
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        key,
        label: getMonthYearLabel(key),
        shortLabel: `${SHORT_MONTH_NAMES[parseInt(key.split('-')[1], 10) - 1]} ${key.split('-')[0]}`,
        financialYear: getFinancialYearFromKey(key),
        filingDueMonth: getFilingDueMonthLabel(key),
        isCurrentMonth: key === currentKey,
        docCount: 0,
        invoiceCount: 0,
        creditNoteCount: 0,
        debitNoteCount: 0,
        taxableTotal: 0
      })
    }
    const entry = monthMap.get(key)
    entry.docCount += 1
    if (doc.sourceType === 'VATTA' || doc.sourceType === 'TIMBER') {
      entry.invoiceCount += 1
      entry.taxableTotal += doc.taxableAmount || 0
    } else if (doc.sourceType === 'CREDIT_NOTE') {
      entry.creditNoteCount += 1
      entry.taxableTotal -= doc.taxableAmount || 0
    } else if (doc.sourceType === 'DEBIT_NOTE') {
      entry.debitNoteCount += 1
      entry.taxableTotal += doc.taxableAmount || 0
    }
  })

  // Return sorted descending (newest month first)
  return Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key))
}

/**
 * Filter documents by Year-Month key (e.g. "2026-10")
 */
export function filterDocumentsByMonth(documents, yearMonthKey) {
  if (!yearMonthKey) return documents
  return documents.filter(doc => (doc.yearMonth || '') === yearMonthKey)
}

/**
 * Calculate comprehensive GSTR-1 and GSTR-3B Tax Totals for a set of documents
 */
export function calculateGstSummary(documents = []) {
  let invoicesTaxable = 0
  let invoicesIgst = 0
  let invoicesCgst = 0
  let invoicesSgst = 0
  let invoicesGrandTotal = 0
  let invoiceCount = 0

  let debitTaxable = 0
  let debitIgst = 0
  let debitCgst = 0
  let debitSgst = 0
  let debitGrandTotal = 0
  let debitCount = 0

  let creditTaxable = 0
  let creditIgst = 0
  let creditCgst = 0
  let creditSgst = 0
  let creditGrandTotal = 0
  let creditCount = 0

  let vatBillCount = 0
  let vatEstimatedTotal = 0

  documents.forEach(doc => {
    const tax = doc.taxableAmount || 0
    const igst = doc.igstAmount || 0
    const cgst = doc.cgstAmount || 0
    const sgst = doc.sgstAmount || 0
    const grand = doc.grandTotal || 0

    if (doc.sourceType === 'VATTA' || doc.sourceType === 'TIMBER') {
      invoiceCount += 1
      invoicesTaxable += tax
      invoicesIgst += igst
      invoicesCgst += cgst
      invoicesSgst += sgst
      invoicesGrandTotal += grand
    } else if (doc.sourceType === 'DEBIT_NOTE') {
      debitCount += 1
      debitTaxable += tax
      debitIgst += igst
      debitCgst += cgst
      debitSgst += sgst
      debitGrandTotal += grand
    } else if (doc.sourceType === 'CREDIT_NOTE') {
      creditCount += 1
      creditTaxable += tax
      creditIgst += igst
      creditCgst += cgst
      creditSgst += sgst
      creditGrandTotal += grand
    } else if (doc.sourceType === 'KERALA_VAT') {
      vatBillCount += 1
      vatEstimatedTotal += grand
    }
  })

  // Net turnover & taxes = Invoices + Debit Notes - Credit Notes
  const netTaxable = invoicesTaxable + debitTaxable - creditTaxable
  const netIgst = invoicesIgst + debitIgst - creditIgst
  const netCgst = invoicesCgst + debitCgst - creditCgst
  const netSgst = invoicesSgst + debitSgst - creditSgst
  const netTaxPayable = netIgst + netCgst + netSgst
  const netInvoiceTurnover = invoicesGrandTotal + debitGrandTotal - creditGrandTotal

  return {
    // Counts
    invoiceCount,
    debitCount,
    creditCount,
    vatBillCount,
    totalGstDocs: invoiceCount + debitCount + creditCount,

    // Invoices Breakdown
    invoicesTaxable,
    invoicesIgst,
    invoicesCgst,
    invoicesSgst,
    invoicesGrandTotal,

    // Debit Notes Breakdown
    debitTaxable,
    debitIgst,
    debitCgst,
    debitSgst,
    debitGrandTotal,

    // Credit Notes Breakdown
    creditTaxable,
    creditIgst,
    creditCgst,
    creditSgst,
    creditGrandTotal,

    // VAT Bills
    vatEstimatedTotal,

    // Net GST Returns (GSTR-1 & GSTR-3B Table 3.1)
    netTaxable,
    netIgst,
    netCgst,
    netSgst,
    netTaxPayable,
    netInvoiceTurnover
  }
}

/**
 * Format Indian currency with 2 decimals
 */
export function formatCurrency(num) {
  const n = Number(num) || 0
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Delete a document from both LocalStorage and Supabase according to its sourceType
 */
export async function deleteDocumentRecord(doc) {
  if (!doc) return false

  try {
    if (doc.sourceType === 'VATTA') {
      deleteVattaInvoiceRecord(doc.id)
    } else if (doc.sourceType === 'TIMBER') {
      deleteInvoiceRecord(doc.id)
    } else if (doc.sourceType === 'CREDIT_NOTE') {
      deleteCreditNoteRecord(doc.id)
    } else if (doc.sourceType === 'DEBIT_NOTE') {
      deleteDebitNoteRecord(doc.id)
    } else if (doc.sourceType === 'KERALA_VAT') {
      deleteVatBillRecord(doc.id)
    }
    return true
  } catch (err) {
    console.error('Error deleting document:', err)
    return false
  }
}

/**
 * Generate and trigger download of a formatted CSV for GSTR-1 filing
 */
export function exportGstr1Csv(monthLabel, documents, totals) {
  const safeMonth = (monthLabel || 'Current_Month').replace(/\s+/g, '_')
  const filename = `GSTR1_${safeMonth}_GK_SAWMILL.csv`

  const headers = [
    'Section',
    'GSTIN/UIN of Recipient',
    'Receiver Name',
    'Document Type',
    'Invoice / Note No',
    'Invoice / Note Date',
    'Original Invoice Ref',
    'Place Of Supply',
    'Reverse Charge',
    'HSN Code',
    'Applicable % of Tax Rate',
    'Taxable Value (INR)',
    'IGST Amount (INR)',
    'CGST Amount (INR)',
    'SGST Amount (INR)',
    'Cess Amount (INR)',
    'Total Document Value (INR)',
    'E-Way Bill No'
  ]

  const rows = []

  // Add each document
  documents.forEach((doc) => {
    let section = 'B2B Invoices (Table 4)'
    if (doc.sourceType === 'CREDIT_NOTE') section = 'Credit Notes (Table 9B)'
    else if (doc.sourceType === 'DEBIT_NOTE') section = 'Debit Notes (Table 9B)'
    else if (doc.sourceType === 'KERALA_VAT') section = 'Delivery Bills (Non-GST)'

    rows.push([
      `"${section}"`,
      `"${doc.receiverGstin || ''}"`,
      `"${(doc.receiverName || '').replace(/"/g, '""')}"`,
      `"${doc.gstDocType}"`,
      `"${doc.docNo}"`,
      `"${doc.docDate || ''}"`,
      `"${(doc.referenceNo || '').replace(/"/g, '""')}"`,
      `"${doc.placeOfSupply || doc.receiverState || ''}"`,
      `"${doc.reverseCharge || 'N'}"`,
      `"${doc.hsnCode || ''}"`,
      `${doc.gstRate}%`,
      doc.taxableAmount.toFixed(2),
      doc.igstAmount.toFixed(2),
      doc.cgstAmount.toFixed(2),
      doc.sgstAmount.toFixed(2),
      '0.00',
      doc.grandTotal.toFixed(2),
      `"${doc.ewayBillNo || ''}"`
    ])
  })

  // Summary lines at bottom
  rows.push([])
  rows.push(['--- GSTR-1 & GSTR-3B MONTHLY SUMMARY ---'])
  rows.push(['Tax Period', `"${monthLabel}"`])
  rows.push(['Total Gross Invoices Taxable (Table 4)', totals.invoicesTaxable.toFixed(2)])
  rows.push(['Total Debit Notes Taxable (Table 9B)', totals.debitTaxable.toFixed(2)])
  rows.push(['Total Credit Notes Taxable (Table 9B)', `-${totals.creditTaxable.toFixed(2)}`])
  rows.push(['NET TAXABLE OUTWARD SUPPLIES (Table 3.1)', totals.netTaxable.toFixed(2)])
  rows.push(['Net Integrated Tax (IGST)', totals.netIgst.toFixed(2)])
  rows.push(['Net Central Tax (CGST)', totals.netCgst.toFixed(2)])
  rows.push(['Net State Tax (SGST)', totals.netSgst.toFixed(2)])
  rows.push(['TOTAL NET GST LIABILITY PAYABLE', totals.netTaxPayable.toFixed(2)])
  rows.push(['TOTAL NET INVOICE TURNOVER', totals.netInvoiceTurnover.toFixed(2)])

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
