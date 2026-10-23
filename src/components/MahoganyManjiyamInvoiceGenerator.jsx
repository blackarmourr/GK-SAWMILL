import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  FileDown,
  ArrowLeft,
  Save,
  FolderOpen,
  Settings,
  Users,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Layers,
  Sparkles,
  Info,
  RotateCcw,
  PlusCircle,
  Truck,
  Hash,
  Building2,
  Percent,
  X
} from 'lucide-react'
import {
  getStoredSettings,
  saveStoredSettings,
  getSavedCustomers,
  saveCustomer,
  getSavedInvoices,
  saveInvoiceRecord,
} from '../data/invoiceSettings.js'
import { convertNumberToIndianWords } from '../utils/numberToWords.js'
import { generateInvoicePdf } from '../utils/invoicePdfGenerator.js'
import { getNextSuggestedInvoice } from '../utils/invoiceSequenceHelper.js'

export default function MahoganyManjiyamInvoiceGenerator({ onBack, onOpenSizeChart }) {
  // Settings & Storage State
  const [settings, setSettings] = useState(() => getStoredSettings())
  const [savedCustomers, setSavedCustomers] = useState(() => getSavedCustomers())
  const [savedInvoices, setSavedInvoices] = useState(() => getSavedInvoices())

  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showSavedInvoicesModal, setShowSavedInvoicesModal] = useState(false)
  const [notification, setNotification] = useState(null)
  const [validationError, setValidationError] = useState('')

  // Invoice Form State (A-21 was last invoice, so next defaults to A-22)
  const [invoiceId, setInvoiceId] = useState(() => 'inv_' + Date.now())
  const [invoiceNo, setInvoiceNo] = useState(() => {
    try {
      const seq = getNextSuggestedInvoice()
      return seq?.suggestedInvoiceNo || 'A-22'
    } catch {
      return 'A-22'
    }
  })
  const [invoiceDate, setInvoiceDate] = useState('01-10-2026')
  const [vehicleNo, setVehicleNo] = useState('KL-02-AN-7779')
  const [dateOfSupply, setDateOfSupply] = useState('01-10-2026')
  const [transportationMode, setTransportationMode] = useState('')
  const [placeOfSupply, setPlaceOfSupply] = useState('Tamil Nadu')
  const [state, setState] = useState('Kerala')
  const [stateCode, setStateCode] = useState('32')
  const [reverseCharge, setReverseCharge] = useState('')
  const [ewayBillNo, setEwayBillNo] = useState('5720 8197 3570')

  // Receiver State
  const [receiverName, setReceiverName] = useState('SREE AMMAN TRADERS')
  const [receiverAddress, setReceiverAddress] = useState(
    '15, Solaialagupuram Ist Street\n25 Solaialagupuram Main Road\nJAIHINDPURAM\nMADURAI, TAMILNADU -625011'
  )
  const [receiverGstin, setReceiverGstin] = useState('33JYGPK7174A1ZF')
  const [receiverState, setReceiverState] = useState('Tamil Nadu')
  const [receiverStateCode, setReceiverStateCode] = useState('33')

  // Dispatched State
  const [dispatchedDetails, setDispatchedDetails] = useState('')
  const [showDispatchedField, setShowDispatchedField] = useState(false)

  // Products State
  const [mahoganyEnabled, setMahoganyEnabled] = useState(true)
  const [mahoganyDesc, setMahoganyDesc] = useState('Mahogany Rejected size\nAll size')
  const [mahoganyHsn, setMahoganyHsn] = useState(settings.mahoganyHsn || '4407')
  const [mahoganyRate, setMahoganyRate] = useState(settings.mahoganyDefaultRate || 215)
  const [mahoganyTaxableValue, setMahoganyTaxableValue] = useState(99975)

  const [manjiyamEnabled, setManjiyamEnabled] = useState(true)
  const [manjiyamDesc, setManjiyamDesc] = useState('Manjiyam Rejected Size\nAll size')
  const [manjiyamHsn, setManjiyamHsn] = useState(settings.manjiyamHsn || '4407')
  const [manjiyamRate, setManjiyamRate] = useState(settings.manjiyamDefaultRate || 210)
  const [manjiyamTaxableValue, setManjiyamTaxableValue] = useState(25200)

  // Tax State
  const [taxTreatment, setTaxTreatment] = useState(settings.defaultTaxTreatment || 'IGST') // 'IGST' | 'CGST_SGST'
  const [gstRate, setGstRate] = useState(settings.defaultGstRate || 18)

  // Additional Charges & Notes
  const [freight, setFreight] = useState('')
  const [insurance, setInsurance] = useState('')
  const [packingCharge, setPackingCharge] = useState('')
  const [discount, setDiscount] = useState('')
  const [roundOff, setRoundOff] = useState('')
  const [cbmOverride, setCbmOverride] = useState('')

  // Bank & Terms State
  const [bankDetails, setBankDetails] = useState(settings.bankName || '')
  const [accountNumber, setAccountNumber] = useState(settings.accountNumber || '')
  const [branchIfsc, setBranchIfsc] = useState(settings.branchIfsc || '')
  const [termsAndConditions, setTermsAndConditions] = useState(settings.termsAndConditions || '')

  // Flash notification helper
  const notify = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  // Automated Calculations
  const calculations = useMemo(() => {
    // 1. Mahogany CFT
    const mahogVal = mahoganyEnabled && Number(mahoganyTaxableValue) > 0 ? Number(mahoganyTaxableValue) : 0
    const mahogR = Number(mahoganyRate) > 0 ? Number(mahoganyRate) : 1
    const mahogCft = mahogVal > 0 ? mahogVal / mahogR : 0

    // 2. Manjiyam CFT
    const manjVal = manjiyamEnabled && Number(manjiyamTaxableValue) > 0 ? Number(manjiyamTaxableValue) : 0
    const manjR = Number(manjiyamRate) > 0 ? Number(manjiyamRate) : 1
    const manjCft = manjVal > 0 ? manjVal / manjR : 0

    // 3. Combined CFT & CBM
    const totalCft = mahogCft + manjCft
    const autoCbm = totalCft * 0.0283168466
    const totalCbm = cbmOverride !== '' && !isNaN(parseFloat(cbmOverride)) ? parseFloat(cbmOverride) : autoCbm

    // 4. Subtotal & Taxable Value
    const subTotal = mahogVal + manjVal
    const disc = Number(discount) > 0 ? Number(discount) : 0
    const taxableValue = Math.max(0, subTotal - disc)

    // 5. GST breakdown
    let cgstRate = 0, cgstAmt = 0
    let sgstRate = 0, sgstAmt = 0
    let igstRate = 0, igstAmt = 0

    const currentGstRate = Number(gstRate) || 0

    if (taxTreatment === 'CGST_SGST') {
      cgstRate = currentGstRate / 2
      sgstRate = currentGstRate / 2
      cgstAmt = (taxableValue * cgstRate) / 100
      sgstAmt = (taxableValue * sgstRate) / 100
    } else {
      igstRate = currentGstRate
      igstAmt = (taxableValue * igstRate) / 100
    }

    const totalGst = cgstAmt + sgstAmt + igstAmt
    const frt = Number(freight) > 0 ? Number(freight) : 0
    const ins = Number(insurance) > 0 ? Number(insurance) : 0
    const pck = Number(packingCharge) > 0 ? Number(packingCharge) : 0

    let grandTotal = taxableValue + totalGst + frt + ins + pck
    let finalRoundOff = Number(roundOff) || 0

    if (settings.roundingMode === 'nearest_rupee') {
      const rounded = Math.round(grandTotal)
      finalRoundOff = Number((rounded - grandTotal).toFixed(2))
      grandTotal = rounded
    } else {
      grandTotal = grandTotal + finalRoundOff
    }

    const grandTotalWords = convertNumberToIndianWords(grandTotal)

    return {
      mahoganyCft: Number(mahogCft.toFixed(2)),
      manjiyamCft: Number(manjCft.toFixed(2)),
      totalCft: Number(totalCft.toFixed(2)),
      autoCbm: Number(autoCbm.toFixed(2)),
      totalCbm: Number(totalCbm.toFixed(2)),
      subTotal: Number(subTotal.toFixed(2)),
      taxableValue: Number(taxableValue.toFixed(2)),
      cgstRate,
      cgstAmount: Number(cgstAmt.toFixed(2)),
      sgstRate,
      sgstAmount: Number(sgstAmt.toFixed(2)),
      igstRate,
      igstAmount: Number(igstAmt.toFixed(2)),
      totalGst: Number(totalGst.toFixed(2)),
      roundOff: finalRoundOff,
      grandTotal: Number(grandTotal.toFixed(2)),
      grandTotalWords,
    }
  }, [
    mahoganyEnabled,
    mahoganyTaxableValue,
    mahoganyRate,
    manjiyamEnabled,
    manjiyamTaxableValue,
    manjiyamRate,
    discount,
    taxTreatment,
    gstRate,
    freight,
    insurance,
    packingCharge,
    roundOff,
    settings.roundingMode,
  ])

  // Cross-module Financial Year sequential invoice tracker
  const suggestedSequence = useMemo(() => {
    let target = new Date()
    if (invoiceDate) {
      if (/^\d{2}-\d{2}-\d{4}$/.test(invoiceDate)) {
        const parts = invoiceDate.split('-')
        target = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
      } else {
        target = new Date(invoiceDate)
      }
    }
    return getNextSuggestedInvoice(target)
  }, [invoiceDate, savedInvoices])

  // Select customer from saved list
  const handleSelectCustomer = (cust) => {
    setReceiverName(cust.name || '')
    setReceiverAddress(cust.address || '')
    setReceiverGstin(cust.gstin || '')
    setReceiverState(cust.state || '')
    setReceiverStateCode(cust.stateCode || '')
    if (cust.placeOfSupply) setPlaceOfSupply(cust.placeOfSupply)
    notify(`Loaded customer: ${cust.name}`)
  }

  // Save current receiver as customer
  const handleSaveCurrentCustomer = () => {
    if (!receiverName || !receiverName.trim()) {
      setValidationError('Please enter a receiver name before saving.')
      return
    }
    const updated = saveCustomer({
      name: receiverName,
      address: receiverAddress,
      gstin: receiverGstin,
      state: receiverState,
      stateCode: receiverStateCode,
      placeOfSupply,
    })
    setSavedCustomers(updated)
    notify('Customer saved to library!')
  }

  // Save full invoice record to localStorage
  const handleSaveInvoice = () => {
    if (!invoiceNo.trim()) {
      setValidationError('Please enter an Invoice Number.')
      return
    }

    const currentInvoiceData = getCurrentInvoiceDataObject()
    const saved = saveInvoiceRecord(currentInvoiceData)
    setSavedInvoices(getSavedInvoices())
    notify(`Invoice ${saved.invoiceNo} saved successfully!`)
  }

  // Load a saved invoice record into form
  const handleLoadInvoice = (inv) => {
    setInvoiceId(inv.id || 'inv_' + Date.now())
    setInvoiceNo(inv.invoiceNo || '')
    setInvoiceDate(inv.invoiceDate || '')
    setVehicleNo(inv.vehicleNo || '')
    setDateOfSupply(inv.dateOfSupply || '')
    setTransportationMode(inv.transportationMode || '')
    setPlaceOfSupply(inv.placeOfSupply || '')
    setState(inv.state || 'Kerala')
    setStateCode(inv.stateCode || '32')
    setReverseCharge(inv.reverseCharge || '')
    setEwayBillNo(inv.ewayBillNo || '')

    setReceiverName(inv.receiverName || '')
    setReceiverAddress(inv.receiverAddress || '')
    setReceiverGstin(inv.receiverGstin || '')
    setReceiverState(inv.receiverState || '')
    setReceiverStateCode(inv.receiverStateCode || '')
    setDispatchedDetails(inv.dispatchedDetails || '')

    setMahoganyEnabled(inv.mahoganyEnabled ?? true)
    setMahoganyDesc(inv.mahoganyDesc || 'Mahogany Rejected size\nAll size')
    setMahoganyHsn(inv.mahoganyHsn || '4407')
    setMahoganyRate(inv.mahoganyRate || 215)
    setMahoganyTaxableValue(inv.mahoganyTaxableValue || 0)

    setManjiyamEnabled(inv.manjiyamEnabled ?? true)
    setManjiyamDesc(inv.manjiyamDesc || 'Manjiyam Rejected Size\nAll size')
    setManjiyamHsn(inv.manjiyamHsn || '4407')
    setManjiyamRate(inv.manjiyamRate || 210)
    setManjiyamTaxableValue(inv.manjiyamTaxableValue || 0)

    setTaxTreatment(inv.taxTreatment || 'IGST')
    setGstRate(inv.gstRate || 18)
    setFreight(inv.freight || '')
    setInsurance(inv.insurance || '')
    setPackingCharge(inv.packingCharge || '')
    setDiscount(inv.discount || '')
    setRoundOff(inv.roundOff || '')
    setCbmOverride(inv.cbmOverride || '')

    setBankDetails(inv.bankDetails || '')
    setAccountNumber(inv.accountNumber || '')
    setBranchIfsc(inv.branchIfsc || '')
    setTermsAndConditions(inv.termsAndConditions || '')

    setShowSavedInvoicesModal(false)
    notify(`Loaded Invoice ${inv.invoiceNo}`)
  }

  // Reset to new clean invoice
  const handleNewInvoice = () => {
    setInvoiceId('inv_' + Date.now())
    const nextInv = suggestedSequence?.suggestedInvoiceNo || 'A-22'
    setInvoiceNo(nextInv)
    setInvoiceDate(new Date().toLocaleDateString('en-GB').replace(/\//g, '-'))
    setMahoganyTaxableValue(0)
    setManjiyamTaxableValue(0)
    setFreight('')
    setInsurance('')
    setPackingCharge('')
    setDiscount('')
    setRoundOff('')
    setCbmOverride('')
    notify('Created new blank invoice')
  }

  // Helper assembling current data
  const getCurrentInvoiceDataObject = () => ({
    id: invoiceId,
    businessName: settings.businessName,
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2,
    telephone: settings.telephone,
    email: settings.email,
    gstin: settings.gstin,

    invoiceNo,
    invoiceDate,
    vehicleNo,
    dateOfSupply,
    transportationMode,
    placeOfSupply,
    state,
    stateCode,
    reverseCharge,
    ewayBillNo,

    receiverName,
    receiverAddress,
    receiverGstin,
    receiverState,
    receiverStateCode,
    dispatchedDetails,

    mahoganyEnabled,
    mahoganyDesc,
    mahoganyHsn,
    mahoganyRate,
    mahoganyTaxableValue,
    mahoganyCft: calculations.mahoganyCft,

    manjiyamEnabled,
    manjiyamDesc,
    manjiyamHsn,
    manjiyamRate,
    manjiyamTaxableValue,
    manjiyamCft: calculations.manjiyamCft,
    totalCft: calculations.totalCft,
    grandTotal: calculations.grandTotal,

    cbmOverride,

    taxTreatment,
    gstRate,
    freight,
    insurance,
    packingCharge,
    discount,
    roundOff,
    roundingMode: settings.roundingMode,

    bankDetails,
    accountNumber,
    branchIfsc,
    termsAndConditions,
  })

  // Generate and Download PDF
  const handleGeneratePdf = () => {
    setValidationError('')

    // Validation
    if (!invoiceNo || !invoiceNo.trim()) {
      setValidationError('Please enter an Invoice Number.')
      return
    }
    if (!receiverName || !receiverName.trim()) {
      setValidationError('Please enter Receiver Name.')
      return
    }
    if (calculations.taxableValue <= 0) {
      setValidationError('Please enter a valid taxable amount for Mahogany or Manjiyam.')
      return
    }
    if (Number(mahoganyRate) <= 0 || Number(manjiyamRate) <= 0) {
      setValidationError('Product rates must be positive numbers.')
      return
    }

    try {
      const invoiceData = getCurrentInvoiceDataObject()
      generateInvoicePdf(invoiceData, true)
      notify('Invoice PDF generated and downloaded!')
    } catch (err) {
      console.error('Invoice PDF error:', err)
      setValidationError('Error generating Invoice PDF. Please check your inputs.')
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      
      {/* Top Navigation & Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: '#ffffff',
            color: 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onOpenSizeChart}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#1e3a2b',
              fontWeight: 700,
              fontSize: '0.825rem',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={14} color="#925c38" />
            Size Chart Generator &rarr;
          </button>

          <button
            type="button"
            onClick={() => setShowSavedInvoicesModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer'
            }}
          >
            <FolderOpen size={15} />
            Saved Invoices ({savedInvoices.length})
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer'
            }}
          >
            <Settings size={15} />
            Settings
          </button>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {notification && (
        <div
          style={{
            marginBottom: '1rem',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#065f46',
            fontSize: '0.875rem',
            fontWeight: 700
          }}
        >
          <CheckCircle2 size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div
          style={{
            marginBottom: '1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#b91c1c',
            fontSize: '0.875rem',
            fontWeight: 700
          }}
        >
          <AlertCircle size={18} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Form Container */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          marginBottom: '2rem'
        }}
      >
        {/* Module Header Bar */}
        <div
          style={{
            background: 'linear-gradient(135deg, #162c20 0%, #1e3a2b 100%)',
            color: '#ffffff',
            padding: '1.5rem',
            borderBottom: '3px solid #d4a373',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: 'rgba(255,255,255,0.15)',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                color: '#fef3c7'
              }}
            >
              FORM GST INVOICE - I
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.35rem' }}>
              Mahogany & Manjiyam Invoice Generator
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#a7f3d0' }}>
              Enter taxable amounts to auto-calculate wood CFT & CBM volume, compute GST, and print official A4 tax invoices.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleNewInvoice}
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              New Invoice
            </button>
            <button
              type="button"
              onClick={handleSaveInvoice}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: '#d4a373',
                color: '#1e3a2b',
                fontSize: '0.825rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Save size={15} />
              Save Invoice
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.5rem', background: '#fafbfc' }}>
          
          {/* SECTION A: Invoice Details */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <h3 style={{ fontSize: '0.925rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={17} />
              Section A: Invoice Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                    Invoice Number *
                  </label>
                  {suggestedSequence && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: '#eaf3ed',
                        color: '#166534',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px'
                      }}
                      title="Indian Financial Year runs from April 1 to March 31. Series resets to A-1 on April 1st."
                    >
                      FY {suggestedSequence.currentFy}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="e.g. A-22"
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
                />
                {suggestedSequence && (
                  <div
                    style={{
                      marginTop: '0.35rem',
                      fontSize: '0.72rem',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.25rem'
                    }}
                  >
                    <span>
                      {suggestedSequence.lastInvoice ? (
                        <>
                          Last: <strong>{suggestedSequence.lastInvoice.invoiceNo}</strong> ({suggestedSequence.lastInvoice.typeLabel === 'Vatta Wood' ? 'Vatta' : 'Timber'})
                        </>
                      ) : (
                        <span>Fresh FY start</span>
                      )}
                    </span>
                    {invoiceNo !== suggestedSequence.suggestedInvoiceNo && (
                      <button
                        type="button"
                        onClick={() => setInvoiceNo(suggestedSequence.suggestedInvoiceNo)}
                        style={{
                          background: '#eaf3ed',
                          border: '1px solid #b7d6c2',
                          color: '#1e3a2b',
                          borderRadius: '4px',
                          padding: '0.15rem 0.45rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Suggest: {suggestedSequence.suggestedInvoiceNo}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Invoice Date *
                </label>
                <input
                  type="text"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: 600, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  placeholder="e.g. KL-02-AN-7779"
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: 600, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Date of Supply
                </label>
                <input
                  type="text"
                  value={dateOfSupply}
                  onChange={(e) => setDateOfSupply(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: 600, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Transportation Mode
                </label>
                <input
                  type="text"
                  value={transportationMode}
                  onChange={(e) => setTransportationMode(e.target.value)}
                  placeholder="e.g. Road / By Road"
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Place of Supply
                </label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  placeholder="e.g. Tamil Nadu"
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: 600, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Supplier State & Code
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    style={{ flex: 3, padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                  <input
                    type="text"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    placeholder="Code"
                    style={{ flex: 1, padding: '0.65rem 0.4rem', borderRadius: '7px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  E-way Bill Number
                </label>
                <input
                  type="text"
                  value={ewayBillNo}
                  onChange={(e) => setEwayBillNo(e.target.value)}
                  placeholder="e.g. 5720 8197 3570"
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: 600, boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION B: Receiver & Dispatched Details */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '0.925rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={17} />
                Section B: Receiver Details
              </h3>

              {/* Saved Customers dropdown pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Saved Customers:</span>
                {savedCustomers.map((c) => (
                  <button
                    key={c.id || c.name}
                    type="button"
                    onClick={() => handleSelectCustomer(c)}
                    style={{
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: receiverName === c.name ? '#eaf3ed' : '#ffffff',
                      color: receiverName === c.name ? 'var(--primary)' : '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    {c.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleSaveCurrentCustomer}
                  style={{
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  + Save Current
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Receiver Name *
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="e.g. SREE AMMAN TRADERS"
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
                />

                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginTop: '0.75rem', marginBottom: '0.3rem' }}>
                  Receiver GSTIN
                </label>
                <input
                  type="text"
                  value={receiverGstin}
                  onChange={(e) => setReceiverGstin(e.target.value)}
                  placeholder="e.g. 33JYGPK7174A1ZF"
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: 600, boxSizing: 'border-box' }}
                />

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <div style={{ flex: 3 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                      Receiver State
                    </label>
                    <input
                      type="text"
                      value={receiverState}
                      onChange={(e) => setReceiverState(e.target.value)}
                      placeholder="e.g. Tamil Nadu"
                      style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1.5 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                      State Code
                    </label>
                    <input
                      type="text"
                      value={receiverStateCode}
                      onChange={(e) => setReceiverStateCode(e.target.value)}
                      placeholder="e.g. 33"
                      style={{ width: '100%', padding: '0.65rem 0.5rem', borderRadius: '7px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Receiver Address (Multi-line)
                </label>
                <textarea
                  rows={6}
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  placeholder="Street address, locality, city, pincode..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.4,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Optional Dispatched Details Toggle */}
            <div style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowDispatchedField(!showDispatchedField)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showDispatchedField ? '− Hide Details of Dispatched' : '+ Add Details of Dispatched (Optional)'}
              </button>

              {showDispatchedField && (
                <div style={{ marginTop: '0.5rem' }}>
                  <textarea
                    rows={3}
                    value={dispatchedDetails}
                    onChange={(e) => setDispatchedDetails(e.target.value)}
                    placeholder="Enter dispatch address or consignee details if different from receiver..."
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION C: Products, Taxable Values & Automated CFT */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <h3 style={{ fontSize: '0.925rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calculator size={17} />
              Section C: Wood Products & Automated CFT
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Enter the target Taxable Amount for each product. Quantity (CFT) is calculated automatically: <code>CFT = Taxable Value ÷ Rate</code>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Product 1: Mahogany */}
              <div
                style={{
                  background: mahoganyEnabled ? '#ffffff' : '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  opacity: mahoganyEnabled ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={mahoganyEnabled}
                      onChange={(e) => setMahoganyEnabled(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Item 1: Mahogany Rejected size (All size)
                  </label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    HSN Code: {mahoganyHsn}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                      Rate per CFT (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={mahoganyRate}
                      disabled={!mahoganyEnabled}
                      onChange={(e) => setMahoganyRate(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.3rem' }}>
                      Taxable Value (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={mahoganyTaxableValue}
                      disabled={!mahoganyEnabled}
                      onChange={(e) => setMahoganyTaxableValue(e.target.value)}
                      placeholder="e.g. 99975"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.8rem',
                        borderRadius: '7px',
                        border: '2px solid var(--primary)',
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: 'var(--primary)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ background: '#eaf3ed', borderRadius: '7px', padding: '0.65rem 0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>
                      Auto-Calculated Mahogany CFT
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)' }}>
                      {calculations.mahoganyCft.toFixed(2)} CFT
                    </span>
                  </div>
                </div>
              </div>

              {/* Product 2: Manjiyam */}
              <div
                style={{
                  background: manjiyamEnabled ? '#ffffff' : '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  opacity: manjiyamEnabled ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={manjiyamEnabled}
                      onChange={(e) => setManjiyamEnabled(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Item 2: Manjiyam Rejected Size (All size)
                  </label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    HSN Code: {manjiyamHsn}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                      Rate per CFT (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={manjiyamRate}
                      disabled={!manjiyamEnabled}
                      onChange={(e) => setManjiyamRate(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#925c38', marginBottom: '0.3rem' }}>
                      Taxable Value (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={manjiyamTaxableValue}
                      disabled={!manjiyamEnabled}
                      onChange={(e) => setManjiyamTaxableValue(e.target.value)}
                      placeholder="e.g. 25200"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.8rem',
                        borderRadius: '7px',
                        border: '2px solid #925c38',
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: '#925c38',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ background: '#fdf8f4', borderRadius: '7px', padding: '0.65rem 0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#925c38' }}>
                      Auto-Calculated Manjiyam CFT
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#925c38' }}>
                      {calculations.manjiyamCft.toFixed(2)} CFT
                    </span>
                  </div>
                </div>
              </div>

              {/* Combined Volume Banner (CFT & CBM) */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                    Combined Total Quantity:
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    {calculations.totalCft.toFixed(2)} CFT
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Formula: CFT × 0.0283168466
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>
                      Manual CBM Override (Optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={cbmOverride}
                      onChange={(e) => setCbmOverride(e.target.value)}
                      placeholder={calculations.autoCbm.toFixed(2)}
                      style={{
                        width: '120px',
                        padding: '0.45rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textAlign: 'center'
                      }}
                    />
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                      CBM Volume on Invoice:
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)' }}>
                      (Qty in CBM :-{calculations.totalCbm.toFixed(2)})
                    </div>
                    {cbmOverride !== '' && (
                      <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 700 }}>
                        Overridden from {calculations.autoCbm.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION D: Tax Treatment & GST Breakdown */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <h3 style={{ fontSize: '0.925rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Percent size={17} />
              Section D: Tax Treatment & Additional Charges
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  GST Tax Treatment
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setTaxTreatment('IGST')}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.5rem',
                      borderRadius: '7px',
                      border: taxTreatment === 'IGST' ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                      background: taxTreatment === 'IGST' ? '#eaf3ed' : '#ffffff',
                      color: taxTreatment === 'IGST' ? 'var(--primary)' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.825rem',
                      cursor: 'pointer'
                    }}
                  >
                    IGST (Inter-state)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxTreatment('CGST_SGST')}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.5rem',
                      borderRadius: '7px',
                      border: taxTreatment === 'CGST_SGST' ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                      background: taxTreatment === 'CGST_SGST' ? '#eaf3ed' : '#ffffff',
                      color: taxTreatment === 'CGST_SGST' ? 'var(--primary)' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.825rem',
                      cursor: 'pointer'
                    }}
                  >
                    CGST + SGST (Intra-state)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Total GST Rate (%)
                </label>
                <input
                  type="number"
                  step="any"
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Freight Charges (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={freight}
                  onChange={(e) => setFreight(e.target.value)}
                  placeholder="Optional"
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Discount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="Optional"
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION E: Live Invoice Summary & Grand Total Card */}
          <div
            style={{
              background: '#ffffff',
              border: '2px solid var(--primary)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 15px rgba(30, 58, 43, 0.08)'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Sub Total</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>₹{calculations.subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Taxable Value</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>₹{calculations.taxableValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                  {taxTreatment === 'IGST' ? `IGST (${calculations.igstRate}%)` : `CGST (${calculations.cgstRate}%) + SGST (${calculations.sgstRate}%)`}
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>₹{calculations.totalGst.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>

              <div style={{ background: '#eaf3ed', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)' }}>GRAND TOTAL</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>₹{calculations.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* In Words */}
            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
              <strong>Grand Total in Words:</strong> ( {calculations.grandTotalWords} )
            </div>
          </div>

          {/* Final Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleGeneratePdf}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem 1.6rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(30, 58, 43, 0.35)',
                  transition: 'all 0.15s'
                }}
              >
                <FileDown size={18} />
                <span>Generate Invoice PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSaveInvoice}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <Save size={16} />
                <span>Save Invoice Record</span>
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Format: Official FORM GST INVOICE - I (A4 Portrait)
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Settings Modal */}
      {showSettingsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSettingsModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Central Invoice & Business Settings
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Configured values are saved in your browser storage and used as defaults for new invoices.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem' }}>Business Name</label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem' }}>GSTIN</label>
                  <input
                    type="text"
                    value={settings.gstin}
                    onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem' }}>Telephone</label>
                  <input
                    type="text"
                    value={settings.telephone}
                    onChange={(e) => setSettings({ ...settings, telephone: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem' }}>Email</label>
                <input
                  type="text"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem' }}>Default Mahogany Rate (₹/CFT)</label>
                  <input
                    type="number"
                    value={settings.mahoganyDefaultRate}
                    onChange={(e) => setSettings({ ...settings, mahoganyDefaultRate: parseFloat(e.target.value) || 215 })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem' }}>Default Manjiyam Rate (₹/CFT)</label>
                  <input
                    type="number"
                    value={settings.manjiyamDefaultRate}
                    onChange={(e) => setSettings({ ...settings, manjiyamDefaultRate: parseFloat(e.target.value) || 210 })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem' }}>Default GST Rate (%)</label>
                  <input
                    type="number"
                    value={settings.defaultGstRate}
                    onChange={(e) => setSettings({ ...settings, defaultGstRate: parseFloat(e.target.value) || 18 })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem' }}>Rounding Mode</label>
                  <select
                    value={settings.roundingMode}
                    onChange={(e) => setSettings({ ...settings, roundingMode: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  >
                    <option value="exact">Exact (Show exact paise)</option>
                    <option value="nearest_rupee">Nearest Rupee (Round off)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    saveStoredSettings(settings)
                    setShowSettingsModal(false)
                    notify('Settings saved successfully!')
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Saved Invoices Library Modal */}
      {showSavedInvoicesModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowSavedInvoicesModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '650px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSavedInvoicesModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
              Saved Invoices Library
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Select any saved invoice to reload, modify, or create a copy.
            </p>

            {savedInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                No saved invoices found. Use the "Save Invoice" button on any invoice to store it here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {savedInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#fafbfc'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                        Invoice #{inv.invoiceNo} &bull; {inv.invoiceDate}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                        Customer: {inv.receiverName || 'N/A'} | Vehicle: {inv.vehicleNo || 'N/A'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoadInvoice(inv)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'var(--primary)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Load Invoice
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
