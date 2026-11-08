import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency } from '../data/gstMonthlyRegisterService.js'

/**
 * Generate official GSTR-1 HSN Summary (Table 12) & Documents Issued (Table 13) PDF
 * 
 * @param {Object} params
 * @param {string} params.monthLabel - e.g. "October 2026"
 * @param {string} params.financialYear - e.g. "FY 2026-27"
 * @param {Array} params.hsnRows - Table 12 rows
 * @param {Array} params.docRows - Table 13 rows
 * @param {Object} params.totals - Calculated totals
 * @param {boolean} [params.save=true] - Whether to trigger download
 * @returns {jsPDF}
 */
export function generateHsnSummaryPdf({
  monthLabel = 'Current Tax Period',
  financialYear = 'FY 2026-27',
  hsnRows = [],
  docRows = [],
  totals = {},
  save = true
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297 mm
  const margin = 12
  const contentWidth = pageWidth - margin * 2
  const centerX = pageWidth / 2

  let y = 16

  // 1. HEADER: BRANDING & CONTACT
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text('G.K. SAW MILL', centerX, y, { align: 'center' })

  y += 5.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)
  doc.text('KATOOR, NEDUMPANA - P.O., KOLLAM, KERALA - 691576', centerX, y, { align: 'center' })

  y += 4
  doc.text('GSTIN: 32AHOPG1823G1ZP | Phone: 9446786175 | State: KERALA (32)', centerX, y, { align: 'center' })

  y += 5
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.4)
  doc.line(margin, y, margin + contentWidth, y)

  y += 6

  // 2. DOCUMENT TITLE & TAX PERIOD METADATA
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text('GSTR-1 HSN SUMMARY (TABLE 12) & DOCUMENTS ISSUED (TABLE 13)', centerX, y, { align: 'center' })

  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  const metaLine = `Tax Period: ${monthLabel}   |   ${financialYear}   |   Generated: ${new Date().toLocaleDateString('en-GB')}`
  doc.text(metaLine, centerX, y, { align: 'center' })

  y += 6

  // 3. TABLE 12: HSN SUMMARY
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 58, 43)
  doc.text('1. TABLE 12: HSN-WISE SUMMARY OF OUTWARD SUPPLIES', margin, y)

  y += 3

  const table12Head = [
    [
      { content: 'Sl', styles: { halign: 'center' } },
      { content: 'HSN', styles: { halign: 'center' } },
      { content: 'Description as per HSN', styles: { halign: 'left' } },
      { content: 'UQC', styles: { halign: 'center' } },
      { content: 'Total Qty', styles: { halign: 'right' } },
      { content: 'Taxable Value', styles: { halign: 'right' } },
      { content: 'Rate', styles: { halign: 'center' } },
      { content: 'IGST', styles: { halign: 'right' } },
      { content: 'CGST', styles: { halign: 'right' } },
      { content: 'SGST', styles: { halign: 'right' } },
      { content: 'Total Tax', styles: { halign: 'right' } }
    ]
  ]

  const table12Body = hsnRows.map((r, idx) => [
    { content: String(idx + 1), styles: { halign: 'center' } },
    { content: String(r.hsn), styles: { halign: 'center', fontStyle: 'bold' } },
    { content: String(r.hsnDescription || r.description || ''), styles: { halign: 'left' } },
    { content: String(r.uqc), styles: { halign: 'center', fontStyle: 'bold' } },
    { content: String(r.quantity), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: formatCurrency(r.taxableValue), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: `${r.rate}%`, styles: { halign: 'center' } },
    { content: Number(r.igst) > 0 ? formatCurrency(r.igst) : '-', styles: { halign: 'right' } },
    { content: Number(r.cgst) > 0 ? formatCurrency(r.cgst) : '-', styles: { halign: 'right' } },
    { content: Number(r.sgst) > 0 ? formatCurrency(r.sgst) : '-', styles: { halign: 'right' } },
    { content: formatCurrency(r.totalTax), styles: { halign: 'right', fontStyle: 'bold' } }
  ])

  const table12Foot = [
    [
      { content: 'Total', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(totals.totalTaxableValue), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '', styles: { halign: 'center' } },
      { content: formatCurrency(totals.totalIgst), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(totals.totalCgst), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(totals.totalSgst), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(totals.totalTaxAmount), styles: { halign: 'right', fontStyle: 'bold' } }
    ]
  ]

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    head: table12Head,
    body: table12Body,
    foot: table12Foot,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      lineColor: [148, 163, 184],
      lineWidth: 0.3,
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      lineColor: [148, 163, 184],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 18 },
      2: { cellWidth: 46 },
      3: { cellWidth: 12 },
      4: { cellWidth: 16 },
      5: { cellWidth: 22 },
      6: { cellWidth: 11 },
      7: { cellWidth: 17 },
      8: { cellWidth: 12 },
      9: { cellWidth: 12 },
      10: { cellWidth: 18 },
    }
  })

  y = doc.lastAutoTable.finalY + 8

  // 4. TABLE 13: DOCUMENTS ISSUED
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 58, 43)
  doc.text('2. TABLE 13: DOCUMENTS ISSUED DURING THE TAX PERIOD', margin, y)

  y += 3

  const table13Head = [
    [
      { content: 'Sl', styles: { halign: 'center' } },
      { content: 'Nature of Document', styles: { halign: 'left' } },
      { content: 'Sr No From', styles: { halign: 'center' } },
      { content: 'Sr No To', styles: { halign: 'center' } },
      { content: 'Total Number', styles: { halign: 'center' } },
      { content: 'Cancelled', styles: { halign: 'center' } },
      { content: 'Net Issued', styles: { halign: 'center' } },
    ]
  ]

  let docIssuedSum = 0
  let docCancelledSum = 0
  let docNetSum = 0

  const table13Body = docRows.map((d, idx) => {
    const issued = Number(d.totalNumber) || 0
    const canc = Number(d.cancelled) || 0
    const net = Number(d.netIssued) || (issued - canc)
    docIssuedSum += issued
    docCancelledSum += canc
    docNetSum += net

    return [
      { content: String(idx + 1), styles: { halign: 'center' } },
      { content: String(d.natureOfDoc || ''), styles: { halign: 'left', fontStyle: 'bold' } },
      { content: String(d.fromNo || '-'), styles: { halign: 'center' } },
      { content: String(d.toNo || '-'), styles: { halign: 'center' } },
      { content: String(issued), styles: { halign: 'center' } },
      { content: String(canc), styles: { halign: 'center' } },
      { content: String(net), styles: { halign: 'center', fontStyle: 'bold' } },
    ]
  })

  const table13Foot = [
    [
      { content: 'Total Documents', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: String(docIssuedSum), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(docCancelledSum), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(docNetSum), styles: { halign: 'center', fontStyle: 'bold' } },
    ]
  ]

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    head: table13Head,
    body: table13Body,
    foot: table13Foot,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
      cellPadding: 2.2,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      lineColor: [148, 163, 184],
      lineWidth: 0.3,
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      lineColor: [148, 163, 184],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 86 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { cellWidth: 16 },
      5: { cellWidth: 14 },
      6: { cellWidth: 16 },
    }
  })

  // 5. SIGNATURE / AUTHORIZATION BLOCK
  let finalY = doc.lastAutoTable.finalY + 14
  if (finalY + 30 > pageHeight - margin) {
    doc.addPage()
    finalY = margin + 15
  }

  const sigX = pageWidth - margin - 50

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.text('For G.K. SAW MILL', sigX, finalY)

  finalY += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Authorized Signatory', sigX, finalY)
  finalY += 4
  doc.setFont('helvetica', 'bold')
  doc.text('Anil Kumar G (Proprietor)', sigX, finalY)

  // Download if requested
  if (save) {
    const cleanMonth = (monthLabel || 'Current_Month').replace(/\s+/g, '_')
    const fileName = `GSTR1_Table12_13_${cleanMonth}_GK_SAWMILL.pdf`
    doc.save(fileName)
  }

  return doc
}
