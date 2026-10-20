import { jsPDF } from 'jspdf'
import { convertNumberToIndianWords } from './numberToWords.js'

/**
 * Generate official FORM GST INVOICE - I for G.K. Saw Mill
 * 
 * Recreates the exact authentic A-19 invoice layout:
 * - Header with business details on left, GSTIN/Tel/Email on right
 * - FORM GST INVOICE - I title
 * - Boxed invoice details & side-by-side Receiver/Dispatched blocks
 * - Goods table with Mahogany & Manjiyam rows, CBM qty & E-way Bill
 * - Charges, Bank details, Terms, and GST breakdown
 * - Grand total in words, copies footer, and proprietor signature block
 * 
 * @param {Object} invoiceData - Complete invoice state
 * @param {boolean} [save=true] - Whether to trigger browser download
 * @returns {jsPDF} Document instance
 */
export function generateInvoicePdf(invoiceData, save = true) {
  const {
    // Business header
    businessName = 'G.K. SAW MILL',
    addressLine1 = 'KATOOR, NEDUMPANA - P.O.,',
    addressLine2 = 'KOLLAM, KERALA - 691576',
    telephone = '9446786175',
    email = 'anilkumarkottiyam175@gmail.com',
    gstin = '32AHOPG1823G1ZP',

    // Invoice details
    reverseCharge = '',
    invoiceNo = 'A-19',
    invoiceDate = '01-10-2026',
    state = 'Kerala',
    stateCode = '32',
    transportationMode = '',
    vehicleNo = 'KL-02-AN-7779',
    dateOfSupply = '01-10-2026',
    placeOfSupply = 'Tamil Nadu',

    // Receiver details
    receiverName = 'SREE AMMAN TRADERS',
    receiverAddress = '15, Solaialagupuram Ist Street\n25 Solaialagupuram Main Road\nJAIHINDPURAM\nMADURAI, TAMILNADU -625011',
    receiverGstin = '33JYGPK7174A1ZF',
    receiverState = 'Tamil Nadu',
    receiverStateCode = '33',

    // Dispatched details
    dispatchedDetails = '',

    // Goods
    mahoganyEnabled = true,
    mahoganyDesc = 'Mahogany Rejected size\nAll size',
    mahoganyHsn = '4407',
    mahoganyRate = 215,
    mahoganyTaxableValue = 99975,

    manjiyamEnabled = true,
    manjiyamDesc = 'Manjiyam Rejected Size\nAll size',
    manjiyamHsn = '4407',
    manjiyamRate = 210,
    manjiyamTaxableValue = 25200,

    ewayBillNo = '5720 8197 3570',

    // Tax settings
    taxTreatment = 'IGST', // 'IGST' | 'CGST_SGST'
    gstRate = 18,

    // Additional charges
    freight = '',
    insurance = '',
    packingCharge = '',

    // Bank & Terms
    bankDetails = '',
    accountNumber = '',
    branchIfsc = '',
    termsAndConditions = '',

    discount = '',
    roundOff = 0,
    cbmOverride = '',
  } = invoiceData

  // 1. Calculations
  const mahogVal = mahoganyEnabled && Number(mahoganyTaxableValue) > 0 ? Number(mahoganyTaxableValue) : 0
  const mahogR = Number(mahoganyRate) > 0 ? Number(mahoganyRate) : 215
  const mahogCft = mahogVal > 0 ? mahogVal / mahogR : 0

  const manjVal = manjiyamEnabled && Number(manjiyamTaxableValue) > 0 ? Number(manjiyamTaxableValue) : 0
  const manjR = Number(manjiyamRate) > 0 ? Number(manjiyamRate) : 210
  const manjCft = manjVal > 0 ? manjVal / manjR : 0

  const totalCft = mahogCft + manjCft
  const autoCbm = totalCft * 0.0283168466
  const totalCbm = cbmOverride !== undefined && cbmOverride !== '' && !isNaN(parseFloat(cbmOverride))
    ? parseFloat(cbmOverride)
    : autoCbm

  const subTotal = mahogVal + manjVal
  const discountVal = Number(discount) > 0 ? Number(discount) : 0
  const taxableValue = subTotal - discountVal

  let cgstRate = 0, cgstAmount = 0
  let sgstRate = 0, sgstAmount = 0
  let igstRate = 0, igstAmount = 0

  if (taxTreatment === 'CGST_SGST') {
    cgstRate = gstRate / 2
    sgstRate = gstRate / 2
    cgstAmount = (taxableValue * cgstRate) / 100
    sgstAmount = (taxableValue * sgstRate) / 100
  } else {
    igstRate = gstRate
    igstAmount = (taxableValue * igstRate) / 100
  }

  const freightVal = Number(freight) > 0 ? Number(freight) : 0
  const insVal = Number(insurance) > 0 ? Number(insurance) : 0
  const packVal = Number(packingCharge) > 0 ? Number(packingCharge) : 0
  const totalGst = cgstAmount + sgstAmount + igstAmount

  let calculatedGrandTotal = taxableValue + totalGst + freightVal + insVal + packVal
  let finalRoundOff = Number(roundOff) || 0

  // If user selected automatic rounding to nearest rupee
  if (invoiceData.roundingMode === 'nearest_rupee') {
    const rounded = Math.round(calculatedGrandTotal)
    finalRoundOff = Number((rounded - calculatedGrandTotal).toFixed(2))
    calculatedGrandTotal = rounded
  } else {
    calculatedGrandTotal = calculatedGrandTotal + finalRoundOff
  }

  const grandTotalWords = convertNumberToIndianWords(calculatedGrandTotal)

  // 2. Initialize PDF Document (A4 portrait: 210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const margin = 12
  const pageWidth = 210
  const contentWidth = pageWidth - margin * 2 // 186 mm
  const midX = margin + contentWidth / 2 // 105 mm

  // Helper formatting numbers with commas (matching A-19 e.g. 125,175.00)
  const formatAmt = (num) => {
    if (num === '' || num === null || num === undefined || isNaN(num)) return ''
    return Number(num).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // --- HEADER SECTION ---
  doc.setTextColor(0, 0, 0)
  
  // Left: Business info (Serif matching original invoice)
  doc.setFont('times', 'bold')
  doc.setFontSize(15)
  doc.text(businessName, margin, 18)

  doc.setFont('times', 'bold')
  doc.setFontSize(8.5)
  doc.text(addressLine1, margin, 23)
  doc.text(addressLine2, margin, 27)

  // Right: Contact info
  const rightX = margin + contentWidth
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(`Tel :- ${telephone}`, rightX, 18, { align: 'right' })
  doc.text(`E-mail :- ${email}`, rightX, 22.5, { align: 'right' })
  doc.text(`GSTIN :- ${gstin}`, rightX, 27, { align: 'right' })

  // Center Title
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('FORM GST INVOICE - I', pageWidth / 2, 33, { align: 'center' })

  // --- MAIN BOUNDED BOX ---
  const boxTop = 36
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)

  // Section 1: Top Metadata Grid (y = 36 to 56, height = 20)
  const metaHeight = 20
  doc.rect(margin, boxTop, contentWidth, metaHeight)
  doc.line(midX, boxTop, midX, boxTop + metaHeight)

  doc.setFontSize(8)
  const lX = margin + 2
  const rX = midX + 2

  // Left Column Metadata
  doc.setFont('helvetica', 'normal')
  doc.text(`Reverse Charge :- ${reverseCharge || ''}`, lX, boxTop + 4.2)
  doc.setFont('helvetica', 'bold')
  doc.text(`Invoice No :- ${invoiceNo || ''}`, lX, boxTop + 8.8)
  doc.text(`Invoice Date : ${invoiceDate || ''}`, lX, boxTop + 13.4)
  doc.text(`State :- ${state || ''}`, lX, boxTop + 18)
  doc.text(`State code :- ${stateCode || ''}`, midX - 2, boxTop + 18, { align: 'right' })

  // Right Column Metadata
  doc.setFont('helvetica', 'normal')
  doc.text(`Transportation mode :- ${transportationMode || ''}`, rX, boxTop + 4.2)
  doc.setFont('helvetica', 'bold')
  doc.text(`Vehicle No :- ${vehicleNo || ''}`, rX, boxTop + 8.8)
  doc.text(`Date of supply :- ${dateOfSupply || ''}`, rX, boxTop + 13.4)
  doc.text(`Place of supply :- ${placeOfSupply || ''}`, rX, boxTop + 18)

  // Section 2: Details of Receiver & Dispatched (y = 56 to 97, height = 41)
  const recTop = boxTop + metaHeight
  const recHeight = 41
  doc.rect(margin, recTop, contentWidth, recHeight)
  doc.line(midX, recTop, midX, recTop + recHeight)

  // Sub headers
  const subHeadH = 5
  doc.line(margin, recTop + subHeadH, margin + contentWidth, recTop + subHeadH)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('Details of Receiver', (margin + midX) / 2, recTop + 3.8, { align: 'center' })
  doc.text('Details of Dispatched', (midX + rightX) / 2, recTop + 3.8, { align: 'center' })

  // Receiver Data
  doc.setFontSize(8)
  let recY = recTop + 9
  doc.setFont('helvetica', 'bold')
  doc.text('Name :-', lX, recY)
  doc.text(receiverName || '', lX + 13, recY)

  recY += 4.2
  doc.text('Address :-', lX, recY)
  doc.setFont('helvetica', 'normal')
  const addrLines = (receiverAddress || '').split('\n')
  addrLines.forEach((line, idx) => {
    doc.text(line.trim(), lX + 16, recY + idx * 3.8)
  })

  const recBottomY = recTop + recHeight - 2.5
  doc.setFont('helvetica', 'bold')
  doc.text(`GSTIN :-   ${receiverGstin || ''}`, lX, recBottomY - 4.2)
  doc.text(`State :- ${receiverState || ''}`, lX, recBottomY)
  doc.text(`State code :-  ${receiverStateCode || ''}`, midX - 2, recBottomY, { align: 'right' })

  // Dispatched Data
  if (dispatchedDetails) {
    doc.setFont('helvetica', 'normal')
    const dispLines = dispatchedDetails.split('\n')
    dispLines.forEach((line, idx) => {
      doc.text(line.trim(), rX, recTop + 9 + idx * 3.8)
    })
  }

  // Section 3: Goods Table Header & Rows
  // Columns aligned with original template proportions:
  // Sl No (14mm), Desc (70mm), HSN (24mm), Qty (24mm), Rate (24mm), Value (30mm)
  const c1 = margin + 14  // 26 mm
  const c2 = margin + 84  // 96 mm
  const c3 = margin + 108 // 120 mm
  const c4 = margin + 132 // 144 mm
  const c5 = margin + 156 // 168 mm

  const tableTop = recTop + recHeight
  const tblHeadH = 6
  const goodsBodyH = 50
  const sepRowH = 4.5
  const tableHeight = tblHeadH + goodsBodyH + sepRowH // 60.5 mm

  doc.rect(margin, tableTop, contentWidth, tableHeight)
  doc.line(margin, tableTop + tblHeadH, rightX, tableTop + tblHeadH)
  doc.line(margin, tableTop + tblHeadH + goodsBodyH, rightX, tableTop + tblHeadH + goodsBodyH)

  // Header vertical lines throughout goods table
  doc.line(c1, tableTop, c1, tableTop + tableHeight)
  doc.line(c2, tableTop, c2, tableTop + tableHeight)
  doc.line(c3, tableTop, c3, tableTop + tableHeight)
  doc.line(c4, tableTop, c4, tableTop + tableHeight)
  doc.line(c5, tableTop, c5, tableTop + tableHeight)

  // Header Texts
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Sl. No.', (margin + c1) / 2, tableTop + 4.2, { align: 'center' })
  doc.text('Description of Goods', (c1 + c2) / 2, tableTop + 4.2, { align: 'center' })
  doc.text('HSN Code', (c2 + c3) / 2, tableTop + 4.2, { align: 'center' })
  doc.text('Qty (CFT)', (c3 + c4) / 2, tableTop + 4.2, { align: 'center' })
  doc.text('Rate', (c4 + c5) / 2, tableTop + 4.2, { align: 'center' })
  doc.text('Value', (c5 + rightX) / 2, tableTop + 4.2, { align: 'center' })

  // Goods Rows
  let curItemY = tableTop + tblHeadH + 6
  let rowIdx = 1

  // Item 1: Mahogany
  if (mahoganyEnabled && mahogVal > 0) {
    doc.setFont('helvetica', 'normal')
    doc.text(String(rowIdx), (margin + c1) / 2, curItemY, { align: 'center' })
    
    doc.setFont('helvetica', 'italic')
    const descL = mahoganyDesc.split('\n')
    doc.text(descL[0] || 'Mahogany Rejected size', c1 + 2, curItemY)
    if (descL[1]) doc.text(descL[1], c1 + 2, curItemY + 4)
    
    doc.setFont('helvetica', 'normal')
    doc.text(String(mahoganyHsn), (c2 + c3) / 2, curItemY, { align: 'center' })
    doc.text(formatAmt(mahogCft), c4 - 2, curItemY, { align: 'right' })
    doc.text(formatAmt(mahogR), c5 - 2, curItemY, { align: 'right' })
    doc.text(formatAmt(mahogVal), rightX - 2, curItemY, { align: 'right' })
    
    curItemY += 13
    rowIdx++
  }

  // Item 2: Manjiyam
  if (manjiyamEnabled && manjVal > 0) {
    doc.setFont('helvetica', 'normal')
    doc.text(String(rowIdx), (margin + c1) / 2, curItemY, { align: 'center' })
    
    doc.setFont('helvetica', 'italic')
    const descL = manjiyamDesc.split('\n')
    doc.text(descL[0] || 'Manjiyam Rejected Size', c1 + 2, curItemY)
    if (descL[1]) doc.text(descL[1], c1 + 2, curItemY + 4)
    
    doc.setFont('helvetica', 'normal')
    doc.text(String(manjiyamHsn), (c2 + c3) / 2, curItemY, { align: 'center' })
    doc.text(formatAmt(manjCft), c4 - 2, curItemY, { align: 'right' })
    doc.text(formatAmt(manjR), c5 - 2, curItemY, { align: 'right' })
    doc.text(formatAmt(manjVal), rightX - 2, curItemY, { align: 'right' })
    
    curItemY += 13
    rowIdx++
  }

  // Volume & E-Way Bill in description area (matching sample invoice)
  doc.setFont('helvetica', 'bold')
  doc.text(`(Qty in CBM :-${totalCbm.toFixed(2)})`, c1 + 2, curItemY + 2)
  if (ewayBillNo && ewayBillNo.trim()) {
    doc.text(`EWAY BILL :- ${ewayBillNo.trim()}`, c1 + 2, curItemY + 7)
  }

  // --- SECTION 4: EXACT ORIGINAL INVOICE CHARGES, BANK & TOTALS ---
  // Reconstructs the exact multi-cell grid from original G.K. Saw Mill Invoice
  const botTop = tableTop + tableHeight
  const rowH = 5.2

  const y0 = botTop
  const y1 = y0 + rowH // Row 1 bottom: Freight / Sub Total
  const y2 = y1 + rowH // Row 2 bottom: Insurance / Discount
  const y3 = y2 + rowH // Row 3 bottom: Packing / TaxableValue
  const y4 = y3 + rowH // Row 4 bottom: Bank Details / CGST Rate
  const y5 = y4 + rowH // Row 5 bottom: Account Number / SGST Rate
  const y6 = y5 + rowH // Row 6 bottom: Branch IFSC / IGST Rate
  const y7 = y6 + rowH // Row 7 bottom: Terms / Round off
  const y8 = y7 + rowH // Row 8 bottom: Signatory / GRAND TOTAL
  const y9 = y8 + 6.2  // Row 9 bottom: Words
  const y10 = y9 + 5.8 // Row 10 bottom: Copies / Reverse Charge (Bottom of Box)

  // Horizontal dividing lines matching original invoice
  doc.line(margin, y1, rightX, y1)
  doc.line(margin, y2, rightX, y2)
  doc.line(margin, y3, rightX, y3)
  doc.line(c3, y4, rightX, y4) // Right side divider below CGST
  doc.line(c3, y5, rightX, y5) // Right side divider below SGST
  doc.line(margin, y6, rightX, y6)
  doc.line(margin, y7, rightX, y7)
  doc.line(margin, y8, rightX, y8)
  doc.line(margin, y9, rightX, y9)
  doc.line(margin, y10, rightX, y10) // Bottom border of outer box

  // Vertical dividing lines matching original invoice
  doc.line(margin, y0, margin, y10) // Outer left border
  doc.line(rightX, y0, rightX, y10) // Outer right border
  doc.line(c2, y0, c2, y6)          // Left charges & bank column border (stops at Terms)
  doc.line(c3, y0, c3, y8)          // Main middle divider (stops at Words)
  doc.line(c4, y3, c4, y6)          // Tax Rate vs Amount column divider
  doc.line(c4, y9, c4, y10)         // Copies vs Reverse Charge divider
  doc.line(c5, y0, c5, y8)          // Final values column divider (stops at Words)

  // Cell Content Rendering
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  // Row 1: Freight / Sub Total
  doc.text('Freight', margin + 2, y0 + 3.8)
  if (freightVal > 0) doc.text(formatAmt(freightVal), c2 - 2, y0 + 3.8, { align: 'right' })
  doc.text('Sub Total', c3 + 2, y0 + 3.8)
  doc.text(formatAmt(subTotal), rightX - 2, y0 + 3.8, { align: 'right' })

  // Row 2: Insurance / Discount
  doc.text('Insurance', margin + 2, y1 + 3.8)
  if (insVal > 0) doc.text(formatAmt(insVal), c2 - 2, y1 + 3.8, { align: 'right' })
  doc.text('Discount', c3 + 2, y1 + 3.8)
  if (discountVal > 0) doc.text(formatAmt(discountVal), rightX - 2, y1 + 3.8, { align: 'right' })

  // Row 3: Packing & Forwading Charge / TaxableValue
  doc.text('Packing & Forwading Charge', margin + 2, y2 + 3.8)
  if (packVal > 0) doc.text(formatAmt(packVal), c2 - 2, y2 + 3.8, { align: 'right' })
  doc.text('TaxableValue', c3 + 2, y2 + 3.8)
  doc.text(formatAmt(taxableValue), rightX - 2, y2 + 3.8, { align: 'right' })

  // Rows 4, 5, 6: Bank details on left, Taxes on right
  const bankLabel = bankDetails ? `Bank Details : ${bankDetails}` : 'Bank Details'
  const acctLabel = accountNumber ? `Account Number : ${accountNumber}` : 'Account Number'
  const ifscLabel = branchIfsc ? `Branch IFSC : ${branchIfsc}` : 'Branch IFSC'
  doc.text(bankLabel, margin + 2, y3 + 3.8)
  doc.text(acctLabel, margin + 2, y4 + 3.8)
  doc.text(ifscLabel, margin + 2, y5 + 3.8)

  // Row 4 (CGST):
  doc.text('CGST Rate', c3 + 2, y3 + 3.8)
  doc.text('Amount', c4 + 2, y3 + 3.8)
  if (taxTreatment === 'CGST_SGST' && cgstAmount > 0) {
    doc.text(formatAmt(cgstAmount), rightX - 2, y3 + 3.8, { align: 'right' })
  }

  // Row 5 (SGST):
  doc.text('SGST Rate', c3 + 2, y4 + 3.8)
  doc.text('Amount', c4 + 2, y4 + 3.8)
  if (taxTreatment === 'CGST_SGST' && sgstAmount > 0) {
    doc.text(formatAmt(sgstAmount), rightX - 2, y4 + 3.8, { align: 'right' })
  }

  // Row 6 (IGST):
  doc.text('IGST Rate', c3 + 2, y5 + 3.8)
  doc.text('Amount', c4 + 2, y5 + 3.8)
  if (taxTreatment === 'IGST' && igstAmount > 0) {
    doc.text(formatAmt(igstAmount), rightX - 2, y5 + 3.8, { align: 'right' })
  }

  // Row 7: Terms and Conditions / Round off
  const termsLabel = termsAndConditions ? `Terms and Conditions : ${termsAndConditions}` : 'Terms and Conditions'
  doc.text(termsLabel, margin + 2, y6 + 3.8)
  doc.text('Round off', c3 + 2, y6 + 3.8)
  if (finalRoundOff !== 0) {
    doc.text(formatAmt(finalRoundOff), rightX - 2, y6 + 3.8, { align: 'right' })
  }

  // Row 8: Authorised Signatory / GRAND TOTAL
  doc.text('Authorised Signatory (with status & seal)', (margin + c3) / 2, y7 + 3.8, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.text('GRAND TOTAL', c3 + 2, y7 + 3.8)
  doc.text(formatAmt(calculatedGrandTotal), rightX - 2, y7 + 3.8, { align: 'right' })

  // Row 9: Grand Total in Words (Full width)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(`Grand Total in words :- ( ${grandTotalWords} )`, margin + 2, y8 + 4.2)

  // Row 10: Copies / Reverse Charge
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Orginal for Recipient, Duplicate for Transporter, Triplicate for Supplier', margin + 2, y9 + 3.8)
  const revChargeLabel = reverseCharge ? `GST Payable on Reverse Charge : ${reverseCharge}` : 'GST Payable on Reverse Charge'
  doc.text(revChargeLabel, c4 + 2, y9 + 3.8)

  // Section 5: Signature Block (Below outer box)
  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  doc.text(`For ${businessName}`, (c4 + rightX) / 2, y10 + 6.5, { align: 'center' })
  doc.text('Proprietor', (c4 + rightX) / 2, y10 + 17.5, { align: 'center' })

  // Trigger Download if requested
  if (save) {
    const cleanInv = invoiceNo ? invoiceNo.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'Invoice'
    const fileName = `GST_Invoice_${cleanInv}_${calculatedGrandTotal.toFixed(0)}.pdf`
    doc.save(fileName)
  }

  return doc
}
