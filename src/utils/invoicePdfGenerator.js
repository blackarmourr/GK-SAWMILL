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
  doc.setFontSize(17.5)
  doc.text(businessName, margin, 16.5)

  doc.setFont('times', 'bold')
  doc.setFontSize(9.6)
  doc.text(addressLine1, margin, 21.8)
  doc.text(addressLine2, margin, 26.2)

  // Right: Contact info
  const rightX = margin + contentWidth
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.6)
  doc.text(`Tel :- ${telephone}`, rightX, 16.5, { align: 'right' })
  doc.text(`E-mail :- ${email}`, rightX, 21.2, { align: 'right' })
  doc.text(`GSTIN :- ${gstin}`, rightX, 26.2, { align: 'right' })

  // Center Title
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('FORM GST INVOICE - I', pageWidth / 2, 33.5, { align: 'center' })

  // --- MAIN BOUNDED BOX ---
  const boxTop = 37.0
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)

  // Section 1: Top Metadata Grid (y = 37.0 to 62.0, height = 25.0)
  const metaHeight = 25.0
  doc.rect(margin, boxTop, contentWidth, metaHeight)
  doc.line(midX, boxTop, midX, boxTop + metaHeight)

  doc.setFontSize(9.4)
  const lX = margin + 2.5
  const rX = midX + 2.5

  // Left Column Metadata (Spaced generously across 25mm)
  doc.setFont('helvetica', 'normal')
  doc.text(`Reverse Charge :- ${reverseCharge || ''}`, lX, boxTop + 5.0)
  doc.setFont('helvetica', 'bold')
  doc.text(`Invoice No :- ${invoiceNo || ''}`, lX, boxTop + 10.5)
  doc.text(`Invoice Date : ${invoiceDate || ''}`, lX, boxTop + 16.0)
  doc.text(`State :- ${state || ''}`, lX, boxTop + 21.5)
  doc.text(`State code :- ${stateCode || ''}`, midX - 2.5, boxTop + 21.5, { align: 'right' })

  // Right Column Metadata
  doc.setFont('helvetica', 'normal')
  doc.text(`Transportation mode :- ${transportationMode || ''}`, rX, boxTop + 5.0)
  doc.setFont('helvetica', 'bold')
  doc.text(`Vehicle No :- ${vehicleNo || ''}`, rX, boxTop + 10.5)
  doc.text(`Date of supply :- ${dateOfSupply || ''}`, rX, boxTop + 16.0)
  doc.text(`Place of supply :- ${placeOfSupply || ''}`, rX, boxTop + 21.5)

  // Section 2: Details of Receiver & Dispatched (y = 62.0 to 109.0, height = 47.0)
  const recTop = boxTop + metaHeight
  const recHeight = 47.0
  doc.rect(margin, recTop, contentWidth, recHeight)
  doc.line(midX, recTop, midX, recTop + recHeight)

  // Sub headers
  const subHeadH = 6.0
  doc.line(margin, recTop + subHeadH, rightX, recTop + subHeadH)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.8)
  doc.text('Details of Receiver', (margin + midX) / 2, recTop + 4.2, { align: 'center' })
  doc.text('Details of Dispatched', (midX + rightX) / 2, recTop + 4.2, { align: 'center' })

  // Receiver Data
  doc.setFontSize(9.0)
  let recY = recTop + subHeadH + 4.5
  const maxRecW = (midX - 2.5) - (lX + 16) // ~72mm strictly within left box
  const maxDispW = (rightX - 2.5) - rX   // ~88mm strictly within right box

  doc.setFont('helvetica', 'bold')
  doc.text('Name :-', lX, recY)
  const rNameLines = doc.splitTextToSize((receiverName || '').trim(), maxRecW)
  rNameLines.forEach((line, idx) => {
    doc.text(line, lX + 13, recY + idx * 3.8)
  })
  recY += Math.max(4.2, rNameLines.length * 3.8)

  doc.text('Address :-', lX, recY)
  doc.setFont('helvetica', 'normal')
  const addrParas = (receiverAddress || '').replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  const rWrapped = []
  addrParas.forEach(p => {
    const lines = doc.splitTextToSize(p.trim(), maxRecW)
    lines.forEach(l => rWrapped.push(l))
  })
  const recBottomY = recTop + recHeight - 2.8
  const maxRecAllowedY = recBottomY - 8.5
  rWrapped.forEach((line) => {
    if (recY <= maxRecAllowedY) {
      doc.text(line, lX + 16, recY)
      recY += 3.6
    }
  })

  doc.setFont('helvetica', 'bold')
  doc.text(`GSTIN :-   ${receiverGstin || ''}`, lX, recBottomY - 4.6)
  doc.text(`State :- ${receiverState || ''}`, lX, recBottomY)
  doc.text(`State code :-  ${receiverStateCode || ''}`, midX - 2.5, recBottomY, { align: 'right' })

  // Dispatched Data
  if (dispatchedDetails) {
    doc.setFont('helvetica', 'normal')
    const dispParas = dispatchedDetails.replace(/\r\n/g, '\n').split('\n').filter(Boolean)
    const dWrapped = []
    dispParas.forEach(p => {
      const lines = doc.splitTextToSize(p.trim(), maxDispW)
      lines.forEach(l => dWrapped.push(l))
    })
    let dY = recTop + subHeadH + 4.5
    const maxDispAllowedY = recTop + recHeight - 3.0
    dWrapped.forEach((line) => {
      if (dY <= maxDispAllowedY) {
        doc.text(line, rX, dY)
        dY += 3.6
      }
    })
  }

  // Section 3: Goods Table Header & Rows (y = 109.0 to 179.0, height = 70.0)
  // Columns aligned with original template proportions:
  // Sl No (14mm), Desc (70mm), HSN (24mm), Qty (24mm), Rate (24mm), Value (30mm)
  const c1 = margin + 14  // 26 mm
  const c2 = margin + 84  // 96 mm
  const c3 = margin + 108 // 120 mm
  const c4 = margin + 132 // 144 mm
  const c5 = margin + 156 // 168 mm

  const tableTop = recTop + recHeight
  const tblHeadH = 7.0
  const goodsBodyH = 58.0
  const sepRowH = 5.0
  const tableHeight = tblHeadH + goodsBodyH + sepRowH // 70.0 mm

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
  doc.setFontSize(9.5)
  doc.text('Sl. No.', (margin + c1) / 2, tableTop + 4.8, { align: 'center' })
  doc.text('Description of Goods', (c1 + c2) / 2, tableTop + 4.8, { align: 'center' })
  doc.text('HSN Code', (c2 + c3) / 2, tableTop + 4.8, { align: 'center' })
  doc.text('Qty (CFT)', (c3 + c4) / 2, tableTop + 4.8, { align: 'center' })
  doc.text('Rate', (c4 + c5) / 2, tableTop + 4.8, { align: 'center' })
  doc.text('Value', (c5 + rightX) / 2, tableTop + 4.8, { align: 'center' })

  // Goods Rows
  let curItemY = tableTop + tblHeadH + 7.5
  let rowIdx = 1

  // Item 1: Mahogany
  if (mahoganyEnabled && mahogVal > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(String(rowIdx), (margin + c1) / 2, curItemY, { align: 'center' })
    
    doc.setFont('helvetica', 'italic')
    const descL = mahoganyDesc.split('\n')
    doc.text(descL[0] || 'Mahogany Rejected size', c1 + 2, curItemY)
    if (descL[1]) doc.text(descL[1], c1 + 2, curItemY + 4.5)
    
    doc.setFont('helvetica', 'normal')
    doc.text(String(mahoganyHsn), (c2 + c3) / 2, curItemY, { align: 'center' })
    doc.text(formatAmt(mahogCft), c4 - 2, curItemY, { align: 'right' })
    doc.text(formatAmt(mahogR), c5 - 2, curItemY, { align: 'right' })
    doc.text(formatAmt(mahogVal), rightX - 2, curItemY, { align: 'right' })
    
    curItemY += 15.0
    rowIdx++
  }

  // Item 2: Manjiyam
  if (manjiyamEnabled && manjVal > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(String(rowIdx), (margin + c1) / 2, curItemY, { align: 'center' })
    
    doc.setFont('helvetica', 'italic')
    const descL = manjiyamDesc.split('\n')
    doc.text(descL[0] || 'Manjiyam Rejected Size', c1 + 2, curItemY)
    if (descL[1]) doc.text(descL[1], c1 + 2, curItemY + 4.5)
    
    doc.setFont('helvetica', 'normal')
    doc.text(String(manjiyamHsn), (c2 + c3) / 2, curItemY, { align: 'center' })
    doc.text(formatAmt(manjCft), c4 - 2, curItemY, { align: 'right' })
    doc.text(formatAmt(manjR), c5 - 2, curItemY, { align: 'right' })
    doc.text(formatAmt(manjVal), rightX - 2, curItemY, { align: 'right' })
    
    curItemY += 15.0
    rowIdx++
  }

  // Volume & E-Way Bill in description area (matching sample invoice)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text(`(Qty in CBM :- ${totalCbm.toFixed(2)})`, c1 + 2, curItemY + 2.5)
  if (ewayBillNo && ewayBillNo.trim()) {
    doc.text(`EWAY BILL :- ${ewayBillNo.trim()}`, c1 + 2, curItemY + 8.5)
  }

  // --- SECTION 4: EXACT ORIGINAL INVOICE CHARGES, BANK & TOTALS ---
  // Expanded to 65.0mm total height to comfortably fill the lower page
  const botTop = tableTop + tableHeight
  const rowH = 6.4

  const y0 = botTop
  const y1 = y0 + rowH // Row 1 bottom: Freight / Sub Total
  const y2 = y1 + rowH // Row 2 bottom: Insurance / Discount
  const y3 = y2 + rowH // Row 3 bottom: Packing / TaxableValue
  const y4 = y3 + rowH // Row 4 bottom: Bank Details / CGST Rate
  const y5 = y4 + rowH // Row 5 bottom: Account Number / SGST Rate
  const y6 = y5 + rowH // Row 6 bottom: Branch IFSC / IGST Rate
  const y7 = y6 + rowH // Row 7 bottom: Terms / Round off
  const y8 = y7 + 6.6  // Row 8 bottom: Signatory / GRAND TOTAL
  const y9 = y8 + 7.2  // Row 9 bottom: Words
  const y10 = y9 + 6.4 // Row 10 bottom: Copies / Reverse Charge (Bottom of Box = 244.0mm)

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
  doc.setFontSize(9.4)

  // Row 1: Freight / Sub Total
  doc.text('Freight', margin + 2.5, y0 + 4.5)
  if (freightVal > 0) doc.text(formatAmt(freightVal), c2 - 2.5, y0 + 4.5, { align: 'right' })
  doc.text('Sub Total', c3 + 2.5, y0 + 4.5)
  doc.text(formatAmt(subTotal), rightX - 2.5, y0 + 4.5, { align: 'right' })

  // Row 2: Insurance / Discount
  doc.text('Insurance', margin + 2.5, y1 + 4.5)
  if (insVal > 0) doc.text(formatAmt(insVal), c2 - 2.5, y1 + 4.5, { align: 'right' })
  doc.text('Discount', c3 + 2.5, y1 + 4.5)
  if (discountVal > 0) doc.text(formatAmt(discountVal), rightX - 2.5, y1 + 4.5, { align: 'right' })

  // Row 3: Packing & Forwading Charge / TaxableValue
  doc.text('Packing & Forwading Charge', margin + 2.5, y2 + 4.5)
  if (packVal > 0) doc.text(formatAmt(packVal), c2 - 2.5, y2 + 4.5, { align: 'right' })
  doc.text('TaxableValue', c3 + 2.5, y2 + 4.5)
  doc.text(formatAmt(taxableValue), rightX - 2.5, y2 + 4.5, { align: 'right' })

  // Rows 4, 5, 6: Bank details on left, Taxes on right
  const bankLabel = bankDetails ? `Bank Details : ${bankDetails}` : 'Bank Details'
  const acctLabel = accountNumber ? `Account Number : ${accountNumber}` : 'Account Number'
  const ifscLabel = branchIfsc ? `Branch IFSC : ${branchIfsc}` : 'Branch IFSC'
  doc.text(bankLabel, margin + 2.5, y3 + 4.5)
  doc.text(acctLabel, margin + 2.5, y4 + 4.5)
  doc.text(ifscLabel, margin + 2.5, y5 + 4.5)

  // Row 4 (CGST):
  doc.text('CGST Rate', c3 + 2.5, y3 + 4.5)
  doc.text('Amount', c4 + 2.5, y3 + 4.5)
  if (taxTreatment === 'CGST_SGST' && cgstAmount > 0) {
    doc.text(formatAmt(cgstAmount), rightX - 2.5, y3 + 4.5, { align: 'right' })
  }

  // Row 5 (SGST):
  doc.text('SGST Rate', c3 + 2.5, y4 + 4.5)
  doc.text('Amount', c4 + 2.5, y4 + 4.5)
  if (taxTreatment === 'CGST_SGST' && sgstAmount > 0) {
    doc.text(formatAmt(sgstAmount), rightX - 2.5, y4 + 4.5, { align: 'right' })
  }

  // Row 6 (IGST):
  doc.text('IGST Rate', c3 + 2.5, y5 + 4.5)
  doc.text('Amount', c4 + 2.5, y5 + 4.5)
  if (taxTreatment === 'IGST' && igstAmount > 0) {
    doc.text(formatAmt(igstAmount), rightX - 2.5, y5 + 4.5, { align: 'right' })
  }

  // Row 7: Terms and Conditions / Round off
  const termsLabel = termsAndConditions ? `Terms and Conditions : ${termsAndConditions}` : 'Terms and Conditions'
  doc.text(termsLabel, margin + 2.5, y6 + 4.5)
  doc.text('Round off', c3 + 2.5, y6 + 4.5)
  if (finalRoundOff !== 0) {
    doc.text(formatAmt(finalRoundOff), rightX - 2.5, y6 + 4.5, { align: 'right' })
  }

  // Row 8: Authorised Signatory / GRAND TOTAL
  doc.text('Authorised Signatory (with status & seal)', (margin + c3) / 2, y7 + 4.5, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.2)
  doc.text('GRAND TOTAL', c3 + 2.5, y7 + 4.5)
  doc.text(formatAmt(calculatedGrandTotal), rightX - 2.5, y7 + 4.5, { align: 'right' })

  // Row 9: Grand Total in Words (Full width)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text(`Grand Total in words :- ( ${grandTotalWords} )`, margin + 2.5, y8 + 5.0)

  // Row 10: Copies / Reverse Charge
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.8)
  doc.text('Orginal for Recipient, Duplicate for Transporter, Triplicate for Supplier', margin + 2.5, y9 + 4.5)
  const revChargeLabel = reverseCharge ? `GST Payable on Reverse Charge : ${reverseCharge}` : 'GST Payable on Reverse Charge'
  doc.text(revChargeLabel, c4 + 2.5, y9 + 4.5)

  // Section 5: Signature Block (Below outer box)
  doc.setFont('times', 'bold')
  doc.setFontSize(11.5)
  doc.text(`For ${businessName}`, (c4 + rightX) / 2, y10 + 7.5, { align: 'center' })
  doc.setFontSize(11.0)
  doc.text('Proprietor', (c4 + rightX) / 2, y10 + 20.0, { align: 'center' })

  // Trigger Download if requested
  if (save) {
    const cleanInv = invoiceNo ? invoiceNo.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'Invoice'
    const fileName = `GST_Invoice_${cleanInv}_${calculatedGrandTotal.toFixed(0)}.pdf`
    doc.save(fileName)
  }

  return doc
}
