import { jsPDF } from 'jspdf'
import { VATTA_STANDARD_ROWS, calculateVattaCalculations } from '../data/vattaStandardSizes.js'

/**
 * Generate A4 Portrait Measurement Sheet PDF for Vatta Wood Pencil Slats
 * Reproduces the authentic G.K. Saw Mill paper measurement sheet layout.
 * 
 * @param {Object} sheetData - Data object containing lorryRegNo, invoiceNo, passNo, date, place, bagQuantities
 * @param {boolean} [save=true] - Whether to trigger browser download
 * @returns {jsPDF} jsPDF instance
 */
export function generateVattaPdf(sheetData, save = true) {
  const {
    lorryRegNo = 'KL-58-D-1555',
    invoiceNo = 'A-20/2026-27',
    passNo = '140/2026-27',
    date = '',
    place = 'Nedumpana',
    bagQuantities = {},
  } = sheetData

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Format date as DD-MM-YYYY
  let displayDate = date
  if (!displayDate) {
    displayDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  } else if (displayDate.includes('-') && displayDate.split('-')[0].length === 4) {
    // If YYYY-MM-DD from HTML input
    const parts = displayDate.split('-')
    displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`
  }

  // Calculate row and grand totals
  const calcResult = calculateVattaCalculations(bagQuantities)

  const pageWidth = 210
  const pageHeight = 297
  const leftX = 18
  const rightX = 192
  const tableWidth = rightX - leftX // 174 mm
  const centerX = pageWidth / 2 // 105 mm

  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.35)

  // ==========================================
  // 1. HEADER SECTION (Centered)
  // ==========================================
  let curY = 28

  doc.setFont('times', 'bold')
  doc.setFontSize(16)
  doc.text('G.K.SAW MILL', centerX, curY, { align: 'center' })

  curY += 7.5
  doc.setFontSize(12)
  doc.text('KATTUR, NEDUMPANA,KOLLAM', centerX, curY, { align: 'center' })

  curY += 8.5
  doc.setFontSize(10.5)
  doc.text('MEASURMENT LIST OF" VATTA " WOOD PENCILS SLAT', centerX, curY, { align: 'center' })

  // ==========================================
  // 2. METADATA SECTION (Left & Right)
  // ==========================================
  curY += 15

  doc.setFont('times', 'normal')
  doc.setFontSize(10)

  // Left Side: Lorry Reg No, Invoice No, Pass No
  doc.text(`Lorry Reg No:-${lorryRegNo || ''}`, leftX, curY)
  // Right Side: Date
  doc.text(`Date:-${displayDate}`, rightX, curY, { align: 'right' })

  curY += 7
  // Format Invoice No & Pass No matching the sample:
  // "Invoice No: A-20/2026-27 Pass" with "No:-140/2026-27" on next line
  const invText = invoiceNo ? `Invoice No: ${invoiceNo} Pass` : 'Invoice No:'
  doc.text(invText, leftX, curY)
  // Right Side: Place
  doc.text(`Place: ${place || 'Nedumpana'}`, rightX, curY, { align: 'right' })

  curY += 7
  doc.text(`No:-${passNo || ''}`, leftX, curY)

  // ==========================================
  // 3. TABLE SECTION
  // ==========================================
  // Column definitions (Total width 174 mm):
  // Sl No (14), Item (24), Length (16), Width (16), Thickness (18),
  // Total Bags (17), Each Contains (18), Total Nos (25), Total CBM (26)
  const cols = {
    x0: leftX,       // 18
    x1: leftX + 14,  // 32  (Sl No)
    x2: leftX + 38,  // 56  (Item)
    x3: leftX + 54,  // 72  (Length)
    x4: leftX + 70,  // 88  (Width)
    x5: leftX + 88,  // 106 (Thickness / End of mm group)
    x6: leftX + 105, // 123 (Total Bags)
    x7: leftX + 123, // 141 (Each Contains)
    x8: leftX + 148, // 166 (Total Nos.)
    x9: rightX,      // 192 (Total Cubic Meter)
  }

  const tableTop = curY + 8
  const headerTopH = 6.5
  const headerSubH = 6.5
  const headerTotalH = headerTopH + headerSubH // 13 mm
  const rowH = 7.0
  const rowCount = 6
  const tableBottom = tableTop + headerTotalH + rowH * rowCount

  // Outer Box
  doc.rect(leftX, tableTop, tableWidth, tableBottom - tableTop)

  // Horizontal Header Lines
  doc.line(leftX, tableTop + headerTotalH, rightX, tableTop + headerTotalH)
  // Sub-header line under "Measurement in 'mm'" (cols.x2 to cols.x5)
  doc.line(cols.x2, tableTop + headerTopH, cols.x5, tableTop + headerTopH)

  // Vertical lines for each column
  doc.line(cols.x1, tableTop, cols.x1, tableBottom)
  doc.line(cols.x2, tableTop, cols.x2, tableBottom)
  // Sub-columns for length, width, thickness (only start at tableTop + headerTopH)
  doc.line(cols.x3, tableTop + headerTopH, cols.x3, tableBottom)
  doc.line(cols.x4, tableTop + headerTopH, cols.x4, tableBottom)
  doc.line(cols.x5, tableTop, cols.x5, tableBottom)
  doc.line(cols.x6, tableTop, cols.x6, tableBottom)
  doc.line(cols.x7, tableTop, cols.x7, tableBottom)
  doc.line(cols.x8, tableTop, cols.x8, tableBottom)

  // Row horizontal separator lines
  for (let i = 1; i <= rowCount; i++) {
    const y = tableTop + headerTotalH + i * rowH
    doc.line(leftX, y, rightX, y)
  }

  // --- HEADER TEXTS ---
  doc.setFont('times', 'normal')
  doc.setFontSize(9)

  // Sl No (centered vertically across both header rows)
  doc.text('Sl No', (cols.x0 + cols.x1) / 2, tableTop + 8, { align: 'center' })
  // Item
  doc.text('Item', (cols.x1 + cols.x2) / 2, tableTop + 8, { align: 'center' })

  // Grouped Header: Measurement in "mm"
  doc.text('Measurement in "mm"', (cols.x2 + cols.x5) / 2, tableTop + 4.5, { align: 'center' })
  // Sub-headers
  doc.setFontSize(8.5)
  doc.text('Length', (cols.x2 + cols.x3) / 2, tableTop + headerTopH + 4.5, { align: 'center' })
  doc.text('Width', (cols.x3 + cols.x4) / 2, tableTop + headerTopH + 4.5, { align: 'center' })
  doc.text('Thickness', (cols.x4 + cols.x5) / 2, tableTop + headerTopH + 4.5, { align: 'center' })

  // Total Bags
  doc.text('Total', (cols.x5 + cols.x6) / 2, tableTop + 5.0, { align: 'center' })
  doc.text('Bags', (cols.x5 + cols.x6) / 2, tableTop + 9.5, { align: 'center' })

  // Each Contains
  doc.text('Each', (cols.x6 + cols.x7) / 2, tableTop + 5.0, { align: 'center' })
  doc.text('Contains', (cols.x6 + cols.x7) / 2, tableTop + 9.5, { align: 'center' })

  // Total Nos.
  doc.text('Total', (cols.x7 + cols.x8) / 2, tableTop + 5.0, { align: 'center' })
  doc.text('Nos.', (cols.x7 + cols.x8) / 2, tableTop + 9.5, { align: 'center' })

  // Total Cubic Meter
  doc.text('Total', (cols.x8 + cols.x9) / 2, tableTop + 5.0, { align: 'center' })
  doc.text('Cubic Meter', (cols.x8 + cols.x9) / 2, tableTop + 9.5, { align: 'center' })

  // --- ROWS CONTENT ---
  doc.setFontSize(9)

  calcResult.rows.forEach((row, idx) => {
    const rY = tableTop + headerTotalH + idx * rowH + 4.8

    // 1. Sl No
    doc.text(String(row.slNo), (cols.x0 + cols.x1) / 2, rY, { align: 'center' })
    // 2. Item
    doc.text(row.item, (cols.x1 + cols.x2) / 2, rY, { align: 'center' })
    // 3. Length
    doc.text(String(row.length), (cols.x2 + cols.x3) / 2, rY, { align: 'center' })
    // 4. Width
    doc.text(String(row.width), (cols.x3 + cols.x4) / 2, rY, { align: 'center' })
    // 5. Thickness
    doc.text(Number(row.thickness).toFixed(1), (cols.x4 + cols.x5) / 2, rY, { align: 'center' })
    // 6. Total Bags
    doc.text(row.bags > 0 ? String(row.bags) : '0', (cols.x5 + cols.x6) / 2, rY, { align: 'center' })
    // 7. Each Contains
    doc.text(String(row.eachContains), (cols.x6 + cols.x7) / 2, rY, { align: 'center' })
    // 8. Total Nos.
    doc.text(String(row.totalPieces), (cols.x7 + cols.x8) / 2, rY, { align: 'center' })
    // 9. Total Cubic Meter (3 decimal places)
    doc.text(row.cbmFormatted, (cols.x8 + cols.x9) / 2, rY, { align: 'center' })
  })

  // ==========================================
  // 4. TOTALS ROW (Under the table columns)
  // ==========================================
  // In the original sheet, the totals line sits directly below the table:
  // Under Total Bags (cols.x5 to cols.x6), Total Nos (cols.x7 to cols.x8), and Total CBM (cols.x8 to cols.x9)
  const totalsTop = tableBottom + 4
  const totalsH = 6.0
  const totalsBottom = totalsTop + totalsH

  // Top line of totals block
  doc.line(cols.x5, totalsTop, cols.x6, totalsTop)
  doc.line(cols.x7, totalsTop, cols.x9, totalsTop)

  // Totals Numbers
  doc.setFont('times', 'normal')
  doc.setFontSize(9.5)
  doc.text(String(calcResult.grandTotalBags), (cols.x5 + cols.x6) / 2, totalsTop + 4.2, { align: 'center' })
  doc.text(String(calcResult.grandTotalPieces), (cols.x7 + cols.x8) / 2, totalsTop + 4.2, { align: 'center' })
  doc.text(calcResult.grandTotalCbmFormatted, (cols.x8 + cols.x9) / 2, totalsTop + 4.2, { align: 'center' })

  // Double underline below the totals (signature accounting style)
  doc.line(cols.x5, totalsBottom, cols.x6, totalsBottom)
  doc.line(cols.x5, totalsBottom + 0.7, cols.x6, totalsBottom + 0.7)

  doc.line(cols.x7, totalsBottom, cols.x9, totalsBottom)
  doc.line(cols.x7, totalsBottom + 0.7, cols.x9, totalsBottom + 0.7)

  // ==========================================
  // 5. SUMMARY STATEMENT BELOW TABLE
  // ==========================================
  const summaryY = totalsBottom + 12
  doc.setFont('times', 'normal')
  doc.setFontSize(9.5)
  doc.text(
    `Total: ${calcResult.grandTotalBags} Bags    ${calcResult.grandTotalPieces} Nos    ${calcResult.grandTotalCbmFormatted} C.Mtr.`,
    leftX + 2,
    summaryY
  )

  // ==========================================
  // 6. PROPRIETOR SIGNATURE BLOCK
  // ==========================================
  const sigY = summaryY + 16
  const sigX = rightX - 25 // Center of signature block on lower-right

  doc.setFont('times', 'normal')
  doc.setFontSize(11)
  doc.text('Proprietor', sigX, sigY, { align: 'center' })

  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.text('G.K. SAW MILL', sigX, sigY + 6.5, { align: 'center' })

  // Trigger download if requested
  if (save) {
    const cleanLorry = lorryRegNo ? lorryRegNo.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'Vatta'
    const fileName = `Vatta_Measurement_${cleanLorry}_${calcResult.grandTotalBags}Bags.pdf`
    doc.save(fileName)
  }

  return doc
}
