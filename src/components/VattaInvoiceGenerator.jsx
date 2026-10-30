import React, { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeft,
  FileDown,
  Printer,
  RotateCcw,
  Sparkles,
  Save,
  FolderOpen,
  Trash2,
  Edit2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Info,
  Calendar,
  Truck,
  FileText,
  MapPin,
  Layers,
  Hash,
  User,
  Users,
  Building2,
  X,
  CreditCard,
  ShieldCheck,
  Check,
  Settings,
  HelpCircle
} from 'lucide-react'
import {
  DEFAULT_VATTA_BUSINESS_SETTINGS,
  DEFAULT_VATTA_PRODUCTS,
  DEFAULT_RECEIVER_PROFILES,
  DEFAULT_DESPATCHED_PROFILES,
  SAMPLE_VATTA_INVOICE_A20,
  formatIndianCurrency,
  formatDate,
  calculateVattaInvoiceTotals,
  getStoredVattaBusinessSettings,
  saveStoredVattaBusinessSettings,
  getStoredVattaProducts,
  saveStoredVattaProducts,
  resetStoredVattaProducts,
  getSavedReceiverProfiles,
  saveReceiverProfile,
  deleteReceiverProfile,
  getSavedDespatchedProfiles,
  saveDespatchedProfile,
  deleteDespatchedProfile,
  getSavedVattaInvoices,
  saveVattaInvoiceRecord,
  deleteVattaInvoiceRecord
} from '../data/vattaInvoiceSettings.js'
import { generateVattaInvoicePdf } from '../utils/vattaInvoicePdfGenerator.js'
import { formatInvoiceGrandTotalWords } from '../utils/numberToWords.js'
import { getNextSuggestedInvoice } from '../utils/invoiceSequenceHelper.js'

export default function VattaInvoiceGenerator({
  onBack,
  initialRecord
}) {
  // Stored Configurations & Directory Profiles
  const [businessSettings, setBusinessSettings] = useState(() => getStoredVattaBusinessSettings())
  const [products, setProducts] = useState(() => getStoredVattaProducts())
  const [savedReceivers, setSavedReceivers] = useState(() => getSavedReceiverProfiles())
  const [savedDespatched, setSavedDespatched] = useState(() => getSavedDespatchedProfiles())
  const [savedInvoices, setSavedInvoices] = useState(() => getSavedVattaInvoices())

  // Selected Profile IDs for quick dropdowns
  const [selectedReceiverId, setSelectedReceiverId] = useState('receiver-hindustan')
  const [selectedDespatchedId, setSelectedDespatchedId] = useState('despatched-umesh')

  // Form State initialized: A-21 was last invoice, next defaults to A-22
  const [invoiceForm, setInvoiceForm] = useState(() => {
    let nextInv = 'A-22'
    try {
      const seq = getNextSuggestedInvoice()
      if (seq && seq.suggestedInvoiceNo) {
        nextInv = seq.suggestedInvoiceNo
      }
    } catch {
      nextInv = 'A-22'
    }
    const today = new Date().toISOString().split('T')[0]
    return {
      ...SAMPLE_VATTA_INVOICE_A20,
      invoiceNo: nextInv,
      invoiceDate: today,
      dateOfSupply: today,
      bankDetails: businessSettings.bankDetails || '',
      accountNumber: businessSettings.accountNumber || '',
      branchIfsc: businessSettings.branchIfsc || '',
      termsAndConditions: businessSettings.termsAndConditions || ''
    }
  })

  // Load initial record if opened from GST Monthly Register
  useEffect(() => {
    if (initialRecord) {
      if (initialRecord.invoiceData) {
        setInvoiceForm({ ...initialRecord.invoiceData })
      } else {
        setInvoiceForm(prev => ({ ...prev, ...initialRecord }))
      }
      showNotification(`Loaded Invoice ${initialRecord.invoice_no || initialRecord.docNo || initialRecord.invoiceData?.invoiceNo || ''}`)
    }
  }, [initialRecord])

  // Modals & UI States
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [showPartiesModal, setShowPartiesModal] = useState(false)
  const [partiesTab, setPartiesTab] = useState('receivers') // 'receivers' | 'despatched'
  const [editingParty, setEditingParty] = useState(null) // null or { type, id, name, address, pinNo, mobileNo, gstin, state, stateCode }
  const [showProductSettingsModal, setShowProductSettingsModal] = useState(false)
  const [tempProducts, setTempProducts] = useState([])
  const [feedbackMsg, setFeedbackMsg] = useState(null)
  const [validationError, setValidationError] = useState('')

  // Show auto-dismiss toast notification
  const showNotification = (text, type = 'success') => {
    setFeedbackMsg({ text, type })
    setTimeout(() => {
      setFeedbackMsg(null)
    }, 3500)
  }

  // Update a single invoice form field
  const handleFieldChange = (field, value) => {
    setInvoiceForm(prev => {
      const next = { ...prev, [field]: value }

      // Auto-suggest tax treatment based on place of supply vs seller state
      if (field === 'placeOfSupply' || field === 'state') {
        const pSupply = (field === 'placeOfSupply' ? value : next.placeOfSupply || '').trim().toUpperCase()
        const sState = (field === 'state' ? value : next.state || '').trim().toUpperCase()
        if (pSupply && sState) {
          next.taxTreatment = pSupply === sState ? 'CGST_SGST' : 'IGST'
        }
      }
      return next
    })
  }

  // Update bag quantity for a product row
  const handleBagChange = (prodId, val) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0)
    setInvoiceForm(prev => ({
      ...prev,
      bagQuantities: {
        ...prev.bagQuantities,
        [prodId]: num
      }
    }))
  }

  // Live Calculations Memo
  const calculated = useMemo(() => {
    return calculateVattaInvoiceTotals({
      products,
      bagQuantities: invoiceForm.bagQuantities,
      taxTreatment: invoiceForm.taxTreatment,
      gstRate: invoiceForm.gstRate,
      discount: invoiceForm.discount,
      freight: invoiceForm.freight,
      insurance: invoiceForm.insurance,
      packingCharge: invoiceForm.packingCharge,
      roundOffMode: invoiceForm.roundOffMode || 'exact'
    })
  }, [products, invoiceForm])

  // Cross-module Financial Year sequential invoice tracker
  const suggestedSequence = useMemo(() => {
    return getNextSuggestedInvoice(invoiceForm.invoiceDate || new Date())
  }, [invoiceForm.invoiceDate, savedInvoices])

  // Select Receiver from dropdown
  const handleSelectReceiver = (id) => {
    setSelectedReceiverId(id)
    const found = savedReceivers.find(r => r.id === id)
    if (found) {
      setInvoiceForm(prev => ({
        ...prev,
        receiverName: found.name || '',
        receiverAddress: found.address || '',
        receiverPinNo: found.pinNo || '',
        receiverMobileNo: found.mobileNo || '',
        receiverGstin: found.gstin || '',
        receiverState: found.state || '',
        receiverStateCode: found.stateCode || ''
      }))
      showNotification(`Loaded Receiver: ${found.name}`)
    }
  }

  // Select Despatched-To from dropdown
  const handleSelectDespatched = (id) => {
    setSelectedDespatchedId(id)
    const found = savedDespatched.find(d => d.id === id)
    if (found) {
      setInvoiceForm(prev => ({
        ...prev,
        despatchedName: found.name || '',
        despatchedAddress: found.address || '',
        despatchedPinNo: found.pinNo || '',
        despatchedMobileNo: found.mobileNo || '',
        despatchedGstin: found.gstin || '',
        despatchedState: found.state || '',
        despatchedStateCode: found.stateCode || '',
        placeOfSupply: found.state || prev.placeOfSupply
      }))
      showNotification(`Loaded Despatched-To: ${found.name}`)
    }
  }

  // Quick Save Receiver
  const handleQuickSaveReceiver = () => {
    if (!invoiceForm.receiverName.trim()) {
      alert('Please enter a receiver company name.')
      return
    }
    const profile = {
      id: selectedReceiverId && selectedReceiverId !== 'custom' ? selectedReceiverId : `receiver-${Date.now()}`,
      name: invoiceForm.receiverName,
      address: invoiceForm.receiverAddress,
      pinNo: invoiceForm.receiverPinNo,
      mobileNo: invoiceForm.receiverMobileNo,
      gstin: invoiceForm.receiverGstin,
      state: invoiceForm.receiverState,
      stateCode: invoiceForm.receiverStateCode
    }
    const updated = saveReceiverProfile(profile)
    if (updated) {
      setSavedReceivers(updated)
      setSelectedReceiverId(profile.id)
      showNotification(`Saved receiver "${profile.name}" to directory!`)
    }
  }

  // Quick Save Despatched
  const handleQuickSaveDespatched = () => {
    if (!invoiceForm.despatchedName.trim()) {
      alert('Please enter a despatched company name.')
      return
    }
    const profile = {
      id: selectedDespatchedId && selectedDespatchedId !== 'custom' ? selectedDespatchedId : `despatched-${Date.now()}`,
      name: invoiceForm.despatchedName,
      address: invoiceForm.despatchedAddress,
      pinNo: invoiceForm.despatchedPinNo,
      mobileNo: invoiceForm.despatchedMobileNo,
      gstin: invoiceForm.despatchedGstin,
      state: invoiceForm.despatchedState,
      stateCode: invoiceForm.despatchedStateCode
    }
    const updated = saveDespatchedProfile(profile)
    if (updated) {
      setSavedDespatched(updated)
      setSelectedDespatchedId(profile.id)
      showNotification(`Saved despatched party "${profile.name}" to directory!`)
    }
  }

  // Save current Bank & Terms as permanent default
  const handleSaveBankAndTerms = () => {
    const updated = {
      ...businessSettings,
      bankDetails: invoiceForm.bankDetails,
      accountNumber: invoiceForm.accountNumber,
      branchIfsc: invoiceForm.branchIfsc,
      termsAndConditions: invoiceForm.termsAndConditions
    }
    setBusinessSettings(updated)
    saveStoredVattaBusinessSettings(updated)
    showNotification('Saved Bank details & Terms as defaults for future invoices!')
  }

  // Load Benchmark Sample A-20
  const handleLoadSampleA20 = () => {
    setInvoiceForm({
      ...SAMPLE_VATTA_INVOICE_A20,
      bankDetails: businessSettings.bankDetails || '',
      accountNumber: businessSettings.accountNumber || '',
      branchIfsc: businessSettings.branchIfsc || '',
      termsAndConditions: businessSettings.termsAndConditions || ''
    })
    setSelectedReceiverId('receiver-hindustan')
    setSelectedDespatchedId('despatched-umesh')
    setValidationError('')
    showNotification('Loaded benchmark invoice A-20 sample data!')
  }

  // Reset Draft / Form
  const handleResetForm = () => {
    if (window.confirm('Reset this invoice to a blank draft?')) {
      const today = new Date().toISOString().split('T')[0]
      let nextInv = 'A-22'
      try {
        const seq = getNextSuggestedInvoice(new Date(today))
        if (seq && seq.suggestedInvoiceNo) nextInv = seq.suggestedInvoiceNo
      } catch {}
      setInvoiceForm({
        invoiceNo: nextInv,
        purchaseOrderNo: '',
        invoiceDate: today,
        dateOfSupply: today,
        state: businessSettings.defaultState || 'KERALA',
        stateCode: businessSettings.defaultStateCode || '32',
        placeOfSupply: '',
        transportationMode: 'By Road',
        vehicleNo: '',
        forestPassNo: '',
        totalMeasurement: '',
        ewayBillNo: '',
        reverseCharge: 'No',

        receiverName: '',
        receiverAddress: '',
        receiverPinNo: '',
        receiverMobileNo: '',
        receiverGstin: '',
        receiverState: '',
        receiverStateCode: '',

        despatchedName: '',
        despatchedAddress: '',
        despatchedPinNo: '',
        despatchedMobileNo: '',
        despatchedGstin: '',
        despatchedState: '',
        despatchedStateCode: '',

        bagQuantities: { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' },
        taxTreatment: 'IGST',
        gstRate: 5,
        discount: '',
        freight: '',
        insurance: '',
        packingCharge: '',
        bankDetails: businessSettings.bankDetails || '',
        accountNumber: businessSettings.accountNumber || '',
        branchIfsc: businessSettings.branchIfsc || '',
        termsAndConditions: businessSettings.termsAndConditions || '',
        roundOff: 0
      })
      setSelectedReceiverId('custom')
      setSelectedDespatchedId('custom')
      setValidationError('')
      showNotification('Invoice form reset to blank draft.')
    }
  }

  // Save current invoice record to history
  const handleSaveInvoiceRecord = () => {
    if (!invoiceForm.invoiceNo.trim()) {
      setValidationError('Please enter an Invoice Number before saving.')
      return
    }
    const record = {
      id: invoiceForm.id || `vatta_inv_${Date.now()}`,
      title: `Invoice ${invoiceForm.invoiceNo} - ${invoiceForm.receiverName || 'Vatta Sale'}`,
      invoiceData: {
        ...invoiceForm,
        passNo: invoiceForm.forestPassNo || invoiceForm.passNo || '',
        forestPassNo: invoiceForm.forestPassNo || invoiceForm.passNo || ''
      },
      forest_pass_no: invoiceForm.forestPassNo || invoiceForm.passNo || '',
      totals: { ...calculated },
      productsSnapshot: [...products],
      grandTotal: calculated.grandTotal
    }
    const updated = saveVattaInvoiceRecord(record)
    if (updated) {
      setSavedInvoices(updated)
      showNotification(`Saved Invoice ${invoiceForm.invoiceNo} to local history!`)
    }
  }

  // Download PDF
  const handleDownloadPdf = () => {
    setValidationError('')
    if (!invoiceForm.invoiceNo.trim()) {
      setValidationError('Invoice Number is required to generate the invoice.')
      return
    }
    if (calculated.totalBags <= 0) {
      setValidationError('Please enter at least one bag quantity to generate an invoice.')
      return
    }

    try {
      generateVattaInvoicePdf({
        ...businessSettings,
        ...invoiceForm,
        ...calculated
      }, true)

      // Auto-save so this invoice is permanently available in the Monthly Register
      const record = {
        id: invoiceForm.id || `vatta_inv_${Date.now()}`,
        title: `Invoice ${invoiceForm.invoiceNo} - ${invoiceForm.receiverName || 'Vatta Sale'}`,
        invoiceData: {
          ...invoiceForm,
          passNo: invoiceForm.forestPassNo || invoiceForm.passNo || '',
          forestPassNo: invoiceForm.forestPassNo || invoiceForm.passNo || ''
        },
        forest_pass_no: invoiceForm.forestPassNo || invoiceForm.passNo || '',
        totals: { ...calculated },
        productsSnapshot: [...products],
        grandTotal: calculated.grandTotal
      }
      const updated = saveVattaInvoiceRecord(record)
      if (updated) {
        setSavedInvoices(updated)
      }

      showNotification(`Downloaded PDF for Invoice ${invoiceForm.invoiceNo} & saved to register!`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      setValidationError(`Failed to generate PDF: ${err.message}`)
    }
  }

  // Print Invoice
  const handlePrintPdf = () => {
    setValidationError('')
    if (!invoiceForm.invoiceNo.trim()) {
      setValidationError('Invoice Number is required.')
      return
    }
    try {
      const doc = generateVattaInvoicePdf({
        ...businessSettings,
        ...invoiceForm,
        ...calculated
      }, false)
      doc.autoPrint()
      const blobUrl = doc.output('bloburl')
      window.open(blobUrl, '_blank')
    } catch (err) {
      console.error('Error printing invoice:', err)
      setValidationError(`Print preview error: ${err.message}`)
    }
  }

  // Open Product Settings Modal
  const handleOpenProductSettings = () => {
    setTempProducts(JSON.parse(JSON.stringify(products)))
    setShowProductSettingsModal(true)
  }

  // Save Product Settings
  const handleSaveProductSettings = () => {
    setProducts(tempProducts)
    saveStoredVattaProducts(tempProducts)
    setShowProductSettingsModal(false)
    showNotification('Saved updated product rates and settings!')
  }

  // Restore Default Product Settings
  const handleRestoreDefaultProducts = () => {
    if (window.confirm('Reset all Vatta product sizes, rates per 1,000, and descriptions to standard defaults?')) {
      const def = resetStoredVattaProducts()
      setProducts(def)
      setTempProducts(def)
      setShowProductSettingsModal(false)
      showNotification('Restored Vatta products to default configurations!')
    }
  }

  return (
    <div className="vatta-invoice-container" style={{ padding: '1.25rem 1rem 3rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          style={{
            position: 'fixed',
            top: '1.25rem',
            right: '1.25rem',
            zIndex: 9999,
            backgroundColor: feedbackMsg.type === 'error' ? '#ef4444' : '#1e3a2b',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {feedbackMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} color="#4ade80" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Top Header & Navigation Bar */}
      <div className="module-top-header">
        <div className="module-top-left">
          <button
            type="button"
            onClick={onBack}
            className="module-back-btn"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="module-page-title">
            Vatta GST Invoice Generator
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="module-top-actions">
          <button
            type="button"
            onClick={handleLoadSampleA20}
            title="Load benchmark sample data from Invoice A-20"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--tag-bg, #f8fafc)',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '0.775rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Sparkles size={14} color="#d4a373" />
            Load Sample A-20
          </button>

          <button
            type="button"
            onClick={handleResetForm}
            title="Clear all fields to a blank draft"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text-secondary, #475569)',
              fontSize: '0.775rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>

          <button
            type="button"
            onClick={() => setShowSavedModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: '#1e3a2b',
              fontSize: '0.775rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <FolderOpen size={14} />
            History ({savedInvoices.length})
          </button>

          <button
            type="button"
            onClick={() => setShowPartiesModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: '#1e3a2b',
              fontSize: '0.775rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Users size={14} />
            Parties Directory
          </button>

          <button
            type="button"
            onClick={handleOpenProductSettings}
            title="Configure Vatta ply dimensions and rates per 1,000 pieces"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: '#334155',
              fontSize: '0.775rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Settings size={14} />
            Product Rates
          </button>

          <button
            type="button"
            onClick={handleSaveInvoiceRecord}
            title="Save current invoice into local storage"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #1e3a2b',
              background: 'var(--card-bg, #ffffff)',
              color: '#1e3a2b',
              fontSize: '0.775rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Save size={14} />
            Save Draft
          </button>

          <button
            type="button"
            onClick={handlePrintPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--tag-bg, #f8fafc)',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '0.775rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Printer size={14} />
            Print
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              border: 'none',
              background: '#1e3a2b',
              color: '#ffffff',
              fontSize: '0.775rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(30,58,43,0.3)'
            }}
          >
            <FileDown size={15} />
            Download A4 PDF
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {validationError && (
        <div
          style={{
            marginBottom: '1rem',
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: '#b91c1c',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          <AlertCircle size={18} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 0.95fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Form Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Section 1: General Invoice Details */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                  Section 1
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                  Invoice Identification & Supply Details
                </h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
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
                  value={invoiceForm.invoiceNo}
                  onChange={(e) => handleFieldChange('invoiceNo', e.target.value)}
                  placeholder="e.g. A-22"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: 700 }}
                />
                {suggestedSequence && (
                  <div
                    style={{
                      marginTop: '0.35rem',
                      fontSize: '0.7rem',
                      color: 'var(--text-secondary, #475569)',
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
                    {invoiceForm.invoiceNo !== suggestedSequence.suggestedInvoiceNo && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange('invoiceNo', suggestedSequence.suggestedInvoiceNo)}
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Purchase Order No <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={invoiceForm.purchaseOrderNo}
                  onChange={(e) => handleFieldChange('purchaseOrderNo', e.target.value)}
                  placeholder="e.g. 4100016589 (Omitted if blank)"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Reverse Charge
                </label>
                <select
                  value={invoiceForm.reverseCharge}
                  onChange={(e) => handleFieldChange('reverseCharge', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                  <option value="">Leave Blank</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceForm.invoiceDate}
                  onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Date of Supply
                </label>
                <input
                  type="date"
                  value={invoiceForm.dateOfSupply}
                  onChange={(e) => handleFieldChange('dateOfSupply', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Transportation Mode
                </label>
                <input
                  type="text"
                  value={invoiceForm.transportationMode}
                  onChange={(e) => handleFieldChange('transportationMode', e.target.value)}
                  placeholder="e.g. By Road (or leave blank)"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Seller State
                </label>
                <input
                  type="text"
                  value={invoiceForm.state}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  placeholder="e.g. KERALA"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  State Code
                </label>
                <input
                  type="text"
                  value={invoiceForm.stateCode}
                  onChange={(e) => handleFieldChange('stateCode', e.target.value)}
                  placeholder="e.g. 32"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Place of Supply
                </label>
                <input
                  type="text"
                  value={invoiceForm.placeOfSupply}
                  onChange={(e) => handleFieldChange('placeOfSupply', e.target.value)}
                  placeholder="e.g. TAMILNADU"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: 600 }}
                />
              </div>

              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Vehicle Registration Number
                </label>
                <input
                  type="text"
                  value={invoiceForm.vehicleNo}
                  onChange={(e) => handleFieldChange('vehicleNo', e.target.value)}
                  placeholder="e.g. KL-58-D-1555"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Parties Details (Receiver & Despatched-To) */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                  Section 2
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                  Receiver & Despatched-To Profiles
                </h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Receiver Block */}
              <div style={{ background: 'var(--tag-bg, #f8fafc)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e3a2b' }}>
                    Details of Receiver (Purchaser)
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <select
                      value={selectedReceiverId}
                      onChange={(e) => handleSelectReceiver(e.target.value)}
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.725rem', maxWidth: '140px' }}
                    >
                      <option value="custom">-- Saved Receivers --</option>
                      {savedReceivers.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleQuickSaveReceiver}
                      title="Save this receiver to directory"
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--card-bg, #ffffff)', fontSize: '0.725rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      <Save size={12} /> Save
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Name</label>
                    <input
                      type="text"
                      value={invoiceForm.receiverName}
                      onChange={(e) => handleFieldChange('receiverName', e.target.value)}
                      placeholder="e.g. M/S. HINDUSTAN PENCILS PVT.LTD"
                      style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem', fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Address</label>
                    <textarea
                      rows={2}
                      value={invoiceForm.receiverAddress}
                      onChange={(e) => handleFieldChange('receiverAddress', e.target.value)}
                      placeholder="Address..."
                      style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>PIN Code</label>
                      <input
                        type="text"
                        value={invoiceForm.receiverPinNo}
                        onChange={(e) => handleFieldChange('receiverPinNo', e.target.value)}
                        placeholder="e.g. 396171"
                        style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Mobile No</label>
                      <input
                        type="text"
                        value={invoiceForm.receiverMobileNo}
                        onChange={(e) => handleFieldChange('receiverMobileNo', e.target.value)}
                        placeholder="Optional"
                        style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>GSTIN</label>
                    <input
                      type="text"
                      value={invoiceForm.receiverGstin}
                      onChange={(e) => handleFieldChange('receiverGstin', e.target.value.toUpperCase())}
                      placeholder="e.g. 24AAACH0401R1ZT"
                      style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 600 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>State</label>
                      <input
                        type="text"
                        value={invoiceForm.receiverState}
                        onChange={(e) => handleFieldChange('receiverState', e.target.value)}
                        placeholder="e.g. GUJARAT"
                        style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>State Code</label>
                      <input
                        type="text"
                        value={invoiceForm.receiverStateCode}
                        onChange={(e) => handleFieldChange('receiverStateCode', e.target.value)}
                        placeholder="e.g. 24"
                        style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Despatched-To Block */}
              <div style={{ background: 'var(--tag-bg, #f8fafc)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e3a2b' }}>
                    Details of Despatched (Delivery Site)
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <select
                      value={selectedDespatchedId}
                      onChange={(e) => handleSelectDespatched(e.target.value)}
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.725rem', maxWidth: '140px' }}
                    >
                      <option value="custom">-- Saved Despatched --</option>
                      {savedDespatched.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleQuickSaveDespatched}
                      title="Save this party to directory"
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--card-bg, #ffffff)', fontSize: '0.725rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      <Save size={12} /> Save
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Name</label>
                    <input
                      type="text"
                      value={invoiceForm.despatchedName}
                      onChange={(e) => handleFieldChange('despatchedName', e.target.value)}
                      placeholder="e.g. UMESH PENCILS PROCESSORS (P) LTD"
                      style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem', fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Address</label>
                    <textarea
                      rows={2}
                      value={invoiceForm.despatchedAddress}
                      onChange={(e) => handleFieldChange('despatchedAddress', e.target.value)}
                      placeholder="Address..."
                      style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>PIN Code</label>
                      <input
                        type="text"
                        value={invoiceForm.despatchedPinNo}
                        onChange={(e) => handleFieldChange('despatchedPinNo', e.target.value)}
                        placeholder="Optional"
                        style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Mobile No</label>
                      <input
                        type="text"
                        value={invoiceForm.despatchedMobileNo}
                        onChange={(e) => handleFieldChange('despatchedMobileNo', e.target.value)}
                        placeholder="Optional"
                        style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>GSTN</label>
                    <input
                      type="text"
                      value={invoiceForm.despatchedGstin}
                      onChange={(e) => handleFieldChange('despatchedGstin', e.target.value.toUpperCase())}
                      placeholder="e.g. 33AAACU0701F1Z3"
                      style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 600 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>STATE</label>
                      <input
                        type="text"
                        value={invoiceForm.despatchedState}
                        onChange={(e) => handleFieldChange('despatchedState', e.target.value)}
                        placeholder="e.g. TAMILNADU"
                        style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>State Code</label>
                      <input
                        type="text"
                        value={invoiceForm.despatchedStateCode}
                        onChange={(e) => handleFieldChange('despatchedStateCode', e.target.value)}
                        placeholder="e.g. 33"
                        style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Vatta Product Bag Quantities & Calculations */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                  Section 3
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                  Vatta Product Bag Quantities & Pricing
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                Formula: Value = (Total Pieces ÷ 1,000) × Rate per 1,000
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ background: '#1e3a2b', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem 0.5rem', borderRadius: '6px 0 0 0' }}>Item</th>
                    <th style={{ padding: '0.6rem 0.5rem', width: '90px' }}>Bags</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Description of Goods</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>HSN</th>
                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Quantity (Pieces)</th>
                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Rate / 1000</th>
                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>GST</th>
                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {calculated.lines.map((l, idx) => (
                    <tr
                      key={l.id}
                      style={{
                        borderBottom: '1px solid var(--border-color, #e2e8f0)',
                        background: idx % 2 === 0 ? 'var(--card-bg)' : 'var(--tag-bg)'
                      }}
                    >
                      <td style={{ padding: '0.5rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>{l.item}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <input
                          type="number"
                          min="0"
                          value={invoiceForm.bagQuantities[l.id] ?? ''}
                          onChange={(e) => handleBagChange(l.id, e.target.value)}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '0.35rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            background: 'var(--card-bg, #ffffff)'
                          }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-secondary, #475569)' }}>
                        {l.description}
                      </td>
                      <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#64748b' }}>{l.hsnCode}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                        {l.pieces > 0 ? l.pieces.toLocaleString('en-IN') : '0'}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>
                        ₹{formatIndianCurrency(l.unitPricePer1000)}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b' }}>
                        {l.gstRate}%
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: '#1e3a2b' }}>
                        {l.lineValue > 0 ? `₹${formatIndianCurrency(l.lineValue)}` : '₹0.00'}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Summary Row */}
                  <tr style={{ background: 'var(--tag-bg)', fontWeight: 800, color: 'var(--primary)', borderTop: '2px solid var(--primary)' }}>
                    <td style={{ padding: '0.65rem 0.5rem' }}>TOTALS</td>
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                      {calculated.totalBags} bags
                    </td>
                    <td colSpan={2} style={{ padding: '0.65rem 0.5rem', color: 'var(--text-primary)' }}>
                      To the Value of First Quality "Vatta" Wood Pencil Slats
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontSize: '0.9rem' }}>
                      {calculated.totalPieces.toLocaleString('en-IN')} pcs
                    </td>
                    <td colSpan={2} style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                      Sub Total:
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontSize: '0.95rem' }}>
                      ₹{formatIndianCurrency(calculated.subTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Forest Pass, Measurement, E-Way Bill & Taxes */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem' }}>
              <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                Section 4
              </span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                Forest Pass, Transit Documentation & Tax Structure
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Forest Pass Number
                </label>
                <input
                  type="text"
                  value={invoiceForm.forestPassNo}
                  onChange={(e) => handleFieldChange('forestPassNo', e.target.value)}
                  placeholder="e.g. 140/2026-27"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Total Measurement (CBM)
                </label>
                <input
                  type="text"
                  value={invoiceForm.totalMeasurement}
                  onChange={(e) => handleFieldChange('totalMeasurement', e.target.value)}
                  placeholder="e.g. 20.689"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  E-Way Bill Number
                </label>
                <input
                  type="text"
                  value={invoiceForm.ewayBillNo}
                  onChange={(e) => handleFieldChange('ewayBillNo', e.target.value)}
                  placeholder="e.g. 5420 8705 0063"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Tax Treatment
                </label>
                <select
                  value={invoiceForm.taxTreatment}
                  onChange={(e) => handleFieldChange('taxTreatment', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <option value="IGST">Inter-State (IGST 5%)</option>
                  <option value="CGST_SGST">Intra-State (CGST 2.5% + SGST 2.5%)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  GST Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={invoiceForm.gstRate}
                  onChange={(e) => handleFieldChange('gstRate', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={invoiceForm.discount}
                  onChange={(e) => handleFieldChange('discount', e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Freight (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={invoiceForm.freight}
                  onChange={(e) => handleFieldChange('freight', e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Insurance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={invoiceForm.insurance}
                  onChange={(e) => handleFieldChange('insurance', e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Packing & Forwarding (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={invoiceForm.packingCharge}
                  onChange={(e) => handleFieldChange('packingCharge', e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Bank Details & Terms */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                  Section 5
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                  Bank Details & Terms (Optional)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleSaveBankAndTerms}
                style={{
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'var(--tag-bg, #f8fafc)',
                  color: '#334155',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Save size={13} />
                Save as Default
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Bank Name / Account Title
                </label>
                <input
                  type="text"
                  value={invoiceForm.bankDetails}
                  onChange={(e) => handleFieldChange('bankDetails', e.target.value)}
                  placeholder="e.g. State Bank of India"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Account Number
                </label>
                <input
                  type="text"
                  value={invoiceForm.accountNumber}
                  onChange={(e) => handleFieldChange('accountNumber', e.target.value)}
                  placeholder="e.g. 67012345678"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Branch IFSC
                </label>
                <input
                  type="text"
                  value={invoiceForm.branchIfsc}
                  onChange={(e) => handleFieldChange('branchIfsc', e.target.value)}
                  placeholder="e.g. SBIN0070000"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Terms and Conditions
                </label>
                <textarea
                  rows={2}
                  value={invoiceForm.termsAndConditions}
                  onChange={(e) => handleFieldChange('termsAndConditions', e.target.value)}
                  placeholder="Goods once sold will not be taken back..."
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Document Replica Preview */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} color="#1e3a2b" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: 0 }}>
                Live A4 Form GST Invoice-I Preview
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
              Single Page A4
            </span>
          </div>

          {/* Paper Document Preview Card */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              borderRadius: '6px',
              padding: '1.75rem 1.25rem',
              border: '1px solid #d1d5db',
              fontFamily: 'serif',
              color: '#000000',
              lineHeight: 1.35,
              fontSize: '0.8rem'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{businessSettings.sellerName}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{businessSettings.sellerAddressLine1}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{businessSettings.sellerAddressLine2}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold' }}>
                <div>Tele : {businessSettings.telephone}</div>
                <div>Email : {businessSettings.email}</div>
                <div>GST No: {businessSettings.sellerGstin}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.75rem', fontFamily: 'sans-serif' }}>
              FORM GST INVOICE-I
            </div>

            {/* Bounded Box */}
            <div style={{ border: '1px solid #000000' }}>
              {/* Upper Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #000000' }}>
                <div style={{ padding: '0.4rem 0.5rem', borderRight: '1px solid #000000', fontSize: '0.75rem' }}>
                  <div>Reverse Charge: {invoiceForm.reverseCharge ? invoiceForm.reverseCharge : ''}</div>
                  <div style={{ fontWeight: 'bold' }}>Invoice No : {invoiceForm.invoiceNo || '—'}</div>
                  {invoiceForm.purchaseOrderNo && (
                    <div>Purchase Order No : {invoiceForm.purchaseOrderNo}</div>
                  )}
                  <div>Invoice Date :- {formatDate(invoiceForm.invoiceDate, '-')}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>State: {invoiceForm.state}</span>
                    <span>State code: {invoiceForm.stateCode}</span>
                  </div>
                </div>
                <div style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem' }}>
                  <div>Transportation mode: {invoiceForm.transportationMode || '—'}</div>
                  <div>Date of supply:- {formatDate(invoiceForm.dateOfSupply, '-')}</div>
                  <div>Place of supply: {invoiceForm.placeOfSupply || '—'}</div>
                </div>
              </div>

              {/* Party Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #000000' }}>
                {/* Receiver */}
                <div style={{ borderRight: '1px solid #000000' }}>
                  <div style={{ borderBottom: '1px solid #000000', padding: '0.2rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>
                    Details of Receiver
                  </div>
                  <div style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem' }}>
                    <div><strong>Name:</strong> {invoiceForm.receiverName || '—'}</div>
                    <div style={{ whiteSpace: 'pre-line' }}><strong>Address:</strong> {invoiceForm.receiverAddress || '—'}</div>
                    {invoiceForm.receiverPinNo && <div>Pin No:- {invoiceForm.receiverPinNo}</div>}
                    <div><strong>GSTI:</strong> {invoiceForm.receiverGstin || '—'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>State: {invoiceForm.receiverState}</span>
                      <span>State code:{invoiceForm.receiverStateCode}</span>
                    </div>
                  </div>
                </div>

                {/* Despatched */}
                <div>
                  <div style={{ borderBottom: '1px solid #000000', padding: '0.2rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>
                    Details of Despatched
                  </div>
                  <div style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{invoiceForm.despatchedName || '—'}</div>
                    <div style={{ whiteSpace: 'pre-line' }}>{invoiceForm.despatchedAddress || '—'}</div>
                    <div><strong>GSTN:-</strong> {invoiceForm.despatchedGstin || '—'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>STATE :- {invoiceForm.despatchedState}</span>
                      <span>State code:{invoiceForm.despatchedStateCode}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle No */}
              <div style={{ padding: '0.25rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.775rem', borderBottom: '1px solid #000000' }}>
                VEHICLE NO:- {invoiceForm.vehicleNo || '—'}
              </div>

              {/* Goods Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.725rem', borderBottom: '1px solid #000000' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000000', textAlign: 'center', fontWeight: 'bold' }}>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.2rem' }}>Items</th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.2rem' }}>Bags</th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.2rem' }}>Description of Goods</th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.2rem' }}>HSN</th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.2rem' }}>Qty</th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.2rem' }}>Unit Price</th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.2rem' }}>Rate</th>
                    <th style={{ padding: '0.2rem' }}>Value</th>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', background: '#fafafa' }}>
                    <th style={{ borderRight: '1px solid #000000' }}></th>
                    <th style={{ borderRight: '1px solid #000000' }}></th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.15rem' }}>
                      To the Value of First Quality<br />" Vatta " Wood Pencils Slats
                    </th>
                    <th style={{ borderRight: '1px solid #000000' }}></th>
                    <th style={{ borderRight: '1px solid #000000' }}></th>
                    <th style={{ borderRight: '1px solid #000000' }}></th>
                    <th style={{ borderRight: '1px solid #000000' }}></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {calculated.lines.map((l) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.15rem 0.25rem', textAlign: 'center' }}>{l.item}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.15rem 0.25rem', textAlign: 'center', fontWeight: 'bold' }}>{l.bags || ''}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.15rem 0.25rem', fontSize: '0.675rem' }}>{l.description}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.15rem 0.25rem', textAlign: 'center' }}>{l.hsnCode}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.15rem 0.25rem', textAlign: 'center' }}>{l.pieces || ''}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.15rem 0.25rem', textAlign: 'right' }}>{formatIndianCurrency(l.unitPricePer1000)}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.15rem 0.25rem', textAlign: 'center' }}>{l.gstRate}%</td>
                      <td style={{ padding: '0.15rem 0.25rem', textAlign: 'right', fontWeight: 'bold' }}>{l.lineValue > 0 ? formatIndianCurrency(l.lineValue) : ''}</td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr style={{ fontWeight: 'bold', background: '#f3f4f6' }}>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '0.2rem' }}>{calculated.totalBags}</td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '0.2rem' }}>{calculated.totalPieces}</td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              {/* Bottom Split: Left Docs & Right Financials */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', borderBottom: '1px solid #000000' }}>
                {/* Left Side */}
                <div style={{ borderRight: '1px solid #000000', padding: '0.4rem', fontSize: '0.725rem' }}>
                  <div style={{ fontStyle: 'italic', marginBottom: '0.4rem' }}>
                    <div>Forest Pass No:- {invoiceForm.forestPassNo || '—'}</div>
                    <div>Total Measurment:- {invoiceForm.totalMeasurement || '—'}</div>
                    <div style={{ fontWeight: 'bold' }}>EWAY BILL No :- {invoiceForm.ewayBillNo || '—'}</div>
                  </div>
                  <div style={{ borderTop: '1px solid #000000', paddingTop: '0.3rem', fontSize: '0.7rem' }}>
                    <div>Freight {invoiceForm.freight ? `: ₹${formatIndianCurrency(invoiceForm.freight)}` : ''}</div>
                    <div>Insurance {invoiceForm.insurance ? `: ₹${formatIndianCurrency(invoiceForm.insurance)}` : ''}</div>
                    <div>Packing & Forwading Charge {invoiceForm.packingCharge ? `: ₹${formatIndianCurrency(invoiceForm.packingCharge)}` : ''}</div>
                  </div>
                  <div style={{ borderTop: '1px solid #000000', paddingTop: '0.3rem', fontSize: '0.7rem' }}>
                    <div style={{ fontWeight: 'bold' }}>Bank Details {invoiceForm.bankDetails ? `: ${invoiceForm.bankDetails}` : ''}</div>
                    <div>Account Number {invoiceForm.accountNumber ? `: ${invoiceForm.accountNumber}` : ''}</div>
                    <div>Branch IFSC {invoiceForm.branchIfsc ? `: ${invoiceForm.branchIfsc}` : ''}</div>
                  </div>
                </div>

                {/* Right Financials */}
                <div style={{ fontSize: '0.725rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0.4rem', borderBottom: '1px solid #e5e7eb' }}>
                    <span>Sub Total</span>
                    <span>{formatIndianCurrency(calculated.subTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0.4rem', borderBottom: '1px solid #e5e7eb' }}>
                    <span>Discount</span>
                    <span>{calculated.discountVal > 0 ? formatIndianCurrency(calculated.discountVal) : ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0.4rem', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>
                    <span>Taxable Value</span>
                    <span>{formatIndianCurrency(calculated.taxableValue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0.4rem', borderBottom: '1px solid #e5e7eb' }}>
                    <span>CGST Rate {calculated.cgstRate > 0 ? `${calculated.cgstRate}%` : ''}</span>
                    <span>{calculated.cgstAmount > 0 ? formatIndianCurrency(calculated.cgstAmount) : ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0.4rem', borderBottom: '1px solid #e5e7eb' }}>
                    <span>SGST Rate {calculated.sgstRate > 0 ? `${calculated.sgstRate}%` : ''}</span>
                    <span>{calculated.sgstAmount > 0 ? formatIndianCurrency(calculated.sgstAmount) : ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0.4rem', borderBottom: '1px solid #e5e7eb' }}>
                    <span>IGST Rate {calculated.igstRate > 0 ? `${calculated.igstRate}%` : ''}</span>
                    <span>{calculated.igstAmount > 0 ? formatIndianCurrency(calculated.igstAmount) : ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0.4rem', borderBottom: '1px solid #e5e7eb' }}>
                    <span>Round off</span>
                    <span>{calculated.roundOff !== 0 ? calculated.roundOff.toFixed(2) : ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.4rem', fontWeight: 'bold', background: '#f3f4f6', fontSize: '0.8rem' }}>
                    <span>GRANT TOTAL</span>
                    <span>₹{formatIndianCurrency(calculated.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Grand Total In Words */}
              <div style={{ padding: '0.3rem 0.5rem', fontSize: '0.725rem', borderBottom: '1px solid #000000' }}>
                Grand Total In words:- {formatInvoiceGrandTotalWords(calculated.grandTotal)}
              </div>

              {/* Copies Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.5rem', fontSize: '0.675rem' }}>
                <span>Orginal for Recipient, Duplicate for Transporter, Triplicate for Supplier</span>
                <span>GST Payable on Reverse Charge</span>
              </div>
            </div>

            {/* Signature Block */}
            <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '0.85rem' }}>For .G.K. Saw Mill</div>
              <div style={{ height: '24px' }}></div>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Proprietor</div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: SAVED INVOICE HISTORY
          ========================================================================= */}
      {showSavedModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={() => setShowSavedModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '12px',
              maxWidth: '650px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderOpen size={20} color="#1e3a2b" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Saved Vatta Invoices</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1rem' }}>
              Restore previously saved invoices to edit, reprint, or reuse details for a new bill.
            </p>

            {savedInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--tag-bg, #f8fafc)', borderRadius: '8px', color: '#94a3b8' }}>
                No saved invoices found. Click "Save Draft" in the top bar to save your active invoice.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {savedInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      background: 'var(--tag-bg, #f8fafc)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #e2e8f0)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary, #0f172a)' }}>{inv.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Total: <strong>₹{formatIndianCurrency(inv.grandTotal)}</strong> • Saved on: {new Date(inv.savedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceForm({ ...inv.invoiceData })
                          setShowSavedModal(false)
                          showNotification(`Loaded Invoice: ${inv.invoiceData.invoiceNo}`)
                        }}
                        style={{
                          background: '#1e3a2b',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Load
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete saved invoice "${inv.title || inv.invoiceData?.invoiceNo || 'Draft'}"?`)) {
                            const updated = deleteVattaInvoiceRecord(inv.id)
                            if (updated) {
                              setSavedInvoices(updated)
                              showNotification(`Deleted invoice "${inv.title || inv.invoiceData?.invoiceNo}"`)
                            }
                          }
                        }}
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: 'none',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: PARTIES DIRECTORY (Receiver & Despatched Profiles)
          ========================================================================= */}
      {showPartiesModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={() => setShowPartiesModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '12px',
              maxWidth: '720px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="#1e3a2b" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Parties Directory</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPartiesModal(false)
                  setEditingParty(null)
                }}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => {
                  setPartiesTab('receivers')
                  setEditingParty(null)
                }}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: partiesTab === 'receivers' ? '#1e3a2b' : '#f1f5f9',
                  color: partiesTab === 'receivers' ? '#ffffff' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Receivers ({savedReceivers.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setPartiesTab('despatched')
                  setEditingParty(null)
                }}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: partiesTab === 'despatched' ? '#1e3a2b' : '#f1f5f9',
                  color: partiesTab === 'despatched' ? '#ffffff' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Despatched-To Sites ({savedDespatched.length})
              </button>
            </div>

            {/* Profile Form (if adding/editing) */}
            {editingParty ? (
              <div style={{ background: 'var(--tag-bg, #f8fafc)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                    {editingParty.isNew ? 'Add New' : 'Edit'} {partiesTab === 'receivers' ? 'Receiver' : 'Despatched Party'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingParty(null)}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                      Company / Party Name *
                    </label>
                    <input
                      type="text"
                      value={editingParty.name}
                      onChange={(e) => setEditingParty({ ...editingParty, name: e.target.value })}
                      placeholder="e.g. M/S. HINDUSTAN PENCILS PVT.LTD"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                      Address
                    </label>
                    <textarea
                      rows={2}
                      value={editingParty.address}
                      onChange={(e) => setEditingParty({ ...editingParty, address: e.target.value })}
                      placeholder="Address lines..."
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                      GSTIN / GST Number
                    </label>
                    <input
                      type="text"
                      value={editingParty.gstin}
                      onChange={(e) => setEditingParty({ ...editingParty, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 24AAACH0401R1ZT"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                      PIN Code
                    </label>
                    <input
                      type="text"
                      value={editingParty.pinNo}
                      onChange={(e) => setEditingParty({ ...editingParty, pinNo: e.target.value })}
                      placeholder="e.g. 396171"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                      State
                    </label>
                    <input
                      type="text"
                      value={editingParty.state}
                      onChange={(e) => setEditingParty({ ...editingParty, state: e.target.value })}
                      placeholder="e.g. GUJARAT"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                      State Code
                    </label>
                    <input
                      type="text"
                      value={editingParty.stateCode}
                      onChange={(e) => setEditingParty({ ...editingParty, stateCode: e.target.value })}
                      placeholder="e.g. 24"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingParty(null)}
                    style={{ background: '#f1f5f9', border: '1px solid var(--border-color, #cbd5e1)', color: 'var(--text-secondary, #475569)', padding: '0.45rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingParty.name.trim()) {
                        alert('Company name is required.')
                        return
                      }
                      if (partiesTab === 'receivers') {
                        const updated = saveReceiverProfile(editingParty)
                        if (updated) setSavedReceivers(updated)
                      } else {
                        const updated = saveDespatchedProfile(editingParty)
                        if (updated) setSavedDespatched(updated)
                      }
                      setEditingParty(null)
                      showNotification('Profile saved successfully!')
                    }}
                    style={{ background: '#1e3a2b', border: 'none', color: '#ffffff', padding: '0.45rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Check size={14} /> Save Profile
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                    {partiesTab === 'receivers' ? 'Saved receiver companies' : 'Saved delivery and despatched locations'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingParty({
                        isNew: true,
                        id: `${partiesTab}-${Date.now()}`,
                        name: '',
                        address: '',
                        pinNo: '',
                        mobileNo: '',
                        gstin: '',
                        state: '',
                        stateCode: ''
                      })
                    }}
                    style={{ background: '#1e3a2b', color: '#ffffff', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Plus size={14} /> Add New Profile
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(partiesTab === 'receivers' ? savedReceivers : savedDespatched).map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        background: 'var(--tag-bg, #f8fafc)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color, #e2e8f0)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary, #0f172a)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.725rem', fontWeight: 700, fontFamily: 'monospace' }}>
                            GST: {p.gstin || 'None'}
                          </span>
                          {p.state && <span>• {p.state}</span>}
                          {p.pinNo && <span>• PIN: {p.pinNo}</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (partiesTab === 'receivers') {
                              handleSelectReceiver(p.id)
                            } else {
                              handleSelectDespatched(p.id)
                            }
                            setShowPartiesModal(false)
                          }}
                          style={{ background: '#eaf3ed', color: '#1e3a2b', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingParty({ ...p, isNew: false })}
                          style={{ background: '#f1f5f9', color: '#334155', border: '1px solid var(--border-color, #cbd5e1)', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete profile "${p.name}"?`)) {
                              if (partiesTab === 'receivers') {
                                const list = deleteReceiverProfile(p.id)
                                if (list) setSavedReceivers(list)
                              } else {
                                const list = deleteDespatchedProfile(p.id)
                                if (list) setSavedDespatched(list)
                              }
                            }
                          }}
                          style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: PRODUCT SETTINGS (Customize Prices & Pieces per bag)
          ========================================================================= */}
      {showProductSettingsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={() => setShowProductSettingsModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '12px',
              maxWidth: '820px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} color="#1e3a2b" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Vatta Product Configurations & Rates</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProductSettingsModal(false)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1rem' }}>
              Customize standard unit prices per 1,000 pieces, pieces per bag, and product descriptions. Changing prices here applies to future bills and does not alter previously saved invoice records.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {tempProducts.map((p, idx) => (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--tag-bg, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 2fr 1fr 1fr 1fr',
                    gap: '0.65rem',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Item Name</label>
                    <input
                      type="text"
                      value={p.item}
                      onChange={(e) => {
                        const next = [...tempProducts]
                        next[idx].item = e.target.value
                        setTempProducts(next)
                      }}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Description</label>
                    <input
                      type="text"
                      value={p.description}
                      onChange={(e) => {
                        const next = [...tempProducts]
                        next[idx].description = e.target.value
                        setTempProducts(next)
                      }}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.775rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Pieces / Bag</label>
                    <input
                      type="number"
                      value={p.piecesPerBag}
                      onChange={(e) => {
                        const next = [...tempProducts]
                        next[idx].piecesPerBag = parseInt(e.target.value, 10) || 0
                        setTempProducts(next)
                      }}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem', textAlign: 'center' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Rate / 1000 (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={p.unitPricePer1000}
                      onChange={(e) => {
                        const next = [...tempProducts]
                        next[idx].unitPricePer1000 = parseFloat(e.target.value) || 0
                        setTempProducts(next)
                      }}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'right' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>HSN Code</label>
                    <input
                      type="text"
                      value={p.hsnCode}
                      onChange={(e) => {
                        const next = [...tempProducts]
                        next[idx].hsnCode = e.target.value
                        setTempProducts(next)
                      }}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleRestoreDefaultProducts}
                style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.45rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Restore Factory Defaults
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowProductSettingsModal(false)}
                  style={{ background: '#f1f5f9', border: '1px solid var(--border-color, #cbd5e1)', color: 'var(--text-secondary, #475569)', padding: '0.45rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProductSettings}
                  style={{ background: '#1e3a2b', border: 'none', color: '#ffffff', padding: '0.45rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Check size={14} /> Save Product Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
