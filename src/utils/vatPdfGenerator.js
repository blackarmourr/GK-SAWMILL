import { jsPDF } from 'jspdf'
import { formatIndianCurrency, formatDate } from '../data/vatSettings.js'

/**
 * Generates an authentic A4 PDF for Kerala VAT Rules - 2005 Form No. 8F
 * Reproduces the exact 12 numbered fields, declaration, and bottom signature
 * as shown in the reference Kerala VAT.pdf document.
 *
 * @param {Object} data - The complete VAT bill document data
 * @returns {jsPDF} The generated jsPDF instance
 */
export function generateVatPdf(data) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const pageHeight = 297

  // Layout Grid Coordinates
  const colNumX = 22       // Number column (1, 2, ..., 12)
  const colLabelX = 32     // Field label column start
  const colLabelWidth = 84 // Max width for field labels
  const colValCenterX = 158 // Horizontal center for field values in right column
  const colValMaxWidth = 82 // Max width for wrapped values

  // Use standard serif font matching the official document
  doc.setFont('times', 'normal')
  doc.setTextColor(0, 0, 0)

  let curY = 26

  /* =========================================================================
     1. DOCUMENT HEADING
     ========================================================================= */
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.text('KERALA VALUE ADDED TAX RULES - 2005 FORM No, 8F', pageWidth / 2, curY, { align: 'center' })

  curY += 5.5
  doc.setFontSize(10.5)
  doc.text('PARTICULARS TO BE CONTAINED IN', pageWidth / 2, curY, { align: 'center' })

  curY += 5.0
  doc.text('INTERSTATE PURCHASE/ STOCK TRANSFER BLLS', pageWidth / 2, curY, { align: 'center' })

  curY += 5.0
  doc.setFontSize(10)
  doc.text('(SEE RULE 66(6))', pageWidth / 2, curY, { align: 'center' })

  curY += 12

  /* =========================================================================
     2. PREPARE 12 NUMBERED FIELDS DATA
     ========================================================================= */

  // Field 1: Consigner
  const f1Lines = []
  if (data.consignerName) f1Lines.push(data.consignerName)
  if (data.consignerBusinessName) f1Lines.push(data.consignerBusinessName)
  if (data.consignerAddress) f1Lines.push(data.consignerAddress)
  if (data.consignerRegistration) f1Lines.push(data.consignerRegistration)
  if (data.consignerPan) f1Lines.push(`PAN: ${data.consignerPan}`)
  if (data.consignerPhone) f1Lines.push(`PH: ${data.consignerPhone}`)

  // Field 2: E-Way Bill Number (single line)
  const f2Lines = []
  if (data.ewayBillNo) {
    f2Lines.push(data.ewayBillNo.trim())
  }

  // Field 3: Transaction Type
  const f3Lines = [data.transactionType || 'Regular']

  // Field 4: Consignee
  const f4Lines = []
  if (data.consigneeName) f4Lines.push(data.consigneeName)
  if (data.consigneeAddress) f4Lines.push(data.consigneeAddress)
  if (data.consigneeCity || data.consigneeState) {
    const loc = [data.consigneeCity, data.consigneeState].filter(Boolean).join(', ')
    if (loc) f4Lines.push(loc)
  }
  if (data.consigneeGstin) {
    f4Lines.push(`GSTN:-${data.consigneeGstin}`)
  } else if (data.consigneeTinCst) {
    f4Lines.push(`TIN/CST: ${data.consigneeTinCst}`)
  }

  // Field 5: Consigner (Whether Seller/Principal Agent)
  const f5Lines = [data.consignerSeller || 'G.K. SAW MILL']

  // Field 6: Principal Agent / Consigner
  const f6Lines = []
  if (data.principalAgentName) f6Lines.push(data.principalAgentName)
  if (data.principalAgentGstin) {
    f6Lines.push(`GSTN:-${data.principalAgentGstin}`)
  }

  // Field 7: Goods Description & Quantity
  const desc = data.goodsDescription || 'Vatta wood & Pencil Slats'
  const qty = data.bagQuantity !== undefined && data.bagQuantity !== '' ? `${data.bagQuantity} bag` : ''
  const f7Text = qty ? `${desc}, ${qty}` : desc
  const f7Lines = [f7Text]

  // Field 8: Bill No / Date / Value
  // Format: A-20/Rs:- 7,81,292.93/- Dt-10-10-2026
  const billNoPart = data.billNo ? `${data.billNo}` : 'A-20'
  const valPart = data.billValue !== undefined && data.billValue !== '' ? `Rs:- ${formatIndianCurrency(data.billValue)}/-` : ''
  const datePart = data.billDate ? `Dt-${formatDate(data.billDate, '-')}` : ''
  const f8Parts = [billNoPart, valPart, datePart].filter(Boolean)
  const f8Text = f8Parts.join('/')
  const f8Lines = [f8Text]

  // Field 9: Mode of Transport / Vehicle No.
  const mode = data.transportMode || 'By Road'
  const veh = data.vehicleNo ? data.vehicleNo.trim() : ''
  const f9Text = veh ? `${mode}, ${veh}` : `${mode},,`
  const f9Lines = [f9Text]

  // Field 10: Transport Document No. / Date
  const f10Lines = []
  if (data.transporterName) f10Lines.push(data.transporterName)
  if (data.transporterGstin) f10Lines.push(`GSTN:-${data.transporterGstin}`)
  if (data.transportDocNo || data.transportDocDate) {
    const docParts = []
    if (data.transportDocNo) docParts.push(`Doc No: ${data.transportDocNo}`)
    if (data.transportDocDate) docParts.push(`Dt: ${formatDate(data.transportDocDate, '-')}`)
    f10Lines.push(docParts.join('  '))
  }

  // Field 11: Carrier Name & Full Address
  const f11Lines = []
  if (data.carrierName) f11Lines.push(data.carrierName)
  if (data.carrierGstin) f11Lines.push(`GSTN:-${data.carrierGstin}`)
  if (data.carrierAddress) f11Lines.push(data.carrierAddress)

  // Field 12: Driver Name, Full Address, Licence No.
  const f12Lines = []
  if (data.driverName) f12Lines.push(data.driverName)
  if (data.driverLicenceNo) f12Lines.push(`DL NO; ${data.driverLicenceNo}`)
  if (data.driverState) f12Lines.push(data.driverState)
  if (data.driverAddress) f12Lines.push(data.driverAddress)

  // Array of 12 field definitions matching the official document
  const FIELDS = [
    {
      num: '1',
      labelLines: [
        'Name & Address of the Consigner with',
        'TIN/CST RC No. Phone No. E-mail, PAN etc.'
      ],
      valLines: f1Lines.length ? f1Lines : ['Anil Kumar.G', 'G.K. Saw Mill', 'Kattur, Nedumpana, Kollam', '32AHOPG1823G1ZP'],
      valLinesRaw: f1Lines
    },
    {
      num: '2',
      labelLines: ['E Way Bill No:'],
      valLines: f2Lines
    },
    {
      num: '3',
      labelLines: ['Transaction Type'],
      valLines: f3Lines
    },
    {
      num: '4',
      labelLines: [
        'Name &, Address of the Consignee with',
        'TIN/CST RC No. Phone No. E-mail, PAN etc.'
      ],
      valLines: f4Lines
    },
    {
      num: '5',
      labelLines: ['Consigner(Whether Seller/Principal Agent)'],
      valLines: f5Lines
    },
    {
      num: '6',
      labelLines: ['Consigner(Whether Seller/Principal Agent)'],
      valLines: f6Lines
    },
    {
      num: '7',
      labelLines: ['Full Description of Goods with Quantity'],
      valLines: f7Lines
    },
    {
      num: '8',
      labelLines: ['Bill No./Date and Value'],
      valLines: f8Lines
    },
    {
      num: '9',
      labelLines: ['Mode of Trasport / Vehicle No.'],
      valLines: f9Lines
    },
    {
      num: '10',
      labelLines: ['Trasport Document No./ Date'],
      valLines: f10Lines
    },
    {
      num: '11',
      labelLines: [
        'Name & Full Address of the Carrier',
        '(Trasporter Co. or Owner of the Vehicle)'
      ],
      valLines: f11Lines
    },
    {
      num: '12',
      labelLines: [
        'Name &, Full Address of the Driver of the',
        'Vehicle with Driving Licence No.'
      ],
      valLines: f12Lines
    }
  ]

  /* =========================================================================
     3. RENDER 12 FIELDS
     ========================================================================= */
  const lineHeight = 4.9 // mm per line
  const fieldSpacing = 5.2 // gap between rows

  doc.setFontSize(10.5)

  FIELDS.forEach((f) => {
    // 1. Wrap label lines
    const wrappedLabels = []
    f.labelLines.forEach(l => {
      const split = doc.splitTextToSize(l, colLabelWidth)
      wrappedLabels.push(...split)
    })

    // 2. Wrap value lines
    const wrappedVals = []
    const valSource = f.valLinesRaw || f.valLines
    valSource.forEach(v => {
      const split = doc.splitTextToSize(v, colValMaxWidth)
      wrappedVals.push(...split)
    })

    const numLabelLines = wrappedLabels.length
    const numValLines = Math.max(wrappedVals.length, 1)
    const rowLineCount = Math.max(numLabelLines, numValLines)
    const rowHeight = rowLineCount * lineHeight

    // Draw field number (left-aligned)
    doc.setFont('times', 'normal')
    doc.text(f.num, colNumX, curY)

    // Draw label lines (left-aligned at colLabelX)
    wrappedLabels.forEach((lbl, idx) => {
      doc.text(lbl, colLabelX, curY + (idx * lineHeight))
    })

    // Draw value lines (centered horizontally at colValCenterX)
    wrappedVals.forEach((val, idx) => {
      doc.text(val, colValCenterX, curY + (idx * lineHeight), { align: 'center' })
    })

    curY += rowHeight + fieldSpacing
  })

  /* =========================================================================
     4. DECLARATION SECTION
     ========================================================================= */
  curY += 10

  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.text('DECLARATION', pageWidth / 2, curY, { align: 'center' })

  curY += 6

  const consignerName = data.consignerName || 'G. Anil Kumar'
  const businessName = data.consignerBusinessName || 'G.K. Saw Mill'
  const address = data.consignerAddress || 'Kattur, Nedumpana, Kollam'
  const pin = data.consignerPin ? ` - ${data.consignerPin}` : ' - 691576'

  const declarationText = `I, ${consignerName}, ${businessName}, ${address}${pin} the consigner hereby declare that the information above correct and complete.`

  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  const declLines = doc.splitTextToSize(declarationText, 170)
  declLines.forEach((line) => {
    doc.text(line, colNumX, curY)
    curY += 5.2
  })

  /* =========================================================================
     5. BOTTOM SECTION: DATE, PLACE & SIGNATURE
     ========================================================================= */
  curY += 16

  // Left side: Date & Place
  const declDate = data.declarationDate
    ? formatDate(data.declarationDate, '/')
    : formatDate(new Date().toISOString().split('T')[0], '/')
  const declPlace = data.declarationPlace || 'Nedumpana'

  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  doc.text(declDate, colNumX, curY)
  doc.text(declPlace, colNumX, curY + 5.2)

  // Right side: Signature & Name
  const sigX = colValCenterX
  doc.text('Signature & Name', sigX, curY, { align: 'center' })

  const signatory = data.signatoryName || consignerName || 'G. Anil Kumar'
  doc.setFont('times', 'bold')
  doc.setFontSize(10.5)
  // Generous vertical space for physical signature
  doc.text(signatory, sigX, curY + 14, { align: 'center' })

  return doc
}

/**
 * Convenience helper to download the VAT Bill PDF directly in browser
 */
export function downloadVatPdf(data) {
  const doc = generateVatPdf(data)
  const billNo = (data.billNo || 'Draft').replace(/[^a-zA-Z0-9_-]/g, '_')
  const dateStr = data.billDate ? formatDate(data.billDate, '-') : 'Kerala-VAT'
  const filename = `Kerala_VAT_Form_8F_${billNo}_${dateStr}.pdf`
  doc.save(filename)
  return filename
}
