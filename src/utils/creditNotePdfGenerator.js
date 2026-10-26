import { jsPDF } from 'jspdf'
import {
  formatIndianCurrency,
  formatCreditNoteDate,
  DEFAULT_CREDIT_NOTE_SETTINGS
} from '../data/creditNoteSettings.js'

/**
 * Generate official print-ready A4 Credit Note PDF
 * Primary Benchmark: Sample Credit Note CN-09 against Invoice A-20
 *
 * @param {Object} creditNoteData - Full credit note data and calculations
 * @param {boolean} [save=true] - Whether to trigger browser download
 * @returns {{ doc: jsPDF, blob: Blob }}
 */
export function generateCreditNotePdf(creditNoteData, save = true) {
  const {
    // Business header
    sellerName = DEFAULT_CREDIT_NOTE_SETTINGS.sellerName,
    sellerAddressLine = DEFAULT_CREDIT_NOTE_SETTINGS.sellerAddressLine,
    sellerGstin = DEFAULT_CREDIT_NOTE_SETTINGS.sellerGstin,
    mobile = DEFAULT_CREDIT_NOTE_SETTINGS.mobile,
    email = DEFAULT_CREDIT_NOTE_SETTINGS.email,
    legalCitation = DEFAULT_CREDIT_NOTE_SETTINGS.legalCitation,

    // Document numbers & dates
    creditNoteNo = 'CN-09',
    creditNoteDate = '2026-10-17',
    referenceNo = '',
    originalInvoiceNo = 'A-20',
    originalInvoiceDate = '2026-10-10',

    // Receiver details
    receiverName = 'M/S. HINDUSTAN PENCILS PVT.LTD',
    receiverAddress = '217/1 GIDC Estate\nUMBERGAON, VALSAD, GUJARAT',
    receiverPinNo = '396171',
    receiverMobileNo = '',
    receiverGstin = '24AAACH0401R1ZT',
    receiverState = 'GUJARAT',
    receiverStateCode = '24',

    // Despatched details
    despatchedName = 'UMESH PENCILS PROCESSORS (P) LTD',
    despatchedAddress = '186/A2B, 173,174, SINGANALLUR VILLAGE\nROAD, NAICKENPALAYAM VILLAGE,\nPOLLACHI-642004, TAMILNADU',
    despatchedPinNo = '',
    despatchedMobileNo = '',
    despatchedGstin = '33AAACU0701F1Z3',
    despatchedState = 'TAMILNADU',
    despatchedStateCode = '33',

    // Goods & reason
    goodsDescription = 'Vatta wood Pencil Slats\n(Rejection Refund)',
    hsnCode = '44219140',

    // Financial breakdown
    taxableAmount = 1301.64,
    taxTreatment = 'IGST',
    gstRate = 5,
    cgstRate = 0,
    cgstAmount = 0,
    sgstRate = 0,
    sgstAmount = 0,
    igstRate = 5,
    igstAmount = 65.08,
    roundOff = 0.28,
    netValue = 1367,
    totalInWords = 'One Thousand Three Hundred and Sixty Seven Only.'
  } = creditNoteData

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
     1. HEADER (Top of Page)
     ========================================================================= */
  let y = 17

  // Company Name Centered
  doc.setFont('times', 'bold')
  doc.setFontSize(22)
  doc.text(sellerName, pageWidth / 2, y, { align: 'center' })

  // Subtitle Address Centered
  y += 6.5
  doc.setFont('times', 'bold')
  doc.setFontSize(10.5)
  doc.text(sellerAddressLine, pageWidth / 2, y, { align: 'center' })

  // Contact & GST Row
  y += 7.0
  doc.setFont('times', 'bold')
  doc.setFontSize(9.5)
  doc.text(`GST No:${sellerGstin}`, margin, y)

  doc.text(`MOB: ${mobile}`, rightEdge, y - 2.5, { align: 'right' })
  doc.text(email, rightEdge, y + 2.0, { align: 'right' })

  // Double Horizontal Rule
  y += 5.5
  doc.setLineWidth(0.35)
  doc.line(margin, y, rightEdge, y)
  doc.line(margin, y + 0.6, rightEdge, y + 0.6)

  /* =========================================================================
     2. DOCUMENT TITLE & LEGAL CITATION
     ========================================================================= */
  y += 6.0
  doc.setFont('times', 'normal')
  doc.setFontSize(9.5)
  doc.text(`Ref: ${referenceNo || ''}`, margin, y)
  doc.text('Date.....................', rightEdge, y, { align: 'right' })

  y += 5.5
  doc.setFont('times', 'bold')
  doc.setFontSize(13)
  doc.text('CREDIT NOTE', pageWidth / 2, y, { align: 'center' })

  y += 4.5
  doc.setFont('times', 'italic')
  doc.setFontSize(8.5)
  doc.text(legalCitation, pageWidth / 2, y, { align: 'center' })

  /* =========================================================================
     3. UPPER BOX: CREDIT NOTE & ORIGINAL INVOICE NUMBERS
     ========================================================================= */
  y += 3.5
  const boxTop = y
  const rowH1 = 6.2
  const rowH2 = 6.2

  // Outer Box for Credit Note & Invoice reference lines
  doc.rect(margin, boxTop, contentWidth, rowH1 + rowH2)
  doc.line(midX, boxTop, midX, boxTop + rowH1 + rowH2)
  doc.line(margin, boxTop + rowH1, rightEdge, boxTop + rowH1)

  // Row 1: Credit Note No & Date
  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  doc.text(`Credit Note No: ${creditNoteNo || ''}`, margin + 2.5, boxTop + 4.4)
  doc.text(formatCreditNoteDate(creditNoteDate, '/'), rightEdge - 2.5, boxTop + 4.4, { align: 'right' })

  // Row 2: Serial No. of Original Invoice & Date of Orginal Invoice
  const row2Y = boxTop + rowH1
  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.text(`Serial No. of Original Invoice:- ${originalInvoiceNo || ''}`, margin + 2.5, row2Y + 4.4)
  doc.text(`Date of Orginal Invoice:- ${formatCreditNoteDate(originalInvoiceDate, '-')}`, rightEdge - 2.5, row2Y + 4.4, { align: 'right' })

  /* =========================================================================
     4. PARTY DETAILS: DETAILS OF RECEIVER & DETAILS OF DESPATCHED
     ========================================================================= */
  const partyTop = boxTop + rowH1 + rowH2
  const partyHeadH = 5.5
  const partyBodyH = 34.0
  const partyTotalH = partyHeadH + partyBodyH

  doc.rect(margin, partyTop, contentWidth, partyTotalH)
  doc.line(midX, partyTop, midX, partyTop + partyTotalH)
  doc.line(margin, partyTop + partyHeadH, rightEdge, partyTop + partyHeadH)

  // Header Titles
  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  doc.text('Details of Receiver', (margin + midX) / 2, partyTop + 4.0, { align: 'center' })
  doc.text('Details of Despatched', (midX + rightEdge) / 2, partyTop + 4.0, { align: 'center' })

  // Body: Receiver (Left)
  let curL = partyTop + partyHeadH + 4.0
  const leftX = margin + 2.5
  const rightX = midX + 2.5
  const maxRecW = (midX - 2.5) - (leftX + 16) // ~72mm strictly within left box
  const maxDespW = (rightEdge - 2.5) - rightX // ~88mm strictly within right box

  doc.setFont('times', 'normal')
  doc.setFontSize(8.2)

  // Receiver Name
  doc.text('Name', leftX, curL)
  doc.setFont('times', 'bold')
  const rNameLines = doc.splitTextToSize((receiverName || '').trim(), maxRecW)
  rNameLines.forEach((line, i) => {
    doc.text(line, leftX + 16, curL + (i * 3.8))
  })
  curL += Math.max(3.8, rNameLines.length * 3.8)
  doc.setFont('times', 'normal')

  // Receiver Address
  doc.text('Address', leftX, curL)
  const addrParas = (receiverAddress || '').replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  const rWrapped = []
  addrParas.forEach(p => {
    const lines = doc.splitTextToSize(p.trim(), maxRecW)
    lines.forEach(l => rWrapped.push(l))
  })
  if (rWrapped.length > 0) {
    rWrapped.forEach((line) => {
      doc.text(line, leftX + 16, curL)
      curL += 3.6
    })
  } else {
    curL += 3.6
  }

  // Pin No
  if (receiverPinNo && !receiverAddress.includes(receiverPinNo)) {
    doc.text(`Pin No:- ${receiverPinNo}`, leftX + 16, curL)
    curL += 3.6
  }

  // MOB
  doc.text(`MOB: ${receiverMobileNo || ''}`, leftX, curL)
  curL += 3.6

  // GSTIN
  doc.text(`GSTIN :-  ${receiverGstin || ''}`, leftX, curL)
  curL += 3.8

  // STATE & State Code
  doc.text(`STATE :- ${receiverState || ''}`, leftX, curL)
  doc.text(`State code:${receiverStateCode || ''}`, midX - 3, curL, { align: 'right' })

  // Body: Despatched (Right)
  let curR = partyTop + partyHeadH + 4.0
  doc.setFont('times', 'bold')
  const dNameLines = doc.splitTextToSize((despatchedName || '').trim(), maxDespW)
  dNameLines.forEach((line, i) => {
    doc.text(line, rightX, curR + (i * 3.8))
  })
  curR += Math.max(3.8, dNameLines.length * 3.8)
  doc.setFont('times', 'normal')

  const despParas = (despatchedAddress || '').replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  const dWrapped = []
  despParas.forEach(p => {
    const lines = doc.splitTextToSize(p.trim(), maxDespW)
    lines.forEach(l => dWrapped.push(l))
  })
  dWrapped.forEach((line) => {
    doc.text(line, rightX, curR)
    curR += 3.6
  })

  // Pin No
  if (despatchedPinNo && !despatchedAddress.includes(despatchedPinNo)) {
    doc.text(`Pin No:- ${despatchedPinNo}`, rightX, curR)
    curR += 3.6
  }

  // MOB if any
  if (despatchedMobileNo) {
    doc.text(`MOB: ${despatchedMobileNo}`, rightX, curR)
    curR += 3.6
  }

  // Despatched GSTIN & State
  curR = Math.max(curR, partyTop + partyHeadH + 26.5)
  doc.text(`GSTIN:-  ${despatchedGstin || ''}`, rightX, curR)
  curR += 3.8
  doc.text(`STATE :- ${despatchedState || ''}`, rightX, curR)
  doc.text(`State code:${despatchedStateCode || ''}`, rightEdge - 3, curR, { align: 'right' })

  /* =========================================================================
     5. ITEMS TABLE
     Columns:
     SL No. (14mm) | Description of Goods (68mm) | HSN Code (26mm) |
     Total Value Collected (30mm) | IGST Rate (22mm) | IGST Amt (26mm)
     Total = 186mm
     ========================================================================= */
  const tableTop = partyTop + partyTotalH
  const colW = {
    slNo: 14,
    desc: 68,
    hsn: 26,
    value: 30,
    rate: 22,
    amt: 26
  }

  const colX = {
    slNo: margin,
    desc: margin + colW.slNo,
    hsn: margin + colW.slNo + colW.desc,
    value: margin + colW.slNo + colW.desc + colW.hsn,
    rate: margin + colW.slNo + colW.desc + colW.hsn + colW.value,
    amt: margin + colW.slNo + colW.desc + colW.hsn + colW.value + colW.rate
  }

  const tableHeadH = 8.0
  const tableBodyH = 48.0
  const isInterState = taxTreatment !== 'CGST_SGST'

  const rateHeader = isInterState ? 'IGST Rate' : 'GST Rate'
  const amtHeader = isInterState ? 'IGST Amt' : 'GST Amt'
  const effectiveGstRate = isInterState ? igstRate : gstRate
  const effectiveGstAmt = isInterState ? igstAmount : (cgstAmount + sgstAmount)

  // Header background / border
  doc.rect(margin, tableTop, contentWidth, tableHeadH + tableBodyH)

  // Column vertical divider lines
  const divX = [colX.desc, colX.hsn, colX.value, colX.rate, colX.amt]
  divX.forEach(x => {
    doc.line(x, tableTop, x, tableTop + tableHeadH + tableBodyH)
  })

  // Horizontal line separating header
  doc.line(margin, tableTop + tableHeadH, rightEdge, tableTop + tableHeadH)

  // Header Text
  doc.setFont('times', 'bold')
  doc.setFontSize(8.8)
  doc.text('SL No.', colX.slNo + colW.slNo / 2, tableTop + 5.2, { align: 'center' })
  doc.text('Description of Goods', colX.desc + colW.desc / 2, tableTop + 5.2, { align: 'center' })
  doc.text('HSN Code', colX.hsn + colW.hsn / 2, tableTop + 5.2, { align: 'center' })
  doc.text('Total Value\nCollected', colX.value + colW.value / 2, tableTop + 3.8, { align: 'center' })
  doc.text(rateHeader, colX.rate + colW.rate / 2, tableTop + 5.2, { align: 'center' })
  doc.text(amtHeader, colX.amt + colW.amt / 2, tableTop + 5.2, { align: 'center' })

  // Item Row 1 Content
  const itemY = tableTop + tableHeadH + 6.0
  doc.setFont('times', 'normal')
  doc.setFontSize(8.8)

  // SL No
  doc.text('1', colX.slNo + colW.slNo / 2, itemY, { align: 'center' })

  // Description of Goods (incorporating ply specification if not already present)
  const ply = creditNoteData.ply || ''
  let finalDesc = (goodsDescription || 'Vatta wood Pencil Slats').trim()
  if (ply && !finalDesc.toLowerCase().includes(ply.toLowerCase())) {
    // If not already in first line, include ply clearly
    const lines = finalDesc.split('\n')
    lines[0] = `${lines[0]} (${ply})`
    finalDesc = lines.join('\n')
  }

  const descParagraphs = finalDesc.split('\n')
  let curDescY = itemY
  const maxDescWidth = colW.desc - 5
  descParagraphs.forEach((dLine, idx) => {
    if (idx === 0) {
      doc.setFont('times', 'bold')
    } else {
      doc.setFont('times', 'normal')
    }
    const wrapped = doc.splitTextToSize(dLine.trim(), maxDescWidth)
    wrapped.forEach(w => {
      doc.text(w, colX.desc + 2.5, curDescY)
      curDescY += 4.2
    })
  })

  // HSN Code
  doc.setFont('times', 'normal')
  doc.text(hsnCode || '44219140', colX.hsn + colW.hsn / 2, itemY, { align: 'center' })

  // Total Value Collected (Taxable Amount)
  doc.text(formatIndianCurrency(taxableAmount), colX.rate - 2.5, itemY, { align: 'right' })

  // IGST Rate
  doc.text(`${effectiveGstRate}%`, colX.rate + colW.rate / 2, itemY, { align: 'center' })

  // IGST Amt
  doc.text(formatIndianCurrency(effectiveGstAmt), rightEdge - 2.5, itemY, { align: 'right' })

  /* =========================================================================
     6. TOTAL ROW (Subtotal at bottom of item table)
     ========================================================================= */
  const subtotalH = 6.0
  const subtotalY = tableTop + tableHeadH + tableBodyH - subtotalH

  doc.line(margin, subtotalY, rightEdge, subtotalY)
  doc.setFont('times', 'bold')
  doc.setFontSize(8.8)
  doc.text('Total', colX.hsn - 3, subtotalY + 4.2, { align: 'right' })
  doc.text(formatIndianCurrency(taxableAmount), colX.rate - 2.5, subtotalY + 4.2, { align: 'right' })
  doc.text(formatIndianCurrency(effectiveGstAmt), rightEdge - 2.5, subtotalY + 4.2, { align: 'right' })

  /* =========================================================================
     7. SUMMARY BOX: Taxable Amt, Round Off, Net Value
     Positioned directly underneath the right columns
     ========================================================================= */
  const sumTop = tableTop + tableHeadH + tableBodyH
  const sumRowH = 5.5
  const sumWidth = colW.hsn + colW.value + colW.rate + colW.amt // 104 mm
  const sumLeftX = colX.hsn

  // 3 Summary Rows:
  // 1. Taxable Amt
  // 2. Round Off
  // 3. Net Value
  for (let i = 0; i < 3; i++) {
    const curSumY = sumTop + i * sumRowH
    doc.rect(sumLeftX, curSumY, sumWidth, sumRowH)
    doc.line(colX.amt, curSumY, colX.amt, curSumY + sumRowH)
  }

  // Row 1: Taxable Amt
  doc.setFont('times', 'normal')
  doc.setFontSize(8.8)
  doc.text('Taxable Amt', sumLeftX + 2.5, sumTop + 4.0)
  doc.text(formatIndianCurrency(taxableAmount), rightEdge - 2.5, sumTop + 4.0, { align: 'right' })

  // Row 2: Round Off
  doc.text('Round Off', sumLeftX + 2.5, sumTop + sumRowH + 4.0)
  doc.text(formatIndianCurrency(roundOff), rightEdge - 2.5, sumTop + sumRowH + 4.0, { align: 'right' })

  // Row 3: Net Value (Bold)
  doc.setFont('times', 'bold')
  doc.text('Net Value', sumLeftX + 2.5, sumTop + sumRowH * 2 + 4.0)
  doc.text(formatIndianCurrency(netValue), rightEdge - 2.5, sumTop + sumRowH * 2 + 4.0, { align: 'right' })

  /* =========================================================================
     8. TOTAL IN WORDS ROW (Spanning Full Width)
     ========================================================================= */
  const wordsTop = sumTop + sumRowH * 3
  const wordsH = 6.5
  doc.rect(margin, wordsTop, contentWidth, wordsH)

  doc.setFont('times', 'bold')
  doc.setFontSize(8.8)
  doc.text(`Total value in words:- ${totalInWords}`, margin + 2.5, wordsTop + 4.5)

  /* =========================================================================
     9. FOOTER & SIGNATURE
     ========================================================================= */
  const signY = wordsTop + wordsH + 18.0
  doc.setFont('times', 'bolditalic')
  doc.setFontSize(10.5)
  doc.text('For .G.K. Saw Mill', rightEdge - 8, signY, { align: 'right' })

  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  doc.text('Proprietor', rightEdge - 14, signY + 12.0, { align: 'right' })

  if (save) {
    const filename = `CreditNote_${creditNoteNo || 'CN'}_${(originalInvoiceNo || '').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    doc.save(filename)
  }

  const pdfBlob = doc.output('blob')
  return { doc, blob: pdfBlob }
}
