import React, { useState, useMemo } from 'react'
import {
  TreePine,
  ArrowLeft,
  Copy,
  Check,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Printer,
  Sparkles,
  Info,
  FileDown,
  Truck,
  Hash,
  FileText,
  Receipt
} from 'lucide-react'
import { getSavedInvoices } from '../data/invoiceSettings.js'
import {
  MAHOGANY_STANDARD_ROWS,
  MANJIYAM_STANDARD_ROWS_7,
  MANJIYAM_STANDARD_ROWS_10,
  MAHAGANI_ITEM_DESC,
  MANJIYAM_ITEM_DESC,
} from '../data/woodStandardSizes.js'
import {
  generateOptimizedSizeChart,
  formatTableForCanva,
  formatNumericalValuesOnly,
  generateCsvContent,
} from '../utils/sizeChartOptimizer.js'
import { generateSizeChartPdf } from '../utils/pdfGenerator.js'

export default function MahoganyManjiyamChartGenerator({ onBack }) {
  // Active wood tab: 'mahogany' | 'manjiyam'
  const [woodType, setWoodType] = useState('mahogany')

  // Vehicle Number & Invoice Number (Persistent in session/localStorage, preserved across wood switches)
  const [vehicleNo, setVehicleNo] = useState(() => {
    try {
      return localStorage.getItem('gk_vehicle_no') || 'KL-02-AN-7779'
    } catch {
      return 'KL-02-AN-7779'
    }
  })

  const [invoiceNo, setInvoiceNo] = useState(() => {
    try {
      return localStorage.getItem('gk_invoice_no') || 'A-22'
    } catch {
      return 'A-22'
    }
  })

  const handleVehicleChange = (val) => {
    setVehicleNo(val)
    try {
      localStorage.setItem('gk_vehicle_no', val)
    } catch {}
  }

  const handleInvoiceChange = (val) => {
    setInvoiceNo(val)
    try {
      localStorage.setItem('gk_invoice_no', val)
    } catch {}
  }

  // Target Total CFT for Mahogany & Manjiyam
  const [mahoganyTargetCft, setMahoganyTargetCft] = useState('419')
  const [manjiyamTargetCft, setManjiyamTargetCft] = useState('120')

  // Mahogany row count selection (1 to 15 configurable)
  const [mahoganyRowCount, setMahoganyRowCount] = useState(15)
  const [customMahoganyInput, setCustomMahoganyInput] = useState('15')

  // Manjiyam row count selection (1 to 10 configurable)
  const [manjiyamRowCount, setManjiyamRowCount] = useState(7)
  const [customRowCountInput, setCustomRowCountInput] = useState('7')

  // Feedback states
  const [copyStatus, setCopyStatus] = useState(null)
  const [pdfStatus, setPdfStatus] = useState(null)
  const [validationError, setValidationError] = useState('')
  const [showPrintSlip, setShowPrintSlip] = useState(false)

  // Linked Mahogany & Manjiyam Invoice state
  const [selectedTimberInvoiceId, setSelectedTimberInvoiceId] = useState('')
  const [savedTimberInvoices, setSavedTimberInvoices] = useState(() => {
    try {
      const list = getSavedInvoices()
      if (Array.isArray(list) && list.length > 0) return list
      return [{
        id: 'sample-a21',
        invoiceNo: 'A-21',
        receiverName: 'SREE AMMAN TRADERS',
        vehicleNo: 'KL-02-AN-7779',
        mahoganyCft: 419,
        manjiyamCft: 238
      }]
    } catch {
      return []
    }
  })

  const handleLoadFromTimberInvoice = (invId) => {
    setSelectedTimberInvoiceId(invId)
    if (!invId) return
    const found = savedTimberInvoices.find(i => i.id === invId)
    if (found) {
      if (found.invoiceNo) {
        handleInvoiceChange(found.invoiceNo)
      }
      if (found.vehicleNo) {
        handleVehicleChange(found.vehicleNo)
      }
      const mahog = found.mahoganyCft || (found.mahoganyTaxableValue && found.mahoganyRate ? (found.mahoganyTaxableValue / found.mahoganyRate).toFixed(2) : 0)
      const manj = found.manjiyamCft || (found.manjiyamTaxableValue && found.manjiyamRate ? (found.manjiyamTaxableValue / found.manjiyamRate).toFixed(2) : 0)

      if (Number(mahog) > 0) {
        setMahoganyTargetCft(String(Math.round(Number(mahog))))
      }
      if (Number(manj) > 0) {
        setManjiyamTargetCft(String(Math.round(Number(manj))))
      }

      if (Number(mahog) > 0 && Number(manj) <= 0) {
        setWoodType('mahogany')
      } else if (Number(manj) > 0 && Number(mahog) <= 0) {
        setWoodType('manjiyam')
      }

      setValidationError('')
      setCopyStatus(`Loaded Invoice ${found.invoiceNo}: Target CFT (${Number(mahog) > 0 ? mahog + ' Mahogany' : ''}${Number(manj) > 0 ? ' / ' + manj + ' Manjiyam' : ''}) & Vehicle populated!`)
      setTimeout(() => setCopyStatus(null), 3500)
    }
  }

  // Determine active template rows based on user wood selection & row count
  const activeTemplateRows = useMemo(() => {
    if (woodType === 'mahogany') {
      const count = Math.min(Math.max(1, mahoganyRowCount), 15)
      return MAHOGANY_STANDARD_ROWS.slice(0, count)
    } else {
      if (manjiyamRowCount === 7) {
        return MANJIYAM_STANDARD_ROWS_7
      } else if (manjiyamRowCount === 10) {
        return MANJIYAM_STANDARD_ROWS_10
      } else {
        const count = Math.min(Math.max(1, manjiyamRowCount), 10)
        return MANJIYAM_STANDARD_ROWS_10.slice(0, count)
      }
    }
  }, [woodType, mahoganyRowCount, manjiyamRowCount])

  // Current Target CFT
  const currentTargetCft = woodType === 'mahogany' ? mahoganyTargetCft : manjiyamTargetCft
  const handleTargetChange = (val) => {
    setValidationError('')
    if (woodType === 'mahogany') {
      setMahoganyTargetCft(val)
    } else {
      setManjiyamTargetCft(val)
    }
  }

  // Calculate optimized chart
  const chartResult = useMemo(() => {
    const target = parseFloat(currentTargetCft)
    if (isNaN(target) || target <= 0) return null
    return generateOptimizedSizeChart(activeTemplateRows, target)
  }, [activeTemplateRows, currentTargetCft])

  // Generate and Download PDF
  const handleGeneratePdf = () => {
    setValidationError('')
    const target = parseFloat(currentTargetCft)
    if (isNaN(target) || target <= 0) {
      setValidationError('Please enter a valid Target Total CFT before generating PDF.')
      return
    }

    if (!chartResult || !chartResult.rows || chartResult.rows.length === 0) {
      setValidationError('No chart rows available to generate PDF.')
      return
    }

    try {
      generateSizeChartPdf({
        woodType,
        vehicleNo,
        invoiceNo,
        chartResult,
        save: true,
      })
      setPdfStatus('PDF Downloaded!')
      setTimeout(() => setPdfStatus(null), 3000)
    } catch (err) {
      console.error('PDF generation error:', err)
      setValidationError('Failed to generate PDF. Please verify your inputs.')
    }
  }

  // Copy helpers
  const handleCopy = (type) => {
    if (!chartResult) return
    let text = ''
    let label = ''

    if (type === 'canva') {
      text = formatTableForCanva(chartResult)
      label = 'Canva Table Copied!'
    } else if (type === 'numbers') {
      text = formatNumericalValuesOnly(chartResult)
      label = 'Numerical Values Copied!'
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus({ type, label })
      setTimeout(() => setCopyStatus(null), 2500)
    })
  }

  // Download CSV helper
  const handleDownloadCsv = () => {
    if (!chartResult) return
    const csvData = generateCsvContent(chartResult)
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fileName = `${woodType === 'mahogany' ? 'Mahagani' : 'Manjiyam'}_Sizes_${chartResult.targetCft}_CFT.csv`
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const isExceedingManjiyamRows = woodType === 'manjiyam' && parseInt(customRowCountInput, 10) > 10
  const isExceedingMahoganyRows = woodType === 'mahogany' && parseInt(customMahoganyInput, 10) > 15

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
            Mahogany & Manjiyam Size Chart
          </h1>
        </div>

        <div className="module-top-actions">
          {/* Action controls */}
        </div>
      </div>

      {/* Main Card */}
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
        {/* Controls Section */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          
          {/* Link & Load from Mahogany & Manjiyam Invoice Bar */}
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
                  Link & Load from Mahogany & Manjiyam Invoice
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Select a saved timber invoice to auto-load invoice number, vehicle, and target CFT
                </div>
              </div>
            </div>

            <select
              value={selectedTimberInvoiceId}
              onChange={(e) => handleLoadFromTimberInvoice(e.target.value)}
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
              <option value="">-- Select Saved Timber Invoice --</option>
              {savedTimberInvoices.map((inv) => {
                const mahog = inv.mahoganyCft || (inv.mahoganyTaxableValue && inv.mahoganyRate ? (inv.mahoganyTaxableValue / inv.mahoganyRate).toFixed(2) : 0)
                const manj = inv.manjiyamCft || (inv.manjiyamTaxableValue && inv.manjiyamRate ? (inv.manjiyamTaxableValue / inv.manjiyamRate).toFixed(2) : 0)
                const cftLabel = []
                if (Number(mahog) > 0) cftLabel.push(`Mahogany: ${mahog} CFT`)
                if (Number(manj) > 0) cftLabel.push(`Manjiyam: ${manj} CFT`)
                return (
                  <option key={inv.id} value={inv.id}>
                    Invoice {inv.invoiceNo} • {inv.receiverName || 'Timber Sale'} • {cftLabel.join(' / ') || 'Timber CFT'}
                  </option>
                )
              })}
            </select>
          </div>

          {/* 1. Vehicle Number & Invoice Number Inputs */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Invoice & Vehicle Identification (Appears on PDF)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Vehicle Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Truck size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    placeholder="e.g. KL-02-AN-7779"
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem 0.7rem 2.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--text-primary, #0f172a)',
                      background: 'var(--card-bg, #ffffff)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Invoice Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Hash size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    placeholder="e.g. A-22"
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem 0.7rem 2.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--text-primary, #0f172a)',
                      background: 'var(--card-bg, #ffffff)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Wood Type Switcher Tabs */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Select Wood Type
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setWoodType('mahogany')}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: woodType === 'mahogany' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  background: woodType === 'mahogany' ? 'var(--tag-bg)' : 'var(--card-bg)',
                  color: woodType === 'mahogany' ? 'var(--primary)' : 'var(--text-secondary)'
                }}
              >
                <span>Mahogany Size Chart</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    background: woodType === 'mahogany' ? 'var(--primary)' : 'var(--border-color)',
                    color: woodType === 'mahogany' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  {mahoganyRowCount} Rows Selected
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWoodType('manjiyam')}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: woodType === 'manjiyam' ? '2px solid var(--wood-accent)' : '1px solid var(--border-color)',
                  background: woodType === 'manjiyam' ? 'var(--tag-bg)' : 'var(--card-bg)',
                  color: woodType === 'manjiyam' ? 'var(--wood-accent)' : 'var(--text-secondary)'
                }}
              >
                <span>Manjiyam Size Chart</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    background: woodType === 'manjiyam' ? 'var(--wood-accent)' : 'var(--border-color)',
                    color: woodType === 'manjiyam' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  {manjiyamRowCount} Rows Selected
                </span>
              </button>
            </div>
          </div>

          {/* 3. Parameters Grid: Target CFT & Row Count */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            
            {/* Target Total CFT Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Target Total CFT
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={currentTargetCft}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  placeholder="e.g. 120, 238, 419"
                  style={{
                    width: '100%',
                    padding: '0.75rem 3.5rem 0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: 'var(--text-primary, #0f172a)',
                    background: 'var(--card-bg, #ffffff)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#64748b'
                  }}
                >
                  CFT
                </span>
              </div>

              {/* Quick Target Presets */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center' }}>Presets:</span>
                {woodType === 'mahogany' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleTargetChange('419')}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: currentTargetCft === '419' ? 'var(--primary)' : 'var(--card-bg)',
                        color: currentTargetCft === '419' ? '#ffffff' : 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      419 CFT (Sample)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTargetChange('465')}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: currentTargetCft === '465' ? 'var(--primary)' : 'var(--card-bg)',
                        color: currentTargetCft === '465' ? '#ffffff' : 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      465 CFT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTargetChange('350')}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      350 CFT
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleTargetChange('120')
                        setManjiyamRowCount(7)
                        setCustomRowCountInput('7')
                      }}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: currentTargetCft === '120' && manjiyamRowCount === 7 ? 'var(--wood-accent)' : 'var(--card-bg)',
                        color: currentTargetCft === '120' && manjiyamRowCount === 7 ? '#ffffff' : 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      120 CFT (7 Rows)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleTargetChange('238')
                        setManjiyamRowCount(10)
                        setCustomRowCountInput('10')
                      }}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: currentTargetCft === '238' && manjiyamRowCount === 10 ? 'var(--wood-accent)' : 'var(--card-bg)',
                        color: currentTargetCft === '238' && manjiyamRowCount === 10 ? '#ffffff' : 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      238 CFT (10 Rows)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTargetChange('180')}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      180 CFT
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Row Count Selector (Configurable for both Mahogany and Manjiyam) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Number of Rows ({woodType === 'mahogany' ? '1 to 15' : '1 to 10'})
              </label>

              {woodType === 'mahogany' ? (
                <div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setMahoganyRowCount(15)
                        setCustomMahoganyInput('15')
                      }}
                      style={{
                        padding: '0.7rem 0.65rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: mahoganyRowCount === 15 ? 'var(--primary)' : 'var(--card-bg)',
                        color: mahoganyRowCount === 15 ? '#ffffff' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      15 Rows (All)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMahoganyRowCount(12)
                        setCustomMahoganyInput('12')
                      }}
                      style={{
                        padding: '0.7rem 0.65rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: mahoganyRowCount === 12 ? 'var(--primary)' : 'var(--card-bg)',
                        color: mahoganyRowCount === 12 ? '#ffffff' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      12 Rows
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMahoganyRowCount(10)
                        setCustomMahoganyInput('10')
                      }}
                      style={{
                        padding: '0.7rem 0.65rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: mahoganyRowCount === 10 ? 'var(--primary)' : 'var(--card-bg)',
                        color: mahoganyRowCount === 10 ? '#ffffff' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      10 Rows
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMahoganyRowCount(7)
                        setCustomMahoganyInput('7')
                      }}
                      style={{
                        padding: '0.7rem 0.65rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: mahoganyRowCount === 7 ? 'var(--primary)' : 'var(--card-bg)',
                        color: mahoganyRowCount === 7 ? '#ffffff' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      7 Rows
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={customMahoganyInput}
                      onChange={(e) => {
                        const val = e.target.value
                        setCustomMahoganyInput(val)
                        const parsed = parseInt(val, 10)
                        if (!isNaN(parsed) && parsed >= 1 && parsed <= 15) {
                          setMahoganyRowCount(parsed)
                        }
                      }}
                      placeholder="Custom"
                      title="Enter custom Mahogany rows (1-15)"
                      style={{
                        width: '75px',
                        padding: '0.7rem 0.4rem',
                        borderRadius: '8px',
                        border: isExceedingMahoganyRows ? '2px solid #ef4444' : '1px solid #cbd5e1',
                        background: 'var(--card-bg, #ffffff)',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
                    Standard Mahogany dimensions are preserved. Quantities will recalculate to fit your selected row count and target CFT.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setManjiyamRowCount(7)
                        setCustomRowCountInput('7')
                      }}
                      style={{
                        flex: 1,
                        padding: '0.7rem 0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: manjiyamRowCount === 7 ? 'var(--wood-accent)' : 'var(--card-bg)',
                        color: manjiyamRowCount === 7 ? '#ffffff' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      7 Rows
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManjiyamRowCount(10)
                        setCustomRowCountInput('10')
                      }}
                      style={{
                        flex: 1,
                        padding: '0.7rem 0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: manjiyamRowCount === 10 ? 'var(--wood-accent)' : 'var(--card-bg)',
                        color: manjiyamRowCount === 10 ? '#ffffff' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      10 Rows
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={customRowCountInput}
                      onChange={(e) => {
                        const val = e.target.value
                        setCustomRowCountInput(val)
                        const parsed = parseInt(val, 10)
                        if (!isNaN(parsed) && parsed > 0 && parsed <= 10) {
                          setManjiyamRowCount(parsed)
                        }
                      }}
                      placeholder="Custom"
                      title="Enter custom row count up to 10"
                      style={{
                        width: '85px',
                        padding: '0.7rem 0.5rem',
                        borderRadius: '8px',
                        border: isExceedingManjiyamRows ? '2px solid #ef4444' : '1px solid #cbd5e1',
                        background: 'var(--card-bg, #ffffff)',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
                    Select standard 7-row or 10-row Manjiyam cutting schedule.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Exceeding Rows Warning Alerts */}
          {isExceedingManjiyamRows && (
            <div
              style={{
                marginTop: '1rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                color: '#991b1b'
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div style={{ fontSize: '0.85rem' }}>
                <strong>Standard Dimension Limit Notice:</strong> The entered row count ({customRowCountInput}) exceeds the 10 available standard Manjiyam dimensions. Standard dimensions must be preserved and not randomly generated. Please configure additional standard rows before selecting more than 10 rows.
              </div>
            </div>
          )}

          {isExceedingMahoganyRows && (
            <div
              style={{
                marginTop: '1rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                color: '#991b1b'
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div style={{ fontSize: '0.85rem' }}>
                <strong>Standard Dimension Limit Notice:</strong> Mahogany has 15 standard dimensions. Please choose a row count between 1 and 15.
              </div>
            </div>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div
              style={{
                marginTop: '1rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#b91c1c',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              <AlertCircle size={18} />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Results & KPI Summary Banner */}
        {chartResult && (
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg, #ffffff)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--tag-bg, #f8fafc)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Target CFT</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>{chartResult.targetCft.toFixed(2)}</div>
              </div>

              <div style={{ background: 'var(--tag-bg, #f8fafc)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Actual Total CFT</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>{chartResult.actualTotalCft.toFixed(2)}</div>
              </div>

              <div style={{ background: 'var(--tag-bg, #f8fafc)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Pieces (Nos)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>{chartResult.totalNos.toLocaleString()}</div>
              </div>

              <div style={{ background: 'var(--tag-bg, #f8fafc)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Volume (CBM)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#925c38' }}>{chartResult.cbm.toFixed(2)}</div>
              </div>
            </div>

            {/* Difference / Accuracy Callout */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: chartResult.isExact ? '#ecfdf5' : '#fffbeb',
                border: chartResult.isExact ? '1px solid #a7f3d0' : '1px solid #fde68a',
                color: chartResult.isExact ? '#065f46' : '#92400e',
                fontSize: '0.875rem',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {chartResult.isExact ? <CheckCircle2 size={18} /> : <Info size={18} />}
                <span>
                  <strong>{chartResult.isExact ? 'Exact Match Achieved:' : 'Closest Achievable Total:'}</strong>{' '}
                  Difference is {chartResult.difference > 0 ? `+${chartResult.difference.toFixed(2)}` : chartResult.difference.toFixed(2)} CFT from requested target.
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.85 }}>
                Formula: CFT = (W × T × L × Nos) / 144
              </span>
            </div>
          </div>
        )}

        {/* Action Toolbar with Generate PDF & Export Options */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'var(--tag-bg)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            
            {/* 1. Generate PDF Button (Prominent) */}
            <button
              type="button"
              onClick={handleGeneratePdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(30, 58, 43, 0.3)',
                transition: 'all 0.15s'
              }}
            >
              <FileDown size={17} />
              <span>{pdfStatus || 'Generate PDF'}</span>
            </button>

            {/* 2. Copy Table for Canva */}
            <button
              type="button"
              onClick={() => handleCopy('canva')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '8px',
                border: 'none',
                background: '#0284c7',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                transition: 'all 0.15s'
              }}
            >
              {copyStatus?.type === 'canva' ? <Check size={16} /> : <Copy size={16} />}
              <span>{copyStatus?.type === 'canva' ? copyStatus.label : 'Copy Table for Canva'}</span>
            </button>

            {/* 3. Copy Numbers Only */}
            <button
              type="button"
              onClick={() => handleCopy('numbers')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--card-bg, #ffffff)',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {copyStatus?.type === 'numbers' ? <Check size={16} /> : <Copy size={16} />}
              <span>{copyStatus?.type === 'numbers' ? copyStatus.label : 'Copy Numbers Only'}</span>
            </button>

            {/* 4. Download CSV */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--card-bg, #ffffff)',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Download size={16} />
              <span>Download CSV</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* View Sawmill Slip Toggle */}
            <button
              type="button"
              onClick={() => setShowPrintSlip(!showPrintSlip)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: showPrintSlip ? '#e2e8f0' : '#ffffff',
                color: '#1e293b',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer'
              }}
            >
              <Printer size={15} />
              <span>{showPrintSlip ? 'Hide Sawmill Slip' : 'View Sawmill Slip'}</span>
            </button>
          </div>
        </div>

        {/* Printable G.K. Saw Mill Slip Preview (if toggled) */}
        {showPrintSlip && chartResult && (
          <div style={{ padding: '2rem 1rem', background: 'var(--tag-bg, #f8fafc)', borderBottom: '1px solid #cbd5e1' }}>
            <div
              style={{
                maxWidth: '720px',
                margin: '0 auto',
                background: 'var(--card-bg, #ffffff)',
                borderRadius: '12px',
                padding: '2.5rem 2rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
              }}
            >
              {/* Header: Company Name & Spacing */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 0.5rem', textTransform: 'uppercase', color: 'var(--text-primary, #0f172a)', letterSpacing: '0.02em' }}>
                  G.K. SAW MILL
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', margin: '0.15rem 0' }}>
                  KATOOR, NEDUMPANA - P.O.,
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', margin: '0.15rem 0' }}>
                  KOLLAM, KERALA - 691576
                </p>
              </div>

              {/* Clean separator line after address */}
              <div style={{ borderBottom: '1px solid #cbd5e1', margin: '1.25rem 0 1rem' }}></div>

              {/* Metadata details */}
              <div style={{ marginBottom: '1.25rem', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <span>GSTIN :- 32AHOPG1823G1ZP</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-secondary, #475569)' }}>Tel :- 9446786175</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Vehicle No: {vehicleNo || 'N/A'}</span>
                  <span>Invoice No :- {invoiceNo || 'N/A'}</span>
                </div>
              </div>

              {/* Title with generous spacing */}
              <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', textTransform: 'uppercase', margin: '1.25rem 0 0.85rem', color: 'var(--text-primary, #0f172a)', letterSpacing: '0.04em' }}>
                {woodType === 'mahogany' ? 'MAHAGANI SIZES' : 'MANJIYAM SIZES'}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'center' }}>Sl No</th>
                    <th style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'center' }}>Width</th>
                    <th style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'center' }}>Thick</th>
                    <th style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'center' }}>Length</th>
                    <th style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'center' }}>Nos</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Cft</th>
                  </tr>
                </thead>
                <tbody>
                  {chartResult.rows.map((row) => (
                    <tr key={row.slNo} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '5px', textAlign: 'center', borderRight: '1px solid #ccc' }}>{row.slNo}</td>
                      <td style={{ padding: '5px', borderRight: '1px solid #ccc' }}>{row.item}</td>
                      <td style={{ padding: '5px', textAlign: 'center', borderRight: '1px solid #ccc' }}>{row.width}</td>
                      <td style={{ padding: '5px', textAlign: 'center', borderRight: '1px solid #ccc' }}>{row.thick}</td>
                      <td style={{ padding: '5px', textAlign: 'center', borderRight: '1px solid #ccc' }}>{row.length}</td>
                      <td style={{ padding: '5px', textAlign: 'center', borderRight: '1px solid #ccc', fontWeight: 700 }}>{row.nos}</td>
                      <td style={{ padding: '5px', textAlign: 'right', fontWeight: 700 }}>{row.cftFormatted}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #000', borderBottom: '1px solid #000', fontWeight: 800 }}>
                    <td colSpan={5} style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #ccc' }}>Total PCS:</td>
                    <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #ccc' }}>{chartResult.totalNos}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{chartResult.actualTotalCft.toFixed(2)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000', fontWeight: 800 }}>
                    <td colSpan={5} style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #ccc' }}>CBM:</td>
                    <td colSpan={2} style={{ padding: '8px', textAlign: 'center' }}>{chartResult.cbm.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>For G.K. Saw Mill</div>
                  <div style={{ height: '40px' }}></div>
                  <div style={{ fontSize: '0.85rem' }}>Proprietor</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Output Table */}
        <div style={{ overflowX: 'auto', background: 'var(--card-bg, #ffffff)' }}>
          {chartResult ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'var(--tag-bg, #f8fafc)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center', width: '60px' }}>Sl No</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Item Description</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Width (in)</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Thick (in)</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Length (ft)</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', background: 'var(--table-head-bg)' }}>Nos (pcs)</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right', background: 'var(--table-head-bg)' }}>CFT</th>
                </tr>
              </thead>
              <tbody>
                {chartResult.rows.map((row, idx) => (
                  <tr
                    key={row.slNo}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: idx % 2 === 0 ? 'var(--card-bg)' : 'var(--tag-bg)',
                      transition: 'background 0.15s'
                    }}
                  >
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {row.slNo}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {row.item}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {row.width}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {row.thick}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {row.length}
                    </td>
                    <td
                      style={{
                        padding: '0.8rem 1rem',
                        textAlign: 'center',
                        fontWeight: 800,
                        color: 'var(--primary)',
                        fontSize: '0.95rem',
                        background: 'var(--tag-bg)'
                      }}
                    >
                      {row.nos}
                    </td>
                    <td
                      style={{
                        padding: '0.8rem 1rem',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        background: 'var(--tag-bg)'
                      }}
                    >
                      {row.cftFormatted}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--table-head-bg)', borderTop: '2px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <td colSpan={5} style={{ padding: '1rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'right', fontSize: '0.95rem' }}>
                    Total Pieces & Total CFT:
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1.05rem', color: 'var(--primary)' }}>
                    {chartResult.totalNos.toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 900, fontSize: '1.05rem', color: 'var(--primary)' }}>
                    {chartResult.actualTotalCft.toFixed(2)}
                  </td>
                </tr>
                <tr style={{ background: 'var(--tag-bg)' }}>
                  <td colSpan={5} style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary)', textAlign: 'right', fontSize: '0.85rem' }}>
                    CBM Volume (CFT × 0.0283168):
                  </td>
                  <td colSpan={2} style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>
                    {chartResult.cbm.toFixed(2)} CBM
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
              Please enter a valid Target CFT to generate the size chart.
            </div>
          )}
        </div>
      </div>

      {/* Information Footer Card */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <Info size={22} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.15rem' }} />
        <div style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5 }}>
          <strong>Direct Print & PDF Export:</strong> Click <strong>"Generate PDF"</strong> to instantly download an official, print-ready A4 document complete with G.K. Saw Mill company header, GSTIN, Vehicle Number, Invoice Number, dimension table, and proprietor signature block. No Canva required.
        </div>
      </div>
    </div>
  )
}
