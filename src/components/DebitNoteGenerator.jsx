import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  ArrowLeft,
  Search,
  Download,
  Eye,
  Save,
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building,
  Hash,
  Calendar,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Printer,
  Cloud,
  Check,
  ExternalLink,
  Percent,
  X
} from 'lucide-react'
import {
  formatIndianCurrency,
  formatDebitNoteDate,
  calculateDebitNoteTotals,
  getSavedDebitNotes,
  saveDebitNoteRecord,
  deleteDebitNoteRecord,
  DEFAULT_INCENTIVE_DESCRIPTIONS,
  DEFAULT_DEBIT_NOTE_SETTINGS,
  SAMPLE_BENCHMARK_DEBIT_NOTE_AA09,
  SAMPLE_BENCHMARK_DEBIT_NOTE_AA08,
  SAMPLE_BENCHMARK_DEBIT_NOTE_DN05
} from '../data/debitNoteSettings.js'
import { getSavedVattaInvoices } from '../data/vattaInvoiceSettings.js'
import { generateDebitNotePdf } from '../utils/debitNotePdfGenerator.js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'

export default function DebitNoteGenerator({
  onBack,
  onOpenVattaInvoice,
  onOpenCreditNote,
  initialRecord
}) {
  // Saved Vatta Invoices list (for picking bills)
  const [savedVattaInvoices, setSavedVattaInvoices] = useState([])
  const [invoicePickerModalOpen, setInvoicePickerModalOpen] = useState(false)
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('')

  // Debit Note Form State (Initialized with sample AA-09 from reference PDF)
  const [form, setForm] = useState(() => ({
    id: `dn_${Date.now()}`,
    debitNoteNo: 'AA-09',
    debitNoteDate: new Date().toISOString().split('T')[0],
    referenceNo: '',

    // Seller info (defaults from sawmill)
    sellerName: DEFAULT_DEBIT_NOTE_SETTINGS.sellerName,
    sellerAddressLine: DEFAULT_DEBIT_NOTE_SETTINGS.sellerAddressLine,
    sellerGstin: DEFAULT_DEBIT_NOTE_SETTINGS.sellerGstin,
    mobile: DEFAULT_DEBIT_NOTE_SETTINGS.mobile,
    email: DEFAULT_DEBIT_NOTE_SETTINGS.email,

    // Consignee / Receiver
    receiverName: 'HINDUSTAN PENCILS Pvt Ltd',
    receiverAddress: 'Plot No:-1 TO 15, ACHHAD INDUSTRIAL ESTATE, ACHHAD, TALUKA, TALASARI, PALGHAR, MAHARASHTRA-401606',
    receiverState: 'MAHARASHTRA',
    receiverStateCode: '27',
    receiverGstin: '27AAACH0401R1ZN',

    // Main header description & HSN
    goodsDescription: 'Annual Bonus - Vatta & Elave Slats for March 2026',
    hsnCode: '44219140',

    // Tax configuration
    taxTreatment: 'IGST', // 'IGST' | 'CGST_SGST'
    gstRate: 5,

    // Bill line items
    items: [
      {
        id: 'item-1',
        slNo: 1,
        description: 'Annual Bonus - Vatta & Elave Slats for March 2026',
        hsnCode: '44219140',
        billNo: 'A-48',
        billDate: '2026-03-11',
        bagsQty: 300,
        ratePerBag: 100
      }
    ]
  }))

  // Modals & UI states
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [savedDebitNotesList, setSavedDebitNotesList] = useState([])
  const [historySearchQuery, setHistorySearchQuery] = useState('')
  const [notification, setNotification] = useState('')
  const [validationError, setValidationError] = useState('')
  const [isSavingCloud, setIsSavingCloud] = useState(false)

  // Load saved invoices & debit notes on mount
  useEffect(() => {
    const invoices = getSavedVattaInvoices()
    setSavedVattaInvoices(invoices || [])
    setSavedDebitNotesList(getSavedDebitNotes())
  }, [])

  // Show transient toast notification
  const notify = (msg) => {
    setNotification(msg)
    setTimeout(() => {
      setNotification('')
    }, 3800)
  }

  // Calculate totals dynamically
  const totals = useMemo(() => {
    return calculateDebitNoteTotals({
      items: form.items,
      taxTreatment: form.taxTreatment,
      gstRate: form.gstRate
    })
  }, [form.items, form.taxTreatment, form.gstRate])

  // Combined full data object for preview and PDF generation
  const fullDebitNoteData = useMemo(() => {
    return {
      ...form,
      ...totals
    }
  }, [form, totals])

  // Handle basic form field changes
  const handleInputChange = (field, val) => {
    setForm(prev => ({
      ...prev,
      [field]: val
    }))
    if (validationError) setValidationError('')
  }

  // Handle Goods Description change (and optionally propagate to items if matching)
  const handleDescriptionPreset = (desc) => {
    setForm(prev => {
      const updatedItems = prev.items.map((it, idx) => {
        if (idx === 0 || !it.description || it.description === prev.goodsDescription) {
          return { ...it, description: desc }
        }
        return it
      })
      return {
        ...prev,
        goodsDescription: desc,
        items: updatedItems
      }
    })
  }

  // Multi-bill items operations
  const handleItemChange = (index, field, val) => {
    setForm(prev => {
      const updated = [...prev.items]
      updated[index] = {
        ...updated[index],
        [field]: val
      }
      return { ...prev, items: updated }
    })
  }

  const handleAddItem = () => {
    setForm(prev => {
      const nextIndex = prev.items.length + 1
      const newItem = {
        id: `item_${Date.now()}_${nextIndex}`,
        slNo: nextIndex,
        description: '',
        hsnCode: prev.hsnCode || '44219140',
        billNo: '',
        billDate: prev.debitNoteDate || '',
        bagsQty: 300,
        ratePerBag: 100
      }
      return {
        ...prev,
        items: [...prev.items, newItem]
      }
    })
  }

  const handleRemoveItem = (index) => {
    if (form.items.length <= 1) {
      notify('At least one bill row is required.')
      return
    }
    setForm(prev => {
      const updated = prev.items.filter((_, i) => i !== index).map((it, i) => ({
        ...it,
        slNo: i + 1
      }))
      return { ...prev, items: updated }
    })
  }

  // Apply Benchmark Sample
  const handleLoadBenchmark = (sample) => {
    setForm({
      ...sample,
      id: `dn_${Date.now()}`,
      sellerName: DEFAULT_DEBIT_NOTE_SETTINGS.sellerName,
      sellerAddressLine: DEFAULT_DEBIT_NOTE_SETTINGS.sellerAddressLine,
      sellerGstin: DEFAULT_DEBIT_NOTE_SETTINGS.sellerGstin,
      mobile: DEFAULT_DEBIT_NOTE_SETTINGS.mobile,
      email: DEFAULT_DEBIT_NOTE_SETTINGS.email
    })
    notify(`Loaded benchmark sample: ${sample.debitNoteNo}`)
  }

  // Pick Vatta Invoice from Saved Records
  const handlePickVattaInvoice = (vattaInv) => {
    const invData = vattaInv.invoiceData || {}
    const invTotals = vattaInv.totals || {}

    // Extract total bags
    let bags = 0
    if (invTotals.totalBags) {
      bags = invTotals.totalBags
    } else if (invData.bagQuantities) {
      bags = Object.values(invData.bagQuantities).reduce((acc, n) => acc + (parseInt(n, 10) || 0), 0)
    }

    setForm(prev => {
      // Update receiver info
      const receiverName = invData.receiverName || prev.receiverName
      const receiverAddress = invData.receiverAddress || prev.receiverAddress
      const receiverGstin = invData.receiverGstin || prev.receiverGstin
      const receiverState = invData.receiverState || prev.receiverState
      const receiverStateCode = invData.receiverStateCode || prev.receiverStateCode

      // Update first item or add item
      const updatedItems = [...prev.items]
      if (updatedItems.length > 0) {
        updatedItems[0] = {
          ...updatedItems[0],
          billNo: invData.invoiceNo || updatedItems[0].billNo,
          billDate: invData.invoiceDate || updatedItems[0].billDate,
          bagsQty: bags > 0 ? bags : updatedItems[0].bagsQty,
          ratePerBag: updatedItems[0].ratePerBag || 100
        }
      }

      return {
        ...prev,
        receiverName,
        receiverAddress,
        receiverGstin,
        receiverState,
        receiverStateCode,
        taxTreatment: invData.taxTreatment || prev.taxTreatment,
        items: updatedItems
      }
    })

    setInvoicePickerModalOpen(false)
    notify(`Applied invoice ${invData.invoiceNo || 'record'} details!`)
  }

  // Validation
  const validateForm = () => {
    if (!form.debitNoteNo.trim()) {
      setValidationError('Please enter a Debit Note Number (e.g. AA-09, DN-05).')
      return false
    }
    if (!form.receiverName.trim()) {
      setValidationError('Please enter the Consignee / Receiver Company Name.')
      return false
    }
    if (form.items.length === 0) {
      setValidationError('Please add at least one bill line item.')
      return false
    }
    for (let i = 0; i < form.items.length; i++) {
      const it = form.items[i]
      if (!it.billNo.trim()) {
        setValidationError(`Row ${i + 1}: Please enter the Original Bill Number.`)
        return false
      }
      if (!it.bagsQty || it.bagsQty <= 0) {
        setValidationError(`Row ${i + 1}: Please enter a valid bags quantity (> 0).`)
        return false
      }
    }
    setValidationError('')
    return true
  }

  // Save Debit Note
  const handleSave = () => {
    if (!validateForm()) return
    setIsSavingCloud(true)
    try {
      const saved = saveDebitNoteRecord(fullDebitNoteData)
      setSavedDebitNotesList(getSavedDebitNotes())
      notify(`Debit Note ${form.debitNoteNo} saved successfully!`)
    } catch (err) {
      console.error('Save failed:', err)
      notify('Failed to save Debit Note.')
    } finally {
      setIsSavingCloud(false)
    }
  }

  // Generate & Download PDF
  const handleDownloadPdf = () => {
    if (!validateForm()) return
    try {
      generateDebitNotePdf(fullDebitNoteData, true)
      // Auto-save so this debit note is included in the Monthly GST Register
      saveDebitNoteRecord(fullDebitNoteData)
      setSavedDebitNotesList(getSavedDebitNotes())
      notify(`Downloaded PDF for Debit Note ${form.debitNoteNo} & saved to register!`)
    } catch (err) {
      console.error('PDF error:', err)
      notify('Error generating PDF document.')
    }
  }

  // Preload initial record if opened from GST Monthly Register
  useEffect(() => {
    if (initialRecord) {
      handleLoadFromHistory(initialRecord)
    }
  }, [initialRecord])

  // Load Record from History
  const handleLoadFromHistory = (rec) => {
    setForm({
      ...rec,
      items: rec.items || rec.calculatedItems || []
    })
    setShowHistoryModal(false)
    notify(`Loaded Debit Note ${rec.debitNoteNo}`)
  }

  // Delete Record from History
  const handleDeleteFromHistory = (id, dnNo) => {
    if (window.confirm(`Delete Debit Note ${dnNo}? This cannot be undone.`)) {
      const updated = deleteDebitNoteRecord(id)
      setSavedDebitNotesList(updated || getSavedDebitNotes())
      notify(`Deleted Debit Note ${dnNo}`)
    }
  }

  // Reset Form to initial clean state
  const handleReset = () => {
    if (window.confirm('Reset this Debit Note form to defaults?')) {
      setForm({
        id: `dn_${Date.now()}`,
        debitNoteNo: 'AA-09',
        debitNoteDate: new Date().toISOString().split('T')[0],
        referenceNo: '',

        sellerName: DEFAULT_DEBIT_NOTE_SETTINGS.sellerName,
        sellerAddressLine: DEFAULT_DEBIT_NOTE_SETTINGS.sellerAddressLine,
        sellerGstin: DEFAULT_DEBIT_NOTE_SETTINGS.sellerGstin,
        mobile: DEFAULT_DEBIT_NOTE_SETTINGS.mobile,
        email: DEFAULT_DEBIT_NOTE_SETTINGS.email,

        receiverName: '',
        receiverAddress: '',
        receiverState: 'MAHARASHTRA',
        receiverStateCode: '27',
        receiverGstin: '',

        goodsDescription: 'Annual Bonus - Vatta & Elave Slats for March 2026',
        hsnCode: '44219140',

        taxTreatment: 'IGST',
        gstRate: 5,

        items: [
          {
            id: 'item-1',
            slNo: 1,
            description: 'Annual Bonus - Vatta & Elave Slats for March 2026',
            hsnCode: '44219140',
            billNo: '',
            billDate: new Date().toISOString().split('T')[0],
            bagsQty: 300,
            ratePerBag: 100
          }
        ]
      })
      notify('Form reset.')
    }
  }

  // Filtered Vatta invoices for picker
  const filteredPickerInvoices = useMemo(() => {
    if (!invoiceSearchQuery.trim()) return savedVattaInvoices
    const q = invoiceSearchQuery.toLowerCase()
    return savedVattaInvoices.filter(inv => {
      const data = inv.invoiceData || {}
      return (
        (data.invoiceNo && data.invoiceNo.toLowerCase().includes(q)) ||
        (data.receiverName && data.receiverName.toLowerCase().includes(q)) ||
        (data.vehicleNo && data.vehicleNo.toLowerCase().includes(q))
      )
    })
  }, [savedVattaInvoices, invoiceSearchQuery])

  // Filtered Debit notes for history modal
  const filteredHistoryNotes = useMemo(() => {
    if (!historySearchQuery.trim()) return savedDebitNotesList
    const q = historySearchQuery.toLowerCase()
    return savedDebitNotesList.filter(dn => {
      return (
        (dn.debitNoteNo && dn.debitNoteNo.toLowerCase().includes(q)) ||
        (dn.receiverName && dn.receiverName.toLowerCase().includes(q)) ||
        (dn.goodsDescription && dn.goodsDescription.toLowerCase().includes(q))
      )
    })
  }, [savedDebitNotesList, historySearchQuery])

  return (
    <div className="module-container" style={{ padding: '1rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#1e3a2b',
            color: '#ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <CheckCircle2 size={18} color="#52b788" />
          {notification}
        </div>
      )}

      {/* Module Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  background: '#eaf3ed',
                  color: '#1e3a2b',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Module 07
              </span>
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px'
                }}
              >
                Incentive & Bonus Billing
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '0.2rem 0 0 0' }}>
              Debit Note Generator
            </h1>
            <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b' }}>
              Form GST Debit Note for Vatta wood pencil slats incentive & annual bonus on earlier delivered loads
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.825rem'
            }}
          >
            <History size={15} />
            History ({savedDebitNotesList.length})
          </button>

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #2d6a4f',
              background: 'var(--card-bg, #ffffff)',
              color: '#2d6a4f',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.825rem'
            }}
          >
            <Eye size={15} />
            Preview A4
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSavingCloud}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              border: 'none',
              background: '#1e3a2b',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.825rem',
              boxShadow: '0 2px 6px rgba(30, 58, 43, 0.25)'
            }}
          >
            <Save size={15} />
            {isSavingCloud ? 'Saving...' : 'Save Note'}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#2d6a4f',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.825rem',
              boxShadow: '0 2px 8px rgba(45, 106, 79, 0.35)'
            }}
          >
            <Download size={15} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Benchmark Reference Quick Bar */}
      <div
        style={{
          background: 'var(--tag-bg, #f8fafc)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={16} color="#2d6a4f" />
          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>
            Load Official Benchmark References:
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleLoadBenchmark(SAMPLE_BENCHMARK_DEBIT_NOTE_AA09)}
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #cbd5e1)',
              color: 'var(--text-primary, #0f172a)',
              cursor: 'pointer'
            }}
          >
            Sample AA-09 (Hindustan Pencils • Bill A-48 • ₹31,500)
          </button>
          <button
            type="button"
            onClick={() => handleLoadBenchmark(SAMPLE_BENCHMARK_DEBIT_NOTE_AA08)}
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #cbd5e1)',
              color: 'var(--text-primary, #0f172a)',
              cursor: 'pointer'
            }}
          >
            Sample AA-08 (Sanghvi Woods • Multi-bill A-41 + A-44 • ₹63,000)
          </button>
          <button
            type="button"
            onClick={() => handleLoadBenchmark(SAMPLE_BENCHMARK_DEBIT_NOTE_DN05)}
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #cbd5e1)',
              color: 'var(--text-primary, #0f172a)',
              cursor: 'pointer'
            }}
          >
            Sample DN-05 (Hindustan Pencils • Bill A-17 • 12% IGST)
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              background: 'transparent',
              border: '1px dashed #94a3b8',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600
          }}
        >
          <AlertTriangle size={16} />
          {validationError}
        </div>
      )}

      {/* Two Column Layout: Editor Form (Left) & Realtime A4 Document Preview (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
          gap: '1.25rem',
          alignItems: 'start'
        }}
      >
        {/* LEFT COLUMN: EDITABLE CONTROLS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Card 1: Document Identifiers & Consignee */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Hash size={18} color="#1e3a2b" />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                  Debit Note Details & Consignee
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInvoicePickerModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  background: '#eaf3ed',
                  color: '#1e3a2b',
                  border: '1px solid #b7d6c2',
                  cursor: 'pointer'
                }}
              >
                <Search size={13} />
                Autofill from Saved Vatta Invoices
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Debit Note No *
                </label>
                <input
                  type="text"
                  value={form.debitNoteNo}
                  onChange={(e) => handleInputChange('debitNoteNo', e.target.value)}
                  placeholder="e.g. AA-09"
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text-primary, #0f172a)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Debit Note Date *
                </label>
                <input
                  type="date"
                  value={form.debitNoteDate}
                  onChange={(e) => handleInputChange('debitNoteDate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Reference No (Optional)
                </label>
                <input
                  type="text"
                  value={form.referenceNo}
                  onChange={(e) => handleInputChange('referenceNo', e.target.value)}
                  placeholder="e.g. REF/2026/01"
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {/* Consignee / Receiver Fields */}
            <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed #e2e8f0' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Party Name (Consignee) *
                </label>
                <input
                  type="text"
                  value={form.receiverName}
                  onChange={(e) => handleInputChange('receiverName', e.target.value)}
                  placeholder="e.g. HINDUSTAN PENCILS Pvt Ltd"
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Address
                </label>
                <textarea
                  rows={2}
                  value={form.receiverAddress}
                  onChange={(e) => handleInputChange('receiverAddress', e.target.value)}
                  placeholder="Plot No / Industrial Estate / City / PIN"
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={form.receiverGstin}
                    onChange={(e) => handleInputChange('receiverGstin', e.target.value)}
                    placeholder="27AAACH0401R1ZN"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                    State
                  </label>
                  <input
                    type="text"
                    value={form.receiverState}
                    onChange={(e) => handleInputChange('receiverState', e.target.value)}
                    placeholder="MAHARASHTRA"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '6px',
                      fontSize: '0.825rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                    State Code
                  </label>
                  <input
                    type="text"
                    value={form.receiverStateCode}
                    onChange={(e) => handleInputChange('receiverStateCode', e.target.value)}
                    placeholder="27"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '6px',
                      fontSize: '0.825rem'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Bonus / Incentive Description & Tax Parameters */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <Layers size={18} color="#1e3a2b" />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                Description of Goods & Tax Settings
              </h2>
            </div>

            {/* Presets Chips */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>
                Quick Description Presets:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {DEFAULT_INCENTIVE_DESCRIPTIONS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDescriptionPreset(preset)}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '9999px',
                      border: form.goodsDescription === preset ? '1px solid #1e3a2b' : '1px solid #cbd5e1',
                      background: form.goodsDescription === preset ? '#eaf3ed' : '#ffffff',
                      color: form.goodsDescription === preset ? '#1e3a2b' : '#334155',
                      fontWeight: form.goodsDescription === preset ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                Description of Goods (Debit Note Header / Default) *
              </label>
              <input
                type="text"
                value={form.goodsDescription}
                onChange={(e) => handleDescriptionPreset(e.target.value)}
                placeholder="e.g. Annual Bonus - Vatta & Elave Slats for March 2026"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  HSN Code
                </label>
                <input
                  type="text"
                  value={form.hsnCode}
                  onChange={(e) => handleInputChange('hsnCode', e.target.value)}
                  placeholder="44219140"
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Tax Treatment
                </label>
                <select
                  value={form.taxTreatment}
                  onChange={(e) => handleInputChange('taxTreatment', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  <option value="IGST">Inter-State (IGST)</option>
                  <option value="CGST_SGST">Intra-State (CGST + SGST)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  GST Rate (%)
                </label>
                <select
                  value={form.gstRate}
                  onChange={(e) => handleInputChange('gstRate', parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                >
                  <option value={5}>5% (Standard Vatta Incentive)</option>
                  <option value={12}>12% (Sample DN-05 rate)</option>
                  <option value={18}>18% (General Goods)</option>
                  <option value={0}>0% (Exempt)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 3: Multi-Bill Line Items Builder */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                  Bill Quantities & Incentive Rates ({form.items.length} {form.items.length === 1 ? 'Bill' : 'Bills'})
                </h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                  Formula: Taxable = Bags Qty × Rate Per Bag (default ₹100/bag)
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  background: '#1e3a2b',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
                Add Bill Row
              </button>
            </div>

            {/* Item Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {form.items.map((item, index) => {
                const rowTaxable = (parseInt(item.bagsQty, 10) || 0) * (parseFloat(item.ratePerBag) || 0)
                const rowGst = Math.round(rowTaxable * (form.gstRate / 100) * 100) / 100
                const rowTotal = rowTaxable + rowGst

                return (
                  <div
                    key={item.id || index}
                    style={{
                      background: 'var(--tag-bg, #f8fafc)',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                      <span
                        style={{
                          background: '#e2e8f0',
                          color: '#334155',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px'
                        }}
                      >
                        ROW #{index + 1}
                      </span>
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', marginBottom: '0.65rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.2rem' }}>
                          Bill No *
                        </label>
                        <input
                          type="text"
                          value={item.billNo}
                          onChange={(e) => handleItemChange(index, 'billNo', e.target.value)}
                          placeholder="e.g. A-48"
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.6rem',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            borderRadius: '6px',
                            fontSize: '0.825rem',
                            fontWeight: 700
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.2rem' }}>
                          Bill Date
                        </label>
                        <input
                          type="date"
                          value={item.billDate}
                          onChange={(e) => handleItemChange(index, 'billDate', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.6rem',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            borderRadius: '6px',
                            fontSize: '0.825rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.2rem' }}>
                          Bags Qty *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.bagsQty}
                          onChange={(e) => handleItemChange(index, 'bagsQty', e.target.value)}
                          placeholder="300"
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.6rem',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            borderRadius: '6px',
                            fontSize: '0.825rem',
                            fontWeight: 700
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.2rem' }}>
                          Rate Per Bag (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.ratePerBag}
                          onChange={(e) => handleItemChange(index, 'ratePerBag', e.target.value)}
                          placeholder="100"
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.6rem',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            borderRadius: '6px',
                            fontSize: '0.825rem',
                            fontWeight: 700
                          }}
                        />
                      </div>
                    </div>

                    {/* Row Financial Computations Bar */}
                    <div
                      style={{
                        background: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary, #475569)'
                      }}
                    >
                      <div>
                        <span>Taxable: </span>
                        <strong style={{ color: 'var(--text-primary, #0f172a)' }}>₹{formatIndianCurrency(rowTaxable)}</strong>
                      </div>
                      <div>
                        <span>{form.taxTreatment === 'IGST' ? `IGST (${form.gstRate}%): ` : `GST (${form.gstRate}%): `}</span>
                        <strong style={{ color: 'var(--text-primary, #0f172a)' }}>₹{formatIndianCurrency(rowGst)}</strong>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700 }}>Row Total: </span>
                        <strong style={{ color: '#1e3a2b', fontSize: '0.825rem' }}>₹{formatIndianCurrency(rowTotal)}</strong>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE AUTHENTIC A4 DOCUMENT PREVIEW */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              padding: '1.25rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              fontFamily: '"Helvetica Neue", Arial, sans-serif'
            }}
          >
            {/* Header Document Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={16} color="#1e3a2b" />
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#1e3a2b', letterSpacing: '0.3px' }}>
                  LIVE A4 DOCUMENT PREVIEW
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--card-bg, #ffffff)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Fullscreen
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#1e3a2b',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  Download A4 PDF
                </button>
              </div>
            </div>

            {/* A4 PAPER CANVAS (SCALED MATCHING PDF) */}
            <div
              style={{
                border: '1.5px solid #000000',
                padding: '1.25rem',
                background: 'var(--card-bg, #ffffff)',
                fontSize: '0.74rem',
                color: '#000000',
                lineHeight: 1.4
              }}
            >
              {/* Seller Header */}
              <div style={{ textAlign: 'center', marginBottom: '0.65rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.5px' }}>
                  {form.sellerName || DEFAULT_DEBIT_NOTE_SETTINGS.sellerName}
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '0.15rem' }}>
                  {form.sellerAddressLine || DEFAULT_DEBIT_NOTE_SETTINGS.sellerAddressLine}
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '0.15rem' }}>
                  GST NO: <strong>{form.sellerGstin || DEFAULT_DEBIT_NOTE_SETTINGS.sellerGstin}</strong>
                  <span style={{ margin: '0 0.4rem' }}>•</span>
                  Mob: {form.mobile || DEFAULT_DEBIT_NOTE_SETTINGS.mobile}
                  <span style={{ margin: '0 0.4rem' }}>•</span>
                  {form.email || DEFAULT_DEBIT_NOTE_SETTINGS.email}
                </div>
              </div>

              {/* Double Horizontal Separator */}
              <div style={{ borderTop: '2px solid #000000', borderBottom: '1px solid #000000', height: '3px', margin: '0.65rem 0' }} />

              {/* Meta & Citation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
                <span>Ref: <strong>{form.referenceNo || '—'}</strong></span>
                <span>Date: .....................</span>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.68rem', fontStyle: 'italic', marginBottom: '0.35rem' }}>
                {DEFAULT_DEBIT_NOTE_SETTINGS.legalCitation}
              </div>

              {/* Document Title */}
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  letterSpacing: '1.5px',
                  marginBottom: '0.75rem'
                }}
              >
                DEBIT NOTE
              </div>

              {/* Upper Box: Debit Note No/Date (Left) & Consignee Details (Right) */}
              <div style={{ border: '1px solid #000000', display: 'grid', gridTemplateColumns: '1fr 1.8fr', marginBottom: '0.75rem' }}>
                {/* Left Column: DEBIT NOTE NO & DATE */}
                <div style={{ borderRight: '1px solid #000000', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ borderBottom: '1px solid #000000', padding: '0.45rem 0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>DEBIT NOTE NO</span>
                    <strong>{form.debitNoteNo || 'AA-09'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid #000000', padding: '0.45rem 0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>DEBIT NOTE DATE</span>
                    <strong>{formatDebitNoteDate(form.debitNoteDate)}</strong>
                  </div>
                  <div style={{ padding: '0.45rem 0.55rem', flex: 1, display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Ref No:</span>
                    <span>{form.referenceNo || '—'}</span>
                  </div>
                </div>

                {/* Right Column: Details of Consignee / Receiver */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ borderBottom: '1px solid #000000', padding: '0.35rem 0.5rem', textAlign: 'center', fontWeight: 800, background: 'var(--tag-bg, #f8fafc)' }}>
                    Details of Consignee / Receiver
                  </div>
                  <div style={{ padding: '0.55rem', flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.825rem' }}>{form.receiverName || '—'}</div>
                    <div style={{ whiteSpace: 'pre-line', fontSize: '0.72rem', margin: '0.2rem 0', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {form.receiverAddress || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '0.35rem 0.55rem', borderTop: '1px solid #e2e8f0', background: 'var(--tag-bg, #f8fafc)' }}>
                    <span>State: <strong>{form.receiverState || '—'}</strong></span>
                    <span>State Code: <strong>{form.receiverStateCode || '—'}</strong></span>
                    <span>GSTIN: <strong>{form.receiverGstin || '—'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Main Goods Description Banner */}
              <div
                style={{
                  border: '1px solid #000000',
                  padding: '0.35rem 0.5rem',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  marginBottom: '0.65rem',
                  background: 'var(--tag-bg, #f8fafc)'
                }}
              >
                {form.goodsDescription || 'Annual Bonus / Incentive'}
              </div>

              {/* 10-Column Multi-Bill Table */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.65rem',
                  marginBottom: '0.65rem',
                  border: '1px solid #000000'
                }}
              >
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000000' }}>
                    <th style={{ border: '1px solid #000000', padding: '0.3rem 0.2rem', textAlign: 'center', width: '6%' }}>SL NO</th>
                    <th style={{ border: '1px solid #000000', padding: '0.3rem 0.3rem', textAlign: 'left', width: '22%' }}>DESCRIPTION OF GOODS</th>
                    <th style={{ border: '1px solid #000000', padding: '0.3rem 0.2rem', textAlign: 'center', width: '10%' }}>HSN CODE</th>
                    <th style={{ border: '1px solid #000000', padding: '0.3rem 0.2rem', textAlign: 'center', width: '8%' }}>BILL NO</th>
                    <th style={{ border: '1px solid #000000', padding: '0.3rem 0.2rem', textAlign: 'center', width: '10%' }}>BILL DATE</th>
                    <th style={{ border: '1px solid #000000', padding: '0.3rem 0.2rem', textAlign: 'right', width: '8%' }}>BAGS QTY</th>
                    <th style={{ border: '1px solid #000000', padding: '0.3rem 0.2rem', textAlign: 'right', width: '8%' }}>RATE/BAG</th>
                    <th style={{ border: '1px solid #000000', padding: '0.3rem 0.2rem', textAlign: 'right', width: '10%' }}>TOTAL TAXABLE</th>
                    <th style={{ border: '1px solid #000000', padding: '0.3rem 0.2rem', textAlign: 'right', width: '8%' }}>
                      {form.taxTreatment === 'IGST' ? `IGST (${form.gstRate}%)` : `GST (${form.gstRate}%)`}
                    </th>
                    <th style={{ border: '1px solid #000000', padding: '0.3rem 0.2rem', textAlign: 'right', width: '10%' }}>TOTAL DN AMT</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.calculatedItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
                      <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'center' }}>{item.slNo}</td>
                      <td style={{ border: '1px solid #000000', padding: '0.35rem 0.3rem' }}>
                        {item.description || (idx === 0 ? form.goodsDescription : '')}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'center' }}>
                        {item.hsnCode || form.hsnCode}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'center', fontWeight: 700 }}>
                        {item.billNo}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'center' }}>
                        {formatDebitNoteDate(item.billDate)}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'right', fontWeight: 700 }}>
                        {item.bagsQty}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'right' }}>
                        {formatIndianCurrency(item.ratePerBag)}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'right', fontWeight: 600 }}>
                        {formatIndianCurrency(item.taxableAmount)}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'right' }}>
                        {formatIndianCurrency(item.lineGst)}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'right', fontWeight: 800 }}>
                        {formatIndianCurrency(item.totalDnAmt)}
                      </td>
                    </tr>
                  ))}

                  {/* Totals Summary Row */}
                  <tr style={{ background: 'var(--tag-bg, #f8fafc)', fontWeight: 800, borderTop: '2px solid #000000' }}>
                    <td colSpan={5} style={{ border: '1px solid #000000', padding: '0.35rem 0.3rem', textAlign: 'right' }}>
                      TOTAL:
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'right' }}>
                      {totals.totalBags}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem' }}></td>
                    <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'right' }}>
                      ₹{formatIndianCurrency(totals.totalTaxable)}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'right' }}>
                      ₹{formatIndianCurrency(totals.totalGst)}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '0.35rem 0.2rem', textAlign: 'right', color: '#1e3a2b' }}>
                      ₹{formatIndianCurrency(totals.totalDnAmt)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Bottom Breakdown & Words Box */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <div style={{ border: '1px solid #000000', padding: '0.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, marginBottom: '0.2rem' }}>
                    TOTAL VALUE (IN WORDS):
                  </div>
                  <div style={{ fontSize: '0.72rem', fontStyle: 'italic', fontWeight: 700, color: '#1e3a2b' }}>
                    {totals.totalInWords}
                  </div>
                </div>

                <div style={{ border: '1px solid #000000', padding: '0.5rem', fontSize: '0.68rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span>Gross Total:</span>
                    <span>₹{formatIndianCurrency(totals.totalTaxable)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span>Net Taxable:</span>
                    <span>₹{formatIndianCurrency(totals.totalTaxable)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>{form.taxTreatment === 'IGST' ? `IGST @ ${form.gstRate}%:` : `GST @ ${form.gstRate}%:`}</span>
                    <span>₹{formatIndianCurrency(totals.totalGst)}</span>
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid #000000',
                      paddingTop: '0.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 800,
                      fontSize: '0.75rem'
                    }}
                  >
                    <span>Total DN Amount:</span>
                    <span>₹{formatIndianCurrency(totals.totalDnAmt)}</span>
                  </div>
                </div>
              </div>

              {/* Signatory Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.5rem' }}>
                <div style={{ textAlign: 'center', width: '180px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>For G.K. SAWMILL</div>
                  <div style={{ height: '35px' }}></div>
                  <div style={{ borderTop: '1px solid #000000', paddingTop: '0.2rem', fontSize: '0.7rem', fontWeight: 700 }}>
                    Proprietor
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: PICK FROM SAVED VATTA INVOICES */}
      {invoicePickerModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setInvoicePickerModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '12px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                  Pick Saved Vatta GST Invoice
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Select an earlier issued Vatta bill to autofill consignee details, bill number, date, and bags quantity
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInvoicePickerModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0', background: 'var(--tag-bg, #f8fafc)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={invoiceSearchQuery}
                  onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                  placeholder="Search by Invoice No (e.g. A-48, A-20), Party Name, or Vehicle No..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {/* Invoices List */}
            <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredPickerInvoices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                  <AlertTriangle size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No matching Vatta invoices found.</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                    Invoices created in Module 01 (Vatta GST Invoice Generator) will appear here.
                  </p>
                </div>
              ) : (
                filteredPickerInvoices.map((inv) => {
                  const data = inv.invoiceData || {}
                  const invTotals = inv.totals || {}
                  return (
                    <div
                      key={inv.id}
                      onClick={() => handlePickVattaInvoice(inv)}
                      style={{
                        border: '1px solid var(--border-color, #cbd5e1)',
                        borderRadius: '8px',
                        padding: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        background: 'var(--card-bg, #ffffff)'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1e3a2b')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e3a2b' }}>
                            {data.invoiceNo || 'Untitled'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {formatDebitNoteDate(data.invoiceDate)}
                          </span>
                          {data.vehicleNo && (
                            <span style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {data.vehicleNo}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                          {data.receiverName || 'No party name'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {data.receiverState ? `${data.receiverState} (${data.receiverStateCode || ''})` : ''} • GSTIN: {data.receiverGstin || 'N/A'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                          ₹{formatIndianCurrency(invTotals.grandTotal || inv.grandTotal || 0)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#2d6a4f', fontWeight: 600, marginTop: '0.2rem' }}>
                          Click to Select &rarr;
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: HISTORY OF SAVED DEBIT NOTES */}
      {showHistoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '12px',
              maxWidth: '780px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                  Debit Note Records History ({savedDebitNotesList.length})
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Saved in browser storage and synchronized to cloud database
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0', background: 'var(--tag-bg, #f8fafc)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search by Debit Note No (e.g. AA-09), Consignee, or Description..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {/* List */}
            <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredHistoryNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                  <History size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No saved Debit Notes yet.</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                    Click "Save Note" in the top bar to record debit notes for instant retrieval.
                  </p>
                </div>
              ) : (
                filteredHistoryNotes.map((dn) => (
                  <div
                    key={dn.id}
                    style={{
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      background: 'var(--card-bg, #ffffff)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e3a2b' }}>
                          {dn.debitNoteNo}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {formatDebitNoteDate(dn.debitNoteDate)}
                        </span>
                        <span style={{ fontSize: '0.72rem', background: '#eaf3ed', color: '#1e3a2b', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                          {dn.totalBags || 0} Bags
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                        {dn.receiverName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {dn.goodsDescription}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                          ₹{formatIndianCurrency(dn.totalDnAmt || dn.totalDnAmount || 0)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Taxable: ₹{formatIndianCurrency(dn.totalTaxable || dn.taxable_amount || 0)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLoadFromHistory(dn)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #1e3a2b',
                          background: 'var(--card-bg, #ffffff)',
                          color: '#1e3a2b',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}
                      >
                        Open
                      </button>

                      <button
                        type="button"
                        onClick={() => generateDebitNotePdf(dn, true)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#2d6a4f',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteFromHistory(dn.id, dn.debitNoteNo)}
                        style={{
                          padding: '0.35rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer'
                        }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FULLSCREEN A4 PREVIEW MODAL */}
      {showPreviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '12px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '94vh',
              overflowY: 'auto',
              padding: '1.5rem',
              boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={20} color="#1e3a2b" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  A4 Print-Ready Document Preview • Debit Note {form.debitNoteNo}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1e3a2b',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.8rem'
                  }}
                >
                  <Download size={14} />
                  Download A4 PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Embedded A4 Document View */}
            <div
              style={{
                border: '2px solid #000000',
                padding: '1.5rem',
                background: 'var(--card-bg, #ffffff)',
                fontFamily: '"Helvetica Neue", Arial, sans-serif',
                fontSize: '0.8rem',
                lineHeight: 1.4
              }}
            >
              {/* Seller Header */}
              <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>
                  {form.sellerName || DEFAULT_DEBIT_NOTE_SETTINGS.sellerName}
                </div>
                <div style={{ fontSize: '0.825rem', marginTop: '0.2rem' }}>
                  {form.sellerAddressLine || DEFAULT_DEBIT_NOTE_SETTINGS.sellerAddressLine}
                </div>
                <div style={{ fontSize: '0.825rem', marginTop: '0.2rem' }}>
                  GST NO: <strong>{form.sellerGstin || DEFAULT_DEBIT_NOTE_SETTINGS.sellerGstin}</strong>
                  <span style={{ margin: '0 0.5rem' }}>•</span>
                  Mob: {form.mobile || DEFAULT_DEBIT_NOTE_SETTINGS.mobile}
                  <span style={{ margin: '0 0.5rem' }}>•</span>
                  {form.email || DEFAULT_DEBIT_NOTE_SETTINGS.email}
                </div>
              </div>

              <div style={{ borderTop: '2px solid #000000', borderBottom: '1px solid #000000', height: '3px', margin: '0.85rem 0' }} />

              {/* Meta & Citation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.45rem' }}>
                <span>Ref: <strong>{form.referenceNo || '—'}</strong></span>
                <span>Date: .....................</span>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.78rem', fontStyle: 'italic', marginBottom: '0.45rem' }}>
                {DEFAULT_DEBIT_NOTE_SETTINGS.legalCitation}
              </div>

              <div style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '1.5px', marginBottom: '0.85rem' }}>
                DEBIT NOTE
              </div>

              {/* Upper Box: Debit Note No/Date (Left) & Consignee Details (Right) */}
              <div style={{ border: '1px solid #000000', display: 'grid', gridTemplateColumns: '1fr 1.8fr', marginBottom: '0.85rem' }}>
                {/* Left Column: DEBIT NOTE NO & DATE */}
                <div style={{ borderRight: '1px solid #000000', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ borderBottom: '1px solid #000000', padding: '0.55rem 0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>DEBIT NOTE NO</span>
                    <strong>{form.debitNoteNo || 'AA-09'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid #000000', padding: '0.55rem 0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>DEBIT NOTE DATE</span>
                    <strong>{formatDebitNoteDate(form.debitNoteDate)}</strong>
                  </div>
                  <div style={{ padding: '0.55rem 0.75rem', flex: 1, display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Ref No:</span>
                    <span>{form.referenceNo || '—'}</span>
                  </div>
                </div>

                {/* Right Column: Details of Consignee / Receiver */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ borderBottom: '1px solid #000000', padding: '0.4rem 0.75rem', textAlign: 'center', fontWeight: 800, background: 'var(--tag-bg, #f8fafc)' }}>
                    Details of Consignee / Receiver
                  </div>
                  <div style={{ padding: '0.75rem', flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{form.receiverName || '—'}</div>
                    <div style={{ whiteSpace: 'pre-line', fontSize: '0.78rem', margin: '0.25rem 0', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {form.receiverAddress || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.45rem 0.75rem', borderTop: '1px solid #e2e8f0', background: 'var(--tag-bg, #f8fafc)' }}>
                    <span>State: <strong>{form.receiverState || '—'}</strong></span>
                    <span>State Code: <strong>{form.receiverStateCode || '—'}</strong></span>
                    <span>GSTIN: <strong>{form.receiverGstin || '—'}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid #000000', padding: '0.45rem 0.65rem', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.85rem', background: 'var(--tag-bg, #f8fafc)' }}>
                {form.goodsDescription}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', marginBottom: '0.85rem', border: '1px solid #000000' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000000' }}>
                    <th style={{ border: '1px solid #000000', padding: '0.4rem 0.25rem', textAlign: 'center', width: '5%' }}>SL NO</th>
                    <th style={{ border: '1px solid #000000', padding: '0.4rem 0.4rem', textAlign: 'left', width: '23%' }}>DESCRIPTION OF GOODS</th>
                    <th style={{ border: '1px solid #000000', padding: '0.4rem 0.25rem', textAlign: 'center', width: '10%' }}>HSN CODE</th>
                    <th style={{ border: '1px solid #000000', padding: '0.4rem 0.25rem', textAlign: 'center', width: '8%' }}>BILL NO</th>
                    <th style={{ border: '1px solid #000000', padding: '0.4rem 0.25rem', textAlign: 'center', width: '10%' }}>BILL DATE</th>
                    <th style={{ border: '1px solid #000000', padding: '0.4rem 0.25rem', textAlign: 'right', width: '8%' }}>BAGS QTY</th>
                    <th style={{ border: '1px solid #000000', padding: '0.4rem 0.25rem', textAlign: 'right', width: '8%' }}>RATE/BAG</th>
                    <th style={{ border: '1px solid #000000', padding: '0.4rem 0.25rem', textAlign: 'right', width: '10%' }}>TOTAL TAXABLE</th>
                    <th style={{ border: '1px solid #000000', padding: '0.4rem 0.25rem', textAlign: 'right', width: '8%' }}>
                      {form.taxTreatment === 'IGST' ? `IGST (${form.gstRate}%)` : `GST (${form.gstRate}%)`}
                    </th>
                    <th style={{ border: '1px solid #000000', padding: '0.4rem 0.25rem', textAlign: 'right', width: '10%' }}>TOTAL DN AMT</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.calculatedItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
                      <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'center' }}>{item.slNo}</td>
                      <td style={{ border: '1px solid #000000', padding: '0.45rem 0.4rem' }}>{item.description || (idx === 0 ? form.goodsDescription : '')}</td>
                      <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'center' }}>{item.hsnCode || form.hsnCode}</td>
                      <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'center', fontWeight: 700 }}>{item.billNo}</td>
                      <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'center' }}>{formatDebitNoteDate(item.billDate)}</td>
                      <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'right', fontWeight: 700 }}>{item.bagsQty}</td>
                      <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'right' }}>{formatIndianCurrency(item.ratePerBag)}</td>
                      <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'right', fontWeight: 600 }}>{formatIndianCurrency(item.taxableAmount)}</td>
                      <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'right' }}>{formatIndianCurrency(item.lineGst)}</td>
                      <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'right', fontWeight: 800 }}>{formatIndianCurrency(item.totalDnAmt)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--tag-bg, #f8fafc)', fontWeight: 800, borderTop: '2px solid #000000' }}>
                    <td colSpan={5} style={{ border: '1px solid #000000', padding: '0.45rem 0.4rem', textAlign: 'right' }}>TOTAL:</td>
                    <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'right' }}>{totals.totalBags}</td>
                    <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem' }}></td>
                    <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'right' }}>₹{formatIndianCurrency(totals.totalTaxable)}</td>
                    <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'right' }}>₹{formatIndianCurrency(totals.totalGst)}</td>
                    <td style={{ border: '1px solid #000000', padding: '0.45rem 0.25rem', textAlign: 'right', color: '#1e3a2b' }}>₹{formatIndianCurrency(totals.totalDnAmt)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div style={{ border: '1px solid #000000', padding: '0.65rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>TOTAL VALUE (IN WORDS):</div>
                  <div style={{ fontSize: '0.8rem', fontStyle: 'italic', fontWeight: 700, color: '#1e3a2b' }}>{totals.totalInWords}</div>
                </div>

                <div style={{ border: '1px solid #000000', padding: '0.65rem', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span>Gross Total:</span>
                    <span>₹{formatIndianCurrency(totals.totalTaxable)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span>Net Taxable:</span>
                    <span>₹{formatIndianCurrency(totals.totalTaxable)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>{form.taxTreatment === 'IGST' ? `IGST @ ${form.gstRate}%:` : `GST @ ${form.gstRate}%:`}</span>
                    <span>₹{formatIndianCurrency(totals.totalGst)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid #000000', paddingTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.85rem' }}>
                    <span>Total DN Amount:</span>
                    <span>₹{formatIndianCurrency(totals.totalDnAmt)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '0.5rem' }}>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>For G.K. SAWMILL</div>
                  <div style={{ height: '45px' }}></div>
                  <div style={{ borderTop: '1px solid #000000', paddingTop: '0.25rem', fontSize: '0.8rem', fontWeight: 700 }}>
                    Proprietor
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
