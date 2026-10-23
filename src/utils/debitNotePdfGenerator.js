import { jsPDF } from 'jspdf'
import {
  formatIndianCurrency,
  formatDebitNoteDate,
  DEFAULT_DEBIT_NOTE_SETTINGS
} from '../data/debitNoteSettings.js'

/**
 * Generate official print-ready A4 Debit Note PDF
 * Primary Reference: Attached G.K. Saw Mill Debit Note Samples (DN-05, AA-09, AA-08)
 *
 * Proportionally fills the A4 portrait page with clear borders and professional typography.
 *
 * @param {Object} debitNoteData - Full debit note details, item rows, and calculations
 * @param {boolean} [save=true] - Whether to trigger browser download
 * @returns {{ doc: jsPDF, blob: Blob }}
 */
export function generateDebitNotePdf(debitNoteData, save = true) {
  const {
    // Seller header
    sellerName = DEFAULT_DEBIT_NOTE_SETTINGS.sellerName,
    sellerAddressLine = DEFAULT_DEBIT_NOTE_SETTINGS.sellerAddressLine,
    sellerGstin = DEFAULT_DEBIT_NOTE_SETTINGS.sellerGstin,
    mobile = DEFAULT_DEBIT_NOTE_SETTINGS.mobile,
    email = DEFAULT_DEBIT_NOTE_SETTINGS.email,
    legalCitation = DEFAULT_DEBIT_NOTE_SETTINGS.legalCitation,

    // Document numbers & dates
    debitNoteNo = 'AA-09',
    debitNoteDate = '2026-03-31',
    referenceNo = '',

    // Consignee / Receiver details
    receiverName = 'HINDUSTAN PENCILS Pvt Ltd',
    receiverAddress = 'Plot No:-1 TO 15, ACHHAD INDUSTRIAL ESTATE, ACHHAD, TALUKA, TALASARI, PALGHAR, MAHARASHTRA-401606',
    receiverState = 'MAHARASHTRA',
    receiverStateCode = '27',
    receiverGstin = '27AAACH0401R1ZN',

    // Calculated rows and totals
    calculatedItems = [],
    items = [],
    totalBags = 0,
    totalTaxable = 0,
    totalGst = 0,
    totalDnAmt = 0,
    totalInWords = '(Thirty One Thousand Five Hundred Only)',
    taxTreatment = 'IGST',
    gstRate = 5
  } = debitNoteData

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const margin = 12
  const contentWidth = pageWidth - margin * 2 // 186 mm
  const rightEdge = margin + contentWidth     // 198 mm

  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.25)

  /* =========================================================================
     1. DOCUMENT HEADER (Top of Page)
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
  doc.text(`GST NO:${sellerGstin}`, margin, y)

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
  doc.setFont('times', 'italic')
  doc.setFontSize(8.5)
  doc.text(legalCitation, pageWidth / 2, y, { align: 'center' })

  y += 5.0
  doc.setFont('times', 'bold')
  doc.setFontSize(13.5)
  doc.text('DEBIT NOTE', pageWidth / 2, y, { align: 'center' })

  /* =========================================================================
     3. UPPER BOX: DEBIT NOTE NO/DATE & CONSIGNEE DETAILS
     ========================================================================= */
  y += 4.0
  const boxTop = y
  const leftColW = 58
  const rightColX = margin + leftColW
  const boxHeight = 44.0

  doc.rect(margin, boxTop, contentWidth, boxHeight)
  doc.line(rightColX, boxTop, rightColX, boxTop + boxHeight)

  // Left Column: DEBIT NOTE NO & DATE
  const leftRowH = 7.0
  doc.line(margin, boxTop + leftRowH, rightColX, boxTop + leftRowH)
  doc.line(margin, boxTop + leftRowH * 2, rightColX, boxTop + leftRowH * 2)

  doc.setFont('times', 'bold')
  doc.setFontSize(8.5)
  doc.text('DEBIT NOTE NO', margin + 2.5, boxTop + 4.8)
  doc.text(debitNoteNo || '', rightColX - 2.5, boxTop + 4.8, { align: 'right' })

  doc.text('DEBIT NOTE DATE', margin + 2.5, boxTop + leftRowH + 4.8)
  doc.text(formatDebitNoteDate(debitNoteDate, 'standard'), rightColX - 2.5, boxTop + leftRowH + 4.8, { align: 'right' })

  // Right Column: Details of Consignee / Receiver
  const rHeaderH = 6.0
  doc.line(rightColX, boxTop + rHeaderH, rightEdge, boxTop + rHeaderH)

  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  doc.text('Details of Consignee / Receiver', (rightColX + rightEdge) / 2, boxTop + 4.2, { align: 'center' })

  // Consignee Content
  const rTextX = rightColX + 3.0
  const maxConsigneeW = (rightEdge - 3.5) - rTextX // 121.5 mm safely inside right border
  let curR = boxTop + rHeaderH + 4.2

  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  const nameLines = doc.splitTextToSize((receiverName || '').trim(), maxConsigneeW)
  nameLines.forEach((line) => {
    doc.text(line, rTextX, curR)
    curR += 4.0
  })

  curR += 0.4
  doc.setFont('times', 'normal')
  doc.setFontSize(8)

  // Split address into lines that strictly stay inside the consignee box
  const addrParagraphs = (receiverAddress || '').replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  const wrappedAddrLines = []
  addrParagraphs.forEach((para) => {
    const lines = doc.splitTextToSize(para.trim(), maxConsigneeW)
    lines.forEach((l) => wrappedAddrLines.push(l))
  })

  // Ensure address lines do not collide with State / GSTIN line at the bottom
  const consigneeBottomY = boxTop + boxHeight - 2.5
  const maxAllowedY = consigneeBottomY - 3.8
  wrappedAddrLines.forEach((line) => {
    if (curR <= maxAllowedY) {
      doc.text(line, rTextX, curR)
      curR += 3.6
    }
  })

  // Bottom Line of Consignee Box: State, State code, GSTIN
  doc.setFont('times', 'bold')
  doc.setFontSize(8.2)
  doc.text(`State : ${receiverState || ''}`, rTextX, consigneeBottomY)
  doc.text(`State code : ${receiverStateCode || ''}`, rTextX + 44, consigneeBottomY)
  doc.text(`GSTIN : ${receiverGstin || ''}`, rightEdge - 2.5, consigneeBottomY, { align: 'right' })

  /* =========================================================================
     4. TABLE OF GOODS (10 Columns matching reference documents)
     Total Content Width = 186 mm
     ========================================================================= */
  const tableTop = boxTop + boxHeight
  const colW = {
    slNo: 9,      // 9
    desc: 46,     // 46
    hsn: 16,      // 16
    billNo: 15,   // 15
    billDate: 16, // 16
    bags: 14,     // 14
    rate: 14,     // 14
    taxable: 20,  // 20
    igst: 16,     // 16
    totalDn: 20   // 20
  }

  const colX = {
    slNo: margin,
    desc: margin + colW.slNo,
    hsn: margin + colW.slNo + colW.desc,
    billNo: margin + colW.slNo + colW.desc + colW.hsn,
    billDate: margin + colW.slNo + colW.desc + colW.hsn + colW.billNo,
    bags: margin + colW.slNo + colW.desc + colW.hsn + colW.billNo + colW.billDate,
    rate: margin + colW.slNo + colW.desc + colW.hsn + colW.billNo + colW.billDate + colW.bags,
    taxable: margin + colW.slNo + colW.desc + colW.hsn + colW.billNo + colW.billDate + colW.bags + colW.rate,
    igst: margin + colW.slNo + colW.desc + colW.hsn + colW.billNo + colW.billDate + colW.bags + colW.rate + colW.taxable,
    totalDn: margin + colW.slNo + colW.desc + colW.hsn + colW.billNo + colW.billDate + colW.bags + colW.rate + colW.taxable + colW.igst
  }

  const headerH = 10.0
  const activeItems = calculatedItems.length > 0 ? calculatedItems : items

  // Dynamically scale table body height based on number of items (ensuring single page A4)
  const isMultiRow = activeItems.length > 2
  const minTableBodyH = isMultiRow ? 44.0 : 48.0
  const rowHeight = isMultiRow ? 10.0 : 14.0

  doc.rect(margin, tableTop, contentWidth, headerH)

  // Column vertical dividers for header
  const divCols = [
    colX.desc,
    colX.hsn,
    colX.billNo,
    colX.billDate,
    colX.bags,
    colX.rate,
    colX.taxable,
    colX.igst,
    colX.totalDn
  ]
  divCols.forEach((x) => {
    doc.line(x, tableTop, x, tableTop + headerH)
  })

  // Header Titles
  doc.setFont('times', 'bold')
  doc.setFontSize(7.5)

  doc.text('SL NO', colX.slNo + colW.slNo / 2, tableTop + 6.0, { align: 'center' })
  doc.text('DESCRIPTION\nOF GOODS', colX.desc + colW.desc / 2, tableTop + 4.2, { align: 'center' })
  doc.text('HSN CODE', colX.hsn + colW.hsn / 2, tableTop + 6.0, { align: 'center' })
  doc.text('BILL NO', colX.billNo + colW.billNo / 2, tableTop + 6.0, { align: 'center' })
  doc.text('BILL\nDATE', colX.billDate + colW.billDate / 2, tableTop + 4.2, { align: 'center' })
  doc.text('BAGS\nQTY', colX.bags + colW.bags / 2, tableTop + 4.2, { align: 'center' })
  doc.text('RATE\nPER BAG', colX.rate + colW.rate / 2, tableTop + 4.2, { align: 'center' })
  doc.text('TOTAL\nTAXABLE\nAMT', colX.taxable + colW.taxable / 2, tableTop + 3.2, { align: 'center' })
  doc.text(taxTreatment === 'CGST_SGST' ? 'GST\nAMT' : 'IGST\nAMT', colX.igst + colW.igst / 2, tableTop + 4.2, { align: 'center' })
  doc.text('TOTAL\nDN AMT', colX.totalDn + colW.totalDn / 2, tableTop + 4.2, { align: 'center' })

  // Render Rows
  let curRowTop = tableTop + headerH
  const totalItemRowsH = Math.max(minTableBodyH, activeItems.length * rowHeight)

  doc.rect(margin, curRowTop, contentWidth, totalItemRowsH)
  divCols.forEach((x) => {
    doc.line(x, curRowTop, x, curRowTop + totalItemRowsH)
  })

  activeItems.forEach((item, idx) => {
    const itemY = curRowTop + idx * rowHeight
    if (idx > 0) {
      doc.line(margin, itemY, rightEdge, itemY)
    }

    const midY = itemY + (rowHeight / 2) + 1.2
    doc.setFont('times', 'normal')
    doc.setFontSize(8)

    // SL No
    doc.text(String(idx + 1), colX.slNo + colW.slNo / 2, midY, { align: 'center' })

    // Description of Goods (wrapped cleanly)
    const desc = item.description || ''
    if (desc) {
      const splitDesc = doc.splitTextToSize(desc, colW.desc - 4)
      const descStartY = itemY + 4.0
      doc.setFont('times', 'bold')
      doc.text(splitDesc, colX.desc + 2, descStartY)
      doc.setFont('times', 'normal')
    }

    // HSN Code
    doc.text(item.hsnCode || '44219140', colX.hsn + colW.hsn / 2, midY, { align: 'center' })

    // Bill No
    doc.text(item.billNo || '', colX.billNo + colW.billNo / 2, midY, { align: 'center' })

    // Bill Date
    doc.text(formatDebitNoteDate(item.billDate, 'shortMonth'), colX.billDate + colW.billDate / 2, midY, { align: 'center' })

    // Bags Qty
    doc.text(item.bagsQty ? String(item.bagsQty) : '', colX.bags + colW.bags / 2, midY, { align: 'center' })

    // Rate Per Bag
    doc.text(item.ratePerBag ? String(item.ratePerBag) : '', colX.rate + colW.rate / 2, midY, { align: 'center' })

    // Total Taxable Amt
    doc.text(item.taxableAmount ? formatIndianCurrency(item.taxableAmount) : '', colX.igst - 2.5, midY, { align: 'right' })

    // IGST Amt
    doc.text(item.igstAmount || item.lineGst ? formatIndianCurrency(item.igstAmount || item.lineGst) : '', colX.totalDn - 2.5, midY, { align: 'right' })

    // Total DN Amt
    doc.setFont('times', 'bold')
    doc.text(item.totalDnAmt ? formatIndianCurrency(item.totalDnAmt) : '', rightEdge - 2.5, midY, { align: 'right' })
    doc.setFont('times', 'normal')
  })

  // Table Totals Subtotal Row
  const subtotalTop = curRowTop + totalItemRowsH
  const subtotalH = 7.0
  doc.rect(margin, subtotalTop, contentWidth, subtotalH)
  divCols.forEach((x) => {
    doc.line(x, subtotalTop, x, subtotalTop + subtotalH)
  })

  doc.setFont('times', 'bold')
  doc.setFontSize(8.5)
  doc.text('TOTAL', colX.hsn + colW.hsn / 2, subtotalTop + 4.8, { align: 'center' })
  doc.text(totalBags ? String(totalBags) : '', colX.bags + colW.bags / 2, subtotalTop + 4.8, { align: 'center' })
  doc.text(formatIndianCurrency(totalTaxable), colX.igst - 2.5, subtotalTop + 4.8, { align: 'right' })
  doc.text(formatIndianCurrency(totalGst), colX.totalDn - 2.5, subtotalTop + 4.8, { align: 'right' })
  doc.text(formatIndianCurrency(totalDnAmt), rightEdge - 2.5, subtotalTop + 4.8, { align: 'right' })

  /* =========================================================================
     5. SUMMARY BOX: Taxable Amount, GST %, Total DN Amount (Right Aligned)
     ========================================================================= */
  const sumTop = subtotalTop + subtotalH
  const sumRowH = 6.2
  const sumWidth = colW.taxable + colW.igst + colW.totalDn // 56 mm
  const sumLeftX = colX.taxable

  for (let i = 0; i < 3; i++) {
    const curSumY = sumTop + i * sumRowH
    doc.rect(sumLeftX, curSumY, sumWidth, sumRowH)
    doc.line(colX.totalDn, curSumY, colX.totalDn, curSumY + sumRowH)
  }

  // Row 1: Taxable Amount
  doc.setFont('times', 'normal')
  doc.setFontSize(8.5)
  doc.text('Taxable Amount', sumLeftX + 2.5, sumTop + 4.4)
  doc.text(formatIndianCurrency(totalTaxable), rightEdge - 2.5, sumTop + 4.4, { align: 'right' })

  // Row 2: GST Rate & Amount
  const gstLabel = taxTreatment === 'CGST_SGST' ? `GST @ ${gstRate}%` : `IGST @ ${gstRate}%`
  doc.text(gstLabel, sumLeftX + 2.5, sumTop + sumRowH + 4.4)
  doc.text(formatIndianCurrency(totalGst), rightEdge - 2.5, sumTop + sumRowH + 4.4, { align: 'right' })

  // Row 3: Total DN Amount (Bold)
  doc.setFont('times', 'bold')
  doc.text('Total DN Amount', sumLeftX + 2.5, sumTop + sumRowH * 2 + 4.4)
  doc.text(formatIndianCurrency(totalDnAmt), rightEdge - 2.5, sumTop + sumRowH * 2 + 4.4, { align: 'right' })

  /* =========================================================================
     6. TOTAL VALUE IN WORDS ROW
     ========================================================================= */
  const wordsTop = sumTop + sumRowH * 3
  const wordsH = 7.5
  doc.rect(margin, wordsTop, contentWidth, wordsH)

  doc.setFont('times', 'bold')
  doc.setFontSize(8.5)
  doc.text(`Total Value in Words :- ${totalInWords}`, margin + 2.5, wordsTop + 5.0)

  /* =========================================================================
     7. FOOTER & PROPRIETOR SIGNATURE
     ========================================================================= */
  const signTop = wordsTop + wordsH + 12.0
  doc.setFont('times', 'bolditalic')
  doc.setFontSize(11)
  doc.text('For G.K. SAW MILL', rightEdge - 6, signTop, { align: 'right' })

  doc.setFont('times', 'bold')
  doc.setFontSize(10)
  doc.text('Proprietor', rightEdge - 12, signTop + 16.0, { align: 'right' })

  if (save) {
    const filename = `DebitNote_${debitNoteNo || 'DN'}_${(receiverName || 'Consignee').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    doc.save(filename)
  }

  const pdfBlob = doc.output('blob')
  return { doc, blob: pdfBlob }
}
