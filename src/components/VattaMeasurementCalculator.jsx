import React, { useState, useMemo, useEffect } from 'react'
import {
  ArrowLeft,
  FileDown,
  Printer,
  RotateCcw,
  Sparkles,
  Save,
  FolderOpen,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Info,
  Calendar,
  Truck,
  FileText,
  MapPin,
  Layers,
  Hash,
  X,
  Receipt
} from 'lucide-react'
import {
  VATTA_STANDARD_ROWS,
  SAMPLE_VATTA_TEST_BAGS,
  getStoredVattaSettings,
  saveStoredVattaSettings,
  getSavedVattaSheets,
  saveVattaSheetRecord,
  deleteVattaSheetRecord,
  calculateVattaCalculations,
} from '../data/vattaStandardSizes.js'
import { getSavedVattaInvoices } from '../data/vattaInvoiceSettings.js'
import { generateVattaPdf } from '../utils/vattaPdfGenerator.js'

export default function VattaMeasurementCalculator({
  onBack
}) {
  // Stored persistent defaults (Lorry Reg No & Place)
  const [storedSettings, setStoredSettings] = useState(() => getStoredVattaSettings())

  // Document Details State
  const [lorryRegNo, setLorryRegNo] = useState(() => storedSettings.lorryRegNo || 'KL-58-D-1555')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [passNo, setPassNo] = useState('')
  const [date, setDate] = useState(() => {
    // Current date formatted as YYYY-MM-DD for input
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [place, setPlace] = useState(() => storedSettings.place || 'Nedumpana')

  // Six Bags Quantities State: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  const [bagQuantities, setBagQuantities] = useState({
    1: '',
    2: '',
    3: '',
    4: '',
    5: '',
    6: '',
  })

  // Sheet record ID for saved sheets
  const [sheetId, setSheetId] = useState(() => 'vatta_' + Date.now())

  // UI state
  const [savedSheets, setSavedSheets] = useState(() => getSavedVattaSheets())
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [notification, setNotification] = useState(null)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)

  // Notification helper
  const notify = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3200)
  }

  // Linked Vatta GST Invoice state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [savedVattaInvoicesList, setSavedVattaInvoicesList] = useState(() => {
    try {
      const list = getSavedVattaInvoices()
      if (Array.isArray(list) && list.length > 0) return list
      return [{
        id: 'sample-a20',
        title: 'Invoice A-20 - M/S. HINDUSTAN PENCILS PVT. LTD',
        invoiceData: {
          invoiceNo: 'A-20',
          invoiceDate: '2026-10-10',
          receiverName: 'M/S. HINDUSTAN PENCILS PVT. LTD',
          vehicleNo: 'KL-58-D-1555',
          placeOfSupply: 'Nedumpana',
          bagQuantities: { 1: 50, 2: 60, 3: 40, 4: 70, 5: 35, 6: 30 }
        },
        totals: { totalBags: 285 }
      }]
    } catch {
      return []
    }
  })

  // Refresh saved invoices list on mount / focus
  useEffect(() => {
    try {
      const list = getSavedVattaInvoices()
      if (Array.isArray(list) && list.length > 0) {
        setSavedVattaInvoicesList(list)
      }
    } catch {}
  }, [])

  const handleLoadFromVattaInvoice = (invId) => {
    setSelectedInvoiceId(invId)
    if (!invId) return
    const found = savedVattaInvoicesList.find(i => i.id === invId)
    if (found && found.invoiceData) {
      const data = found.invoiceData
      // 1. Bag counts
      if (data.bagQuantities) {
        setBagQuantities({
          1: data.bagQuantities[1] !== undefined && data.bagQuantities[1] !== '' ? Number(data.bagQuantities[1]) : '',
          2: data.bagQuantities[2] !== undefined && data.bagQuantities[2] !== '' ? Number(data.bagQuantities[2]) : '',
          3: data.bagQuantities[3] !== undefined && data.bagQuantities[3] !== '' ? Number(data.bagQuantities[3]) : '',
          4: data.bagQuantities[4] !== undefined && data.bagQuantities[4] !== '' ? Number(data.bagQuantities[4]) : '',
          5: data.bagQuantities[5] !== undefined && data.bagQuantities[5] !== '' ? Number(data.bagQuantities[5]) : '',
          6: data.bagQuantities[6] !== undefined && data.bagQuantities[6] !== '' ? Number(data.bagQuantities[6]) : ''
        })
      }
      // 2. Invoice number
      if (data.invoiceNo) {
        setInvoiceNo(`${data.invoiceNo}/2026-27`)
      }
      // 3. Vehicle / Lorry Reg No
      if (data.vehicleNo) {
        setLorryRegNo(data.vehicleNo)
      }
      // 4. Date
      if (data.invoiceDate) {
        setDate(data.invoiceDate)
      }
      // 5. Place
      if (data.placeOfSupply) {
        setPlace(data.placeOfSupply)
      }
      notify(`Loaded Invoice ${data.invoiceNo}: ${found.totals?.totalBags || 0} Bags & ${data.vehicleNo || 'Vehicle'}!`)
    }
  }

  // Update persistent defaults whenever Lorry Reg No or Place change
  const handleLorryRegChange = (val) => {
    setLorryRegNo(val)
    const updated = { ...storedSettings, lorryRegNo: val }
    setStoredSettings(updated)
    saveStoredVattaSettings(updated)
  }

  const handlePlaceChange = (val) => {
    setPlace(val)
    const updated = { ...storedSettings, place: val }
    setStoredSettings(updated)
    saveStoredVattaSettings(updated)
  }

  // Handle bag quantity input per row
  const handleBagChange = (slNo, val) => {
    setValidationError('')
    if (val === '') {
      setBagQuantities((prev) => ({ ...prev, [slNo]: '' }))
      return
    }
    const parsed = parseInt(val, 10)
    if (!isNaN(parsed) && parsed >= 0) {
      setBagQuantities((prev) => ({ ...prev, [slNo]: parsed }))
    }
  }

  // Live Calculations
  const calculations = useMemo(() => {
    return calculateVattaCalculations(bagQuantities)
  }, [bagQuantities])

  // Quick Action: Load Benchmark Sample Data (285 Bags)
  const handleLoadSample = () => {
    setBagQuantities({ ...SAMPLE_VATTA_TEST_BAGS })
    setInvoiceNo('A-20/2026-27')
    setPassNo('140/2026-27')
    setLorryRegNo('KL-58-D-1555')
    setPlace('Nedumpana')
    setDate('2026-10-10')
    setValidationError('')
    notify('Loaded standard benchmark test load: 285 Bags (20.689 CBM)!')
  }

  // Quick Action: Reset Bag Quantities
  const handleResetBags = () => {
    setBagQuantities({
      1: '',
      2: '',
      3: '',
      4: '',
      5: '',
      6: '',
    })
    notify('Bag quantities reset to zero.')
  }

  // Quick Action: Clear Form with confirmation
  const handleConfirmClear = () => {
    setSheetId('vatta_' + Date.now())
    setInvoiceNo('')
    setPassNo('')
    handleResetBags()
    setShowConfirmClear(false)
    notify('Measurement form cleared.')
  }

  // Save current sheet to localStorage
  const handleSaveSheet = () => {
    if (!lorryRegNo.trim()) {
      setValidationError('Please enter a Lorry Registration Number before saving.')
      return
    }

    const record = {
      id: sheetId,
      lorryRegNo,
      invoiceNo,
      passNo,
      date,
      place,
      bagQuantities,
      totalBags: calculations.grandTotalBags,
      totalPieces: calculations.grandTotalPieces,
      totalCbm: calculations.grandTotalCbmFormatted,
    }

    saveVattaSheetRecord(record)
    setSavedSheets(getSavedVattaSheets())
    notify(`Measurement sheet saved (${calculations.grandTotalBags} bags)!`)
  }

  // Load a saved sheet record
  const handleLoadSavedRecord = (rec) => {
    setSheetId(rec.id || 'vatta_' + Date.now())
    if (rec.lorryRegNo) handleLorryRegChange(rec.lorryRegNo)
    setInvoiceNo(rec.invoiceNo || '')
    setPassNo(rec.passNo || '')
    if (rec.date) setDate(rec.date)
    if (rec.place) handlePlaceChange(rec.place)
    if (rec.bagQuantities) setBagQuantities({ ...rec.bagQuantities })
    setShowSavedModal(false)
    notify(`Loaded sheet from ${rec.date || 'record'}`)
  }

  // Delete saved sheet record
  const handleDeleteSavedRecord = (id, e) => {
    e.stopPropagation()
    try {
      const existing = deleteVattaSheetRecord(id)
      setSavedSheets(existing)
      notify('Sheet record removed.')
    } catch (err) {
      console.error(err)
    }
  }

  // Formatted date string for display (DD-MM-YYYY)
  const displayFormattedDate = useMemo(() => {
    if (!date) return ''
    if (date.includes('-') && date.split('-')[0].length === 4) {
      const parts = date.split('-')
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return date
  }, [date])

  // PDF Generation handler
  const handleGeneratePdf = () => {
    setValidationError('')

    if (!lorryRegNo || !lorryRegNo.trim()) {
      setValidationError('Please enter the Lorry Registration Number.')
      return
    }
    if (calculations.grandTotalBags <= 0) {
      setValidationError('Please enter at least one bag quantity to generate the measurement sheet.')
      return
    }

    try {
      setIsPdfGenerating(true)
      generateVattaPdf(
        {
          lorryRegNo,
          invoiceNo,
          passNo,
          date,
          place,
          bagQuantities,
        },
        true
      )
      notify('A4 PDF generated and downloaded successfully!')
    } catch (err) {
      console.error('PDF generation error:', err)
      setValidationError('Failed to generate PDF. Please verify your inputs.')
    } finally {
      setIsPdfGenerating(false)
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      
      {/* Standardized Module Header */}
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
            Vatta Measurement Calculator
          </h1>
        </div>

        <div className="module-top-actions">
          <button
            type="button"
            onClick={handleLoadSample}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--tag-bg)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={14} color="#d4a373" />
            Test Sample (285 Bags)
          </button>

          <button
            type="button"
            onClick={() => setShowSavedModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <FolderOpen size={14} />
            Saved Sheets ({savedSheets.length})
          </button>

          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>

          <button
            type="button"
            onClick={handleSaveSheet}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <Save size={14} />
            Save Sheet
          </button>

          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={isPdfGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary, #1e3a2b)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: isPdfGenerating ? 'wait' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          >
            <FileDown size={14} />
            {isPdfGenerating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            backgroundColor: 'var(--primary, #1e3a2b)',
            color: '#ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.875rem',
            fontWeight: 700
          }}
        >
          <CheckCircle2 size={18} color="#d4a373" />
          {notification}
        </div>
      )}

      {/* Main Container */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          marginBottom: '2rem'
        }}
      >

        {/* Validation Error Banner */}
        {validationError && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#fee2e2',
              borderBottom: '1px solid #fca5a5',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.875rem',
              fontWeight: 600
            }}
          >
            <AlertCircle size={18} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Form Body */}
        <div style={{ padding: '1.5rem', background: '#fafbfc' }}>
          
          {/* Link & Load from Vatta GST Invoice Bar */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 43, 0.06) 0%, rgba(212, 163, 115, 0.12) 100%)',
              border: '1.5px dashed #2d6a4f',
              borderRadius: '12px',
              padding: '0.9rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: '#1e3a2b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Receipt size={17} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Link & Load from Vatta GST Invoice
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Select a saved Vatta GST invoice to auto-load bag counts, invoice number, vehicle & place
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={selectedInvoiceId}
                onChange={(e) => handleLoadFromVattaInvoice(e.target.value)}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #2d6a4f',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  minWidth: '240px'
                }}
              >
                <option value="">-- Select Saved Vatta Invoice --</option>
                {savedVattaInvoicesList.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    Invoice {inv.invoiceData?.invoiceNo || 'Draft'} • {inv.invoiceData?.receiverName || 'Vatta'} • {inv.totals?.totalBags || 0} Bags ({inv.invoiceData?.invoiceDate || ''})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 1: Document Details */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '0.925rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Truck size={17} />
                Document Details
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Lorry registration & place are automatically remembered in your browser
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.3rem' }}>
                  Lorry Reg. Number *
                </label>
                <input
                  type="text"
                  value={lorryRegNo}
                  onChange={(e) => handleLorryRegChange(e.target.value)}
                  placeholder="e.g. KL-58-D-1555"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '7px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.3rem' }}>
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="e.g. A-22/2026-27"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '7px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.3rem' }}>
                  Pass Number
                </label>
                <input
                  type="text"
                  value={passNo}
                  onChange={(e) => setPassNo(e.target.value)}
                  placeholder="e.g. 140/2026-27"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '7px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.3rem' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '7px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', marginBottom: '0.3rem' }}>
                  Place
                </label>
                <input
                  type="text"
                  value={place}
                  onChange={(e) => handlePlaceChange(e.target.value)}
                  placeholder="e.g. Nedumpana"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '7px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Six Standard Vatta Ply Rows Input Table */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '0.925rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={17} />
                  Standard Vatta Wood Pencil Slat Specifications
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Standard dimensions and pieces-per-bag are fixed for G.K. Saw Mill. Enter the <strong>Total Bags</strong> for each ply size.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleResetBags}
                  style={{
                    background: 'var(--tag-bg, #f8fafc)',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary, #475569)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <RotateCcw size={13} />
                  Reset Bags
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(true)}
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#b91c1c',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Trash2 size={13} />
                  Clear Form
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--table-head-bg, #f1f5f9)', borderBottom: '2px solid var(--border-color)', textAlign: 'center', color: 'var(--text-primary)' }}>
                    <th style={{ padding: '0.65rem 0.5rem', width: '50px' }}>Sl No</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Item</th>
                    <th style={{ padding: '0.65rem 0.5rem' }} colSpan={3}>
                      Measurement in "mm" (L × W × T)
                    </th>
                    <th style={{ padding: '0.65rem 0.75rem', width: '130px', color: 'var(--primary)' }}>
                      Total Bags *
                    </th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Each Contains</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Total Nos.</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Total CBM</th>
                  </tr>
                  <tr style={{ background: 'var(--tag-bg, #f8fafc)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    <th colSpan={2}></th>
                    <th style={{ padding: '0.35rem 0.5rem' }}>Length</th>
                    <th style={{ padding: '0.35rem 0.5rem' }}>Width</th>
                    <th style={{ padding: '0.35rem 0.5rem' }}>Thickness</th>
                    <th colSpan={4}></th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.rows.map((row) => (
                    <tr
                      key={row.slNo}
                      style={{
                        borderBottom: '1px solid var(--border-color, #e2e8f0)',
                        background: row.bags > 0 ? 'var(--card-bg)' : 'var(--tag-bg)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                        {row.slNo}
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {row.item}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary, #475569)' }}>
                        {row.length}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary, #475569)' }}>
                        {row.width}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary, #475569)' }}>
                        {row.thickness.toFixed(1)}
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', background: row.bags > 0 ? '#f0fdf4' : 'transparent' }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={bagQuantities[row.slNo] === 0 ? 0 : (bagQuantities[row.slNo] || '')}
                          onChange={(e) => handleBagChange(row.slNo, e.target.value)}
                          placeholder="0"
                          style={{
                            width: '100%',
                            maxWidth: '100px',
                            padding: '0.55rem 0.6rem',
                            borderRadius: '6px',
                            border: row.bags > 0 ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                            fontWeight: 800,
                            textAlign: 'center',
                            fontSize: '0.95rem',
                            color: row.bags > 0 ? 'var(--primary)' : '#0f172a',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                        {row.eachContains}
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                        {row.totalPieces.toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: 800, color: 'var(--wood-accent)' }}>
                        {row.cbmFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--tag-bg, #f8fafc)', borderTop: '2px solid #0f172a', fontWeight: 800 }}>
                    <td colSpan={5} style={{ padding: '0.85rem 0.75rem', textAlign: 'right', textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--text-secondary, #475569)' }}>
                      Grand Totals:
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontSize: '1.1rem', color: 'var(--primary)' }}>
                      {calculations.grandTotalBags} Bags
                    </td>
                    <td></td>
                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontSize: '1rem', color: 'var(--text-primary, #0f172a)' }}>
                      {calculations.grandTotalPieces.toLocaleString('en-US')} Nos
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontSize: '1.15rem', color: 'var(--wood-accent)' }}>
                      {calculations.grandTotalCbmFormatted} C.Mtr.
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 3: Live Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}
          >
            <div
              style={{
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                padding: '1.25rem',
                borderLeft: '5px solid var(--primary)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
                Total Load Bags
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)', marginTop: '0.25rem' }}>
                {calculations.grandTotalBags}
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginLeft: '0.35rem' }}>Bags</span>
              </div>
            </div>

            <div
              style={{
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                padding: '1.25rem',
                borderLeft: '5px solid #2563eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
                Total Pencil Slat Pieces
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary, #0f172a)', marginTop: '0.25rem' }}>
                {calculations.grandTotalPieces.toLocaleString('en-US')}
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginLeft: '0.35rem' }}>Nos</span>
              </div>
            </div>

            <div
              style={{
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                padding: '1.25rem',
                borderLeft: '5px solid var(--wood-accent)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
                Total Cubic Metres (CBM)
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--wood-accent)', marginTop: '0.25rem' }}>
                {calculations.grandTotalCbmFormatted}
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginLeft: '0.35rem' }}>C.Mtr.</span>
              </div>
            </div>
          </div>

          {/* Section 4: Live Printable Sheet Preview */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', margin: 0 }}>
                  A4 Measurement Sheet Live Preview
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Authentic layout matching the G.K. Saw Mill paper measurement slip
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  style={{
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <FileDown size={15} />
                  Download A4 PDF
                </button>
              </div>
            </div>

            {/* Authentic Sheet Container */}
            <div
              style={{
                maxWidth: '750px',
                margin: '0 auto',
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #cbd5e1)',
                padding: '2.5rem 2rem 3rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                fontFamily: '"Times New Roman", Times, serif',
                color: '#000000',
                borderRadius: '4px'
              }}
            >
              {/* Sheet Header */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.02em', marginBottom: '0.25rem' }}>
                  G.K.SAW MILL
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.02em', marginBottom: '0.35rem' }}>
                  KATTUR, NEDUMPANA,KOLLAM
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  MEASURMENT LIST OF" VATTA " WOOD PENCILS SLAT
                </div>
              </div>

              {/* Metadata */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <div>
                  <div>Lorry Reg No:-{lorryRegNo || '_________________'}</div>
                  <div>Invoice No: {invoiceNo || '_______________'} Pass</div>
                  <div>No:-{passNo || '_______________'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Date:-{displayFormattedDate || '___-___-______'}</div>
                  <div>Place: {place || 'Nedumpana'}</div>
                </div>
              </div>

              {/* Preview Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000000', textAlign: 'center' }}>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.4rem 0.2rem', width: '38px' }} rowSpan={2}>
                      Sl No
                    </th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.4rem 0.4rem', width: '70px' }} rowSpan={2}>
                      Item
                    </th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.3rem 0.4rem' }} colSpan={3}>
                      Measurement in "mm"
                    </th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.3rem 0.2rem', width: '50px' }} rowSpan={2}>
                      Total<br />Bags
                    </th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.3rem 0.2rem', width: '55px' }} rowSpan={2}>
                      Each<br />Contains
                    </th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.3rem 0.3rem', width: '75px' }} rowSpan={2}>
                      Total<br />Nos.
                    </th>
                    <th style={{ padding: '0.3rem 0.3rem', width: '85px' }} rowSpan={2}>
                      Total<br />Cubic Meter
                    </th>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000000', textAlign: 'center', fontSize: '0.8rem' }}>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.3rem 0.2rem', width: '48px' }}>Length</th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.3rem 0.2rem', width: '48px' }}>Width</th>
                    <th style={{ borderRight: '1px solid #000000', padding: '0.3rem 0.2rem', width: '50px' }}>Thickness</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.rows.map((r) => (
                    <tr key={r.slNo} style={{ borderBottom: '1px solid #000000', textAlign: 'center' }}>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.45rem 0.2rem' }}>{r.slNo}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.45rem 0.4rem' }}>{r.item}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.45rem 0.2rem' }}>{r.length}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.45rem 0.2rem' }}>{r.width}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.45rem 0.2rem' }}>{r.thickness.toFixed(1)}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.45rem 0.2rem' }}>{r.bags}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.45rem 0.2rem' }}>{r.eachContains}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '0.45rem 0.3rem' }}>{r.totalPieces}</td>
                      <td style={{ padding: '0.45rem 0.3rem' }}>{r.cbmFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Line Under Columns */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', textAlign: 'center' }}>
                  <div style={{ width: '80px', borderTop: '1px solid #000000', borderBottom: '3px double #000000', padding: '0.3rem 0.2rem' }}>
                    {calculations.grandTotalBags}
                  </div>
                  <div style={{ width: '60px' }}></div>
                  <div style={{ width: '90px', borderTop: '1px solid #000000', borderBottom: '3px double #000000', padding: '0.3rem 0.2rem' }}>
                    {calculations.grandTotalPieces}
                  </div>
                  <div style={{ width: '100px', borderTop: '1px solid #000000', borderBottom: '3px double #000000', padding: '0.3rem 0.2rem' }}>
                    {calculations.grandTotalCbmFormatted}
                  </div>
                </div>
              </div>

              {/* Summary line */}
              <div style={{ fontSize: '0.95rem', marginBottom: '2.5rem', fontWeight: 600 }}>
                Total: {calculations.grandTotalBags} Bags &nbsp;&nbsp;&nbsp; {calculations.grandTotalPieces} Nos &nbsp;&nbsp;&nbsp; {calculations.grandTotalCbmFormatted} C.Mtr.
              </div>

              {/* Signature block */}
              <div style={{ textAlign: 'right', paddingRight: '2rem' }}>
                <div style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>Proprietor</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>G.K. SAW MILL</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Sheets Modal */}
      {showSavedModal && (
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
          onClick={() => setShowSavedModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '16px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderOpen size={18} color="var(--primary)" />
                Saved Vatta Measurement Sheets
              </h3>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {savedSheets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>No saved measurement sheets yet.</p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>Click "Save Sheet" on the calculator to save your work.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {savedSheets.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => handleLoadSavedRecord(rec)}
                      style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        background: 'var(--tag-bg, #f8fafc)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          Lorry: {rec.lorryRegNo || 'N/A'} {rec.invoiceNo ? `• Inv: ${rec.invoiceNo}` : ''}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                          Date: {rec.date} • {rec.totalBags} Bags • {rec.totalPieces?.toLocaleString()} Nos • {rec.totalCbm} CBM
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedRecord(rec.id, e)}
                          style={{
                            background: '#fee2e2',
                            border: 'none',
                            color: '#991b1b',
                            padding: '0.4rem',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                          title="Delete record"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Form */}
      {showConfirmClear && (
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
          onClick={() => setShowConfirmClear(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '14px',
              maxWidth: '420px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#991b1b' }}>
              Clear Measurement Sheet?
            </h4>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}>
              This will clear all entered bag quantities and invoice details. Persistent vehicle and place settings will be preserved.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '7px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'var(--card-bg, #ffffff)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: '#b91c1c',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Yes, Clear Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
