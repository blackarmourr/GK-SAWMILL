/**
 * HSN Summary & Documents Issued Service
 * G.K. Sawmill - GST Filing Automation (GSTR-1 Tables 12 & 13)
 *
 * Automates:
 * 1. GSTR-1 Table 12: HSN-wise Summary of Outward Supplies
 *    - HSN 4407 (Mahogany & Manjiyam Sawn Timber) in CBM (converted from CFT)
 *    - HSN 44219140 (Vatta Slat Wood / Pencil Slats) in BAG
 *    - Taxable Value, Tax Rates, Integrated Tax (IGST), Central Tax (CGST), State Tax (SGST)
 * 2. GSTR-1 Table 13: Documents Issued During the Tax Period
 *    - Invoices for outward supply (Vatta Series & Timber Series)
 *    - Credit Notes, Debit Notes, Delivery Challans
 *    - Min Serial No, Max Serial No, Total Issued, Cancelled, Net Issued
 */

import { convertCftToCbm } from './woodStandardSizes.js'

export const HSN_CATALOG = {
  TIMBER_4407: {
    hsn: '4407',
    description: 'Mahogany & Manjiyam Sawn Timber',
    hsnDescription: 'WOOD SAWN OR CHIPPED..',
    uqc: 'CBM',
    defaultRate: 18,
  },
  VATTA_44219140: {
    hsn: '44219140',
    description: 'Vatta Pencil Slats',
    hsnDescription: 'Pencil slats',
    uqc: 'BAG',
    defaultRate: 5,
  }
}

/**
 * Natural sort helper for invoice numbers (e.g. handles "A-2", "A-10", "1", "12")
 */
export function naturalSortDocNos(docs) {
  return [...docs].sort((a, b) => {
    const na = String(a.docNo || '')
    const nb = String(b.docNo || '')
    return na.localeCompare(nb, undefined, { numeric: true, sensitivity: 'base' })
  })
}

/**
 * Generates initial Table 12 (HSN Summary) dynamically calculated from the month's documents
 */
export function buildDefaultHsnSummary(monthDocs = []) {
  const vattaDocs = monthDocs.filter(d => d.sourceType === 'VATTA')
  const timberDocs = monthDocs.filter(d => d.sourceType === 'TIMBER')

  // --- 1. Timber: HSN 4407 (Mahogany & Manjiyam) in CBM ---
  let timberTotalCft = 0
  let timberTaxable = 0
  let timberIgst = 0
  let timberCgst = 0
  let timberSgst = 0
  let timberRate = HSN_CATALOG.TIMBER_4407.defaultRate

  timberDocs.forEach(d => {
    const raw = d.rawRecord || {}
    const cft = Number(d.totalCft || raw.totalCft || raw.total_cft || (Number(raw.mahoganyCft || 0) + Number(raw.manjiyamCft || 0))) || 0
    timberTotalCft += cft
    timberTaxable += Number(d.taxableAmount || 0)
    timberIgst += Number(d.igstAmount || 0)
    timberCgst += Number(d.cgstAmount || 0)
    timberSgst += Number(d.sgstAmount || 0)
    if (d.gstRate && Number(d.gstRate) > 0) {
      timberRate = Number(d.gstRate)
    }
  })

  // Calculate CBM from CFT using official conversion factor
  const timberTotalCbm = Number(convertCftToCbm(timberTotalCft).toFixed(2))

  // If taxes are 0 but taxable exists, compute IGST (inter-state outward supply)
  if (timberTaxable > 0 && timberIgst === 0 && timberCgst === 0 && timberSgst === 0) {
    timberIgst = Math.round(timberTaxable * (timberRate / 100) * 100) / 100
  }

  // --- 2. Vatta: HSN 44219140 (Pencil Slats) in BAG ---
  let vattaTotalBags = 0
  let vattaTaxable = 0
  let vattaIgst = 0
  let vattaCgst = 0
  let vattaSgst = 0
  let vattaRate = HSN_CATALOG.VATTA_44219140.defaultRate

  vattaDocs.forEach(d => {
    const raw = d.rawRecord || {}
    const bags = Number(d.totalBags || raw.totalBags || raw.total_bags || raw.totals?.totalBags || 0) || 0
    vattaTotalBags += bags
    vattaTaxable += Number(d.taxableAmount || 0)
    vattaIgst += Number(d.igstAmount || 0)
    vattaCgst += Number(d.cgstAmount || 0)
    vattaSgst += Number(d.sgstAmount || 0)
    if (d.gstRate && Number(d.gstRate) > 0) {
      vattaRate = Number(d.gstRate)
    }
  })

  // If taxes are 0 but taxable exists, compute IGST
  if (vattaTaxable > 0 && vattaIgst === 0 && vattaCgst === 0 && vattaSgst === 0) {
    vattaIgst = Math.round(vattaTaxable * (vattaRate / 100) * 100) / 100
  }

  // Row 1: Mahogany / Manjiyam Sawn Timber (4407)
  const timberRow = {
    id: 'hsn-row-4407',
    srNo: 1,
    hsn: '4407',
    description: HSN_CATALOG.TIMBER_4407.description,
    hsnDescription: HSN_CATALOG.TIMBER_4407.hsnDescription,
    uqc: 'CBM',
    quantity: timberTotalCbm,
    taxableValue: Math.round(timberTaxable * 100) / 100,
    rate: timberRate,
    igst: Math.round(timberIgst * 100) / 100,
    cgst: Math.round(timberCgst * 100) / 100,
    sgst: Math.round(timberSgst * 100) / 100,
    cess: 0,
    totalTax: Math.round((timberIgst + timberCgst + timberSgst) * 100) / 100,
    invoiceCount: timberDocs.length,
    originalCft: timberTotalCft,
  }

  // Row 2: Vatta Pencil Slats (44219140)
  const vattaRow = {
    id: 'hsn-row-44219140',
    srNo: 2,
    hsn: '44219140',
    description: HSN_CATALOG.VATTA_44219140.description,
    hsnDescription: HSN_CATALOG.VATTA_44219140.hsnDescription,
    uqc: 'BAG',
    quantity: vattaTotalBags,
    taxableValue: Math.round(vattaTaxable * 100) / 100,
    rate: vattaRate,
    igst: Math.round(vattaIgst * 100) / 100,
    cgst: Math.round(vattaCgst * 100) / 100,
    sgst: Math.round(vattaSgst * 100) / 100,
    cess: 0,
    totalTax: Math.round((vattaIgst + vattaCgst + vattaSgst) * 100) / 100,
    invoiceCount: vattaDocs.length,
    originalBags: vattaTotalBags,
  }

  return [timberRow, vattaRow]
}

/**
 * Generates initial Table 13 (Documents Issued) dynamically calculated from the month's documents
 */
export function buildDefaultDocumentsIssued(monthDocs = []) {
  const result = []
  let sr = 1

  // 1. Vatta Tax Invoices
  const vattaDocs = naturalSortDocNos(monthDocs.filter(d => d.sourceType === 'VATTA'))
  if (vattaDocs.length > 0) {
    result.push({
      id: 'doc-series-vatta',
      srNo: sr++,
      natureOfDoc: 'Invoices for outward supply (Vatta Slat Wood)',
      docTypeCategory: 'INVOICE_VATTA',
      fromNo: vattaDocs[0].docNo || '1',
      toNo: vattaDocs[vattaDocs.length - 1].docNo || String(vattaDocs.length),
      totalNumber: vattaDocs.length,
      cancelled: 0,
      netIssued: vattaDocs.length,
      autoCalculated: true,
    })
  } else {
    result.push({
      id: 'doc-series-vatta-empty',
      srNo: sr++,
      natureOfDoc: 'Invoices for outward supply (Vatta Slat Wood)',
      docTypeCategory: 'INVOICE_VATTA',
      fromNo: '-',
      toNo: '-',
      totalNumber: 0,
      cancelled: 0,
      netIssued: 0,
      autoCalculated: true,
    })
  }

  // 2. Timber Tax Invoices (Mahogany & Manjiyam)
  const timberDocs = naturalSortDocNos(monthDocs.filter(d => d.sourceType === 'TIMBER'))
  if (timberDocs.length > 0) {
    result.push({
      id: 'doc-series-timber',
      srNo: sr++,
      natureOfDoc: 'Invoices for outward supply (Mahogany & Manjiyam Timber)',
      docTypeCategory: 'INVOICE_TIMBER',
      fromNo: timberDocs[0].docNo || 'A-1',
      toNo: timberDocs[timberDocs.length - 1].docNo || `A-${timberDocs.length}`,
      totalNumber: timberDocs.length,
      cancelled: 0,
      netIssued: timberDocs.length,
      autoCalculated: true,
    })
  } else {
    result.push({
      id: 'doc-series-timber-empty',
      srNo: sr++,
      natureOfDoc: 'Invoices for outward supply (Mahogany & Manjiyam Timber)',
      docTypeCategory: 'INVOICE_TIMBER',
      fromNo: '-',
      toNo: '-',
      totalNumber: 0,
      cancelled: 0,
      netIssued: 0,
      autoCalculated: true,
    })
  }

  // 3. Credit Notes
  const creditDocs = naturalSortDocNos(monthDocs.filter(d => d.sourceType === 'CREDIT_NOTE'))
  if (creditDocs.length > 0) {
    result.push({
      id: 'doc-series-credit',
      srNo: sr++,
      natureOfDoc: 'Credit Notes (CDNR)',
      docTypeCategory: 'CREDIT_NOTE',
      fromNo: creditDocs[0].docNo,
      toNo: creditDocs[creditDocs.length - 1].docNo,
      totalNumber: creditDocs.length,
      cancelled: 0,
      netIssued: creditDocs.length,
      autoCalculated: true,
    })
  }

  // 4. Debit Notes
  const debitDocs = naturalSortDocNos(monthDocs.filter(d => d.sourceType === 'DEBIT_NOTE'))
  if (debitDocs.length > 0) {
    result.push({
      id: 'doc-series-debit',
      srNo: sr++,
      natureOfDoc: 'Debit Notes (CDNR)',
      docTypeCategory: 'DEBIT_NOTE',
      fromNo: debitDocs[0].docNo,
      toNo: debitDocs[debitDocs.length - 1].docNo,
      totalNumber: debitDocs.length,
      cancelled: 0,
      netIssued: debitDocs.length,
      autoCalculated: true,
    })
  }

  // 5. Kerala VAT Delivery Bills / Delivery Challans
  const vatDocs = naturalSortDocNos(monthDocs.filter(d => d.sourceType === 'KERALA_VAT'))
  if (vatDocs.length > 0) {
    result.push({
      id: 'doc-series-vat',
      srNo: sr++,
      natureOfDoc: 'Delivery Challans / Kerala VAT Delivery Bills',
      docTypeCategory: 'DELIVERY_CHALLAN',
      fromNo: vatDocs[0].docNo,
      toNo: vatDocs[vatDocs.length - 1].docNo,
      totalNumber: vatDocs.length,
      cancelled: 0,
      netIssued: vatDocs.length,
      autoCalculated: true,
    })
  }

  return result
}

/**
 * Calculate totals for HSN Summary Table
 */
export function calculateHsnTotals(rows = []) {
  let totalTaxableValue = 0
  let totalIgst = 0
  let totalCgst = 0
  let totalSgst = 0
  let totalCess = 0
  let totalTaxAmount = 0
  let totalQuantityCbm = 0
  let totalQuantityBags = 0

  rows.forEach(r => {
    const taxVal = Number(r.taxableValue) || 0
    const igst = Number(r.igst) || 0
    const cgst = Number(r.cgst) || 0
    const sgst = Number(r.sgst) || 0
    const cess = Number(r.cess) || 0
    const qty = Number(r.quantity) || 0

    totalTaxableValue += taxVal
    totalIgst += igst
    totalCgst += cgst
    totalSgst += sgst
    totalCess += cess
    totalTaxAmount += (igst + cgst + sgst + cess)

    if (r.uqc === 'CBM') {
      totalQuantityCbm += qty
    } else if (r.uqc === 'BAG') {
      totalQuantityBags += qty
    }
  })

  return {
    totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
    totalIgst: Math.round(totalIgst * 100) / 100,
    totalCgst: Math.round(totalCgst * 100) / 100,
    totalSgst: Math.round(totalSgst * 100) / 100,
    totalCess: Math.round(totalCess * 100) / 100,
    totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
    totalQuantityCbm: Number(totalQuantityCbm.toFixed(2)),
    totalQuantityBags: Math.round(totalQuantityBags),
  }
}

/**
 * Calculate totals for Documents Issued Table
 */
export function calculateDocsIssuedTotals(rows = []) {
  let totalIssued = 0
  let totalCancelled = 0
  let totalNet = 0

  rows.forEach(r => {
    const issued = Number(r.totalNumber) || 0
    const cancelled = Number(r.cancelled) || 0
    const net = Number(r.netIssued) || (issued - cancelled)

    totalIssued += issued
    totalCancelled += cancelled
    totalNet += net
  })

  return {
    totalIssued,
    totalCancelled,
    totalNet
  }
}

/**
 * Local storage load/save for user-customized HSN records per month
 */
export function loadSavedHsnState(monthKey) {
  if (!monthKey) return null
  try {
    const key = `gk_hsn_summary_${monthKey}`
    const raw = localStorage.getItem(key)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn('Error reading saved HSN state:', err)
  }
  return null
}

export function saveHsnState(monthKey, state) {
  if (!monthKey || !state) return false
  try {
    const key = `gk_hsn_summary_${monthKey}`
    localStorage.setItem(key, JSON.stringify({
      ...state,
      savedAt: new Date().toISOString()
    }))
    return true
  } catch (err) {
    console.warn('Error saving HSN state:', err)
    return false
  }
}

/**
 * Clear custom overrides and return to auto-calculated state
 */
export function clearSavedHsnState(monthKey) {
  if (!monthKey) return
  try {
    localStorage.removeItem(`gk_hsn_summary_${monthKey}`)
  } catch {}
}

/**
 * Export CSV for GSTR-1 Table 12 & Table 13
 */
export function exportHsnSummaryCsv(monthLabel, hsnRows = [], docRows = [], totals = {}) {
  const safeMonth = (monthLabel || 'Tax_Period').replace(/\s+/g, '_')
  const filename = `GSTR1_Table12_13_HSN_Docs_${safeMonth}_GK_SAWMILL.csv`

  const lines = []

  // Header Title
  lines.push(['"G.K. SAW MILL - GSTR-1 HSN SUMMARY (TABLE 12) & DOCUMENTS ISSUED (TABLE 13)"'])
  lines.push([`"Tax Period: ${monthLabel}"`, `"GSTIN: 32AHOPG1823G1ZP"`, `"State: KERALA (32)"`])
  lines.push([])

  // Section 1: TABLE 12 - HSN-WISE SUMMARY OF OUTWARD SUPPLIES
  lines.push(['"TABLE 12: HSN-WISE SUMMARY OF OUTWARD SUPPLIES"'])
  lines.push([
    'Sr No',
    'HSN',
    'Description',
    'Description as per HSN Code',
    'UQC',
    'Total Quantity',
    'Total Taxable Value (INR)',
    'Rate (%)',
    'Integrated Tax (INR)',
    'Central Tax (INR)',
    'State/UT Tax (INR)',
    'Cess (INR)',
    'Total Tax (INR)'
  ])

  hsnRows.forEach((r, idx) => {
    lines.push([
      idx + 1,
      `"${r.hsn}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${(r.hsnDescription || '').replace(/"/g, '""')}"`,
      `"${r.uqc}"`,
      r.quantity,
      Number(r.taxableValue).toFixed(2),
      `${r.rate}%`,
      Number(r.igst).toFixed(2),
      Number(r.cgst).toFixed(2),
      Number(r.sgst).toFixed(2),
      Number(r.cess || 0).toFixed(2),
      Number(r.totalTax).toFixed(2)
    ])
  })

  // Table 12 Totals
  lines.push([
    '"TOTAL"',
    '""',
    '""',
    '""',
    '""',
    '""',
    Number(totals.totalTaxableValue || 0).toFixed(2),
    '""',
    Number(totals.totalIgst || 0).toFixed(2),
    Number(totals.totalCgst || 0).toFixed(2),
    Number(totals.totalSgst || 0).toFixed(2),
    Number(totals.totalCess || 0).toFixed(2),
    Number(totals.totalTaxAmount || 0).toFixed(2)
  ])

  lines.push([])
  lines.push([])

  // Section 2: TABLE 13 - DOCUMENTS ISSUED DURING THE TAX PERIOD
  lines.push(['"TABLE 13: DOCUMENTS ISSUED DURING THE TAX PERIOD"'])
  lines.push([
    'Sr No',
    'Nature of Document',
    'Serial No From',
    'Serial No To',
    'Total Number',
    'Cancelled',
    'Net Issued'
  ])

  docRows.forEach((d, idx) => {
    lines.push([
      idx + 1,
      `"${(d.natureOfDoc || '').replace(/"/g, '""')}"`,
      `"${d.fromNo || ''}"`,
      `"${d.toNo || ''}"`,
      d.totalNumber,
      d.cancelled,
      d.netIssued
    ])
  })

  const docTotals = calculateDocsIssuedTotals(docRows)
  lines.push([
    '"TOTAL"',
    '""',
    '""',
    '""',
    docTotals.totalIssued,
    docTotals.totalCancelled,
    docTotals.totalNet
  ])

  const csvContent = '\uFEFF' + lines.map(row => row.join(',')).join('\r\n')
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
