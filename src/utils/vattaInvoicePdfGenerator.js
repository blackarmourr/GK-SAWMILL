import { jsPDF } from 'jspdf'
import {
  formatIndianCurrency,
  formatDate
} from '../data/vattaInvoiceSettings.js'
import { formatInvoiceGrandTotalWords } from './numberToWords.js'

/**
 * Generate official FORM GST INVOICE - I for Vatta Wood Pencil Slats
 * Primary Reference: Form GST Invoice-I.pdf (benchmark invoice A-20)
 *
 * Fully fills the A4 portrait page with proportional vertical spacing,
 * clear dividing lines, and distinct separation above Bank Details.
 *
 * @param {Object} invoiceData - Full invoice details and calculations
 * @param {boolean} [save=true] - Whether to trigger immediate download
 * @returns {jsPDF} The jsPDF document instance
 */
export function generateVattaInvoicePdf(invoiceData, save = true) {
  const {
    // Seller header
    sellerName = 'G.K. SAW MILL',
    sellerAddressLine1 = 'KATOOR, NEDUMPANA-P.O,',
    sellerAddressLine2 = 'KOLLAM, KERALA -691576',
    telephone = '9446786175',
    email = 'anilkumarkottiyam175@gmail.com',
    sellerGstin = '32AHOPG1823G1ZP',

    // Upper info
    reverseCharge = '',
    invoiceNo = 'A-20',
    purchaseOrderNo = '',
    invoiceDate = '',
    dateOfSupply = '',
    state = 'KERALA',
    stateCode = '32',
    placeOfSupply = 'TAMILNADU',
    transportationMode = '',
    vehicleNo = 'KL-58-D-1555',

    // Receiver
    receiverName = '',
    receiverAddress = '',
    receiverPinNo = '',
    receiverMobileNo = '',
    receiverGstin = '',
    receiverState = '',
    receiverStateCode = '',

    // Despatched
    despatchedName = '',
    despatchedAddress = '',
    despatchedPinNo = '',
    despatchedMobileNo = '',
    despatchedGstin = '',
    despatchedState = '',
    despatchedStateCode = '',

    // Items & totals (from calculateVattaInvoiceTotals or invoiceData)
    lines = [],
    totalBags = 0,
    totalPieces = 0,
    subTotal = 0,
    discountVal = 0,
    taxableValue = 0,
    cgstRate = 0,
    cgstAmount = 0,
    sgstRate = 0,
    sgstAmount = 0,
    igstRate = 5,
    igstAmount = 0,
    roundOff = 0,
    grandTotal = 0,

    // Below table
    forestPassNo = '',
    totalMeasurement = '',
    ewayBillNo = '',

    // Additional charges & footer
    freight = '',
    insurance = '',
    packingCharge = '',
    bankDetails = '',
    accountNumber = '',
    branchIfsc = '',
    termsAndConditions = ''
  } = invoiceData

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const margin = 12
  const contentWidth = pageWidth - margin * 2 // 186 mm
  const midX = margin + contentWidth / 2      // 105 mm
  const rightEdge = margin + contentWidth     // 198 mm

  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.25)

  /* =========================================================================
     1. DOCUMENT HEADER (Top of Page)
     ========================================================================= */
  // Left: Business Title & Address
  doc.setFont('times', 'bold')
  doc.setFontSize(15.5)
  doc.text(sellerName, margin, 16.5)

  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  doc.text(sellerAddressLine1, margin, 21.5)
  doc.text(sellerAddressLine2, margin, 26.2)

  // Right: Telephone, Email, GST No
  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  doc.text(`Tele : ${telephone}`, rightEdge, 16.5, { align: 'right' })
  doc.text(`Email : ${email}`, rightEdge, 21.5, { align: 'right' })
  doc.text(`GST No: ${sellerGstin}`, rightEdge, 26.2, { align: 'right' })

  // Centered Title: FORM GST INVOICE-I
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('FORM GST INVOICE-I', pageWidth / 2, 33.8, { align: 'center' })

  /* =========================================================================
     2. UPPER INFORMATION SECTION (Boxed)
     ========================================================================= */
  const boxTop = 37.0
  const hasPo = Boolean(purchaseOrderNo && purchaseOrderNo.trim())
  // If PO is present: 26mm (5 rows); if absent: 22mm (4 rows)
  const upperHeight = hasPo ? 26.0 : 22.0

  // Outer border & center vertical divider
  doc.rect(margin, boxTop, contentWidth, upperHeight)
  doc.line(midX, boxTop, midX, boxTop + upperHeight)

  const leftTextX = margin + 2.5
  const rightTextX = midX + 2.5

  doc.setFont('times', 'normal')
  doc.setFontSize(8.8)

  if (hasPo) {
    // 5 Rows spaced gracefully at 4.9mm steps
    let curL = boxTop + 4.5
    let curR = boxTop + 4.5

    // Row 1
    const rcVal = reverseCharge !== undefined && reverseCharge !== null ? reverseCharge : ''
    doc.text(`Reverse Charge: ${rcVal ? rcVal : ''}`, leftTextX, curL)
    doc.text(`Transportation mode: ${transportationMode || ''}`, rightTextX, curR)

    // Row 2
    curL += 4.9
    curR += 4.9
    doc.setFont('times', 'bold')
    doc.text(`Invoice No : ${invoiceNo || ''}`, leftTextX, curL)
    doc.setFont('times', 'normal')
    doc.text(`Date of supply:- ${formatDate(dateOfSupply, '-')}`, rightTextX, curR)

    // Row 3: Purchase Order No
    curL += 4.9
    doc.text(`Purchase Order No : ${purchaseOrderNo.trim()}`, leftTextX, curL)
    doc.text(`Place of supply: ${placeOfSupply || ''}`, rightTextX, curR + 4.9)

    // Row 4: Invoice Date
    curL += 4.9
    doc.text(`Invoice Date :- ${formatDate(invoiceDate, '-')}`, leftTextX, curL)

    // Row 5: State & State Code
    curL += 4.9
    doc.text(`State: ${state || 'KERALA'}`, leftTextX, curL)
    doc.text(`State code: ${stateCode || '32'}`, midX - 2.5, curL, { align: 'right' })
  } else {
    // 4 Rows spaced gracefully at 5.2mm steps
    let curL = boxTop + 4.6
    let curR = boxTop + 4.6

    // Row 1
    const rcVal = reverseCharge !== undefined && reverseCharge !== null ? reverseCharge : ''
    doc.text(`Reverse Charge: ${rcVal ? rcVal : ''}`, leftTextX, curL)
    doc.text(`Transportation mode: ${transportationMode || ''}`, rightTextX, curR)

    // Row 2
    curL += 5.2
    curR += 5.2
    doc.setFont('times', 'bold')
    doc.text(`Invoice No : ${invoiceNo || ''}`, leftTextX, curL)
    doc.setFont('times', 'normal')
    doc.text(`Date of supply:- ${formatDate(dateOfSupply, '-')}`, rightTextX, curR)

    // Row 3
    curL += 5.2
    curR += 5.2
    doc.text(`Invoice Date :- ${formatDate(invoiceDate, '-')}`, leftTextX, curL)
    doc.text(`Place of supply: ${placeOfSupply || ''}`, rightTextX, curR)

    // Row 4
    curL += 5.2
    doc.text(`State: ${state || 'KERALA'}`, leftTextX, curL)
    doc.text(`State code: ${stateCode || '32'}`, midX - 2.5, curL, { align: 'right' })
  }

  /* =========================================================================
     3. PARTY DETAILS: DETAILS OF RECEIVER & DETAILS OF DESPATCHED
     ========================================================================= */
  const partyTop = boxTop + upperHeight
  const partyHeight = 46.0

  doc.rect(margin, partyTop, contentWidth, partyHeight)
  doc.line(midX, partyTop, midX, partyTop + partyHeight)

  // Header Bar
  const partyHeadH = 6.2
  doc.line(margin, partyTop + partyHeadH, rightEdge, partyTop + partyHeadH)
  doc.setFont('times', 'bold')
  doc.setFontSize(9.5)
  doc.text('Details of Receiver', (margin + midX) / 2, partyTop + 4.4, { align: 'center' })
  doc.text('Details of Despatched', (midX + rightEdge) / 2, partyTop + 4.4, { align: 'center' })

  // Receiver (Left Column)
  let rY = partyTop + partyHeadH + 4.5
  const maxRecW = (midX - 2.5) - (leftTextX + 18) // 70 mm strictly within left column
  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  doc.text('Name', leftTextX, rY)
  const rNameLines = doc.splitTextToSize((receiverName || '').trim(), maxRecW)
  rNameLines.forEach((line, i) => {
    doc.text(line, leftTextX + 18, rY + (i * 4.0))
  })
  rY += Math.max(4.5, rNameLines.length * 4.0)

  doc.text('Address', leftTextX, rY)
  doc.setFont('times', 'normal')
  const rAddrParagraphs = (receiverAddress || '').replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  const rWrappedLines = []
  rAddrParagraphs.forEach((para) => {
    const lines = doc.splitTextToSize(para.trim(), maxRecW)
    lines.forEach((l) => rWrappedLines.push(l))
  })
  if (receiverPinNo && !receiverAddress.includes(receiverPinNo)) {
    rWrappedLines.push(`Pin No:- ${receiverPinNo}`)
  }

  // Receiver bottom meta (Mobile No, GSTI, State)
  const recBottomY = partyTop + partyHeight - 2.5
  const maxRecAllowedY = recBottomY - 12.0
  rWrappedLines.forEach((line) => {
    if (rY <= maxRecAllowedY) {
      doc.text(line, leftTextX + 18, rY)
      rY += 3.8
    }
  })

  doc.setFont('times', 'bold')
  if (receiverMobileNo) {
    doc.text(`Mobile No: ${receiverMobileNo}`, leftTextX, recBottomY - 9.0)
  } else {
    doc.text('Mobile No:', leftTextX, recBottomY - 9.0)
  }
  doc.text('GSTI', leftTextX, recBottomY - 4.6)
  doc.text(receiverGstin || '', leftTextX + 18, recBottomY - 4.6)

  doc.text(`State    ${receiverState || ''}`, leftTextX, recBottomY)
  doc.text(`State code:${receiverStateCode || ''}`, midX - 2.5, recBottomY, { align: 'right' })

  // Despatched (Right Column)
  let dY = partyTop + partyHeadH + 4.5
  const maxDispW = (rightEdge - 2.5) - rightTextX // 88 mm strictly within right column
  doc.setFont('times', 'bold')
  const dNameLines = doc.splitTextToSize((despatchedName || '').trim(), maxDispW)
  dNameLines.forEach((line, i) => {
    doc.text(line, rightTextX, dY + (i * 4.0))
  })
  dY += Math.max(4.5, dNameLines.length * 4.0)

  doc.setFont('times', 'normal')
  const dAddrParagraphs = (despatchedAddress || '').replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  const dWrappedLines = []
  dAddrParagraphs.forEach((para) => {
    const lines = doc.splitTextToSize(para.trim(), maxDispW)
    lines.forEach((l) => dWrappedLines.push(l))
  })
  if (despatchedPinNo && !despatchedAddress.includes(despatchedPinNo)) {
    dWrappedLines.push(`Pin No:- ${despatchedPinNo}`)
  }

  const dispBottomY = partyTop + partyHeight - 2.5
  const maxDispAllowedY = dispBottomY - 8.0
  dWrappedLines.forEach((line) => {
    if (dY <= maxDispAllowedY) {
      doc.text(line, rightTextX, dY)
      dY += 3.8
    }
  })

  // Despatched bottom meta (GSTN, STATE, State Code)
  doc.setFont('times', 'bold')
  doc.text(`GSTN:-  ${despatchedGstin || ''}`, rightTextX, dispBottomY - 4.6)
  doc.text(`STATE :- ${despatchedState || ''}`, rightTextX, dispBottomY)
  doc.text(`State code:${despatchedStateCode || ''}`, rightEdge - 2.5, dispBottomY, { align: 'right' })

  /* =========================================================================
     4. VEHICLE SECTION
     ========================================================================= */
  const vehTop = partyTop + partyHeight
  const vehHeight = 6.8

  doc.rect(margin, vehTop, contentWidth, vehHeight)
  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  doc.text(`VEHICLE NO:- ${vehicleNo || ''}`, pageWidth / 2, vehTop + 4.7, { align: 'center' })

  /* =========================================================================
     5. PRODUCT TABLE
     ========================================================================= */
  const tableTop = vehTop + vehHeight
  // Column definitions across 186mm content width
  const colX = [
    margin,        // Items start (12)
    margin + 17,   // Bags start (29)
    margin + 31,   // Description start (43)
    margin + 88,   // HSN start (100)
    margin + 107,  // Qty in Bags start (119)
    margin + 126,  // Unit Price start (138)
    margin + 143,  // Rate start (155)
    margin + 155,  // Value start (167)
    rightEdge      // End (198)
  ]

  const headerH = 6.5
  doc.rect(margin, tableTop, contentWidth, headerH)
  for (let i = 1; i < colX.length - 1; i++) {
    doc.line(colX[i], tableTop, colX[i], tableTop + headerH)
  }

  doc.setFont('times', 'bold')
  doc.setFontSize(8.8)
  doc.text('Items', (colX[0] + colX[1]) / 2, tableTop + 4.5, { align: 'center' })
  doc.text('Bags', (colX[1] + colX[2]) / 2, tableTop + 4.5, { align: 'center' })
  doc.text('Description of Goods', (colX[2] + colX[3]) / 2, tableTop + 4.5, { align: 'center' })
  doc.text('HSN Code', (colX[3] + colX[4]) / 2, tableTop + 4.5, { align: 'center' })
  doc.text('Qty in Bags', (colX[4] + colX[5]) / 2, tableTop + 4.5, { align: 'center' })
  doc.text('Unit Price', (colX[5] + colX[6]) / 2, tableTop + 4.5, { align: 'center' })
  doc.text('Rate', (colX[6] + colX[7]) / 2, tableTop + 4.5, { align: 'center' })
  doc.text('Value', (colX[7] + colX[8]) / 2, tableTop + 4.5, { align: 'center' })

  // Subheader inside table: "To the Value of First Quality / " Vatta " Wood Pencils Slats"
  const subHeadTop = tableTop + headerH
  const subHeadHeight = 9.2
  doc.rect(margin, subHeadTop, contentWidth, subHeadHeight)
  for (let i = 1; i < colX.length - 1; i++) {
    doc.line(colX[i], subHeadTop, colX[i], subHeadTop + subHeadHeight)
  }
  doc.setFont('times', 'bold')
  doc.setFontSize(8.2)
  doc.text('To the Value of First Quality', (colX[2] + colX[3]) / 2, subHeadTop + 3.8, { align: 'center' })
  doc.text('" Vatta " Wood Pencils Slats', (colX[2] + colX[3]) / 2, subHeadTop + 7.6, { align: 'center' })

  // 6 Standard Ply Product Rows (Expanded to 6.8mm each for generous readability)
  let curRowTop = subHeadTop + subHeadHeight
  const rowHeight = 6.8

  lines.forEach((l) => {
    doc.rect(margin, curRowTop, contentWidth, rowHeight)
    for (let i = 1; i < colX.length - 1; i++) {
      doc.line(colX[i], curRowTop, colX[i], curRowTop + rowHeight)
    }

    const midY = curRowTop + 4.6
    doc.setFont('times', 'normal')
    doc.setFontSize(8.5)

    // Items (e.g. "8 - Ply")
    doc.text(l.item, (colX[0] + colX[1]) / 2, midY, { align: 'center' })

    // Bags (e.g. 185)
    doc.text(l.bags > 0 ? String(l.bags) : '', (colX[1] + colX[2]) / 2, midY, { align: 'center' })

    // Description (e.g. "186 x 77 x 5.5 mm-900 Nos per Bag")
    doc.text(l.description, colX[2] + 2.5, midY)

    // HSN Code
    doc.text(l.hsnCode, (colX[3] + colX[4]) / 2, midY, { align: 'center' })

    // Qty in Bags (Pieces)
    doc.text(l.pieces > 0 ? String(l.pieces) : '', (colX[4] + colX[5]) / 2, midY, { align: 'center' })

    // Unit Price (e.g. 2,925.00)
    doc.text(l.unitPricePer1000 ? formatIndianCurrency(l.unitPricePer1000) : '', colX[6] - 2.5, midY, { align: 'right' })

    // Rate (e.g. 5%)
    doc.text(l.gstRate ? `${l.gstRate}%` : '5%', (colX[6] + colX[7]) / 2, midY, { align: 'center' })

    // Line Value
    doc.text(l.lineValue > 0 ? formatIndianCurrency(l.lineValue) : '', colX[8] - 2.5, midY, { align: 'right' })

    curRowTop += rowHeight
  })

  // Table Totals Row (Total Bags & Total Pieces)
  const totalRowTop = curRowTop
  const totalRowH = 6.5
  doc.rect(margin, totalRowTop, contentWidth, totalRowH)
  for (let i = 1; i < colX.length - 1; i++) {
    doc.line(colX[i], totalRowTop, colX[i], totalRowTop + totalRowH)
  }

  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  // Total Bags
  doc.text(totalBags > 0 ? String(totalBags) : '', (colX[1] + colX[2]) / 2, totalRowTop + 4.5, { align: 'center' })
  // Total Pieces
  doc.text(totalPieces > 0 ? String(totalPieces) : '', (colX[4] + colX[5]) / 2, totalRowTop + 4.5, { align: 'center' })

  /* =========================================================================
     6. BELOW TABLE: SPLIT SECTION (Forest Pass, Charges, Bank / Financials)
     ========================================================================= */
  const splitTop = totalRowTop + totalRowH
  const splitColX = colX[5] // 138mm: financial summary table starts here
  const splitHeight = 56.0  // Expanded from 46.5mm to comfortably fill the lower page

  doc.rect(margin, splitTop, contentWidth, splitHeight)
  doc.line(splitColX, splitTop, splitColX, splitTop + splitHeight)

  // --- Left Sub-Block: Forest Pass, E-Way Bill & Charges ---
  let leftY = splitTop + 4.6
  doc.setFont('times', 'italic')
  doc.setFontSize(8.5)
  doc.text(`Forest Pass No:- ${forestPassNo || ''}`, leftTextX + 12, leftY)

  leftY += 4.8
  doc.text(`Total Measurment:- ${totalMeasurement || ''}`, leftTextX + 12, leftY)

  leftY += 4.8
  doc.setFont('times', 'bold')
  doc.text(`EWAY BILL No :- ${ewayBillNo || ''}`, leftTextX + 12, leftY)

  // 1. Divider line below Forest Pass & E-Way Bill block (at 17.5mm)
  const line1Y = splitTop + 17.5
  doc.line(margin, line1Y, splitColX, line1Y)

  // Charges Section on Left
  let feeY = line1Y + 3.8
  doc.setFont('times', 'normal')
  doc.setFontSize(8.2)
  doc.text(`Freight ${freight ? `: ₹${formatIndianCurrency(freight)}` : ''}`, leftTextX, feeY)
  feeY += 4.0
  doc.text(`Insurance ${insurance ? `: ₹${formatIndianCurrency(insurance)}` : ''}`, leftTextX, feeY)
  feeY += 4.0
  doc.text(`Packing & Forwading Charge ${packingCharge ? `: ₹${formatIndianCurrency(packingCharge)}` : ''}`, leftTextX, feeY)

  // 2. CRITICAL USER REQUIREMENT:
  // "Also, try to put a line above the bank details to separate the bank details with that above thing."
  const bankLineY = splitTop + 31.0
  doc.line(margin, bankLineY, splitColX, bankLineY)

  // Bank Details Section on Left
  let bankY = bankLineY + 4.0
  doc.setFont('times', 'bold')
  doc.setFontSize(8.5)
  doc.text(`Bank Details ${bankDetails ? `: ${bankDetails}` : ''}`, leftTextX, bankY)
  bankY += 4.0
  doc.setFont('times', 'normal')
  doc.text(`Account Number ${accountNumber ? `: ${accountNumber}` : ''}`, leftTextX, bankY)
  bankY += 4.0
  doc.text(`Branch IFSC ${branchIfsc ? `: ${branchIfsc}` : ''}`, leftTextX, bankY)

  // 3. Terms & Conditions and Authorised Signatory bar
  const termsTop = splitTop + 45.0
  doc.line(margin, termsTop, splitColX, termsTop)

  doc.setFont('times', 'bold')
  doc.setFontSize(8)
  doc.text('Terms and Conditions:', leftTextX, termsTop + 4.5)

  // Authorised Signatory vertical block
  const signColX = margin + 85
  doc.line(signColX, termsTop, signColX, splitTop + splitHeight)
  doc.text('Authorised Signatory', (signColX + splitColX) / 2, termsTop + 4.2, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.text('(with status & seal)', (signColX + splitColX) / 2, termsTop + 8.0, { align: 'center' })

  // --- Right Sub-Block: Financial Summary Grid (8 rows × 7.0mm = 56.0mm) ---
  const finRowH = splitHeight / 8 // Exactly 7.0mm per financial row
  const valColX = rightEdge - 28  // Divider between label & amount
  doc.line(valColX, splitTop, valColX, splitTop + splitHeight)

  const finRows = [
    { label: 'Sub Total', value: formatIndianCurrency(subTotal) },
    { label: 'Discount', value: discountVal > 0 ? formatIndianCurrency(discountVal) : '' },
    { label: 'Taxable Value', value: formatIndianCurrency(taxableValue) },
    {
      label: cgstRate > 0 ? `CGST Rate ${cgstRate}%` : 'CGST Rate',
      amtLabel: 'Amt.',
      value: cgstAmount > 0 ? formatIndianCurrency(cgstAmount) : ''
    },
    {
      label: sgstRate > 0 ? `SGST Rate ${sgstRate}%` : 'SGST Rate',
      amtLabel: 'Amt.',
      value: sgstAmount > 0 ? formatIndianCurrency(sgstAmount) : ''
    },
    {
      label: igstRate > 0 ? `IGST Rate ${igstRate}%` : 'IGST Rate',
      amtLabel: 'Amt.',
      value: igstAmount > 0 ? formatIndianCurrency(igstAmount) : ''
    },
    { label: 'Round off', value: roundOff !== 0 ? (roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)) : '' },
    { label: 'GRANT TOTAL', value: formatIndianCurrency(grandTotal), isBold: true }
  ]

  finRows.forEach((r, idx) => {
    const rowY = splitTop + (idx * finRowH)
    if (idx > 0) {
      doc.line(splitColX, rowY, rightEdge, rowY)
    }

    const midTextY = rowY + (finRowH / 2) + 1.2
    doc.setFont('times', r.isBold ? 'bold' : 'normal')
    doc.setFontSize(r.isBold ? 9 : 8.5)

    // Left label in financial cell
    doc.text(r.label, splitColX + 2.5, midTextY)

    // Optional Amt. label
    if (r.amtLabel) {
      doc.text(r.amtLabel, valColX - 2.5, midTextY, { align: 'right' })
    }

    // Right amount value
    doc.text(r.value || '', rightEdge - 2.5, midTextY, { align: 'right' })
  })

  /* =========================================================================
     7. GRAND TOTAL IN WORDS
     ========================================================================= */
  const wordsTop = splitTop + splitHeight
  const wordsHeight = 7.5
  doc.rect(margin, wordsTop, contentWidth, wordsHeight)

  doc.setFont('times', 'normal')
  doc.setFontSize(8.5)
  const grandWords = formatInvoiceGrandTotalWords(grandTotal)
  doc.text(`Grand Total In words:- ${grandWords}`, leftTextX, wordsTop + 5.0)

  /* =========================================================================
     8. FOOTER COPIES STRIP & REVERSE CHARGE
     ========================================================================= */
  const footerStripTop = wordsTop + wordsHeight
  const footerStripH = 7.0
  doc.rect(margin, footerStripTop, contentWidth, footerStripH)

  doc.setFont('times', 'normal')
  doc.setFontSize(8.5)
  doc.text('Orginal for Recipient, Duplicate for Transporter, Triplicate for Supplier', leftTextX, footerStripTop + 4.7)
  doc.text('GST Payable on Reverse Charge', rightEdge - 2.5, footerStripTop + 4.7, { align: 'right' })

  /* =========================================================================
     9. OUTSIDE BOTTOM: FOR G.K. SAW MILL & PROPRIETOR
     ========================================================================= */
  const signTop = footerStripTop + footerStripH + 7.5
  doc.setFont('times', 'bolditalic')
  doc.setFontSize(11)
  doc.text('For .G.K. Saw Mill', rightEdge - 6, signTop, { align: 'right' })

  doc.setFont('times', 'bold')
  doc.setFontSize(10)
  doc.text('Proprietor', rightEdge - 12, signTop + 16.5, { align: 'right' })

  // Trigger download if requested
  if (save) {
    const filename = `Vatta_Invoice_${(invoiceNo || 'Draft').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
    doc.save(filename)
  }

  return doc
}
