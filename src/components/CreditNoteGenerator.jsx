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
  Truck,
  Hash,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Printer,
  Cloud,
  Check
} from 'lucide-react'
import {
  formatIndianCurrency,
  formatCreditNoteDate,
  calculateCreditNoteTotals,
  getSavedCreditNotes,
  saveCreditNoteRecord,
  deleteCreditNoteRecord,
  DEFAULT_CREDIT_REASONS,
  DEFAULT_CREDIT_NOTE_SETTINGS,
  SAMPLE_BENCHMARK_CREDIT_NOTE_CN09
} from '../data/creditNoteSettings.js'
import {
  getSavedVattaInvoices,
  saveVattaInvoiceRecord,
  SAMPLE_VATTA_INVOICE_A20,
  calculateVattaInvoiceTotals
} from '../data/vattaInvoiceSettings.js'
import { generateCreditNotePdf } from '../utils/creditNotePdfGenerator.js'
import { uploadPdfToStorage, isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'

export default function CreditNoteGenerator({
  onBack,
  onOpenVattaInvoice,
  onOpenVattaMeasurement
}) {
  // Saved Vatta Invoices list
  const [savedVattaInvoices, setSavedVattaInvoices] = useState([])
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('')

  // Selected Original Vatta Invoice
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  // Credit Note Form State
  const [creditNoteForm, setCreditNoteForm] = useState({
    id: '',
    creditNoteNo: 'CN-09',
    creditNoteDate: new Date().toISOString().split('T')[0],
    referenceNo: '',

    // Original Invoice links
    originalInvoiceId: '',
    originalInvoiceNo: '',
    originalInvoiceDate: '',

    // Receiver
    receiverName: '',
    receiverAddress: '',
    receiverPinNo: '',
    receiverMobileNo: '',
    receiverGstin: '',
    receiverState: '',
    receiverStateCode: '',

    // Despatched
    despatchedName: '',
    despatchedAddress: '',
    despatchedPinNo: '',
    despatchedMobileNo: '',
    despatchedGstin: '',
    despatchedState: '',
    despatchedStateCode: '',

    // Goods & Reason
    goodsDescription: 'Vatta wood Pencil Slats\n(Rejection Refund)',
    creditReason: 'Rejection Refund',
    hsnCode: '44219140',

    // Financial Inputs
    creditMode: 'direct', // 'direct' | 'itemized'
    directTaxableAmount: '1301.64',
    itemRejections: {}, // { [productId]: rejectedPieces }
    taxTreatment: 'IGST',
    gstRate: 5
  })

  // Modals & Notifications
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [savedCreditNotesList, setSavedCreditNotesList] = useState([])
  const [historySearchQuery, setHistorySearchQuery] = useState('')
  const [notification, setNotification] = useState('')
  const [validationError, setValidationError] = useState('')
  const [isSavingCloud, setIsSavingCloud] = useState(false)

  // Load saved Vatta invoices & credit notes on mount
  useEffect(() => {
    let invoices = getSavedVattaInvoices()
    // If no invoices exist in local storage, automatically seed sample A-20 so user can immediately test
    if (!invoices || invoices.length === 0) {
      const benchmarkCalculated = calculateVattaInvoiceTotals({
        bagQuantities: SAMPLE_VATTA_INVOICE_A20.bagQuantities,
        taxTreatment: SAMPLE_VATTA_INVOICE_A20.taxTreatment,
        gstRate: SAMPLE_VATTA_INVOICE_A20.gstRate
      })
      const seededA20 = {
        id: 'vatta_inv_sample_a20',
        title: `Invoice A-20 - ${SAMPLE_VATTA_INVOICE_A20.receiverName}`,
        invoiceData: { ...SAMPLE_VATTA_INVOICE_A20 },
        totals: benchmarkCalculated,
        productsSnapshot: benchmarkCalculated.lines,
        grandTotal: benchmarkCalculated.grandTotal,
        savedAt: new Date().toISOString()
      }
      saveVattaInvoiceRecord(seededA20)
      invoices = [seededA20]
    }
    setSavedVattaInvoices(invoices)

    const creditNotes = getSavedCreditNotes()
    setSavedCreditNotesList(creditNotes)

    // Preload benchmark invoice A-20 into form
    const sampleA20 = invoices.find(inv => inv.invoiceData?.invoiceNo === 'A-20') || invoices[0]
    if (sampleA20) {
      selectInvoiceRecord(sampleA20, false)
    }
  }, [])

  const showToast = (msg) => {
    setNotification(msg)
    setTimeout(() => {
      setNotification('')
    }, 4000)
  }

  // Filtered saved Vatta invoices
  const filteredVattaInvoices = useMemo(() => {
    if (!invoiceSearchQuery.trim()) return savedVattaInvoices
    const q = invoiceSearchQuery.toLowerCase()
    return savedVattaInvoices.filter((inv) => {
      const invNo = inv.invoiceData?.invoiceNo || ''
      const rec = inv.invoiceData?.receiverName || ''
      const veh = inv.invoiceData?.vehicleNo || ''
      return (
        invNo.toLowerCase().includes(q) ||
        rec.toLowerCase().includes(q) ||
        veh.toLowerCase().includes(q)
      )
    })
  }, [savedVattaInvoices, invoiceSearchQuery])

  // Select a Vatta Invoice and populate the credit note form
  const selectInvoiceRecord = (invRecord, notify = true) => {
    if (!invRecord) return
    setSelectedInvoice(invRecord)
    const data = invRecord.invoiceData || {}

    // Determine default credit note number based on existing count
    const existing = getSavedCreditNotes()
    const nextCnNo = `CN-${String(existing.length + 1).padStart(2, '0')}`

    setCreditNoteForm((prev) => ({
      ...prev,
      id: `cn_${Date.now()}`,
      creditNoteNo: prev.creditNoteNo || nextCnNo,
      originalInvoiceId: invRecord.id,
      originalInvoiceNo: data.invoiceNo || '',
      originalInvoiceDate: data.invoiceDate || '',

      // Receiver
      receiverName: data.receiverName || '',
      receiverAddress: data.receiverAddress || '',
      receiverPinNo: data.receiverPinNo || '',
      receiverMobileNo: data.receiverMobileNo || '',
      receiverGstin: data.receiverGstin || '',
      receiverState: data.receiverState || '',
      receiverStateCode: data.receiverStateCode || '',

      // Despatched
      despatchedName: data.despatchedName || '',
      despatchedAddress: data.despatchedAddress || '',
      despatchedPinNo: data.despatchedPinNo || '',
      despatchedMobileNo: data.despatchedMobileNo || '',
      despatchedGstin: data.despatchedGstin || '',
      despatchedState: data.despatchedState || '',
      despatchedStateCode: data.despatchedStateCode || '',

      taxTreatment: data.taxTreatment || 'IGST',
      gstRate: data.gstRate !== undefined ? Number(data.gstRate) : 5,

      // Default sample values if A-20 selected
      directTaxableAmount: data.invoiceNo === 'A-20' ? '1301.64' : (prev.directTaxableAmount || '0')
    }))

    if (notify) {
      showToast(`Selected Vatta Invoice ${data.invoiceNo} (${data.receiverName || 'Purchaser'})`)
    }
  }

  // Calculate prior credits issued for selected invoice
  const priorCredits = useMemo(() => {
    if (!selectedInvoice) return { totalCredited: 0, count: 0 }
    const existing = savedCreditNotesList.filter(
      cn => cn.originalInvoiceId === selectedInvoice.id && cn.id !== creditNoteForm.id
    )
    const totalCredited = existing.reduce((sum, cn) => sum + (Number(cn.netValue) || 0), 0)
    return {
      totalCredited: Math.round(totalCredited * 100) / 100,
      count: existing.length
    }
  }, [selectedInvoice, savedCreditNotesList, creditNoteForm.id])

  // Derive taxable amount based on mode (direct or itemized)
  const computedTaxableAmount = useMemo(() => {
    if (creditNoteForm.creditMode === 'direct') {
      return parseFloat(creditNoteForm.directTaxableAmount) || 0
    }
    // Itemized rejection calculation
    if (!selectedInvoice || !selectedInvoice.totals?.lines) return 0
    let total = 0
    selectedInvoice.totals.lines.forEach((line) => {
      const rejectedPcs = Number(creditNoteForm.itemRejections[line.id]) || 0
      if (rejectedPcs > 0) {
        const ratePer1000 = Number(line.unitPricePer1000) || 0
        total += (rejectedPcs / 1000) * ratePer1000
      }
    })
    return Math.round(total * 100) / 100
  }, [creditNoteForm.creditMode, creditNoteForm.directTaxableAmount, creditNoteForm.itemRejections, selectedInvoice])

  // Complete calculated financial breakdown
  const calculated = useMemo(() => {
    return calculateCreditNoteTotals({
      taxableAmount: computedTaxableAmount,
      taxTreatment: creditNoteForm.taxTreatment,
      gstRate: creditNoteForm.gstRate
    })
  }, [computedTaxableAmount, creditNoteForm.taxTreatment, creditNoteForm.gstRate])

  // Remaining creditable balance on original invoice
  const originalInvoiceGrandTotal = selectedInvoice?.grandTotal || selectedInvoice?.totals?.grandTotal || 0
  const remainingCreditableBalance = Math.max(0, originalInvoiceGrandTotal - priorCredits.totalCredited)
  const isOverCredited = originalInvoiceGrandTotal > 0 && calculated.netValue > remainingCreditableBalance

  // Load benchmark sample CN-09
  const handleLoadBenchmarkCN09 = () => {
    setCreditNoteForm((prev) => ({
      ...prev,
      ...SAMPLE_BENCHMARK_CREDIT_NOTE_CN09,
      directTaxableAmount: String(SAMPLE_BENCHMARK_CREDIT_NOTE_CN09.taxableAmount),
      creditMode: 'direct'
    }))
    showToast('Loaded Benchmark Credit Note CN-09 (Sample Reference)!')
  }

  // Handle Save
  const handleSaveCreditNote = async () => {
    setValidationError('')
    if (!creditNoteForm.creditNoteNo.trim()) {
      setValidationError('Please enter a Credit Note Number.')
      return
    }
    if (!creditNoteForm.originalInvoiceNo.trim()) {
      setValidationError('Please select an original Vatta Invoice before saving.')
      return
    }
    if (calculated.netValue <= 0) {
      setValidationError('Please enter a creditable taxable amount greater than 0.')
      return
    }

    const recordToSave = {
      id: creditNoteForm.id || `cn_${Date.now()}`,
      creditNoteNo: creditNoteForm.creditNoteNo.trim(),
      creditNoteDate: creditNoteForm.creditNoteDate,
      referenceNo: creditNoteForm.referenceNo.trim(),

      originalInvoiceId: creditNoteForm.originalInvoiceId || selectedInvoice?.id || `vatta_inv_${Date.now()}`,
      originalInvoiceNo: creditNoteForm.originalInvoiceNo,
      originalInvoiceDate: creditNoteForm.originalInvoiceDate,

      receiverName: creditNoteForm.receiverName,
      receiverAddress: creditNoteForm.receiverAddress,
      receiverPinNo: creditNoteForm.receiverPinNo,
      receiverMobileNo: creditNoteForm.receiverMobileNo,
      receiverGstin: creditNoteForm.receiverGstin,
      receiverState: creditNoteForm.receiverState,
      receiverStateCode: creditNoteForm.receiverStateCode,

      despatchedName: creditNoteForm.despatchedName,
      despatchedAddress: creditNoteForm.despatchedAddress,
      despatchedPinNo: creditNoteForm.despatchedPinNo,
      despatchedMobileNo: creditNoteForm.despatchedMobileNo,
      despatchedGstin: creditNoteForm.despatchedGstin,
      despatchedState: creditNoteForm.despatchedState,
      despatchedStateCode: creditNoteForm.despatchedStateCode,

      goodsDescription: creditNoteForm.goodsDescription,
      creditReason: creditNoteForm.creditReason,
      hsnCode: creditNoteForm.hsnCode,

      taxableAmount: calculated.taxableAmount,
      taxTreatment: calculated.taxTreatment,
      gstRate: calculated.gstRate,
      cgstRate: calculated.cgstRate,
      cgstAmount: calculated.cgstAmount,
      sgstRate: calculated.sgstRate,
      sgstAmount: calculated.sgstAmount,
      igstRate: calculated.igstRate,
      igstAmount: calculated.igstAmount,
      roundOff: calculated.roundOff,
      netValue: calculated.netValue,
      totalInWords: calculated.totalInWords,

      creditMode: creditNoteForm.creditMode,
      directTaxableAmount: creditNoteForm.directTaxableAmount,
      itemRejections: creditNoteForm.itemRejections
    }

    // Generate PDF Blob for remote upload if Supabase is active
    setIsSavingCloud(true)
    let pdfPath = null
    try {
      const { blob } = generateCreditNotePdf(recordToSave, false)
      if (isSupabaseConfigured && supabase) {
        const remoteFileName = `credit-notes/${recordToSave.creditNoteNo}_${Date.now()}.pdf`
        const uploadRes = await uploadPdfToStorage('business-documents', remoteFileName, blob)
        if (uploadRes.path) {
          pdfPath = uploadRes.path
          recordToSave.pdfStoragePath = pdfPath
        }
      }
    } catch (err) {
      console.warn('PDF blob preparation notice:', err)
    } finally {
      setIsSavingCloud(false)
    }

    const updated = saveCreditNoteRecord(recordToSave)
    if (updated) {
      setSavedCreditNotesList(updated)
      showToast(`Saved Credit Note ${recordToSave.creditNoteNo} successfully!`)
    }
  }

  // Handle Download PDF
  const handleDownloadPdf = () => {
    setValidationError('')
    if (!creditNoteForm.creditNoteNo.trim()) {
      setValidationError('Please enter a Credit Note Number.')
      return
    }
    const fullPayload = {
      ...creditNoteForm,
      ...calculated
    }
    generateCreditNotePdf(fullPayload, true)
    showToast(`Downloading Credit Note ${creditNoteForm.creditNoteNo}.pdf...`)
  }

  // Open existing credit note from history
  const handleOpenFromHistory = (cn) => {
    setCreditNoteForm({
      ...cn,
      creditMode: cn.creditMode || 'direct',
      directTaxableAmount: String(cn.taxableAmount || '0'),
      itemRejections: cn.itemRejections || {}
    })
    // Attempt to locate original invoice in saved list
    const foundInv = savedVattaInvoices.find(inv => inv.id === cn.originalInvoiceId || inv.invoiceData?.invoiceNo === cn.originalInvoiceNo)
    if (foundInv) {
      setSelectedInvoice(foundInv)
    }
    setShowHistoryModal(false)
    showToast(`Loaded Credit Note ${cn.creditNoteNo} into editor.`)
  }

  // Delete credit note with confirmation
  const handleDeleteCreditNote = (id, cnNo) => {
    if (window.confirm(`Are you sure you want to delete Credit Note ${cnNo}? This cannot be undone.`)) {
      const updated = deleteCreditNoteRecord(id)
      if (updated) {
        setSavedCreditNotesList(updated)
        showToast(`Deleted Credit Note ${cnNo}.`)
      }
    }
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.25rem 1rem 3rem' }}>
      {/* Top Banner / Breadcrumbs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          background: 'linear-gradient(135deg, #1e3a2b 0%, #2d6a4f 100%)',
          borderRadius: '16px',
          padding: '1.25rem 1.75rem',
          color: '#ffffff',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 24px rgba(30, 58, 43, 0.2)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.5px'
              }}
            >
              MODULE 06 • VATTA WOOD BUSINESS
            </span>
            <span
              style={{
                background: '#d4a373',
                color: '#1e3a2b',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800
              }}
            >
              Section 34 CGST Act
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Credit Note Generator
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
            Form GST Credit Note for Vatta wood pencil slats rejection, shortage, and rate adjustments
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleLoadBenchmarkCN09}
            style={{
              background: '#d4a373',
              border: 'none',
              color: '#1e3a2b',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}
          >
            <Sparkles size={15} />
            Load Sample CN-09
          </button>
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              color: '#ffffff',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <History size={15} />
            History ({savedCreditNotesList.length})
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: '#ffffff',
              border: 'none',
              color: '#1e3a2b',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ArrowLeft size={15} />
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #10b981',
            color: '#065f46',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            fontSize: '0.88rem'
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          {notification}
        </div>
      )}

      {/* Validation Alert */}
      {validationError && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #ef4444',
            color: '#991b1b',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            fontSize: '0.88rem'
          }}
        >
          <AlertTriangle size={18} color="#ef4444" />
          {validationError}
        </div>
      )}

      {/* Over-Crediting Warning Banner */}
      {isOverCredited && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #f59e0b',
            color: '#92400e',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            fontSize: '0.88rem'
          }}
        >
          <ShieldAlert size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Warning: Over-crediting detected!</strong>
            <div>
              This credit note amount (<strong>₹{formatIndianCurrency(calculated.netValue)}</strong>) exceeds the remaining creditable balance (<strong>₹{formatIndianCurrency(remainingCreditableBalance)}</strong>) on original invoice {creditNoteForm.originalInvoiceNo}.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* =========================================================================
            LEFT COLUMN: INVOICE SELECTOR (Vatta Wood Invoices Exclusively)
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={18} color="#1e3a2b" />
                Select Vatta Invoice
              </h2>
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {savedVattaInvoices.length} Available
              </span>
            </div>

            <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: '#64748b' }}>
              Credit notes can only be issued against saved Vatta Wood invoices. Mahogany and Manjiyam timber sales are strictly segregated.
            </p>

            {/* Search Box */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }}
              />
              <input
                type="text"
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                placeholder="Search invoice no, receiver..."
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Invoices List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '380px', overflowY: 'auto' }}>
              {filteredVattaInvoices.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                  No matching Vatta invoices found.
                </div>
              ) : (
                filteredVattaInvoices.map((inv) => {
                  const data = inv.invoiceData || {}
                  const isSelected = selectedInvoice?.id === inv.id || creditNoteForm.originalInvoiceId === inv.id

                  return (
                    <div
                      key={inv.id}
                      onClick={() => selectInvoiceRecord(inv)}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #1e3a2b' : '1px solid #e2e8f0',
                        background: isSelected ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 800, color: '#1e3a2b', fontSize: '0.9rem' }}>
                          Invoice {data.invoiceNo}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {formatCreditNoteDate(data.invoiceDate, '-')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                        {data.receiverName || 'Vatta Purchaser'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                        <span>Lorry: {data.vehicleNo || 'N/A'}</span>
                        <strong style={{ color: '#0f172a' }}>
                          ₹{formatIndianCurrency(inv.grandTotal || inv.totals?.grandTotal || 0)}
                        </strong>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Original Invoice Reference Card */}
          {selectedInvoice && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem'
              }}
            >
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                Original Invoice Financials
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Original Grand Total:</span>
                  <strong style={{ color: '#1e293b' }}>₹{formatIndianCurrency(originalInvoiceGrandTotal)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Prior Credit Notes ({priorCredits.count}):</span>
                  <strong style={{ color: '#dc2626' }}>₹{formatIndianCurrency(priorCredits.totalCredited)}</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '0.4rem',
                    borderTop: '1px dashed #cbd5e1',
                    fontWeight: 700
                  }}
                >
                  <span style={{ color: '#1e3a2b' }}>Remaining Creditable:</span>
                  <span style={{ color: remainingCreditableBalance > 0 ? '#166534' : '#dc2626' }}>
                    ₹{formatIndianCurrency(remainingCreditableBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            RIGHT COLUMN: CREDIT NOTE EDITOR
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Main Details Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                  Credit Note Form
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Against Vatta Invoice: <strong>{creditNoteForm.originalInvoiceNo || 'None selected'}</strong>
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Eye size={15} />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handleSaveCreditNote}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#1e3a2b',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Save size={15} />
                  {isSavingCloud ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2d6a4f',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Download size={15} />
                  Download PDF
                </button>
              </div>
            </div>

            {/* Row 1: Document Reference Numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Credit Note No *
                </label>
                <input
                  type="text"
                  value={creditNoteForm.creditNoteNo}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, creditNoteNo: e.target.value })}
                  placeholder="CN-09"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Credit Note Date *
                </label>
                <input
                  type="date"
                  value={creditNoteForm.creditNoteDate}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, creditNoteDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Reference No (Ref)
                </label>
                <input
                  type="text"
                  value={creditNoteForm.referenceNo}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, referenceNo: e.target.value })}
                  placeholder="Optional reference"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Original Invoice Date
                </label>
                <input
                  type="date"
                  value={creditNoteForm.originalInvoiceDate}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, originalInvoiceDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Row 2: Parties Summary (Receiver & Despatched) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Receiver (Purchaser) */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                  <Building size={16} color="#1e3a2b" />
                  Details of Receiver (Purchaser)
                </div>
                <input
                  type="text"
                  value={creditNoteForm.receiverName}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, receiverName: e.target.value })}
                  placeholder="Receiver Company Name"
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: '0.4rem',
                    boxSizing: 'border-box'
                  }}
                />
                <textarea
                  value={creditNoteForm.receiverAddress}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, receiverAddress: e.target.value })}
                  rows={2}
                  placeholder="Receiver Address"
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    marginBottom: '0.4rem',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.4rem' }}>
                  <input
                    type="text"
                    value={creditNoteForm.receiverGstin}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, receiverGstin: e.target.value })}
                    placeholder="GSTIN"
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  <input
                    type="text"
                    value={creditNoteForm.receiverState}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, receiverState: e.target.value })}
                    placeholder="State"
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Despatched */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                  <Truck size={16} color="#1e3a2b" />
                  Details of Despatched (Consignee)
                </div>
                <input
                  type="text"
                  value={creditNoteForm.despatchedName}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, despatchedName: e.target.value })}
                  placeholder="Despatched Party Name"
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: '0.4rem',
                    boxSizing: 'border-box'
                  }}
                />
                <textarea
                  value={creditNoteForm.despatchedAddress}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, despatchedAddress: e.target.value })}
                  rows={2}
                  placeholder="Despatched Address"
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    marginBottom: '0.4rem',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.4rem' }}>
                  <input
                    type="text"
                    value={creditNoteForm.despatchedGstin}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, despatchedGstin: e.target.value })}
                    placeholder="GSTIN"
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  <input
                    type="text"
                    value={creditNoteForm.despatchedState}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, despatchedState: e.target.value })}
                    placeholder="State"
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Goods Description & Reason */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Reason for Credit Note
                </label>
                <select
                  value={creditNoteForm.creditReason}
                  onChange={(e) => {
                    const r = e.target.value
                    setCreditNoteForm({
                      ...creditNoteForm,
                      creditReason: r,
                      goodsDescription: `Vatta wood Pencil Slats\n(${r})`
                    })
                  }}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  {DEFAULT_CREDIT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  HSN Code
                </label>
                <input
                  type="text"
                  value={creditNoteForm.hsnCode}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, hsnCode: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  GST Tax Treatment
                </label>
                <select
                  value={creditNoteForm.taxTreatment}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, taxTreatment: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  <option value="IGST">Inter-State (IGST 5%)</option>
                  <option value="CGST_SGST">Intra-State (CGST 2.5% + SGST 2.5%)</option>
                </select>
              </div>
            </div>

            {/* Description of Goods field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                Description of Goods (Appears on Printed Table)
              </label>
              <textarea
                value={creditNoteForm.goodsDescription}
                onChange={(e) => setCreditNoteForm({ ...creditNoteForm, goodsDescription: e.target.value })}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Credit Amount Input Modes */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                  Credit Amount Determination
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setCreditNoteForm({ ...creditNoteForm, creditMode: 'direct' })}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: creditNoteForm.creditMode === 'direct' ? '#1e3a2b' : '#e2e8f0',
                      color: creditNoteForm.creditMode === 'direct' ? '#ffffff' : '#475569'
                    }}
                  >
                    Direct Taxable Amount
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditNoteForm({ ...creditNoteForm, creditMode: 'itemized' })}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: creditNoteForm.creditMode === 'itemized' ? '#1e3a2b' : '#e2e8f0',
                      color: creditNoteForm.creditMode === 'itemized' ? '#ffffff' : '#475569'
                    }}
                  >
                    Itemized Rejected Pieces
                  </button>
                </div>
              </div>

              {creditNoteForm.creditMode === 'direct' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Taxable Value Collected / Being Credited (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={creditNoteForm.directTaxableAmount}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, directTaxableAmount: e.target.value })}
                    placeholder="1301.64"
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#1e3a2b',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                    Enter the taxable amount before GST (benchmark sample uses <strong>1301.64</strong>).
                  </span>
                </div>
              ) : (
                <div>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: '#64748b' }}>
                    Enter rejected piece counts for each ply size from original invoice {creditNoteForm.originalInvoiceNo}:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedInvoice?.totals?.lines?.map((line) => {
                      const currentVal = creditNoteForm.itemRejections[line.id] || ''
                      const lineRejectionVal = ((Number(currentVal) || 0) / 1000) * Number(line.unitPricePer1000)

                      return (
                        <div
                          key={line.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.5fr 1fr 1.2fr 1fr',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem 0.75rem',
                            background: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.82rem'
                          }}
                        >
                          <div>
                            <strong>{line.item}</strong>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Rate: ₹{line.unitPricePer1000}/1k | Invoiced: {line.pieces} pcs
                            </div>
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0"
                              max={line.pieces}
                              value={currentVal}
                              onChange={(e) => {
                                const val = e.target.value
                                setCreditNoteForm({
                                  ...creditNoteForm,
                                  itemRejections: {
                                    ...creditNoteForm.itemRejections,
                                    [line.id]: val
                                  }
                                })
                              }}
                              placeholder="Rejected Pcs"
                              style={{
                                width: '100%',
                                padding: '0.35rem 0.5rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.82rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <div style={{ textAlign: 'right', color: '#475569', fontSize: '0.78rem' }}>
                            = ₹{formatIndianCurrency(lineRejectionVal)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Calculations Summary Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Taxable Amount:</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{formatIndianCurrency(calculated.taxableAmount)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {calculated.taxTreatment === 'CGST_SGST' ? 'CGST + SGST (5%):' : 'IGST (5%):'}
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{formatIndianCurrency(calculated.totalGst)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Round Off:</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {calculated.roundOff >= 0 ? `+${calculated.roundOff.toFixed(2)}` : calculated.roundOff.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#1e3a2b', fontWeight: 700 }}>Net Credit Value:</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e3a2b' }}>
                    ₹{formatIndianCurrency(calculated.netValue)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.8rem',
                  color: '#334155'
                }}
              >
                <strong>Total value in words:- </strong>
                <span>{calculated.totalInWords}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: LIVE ON-SCREEN A4 DOCUMENT PREVIEW
          ========================================================================= */}
      {showPreviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1500,
            padding: '1rem'
          }}
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e3a2b' }}>
                  Printable A4 Credit Note Preview
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Authentic layout matching the official G.K. Saw Mill document sample
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#1e3a2b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.82rem'
                  }}
                >
                  <Download size={15} />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    background: '#e2e8f0',
                    color: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.82rem'
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Document Replica Box (Scaled to A4 proportions) */}
            <div
              style={{
                border: '1px solid #000000',
                padding: '1.5rem',
                fontFamily: 'serif',
                color: '#000000',
                background: '#ffffff'
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, letterSpacing: '1px' }}>
                  G.K. SAWMILL
                </h1>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', marginTop: '0.2rem' }}>
                  Katoor, Nedumpana P.O, Kollam, Kerala- 691577
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                <div>GST No:32AHOPG1823G1ZP</div>
                <div style={{ textAlign: 'right' }}>
                  <div>MOB: 9446786175</div>
                  <div>anilkumarkottiyam175@gmail.com</div>
                </div>
              </div>

              {/* Double Horizontal Rule */}
              <div style={{ borderTop: '2px solid #000000', borderBottom: '1px solid #000000', height: '2px', marginBottom: '0.75rem' }} />

              {/* Ref & Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <div>Ref: {creditNoteForm.referenceNo}</div>
                <div>Date.....................</div>
              </div>

              <div style={{ textAlign: 'center', margin: '0.4rem 0' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>CREDIT NOTE</div>
                <div style={{ fontSize: '0.78rem', fontStyle: 'italic' }}>
                  (See section 34 CGST Act& Ruless 6 of Invoice Rules)
                </div>
              </div>

              {/* Boxed Information Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', fontSize: '0.82rem', marginBottom: '0' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #000000' }}>
                    <td style={{ width: '50%', padding: '0.35rem 0.5rem', borderRight: '1px solid #000000', fontWeight: 800 }}>
                      Credit Note No: {creditNoteForm.creditNoteNo}
                    </td>
                    <td style={{ width: '50%', padding: '0.35rem 0.5rem', textAlign: 'right' }}>
                      {formatCreditNoteDate(creditNoteForm.creditNoteDate, '/')}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000000' }}>
                    <td style={{ width: '50%', padding: '0.35rem 0.5rem', borderRight: '1px solid #000000' }}>
                      Serial No. of Original Invoice:- {creditNoteForm.originalInvoiceNo}
                    </td>
                    <td style={{ width: '50%', padding: '0.35rem 0.5rem', textAlign: 'right' }}>
                      Date of Orginal Invoice:- {formatCreditNoteDate(creditNoteForm.originalInvoiceDate, '-')}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000000', background: '#fafafa' }}>
                    <th style={{ width: '50%', padding: '0.35rem 0.5rem', borderRight: '1px solid #000000', textAlign: 'center', fontWeight: 800 }}>
                      Details of Receiver
                    </th>
                    <th style={{ width: '50%', padding: '0.35rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>
                      Details of Despatched
                    </th>
                  </tr>
                  <tr>
                    <td style={{ width: '50%', padding: '0.5rem', borderRight: '1px solid #000000', verticalAlign: 'top', lineHeight: '1.4' }}>
                      <div><strong>Name:</strong> {creditNoteForm.receiverName}</div>
                      <div><strong>Address:</strong> {creditNoteForm.receiverAddress}</div>
                      <div>MOB: {creditNoteForm.receiverMobileNo}</div>
                      <div>GSTIN :- {creditNoteForm.receiverGstin}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>STATE :- {creditNoteForm.receiverState}</span>
                        <span>State code:{creditNoteForm.receiverStateCode}</span>
                      </div>
                    </td>
                    <td style={{ width: '50%', padding: '0.5rem', verticalAlign: 'top', lineHeight: '1.4' }}>
                      <div style={{ fontWeight: 800 }}>{creditNoteForm.despatchedName}</div>
                      <div>{creditNoteForm.despatchedAddress}</div>
                      <div style={{ marginTop: '0.5rem' }}>GSTIN:- {creditNoteForm.despatchedGstin}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>STATE :- {creditNoteForm.despatchedState}</span>
                        <span>State code:{creditNoteForm.despatchedStateCode}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Goods Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', borderTop: 'none', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000000' }}>
                    <th style={{ width: '8%', padding: '0.4rem', borderRight: '1px solid #000000', textAlign: 'center' }}>SL No.</th>
                    <th style={{ width: '38%', padding: '0.4rem', borderRight: '1px solid #000000', textAlign: 'center' }}>Description of Goods</th>
                    <th style={{ width: '14%', padding: '0.4rem', borderRight: '1px solid #000000', textAlign: 'center' }}>HSN Code</th>
                    <th style={{ width: '16%', padding: '0.4rem', borderRight: '1px solid #000000', textAlign: 'center' }}>Total Value Collected</th>
                    <th style={{ width: '12%', padding: '0.4rem', borderRight: '1px solid #000000', textAlign: 'center' }}>
                      {calculated.taxTreatment === 'CGST_SGST' ? 'GST Rate' : 'IGST Rate'}
                    </th>
                    <th style={{ width: '12%', padding: '0.4rem', textAlign: 'center' }}>
                      {calculated.taxTreatment === 'CGST_SGST' ? 'GST Amt' : 'IGST Amt'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ height: '70px', verticalAlign: 'top' }}>
                    <td style={{ padding: '0.5rem', borderRight: '1px solid #000000', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '0.5rem', borderRight: '1px solid #000000', whiteSpace: 'pre-line' }}>
                      {creditNoteForm.goodsDescription}
                    </td>
                    <td style={{ padding: '0.5rem', borderRight: '1px solid #000000', textAlign: 'center' }}>
                      {creditNoteForm.hsnCode}
                    </td>
                    <td style={{ padding: '0.5rem', borderRight: '1px solid #000000', textAlign: 'right' }}>
                      {formatIndianCurrency(calculated.taxableAmount)}
                    </td>
                    <td style={{ padding: '0.5rem', borderRight: '1px solid #000000', textAlign: 'center' }}>
                      {calculated.gstRate}%
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      {formatIndianCurrency(calculated.totalGst)}
                    </td>
                  </tr>
                  {/* Total Subtotal Row */}
                  <tr style={{ borderTop: '1px solid #000000', borderBottom: '1px solid #000000', fontWeight: 800 }}>
                    <td colSpan={3} style={{ padding: '0.35rem 0.5rem', borderRight: '1px solid #000000', textAlign: 'right' }}>
                      Total
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', borderRight: '1px solid #000000', textAlign: 'right' }}>
                      {formatIndianCurrency(calculated.taxableAmount)}
                    </td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right' }}>
                      {formatIndianCurrency(calculated.totalGst)}
                    </td>
                  </tr>
                  {/* Summary Rows */}
                  <tr>
                    <td colSpan={3} style={{ borderRight: '1px solid #000000' }}></td>
                    <td colSpan={2} style={{ padding: '0.35rem 0.5rem', borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                      Taxable Amt
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', borderBottom: '1px solid #000000' }}>
                      {formatIndianCurrency(calculated.taxableAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ borderRight: '1px solid #000000' }}></td>
                    <td colSpan={2} style={{ padding: '0.35rem 0.5rem', borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                      Round Off
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', borderBottom: '1px solid #000000' }}>
                      {formatIndianCurrency(calculated.roundOff)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 800 }}>
                    <td colSpan={3} style={{ borderRight: '1px solid #000000' }}></td>
                    <td colSpan={2} style={{ padding: '0.35rem 0.5rem', borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                      Net Value
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', borderBottom: '1px solid #000000' }}>
                      {formatIndianCurrency(calculated.netValue)}
                    </td>
                  </tr>
                  {/* Words Row */}
                  <tr style={{ borderTop: '1px solid #000000' }}>
                    <td colSpan={6} style={{ padding: '0.45rem 0.5rem', fontWeight: 800 }}>
                      Total value in words:- {calculated.totalInWords}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatory Footer */}
              <div style={{ marginTop: '2.5rem', textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '0.95rem' }}>
                  For .G.K. Saw Mill
                </div>
                <div style={{ height: '35px' }} />
                <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                  Proprietor
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CREDIT NOTE HISTORY
          ========================================================================= */}
      {showHistoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1500,
            padding: '1rem'
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '780px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e3a2b' }}>
                  Saved Credit Notes History
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {savedCreditNotesList.length} credit notes recorded
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: '#e2e8f0',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }}
              />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search credit note no, invoice no, receiver..."
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {savedCreditNotesList
                .filter((cn) => {
                  if (!historySearchQuery.trim()) return true
                  const q = historySearchQuery.toLowerCase()
                  return (
                    (cn.creditNoteNo || '').toLowerCase().includes(q) ||
                    (cn.originalInvoiceNo || '').toLowerCase().includes(q) ||
                    (cn.receiverName || '').toLowerCase().includes(q)
                  )
                })
                .map((cn) => (
                  <div
                    key={cn.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 800, color: '#1e3a2b', fontSize: '0.95rem' }}>
                          {cn.creditNoteNo}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Dated {formatCreditNoteDate(cn.creditNoteDate, '-')}
                        </span>
                        <span
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}
                        >
                          Inv {cn.originalInvoiceNo}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                        {cn.receiverName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Reason: {cn.creditReason || 'Rejection Refund'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e3a2b' }}>
                          ₹{formatIndianCurrency(cn.netValue)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Taxable: ₹{formatIndianCurrency(cn.taxableAmount)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenFromHistory(cn)}
                          style={{
                            padding: '0.4rem 0.7rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#334155',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => generateCreditNotePdf(cn, true)}
                          style={{
                            padding: '0.4rem 0.7rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#2d6a4f',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Download size={13} />
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCreditNote(cn.id, cn.creditNoteNo)}
                          style={{
                            padding: '0.4rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#fee2e2',
                            color: '#dc2626',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
