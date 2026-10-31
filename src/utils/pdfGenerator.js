import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Generate official A4 Portrait PDF for G.K. Saw Mill Size Chart
 * 
 * Clean, borderless executive layout with generous spacing across
 * company header, address, metadata, and table.
 * 
 * @param {Object} params
 * @param {string} params.woodType - 'mahogany' | 'manjiyam'
 * @param {string} params.vehicleNo - User-entered Vehicle Number
 * @param {string} params.invoiceNo - User-entered Invoice Number
 * @param {Object} params.chartResult - Result object from generateOptimizedSizeChart
 * @param {boolean} [params.save=true] - Whether to trigger browser download
 * @returns {jsPDF} The jsPDF document instance
 */
export function generateSizeChartPdf({
  woodType,
  vehicleNo,
  invoiceNo,
  chartResult,
  save = true,
}) {
  if (!chartResult || !chartResult.rows) {
    throw new Error('No chart data provided for PDF generation')
  }

  // Create A4 Portrait PDF (210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297 mm
  const margin = 14
  const contentWidth = pageWidth - margin * 2 // 182 mm
  const centerX = pageWidth / 2

  // Start with comfortable breathing room from top of A4 sheet
  let y = 20

  // --- 1. HEADER: COMPANY NAME ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.setTextColor(15, 23, 42) // Deep elegant charcoal/black
  doc.text('G.K. SAW MILL', centerX, y, { align: 'center' })

  // Spacing after company name
  y += 7

  // --- 2. ADDRESS SECTION ---
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(51, 65, 85) // Crisp subtle dark tone
  doc.text('KATOOR, NEDUMPANA - P.O.,', centerX, y, { align: 'center' })

  y += 4.5
  doc.text('KOLLAM, KERALA - 691576', centerX, y, { align: 'center' })

  // Spacing after address section (uncongested, balanced whitespace)
  y += 7.5

  // Subtle clean divider line separating branding from invoice metadata
  doc.setDrawColor(203, 213, 225) // Clean slate border
  doc.setLineWidth(0.3)
  doc.line(margin, y, margin + contentWidth, y)

  y += 5.5

  // --- 3. METADATA: GSTIN, TEL, VEHICLE NO, INVOICE NO ---
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(9)

  // Line 1: GSTIN (Left) and Phone (Right)
  doc.setFont('helvetica', 'bold')
  doc.text('GSTIN :- 32AHOPG1823G1ZP', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text('Tel :- 9446786175', pageWidth - margin, y, { align: 'right' })

  y += 5

  // Line 2: Vehicle No (Left) and Invoice No (Right)
  doc.setFont('helvetica', 'bold')
  const vNoText = `Vehicle No: ${vehicleNo && vehicleNo.trim() ? vehicleNo.trim() : 'N/A'}`
  const invNoText = `Invoice No :- ${invoiceNo && invoiceNo.trim() ? invoiceNo.trim() : 'N/A'}`
  doc.text(vNoText, margin, y)
  doc.text(invNoText, pageWidth - margin, y, { align: 'right' })

  // Generous spacing before Title
  y += 8.5

  // --- 4. TITLE ---
  const title = woodType === 'mahogany' ? 'MAHAGANI SIZES' : 'MANJIYAM SIZES'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(title, centerX, y, { align: 'center' })

  // Spacing before table
  y += 5

  // --- 5. TABLE DATA ---
  const tableHead = [
    [
      { content: 'Sl No', styles: { halign: 'center' } },
      { content: 'Item', styles: { halign: 'left' } },
      { content: 'Width', styles: { halign: 'center' } },
      { content: 'Thick', styles: { halign: 'center' } },
      { content: 'Length', styles: { halign: 'center' } },
      { content: 'Nos', styles: { halign: 'center' } },
      { content: 'Cft', styles: { halign: 'right' } },
    ],
  ]

  const tableBody = chartResult.rows.map((row) => [
    { content: String(row.slNo), styles: { halign: 'center' } },
    { content: String(row.item), styles: { halign: 'left' } },
    { content: String(row.width), styles: { halign: 'center' } },
    { content: String(row.thick), styles: { halign: 'center' } },
    { content: String(row.length), styles: { halign: 'center' } },
    { content: String(row.nos), styles: { halign: 'center', fontStyle: 'bold' } },
    { content: String(row.cftFormatted), styles: { halign: 'right', fontStyle: 'bold' } },
  ])

  // Table summary rows (matching authentic G.K. Saw Mill format)
  const tableFoot = [
    [
      { content: 'Total PCS', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: String(chartResult.totalNos), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(chartResult.actualTotalCft.toFixed(2)), styles: { halign: 'right', fontStyle: 'bold' } },
    ],
    [
      { content: `CBM:- ${chartResult.cbm.toFixed(2)}`, colSpan: 7, styles: { halign: 'center', fontStyle: 'bold' } },
    ],
  ]

  // Column width allocations (Total = 182 mm)
  // Sl No: 14mm, Item: 66mm, Width: 20mm, Thick: 20mm, Length: 20mm, Nos: 20mm, Cft: 22mm
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    head: tableHead,
    body: tableBody,
    foot: tableFoot,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2.3,
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
    },
    footStyles: {
      fillColor: [250, 250, 250],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
    },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 66 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 22 },
    },
  })

  // --- 6. FOOTER: SIGNATURE AREA ---
  let finalY = doc.lastAutoTable.finalY + 12
  const signatureX = pageWidth - margin - 45

  // Ensure signature does not overflow off the page when row count is large
  if (finalY + 25 > pageHeight - margin) {
    doc.addPage()
    finalY = margin + 15
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text('For G.K. Saw Mill', signatureX, finalY)

  doc.setFont('helvetica', 'bold')
  doc.text('Proprietor', signatureX + 4, finalY + 18)

  // Trigger browser download if requested
  if (save) {
    const cleanWood = woodType === 'mahogany' ? 'Mahagani' : 'Manjiyam'
    const cleanInv = invoiceNo && invoiceNo.trim() ? invoiceNo.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'Chart'
    const fileName = `${cleanWood}_Sizes_${cleanInv}_${chartResult.actualTotalCft.toFixed(0)}CFT.pdf`
    doc.save(fileName)
  }

  return doc
}
