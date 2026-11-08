import React, { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Copy,
  Check,
  PlusCircle,
  Trash2,
  RotateCcw,
  AlertCircle,
  FileText,
  Boxes,
  Layers,
  TrendingUp,
  Receipt,
  Eye,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink
} from 'lucide-react'
import {
  fetchAllGstDocuments,
  getAvailableMonths,
  filterDocumentsByMonth,
  formatCurrency,
  getYearMonthKey,
  getMonthYearLabel,
  getFilingDueMonthLabel,
  getFinancialYearFromKey
} from '../data/gstMonthlyRegisterService.js'
import {
  buildDefaultHsnSummary,
  buildDefaultDocumentsIssued,
  calculateHsnTotals,
  calculateDocsIssuedTotals,
  loadSavedHsnState,
  saveHsnState,
  clearSavedHsnState,
  exportHsnSummaryCsv,
  HSN_CATALOG
} from '../data/hsnDocumentsService.js'
import { generateHsnSummaryPdf } from '../utils/hsnSummaryPdfGenerator.js'

export default function HsnSummaryDocumentsGenerator({ onBack }) {
  // All combined documents from cloud & local storage
  const [allDocs, setAllDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Current selected month folder (default: current calendar month, e.g. "2026-10")
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => getYearMonthKey(new Date()))

  // Table 12: HSN Summary rows
  const [hsnRows, setHsnRows] = useState([])

  // Table 13: Documents Issued rows
  const [docRows, setDocRows] = useState([])

  // Tracking if user made manual adjustments
  const [isModified, setIsModified] = useState(false)

  // Accordion for invoices breakdown
  const [showInvoicesDrawer, setShowInvoicesDrawer] = useState(false)

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Load documents across all modules
  const loadDocuments = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const docs = await fetchAllGstDocuments()
      setAllDocs(docs)
      if (isManual) {
        showToast(`Refreshed! Synced ${docs.length} total records.`)
      }
    } catch (err) {
      console.error('Error fetching documents for HSN Summary:', err)
      showToast('Error syncing cloud documents. Showing local data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  // Discover available months from all documents
  const availableMonths = useMemo(() => {
    return getAvailableMonths(allDocs)
  }, [allDocs])

  // Current active month label & metadata
  const activeMonthInfo = useMemo(() => {
    const found = availableMonths.find(m => m.key === selectedMonthKey)
    if (found) return found
    return {
      key: selectedMonthKey,
      label: getMonthYearLabel(selectedMonthKey),
      filingDueMonth: getFilingDueMonthLabel(selectedMonthKey),
      financialYear: getFinancialYearFromKey(selectedMonthKey),
      isCurrentMonth: selectedMonthKey === getYearMonthKey(new Date())
    }
  }, [availableMonths, selectedMonthKey])

  // Filter documents belonging to the selected month
  const monthDocs = useMemo(() => {
    return filterDocumentsByMonth(allDocs, selectedMonthKey)
  }, [allDocs, selectedMonthKey])

  // Sub-breakdowns of monthDocs
  const vattaInvoices = useMemo(() => monthDocs.filter(d => d.sourceType === 'VATTA'), [monthDocs])
  const timberInvoices = useMemo(() => monthDocs.filter(d => d.sourceType === 'TIMBER'), [monthDocs])

  // Initialize or re-populate HSN & Document tables when selected month or documents change
  useEffect(() => {
    // Check if user has previously saved custom state for this month
    const saved = loadSavedHsnState(selectedMonthKey)
    if (saved && Array.isArray(saved.hsnRows) && Array.isArray(saved.docRows)) {
      setHsnRows(saved.hsnRows)
      setDocRows(saved.docRows)
      setIsModified(true)
    } else {
      // Auto-compute from the month's documents
      const computedHsn = buildDefaultHsnSummary(monthDocs)
      const computedDocs = buildDefaultDocumentsIssued(monthDocs)
      setHsnRows(computedHsn)
      setDocRows(computedDocs)
      setIsModified(false)
    }
  }, [selectedMonthKey, monthDocs])

  // Calculate live totals for Table 12 (HSN)
  const hsnTotals = useMemo(() => {
    return calculateHsnTotals(hsnRows)
  }, [hsnRows])

  // Calculate live totals for Table 13 (Documents)
  const docTotals = useMemo(() => {
    return calculateDocsIssuedTotals(docRows)
  }, [docRows])

  // Navigation handlers
  const handleNavigateMonth = (direction) => {
    const parts = selectedMonthKey.split('-')
    if (parts.length < 2) return
    let y = parseInt(parts[0], 10)
    let m = parseInt(parts[1], 10)

    if (direction === 'prev') {
      m -= 1
      if (m < 1) {
        m = 12
        y -= 1
      }
    } else {
      m += 1
      if (m > 12) {
        m = 1
        y += 1
      }
    }
    const newKey = `${y}-${String(m).padStart(2, '0')}`
    setSelectedMonthKey(newKey)
  }

  // Row update helpers for Table 12
  const handleUpdateHsnRow = (id, field, value) => {
    setHsnRows(prev => {
      const next = prev.map(r => {
        if (r.id !== id) return r
        const updated = { ...r, [field]: value }

        // Recalculate taxes if taxableValue or rate changes
        if (field === 'taxableValue' || field === 'rate') {
          const taxVal = Number(field === 'taxableValue' ? value : updated.taxableValue) || 0
          const rateVal = Number(field === 'rate' ? value : updated.rate) || 0
          // Default to IGST for inter-state outward supply
          const newIgst = Math.round(taxVal * (rateVal / 100) * 100) / 100
          updated.igst = newIgst
          updated.cgst = 0
          updated.sgst = 0
          updated.totalTax = newIgst
        } else if (field === 'igst' || field === 'cgst' || field === 'sgst' || field === 'cess') {
          const igst = Number(field === 'igst' ? value : updated.igst) || 0
          const cgst = Number(field === 'cgst' ? value : updated.cgst) || 0
          const sgst = Number(field === 'sgst' ? value : updated.sgst) || 0
          const cess = Number(field === 'cess' ? value : updated.cess) || 0
          updated.totalTax = Math.round((igst + cgst + sgst + cess) * 100) / 100
        }
        return updated
      })
      saveHsnState(selectedMonthKey, { hsnRows: next, docRows })
      setIsModified(true)
      return next
    })
  }

  // Add custom HSN row
  const handleAddHsnRow = () => {
    const newRow = {
      id: `hsn-custom-${Date.now()}`,
      srNo: hsnRows.length + 1,
      hsn: '',
      description: '',
      hsnDescription: 'Other Wood Products',
      uqc: 'OTH',
      quantity: 0,
      taxableValue: 0,
      rate: 18,
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0,
      totalTax: 0,
      isCustom: true
    }
    const next = [...hsnRows, newRow]
    setHsnRows(next)
    saveHsnState(selectedMonthKey, { hsnRows: next, docRows })
    setIsModified(true)
    showToast('Added new custom HSN row.')
  }

  // Delete HSN row
  const handleDeleteHsnRow = (id) => {
    const next = hsnRows.filter(r => r.id !== id).map((r, i) => ({ ...r, srNo: i + 1 }))
    setHsnRows(next)
    saveHsnState(selectedMonthKey, { hsnRows: next, docRows })
    setIsModified(true)
    showToast('HSN row removed.')
  }

  // Row update helpers for Table 13
  const handleUpdateDocRow = (id, field, value) => {
    setDocRows(prev => {
      const next = prev.map(d => {
        if (d.id !== id) return d
        const updated = { ...d, [field]: value }
        if (field === 'totalNumber' || field === 'cancelled') {
          const tot = Number(field === 'totalNumber' ? value : updated.totalNumber) || 0
          const canc = Number(field === 'cancelled' ? value : updated.cancelled) || 0
          updated.netIssued = Math.max(0, tot - canc)
        }
        return updated
      })
      saveHsnState(selectedMonthKey, { hsnRows, docRows: next })
      setIsModified(true)
      return next
    })
  }

  // Add custom Document row
  const handleAddDocRow = () => {
    const newDoc = {
      id: `doc-custom-${Date.now()}`,
      srNo: docRows.length + 1,
      natureOfDoc: 'Other Commercial Documents',
      fromNo: '',
      toNo: '',
      totalNumber: 0,
      cancelled: 0,
      netIssued: 0,
      isCustom: true
    }
    const next = [...docRows, newDoc]
    setDocRows(next)
    saveHsnState(selectedMonthKey, { hsnRows, docRows: next })
    setIsModified(true)
    showToast('Added document series row.')
  }

  // Delete Document row
  const handleDeleteDocRow = (id) => {
    const next = docRows.filter(d => d.id !== id).map((d, i) => ({ ...d, srNo: i + 1 }))
    setDocRows(next)
    saveHsnState(selectedMonthKey, { hsnRows, docRows: next })
    setIsModified(true)
    showToast('Document series row removed.')
  }

  // Reset to auto-calculated from invoices
  const handleResetToAuto = () => {
    clearSavedHsnState(selectedMonthKey)
    const computedHsn = buildDefaultHsnSummary(monthDocs)
    const computedDocs = buildDefaultDocumentsIssued(monthDocs)
    setHsnRows(computedHsn)
    setDocRows(computedDocs)
    setIsModified(false)
    showToast(`Recalculated Table 12 & 13 from ${monthDocs.length} invoices!`)
  }

  // Clipboard copy helpers
  const handleCopySingleValue = (val, keyName) => {
    if (val === undefined || val === null) return
    const text = String(val)
    navigator.clipboard.writeText(text)
    setCopiedKey(keyName)
    showToast(`Copied "${text}" to clipboard!`)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Copy whole Table 12 for GST portal
  const handleCopyTable12ForPortal = () => {
    const header = ['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Taxable Value', 'Rate %', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess'].join('\t')
    const rowsText = hsnRows.map(r => [
      r.hsn,
      r.hsnDescription || r.description,
      r.uqc,
      r.quantity,
      Number(r.taxableValue).toFixed(2),
      r.rate,
      Number(r.igst).toFixed(2),
      Number(r.cgst).toFixed(2),
      Number(r.sgst).toFixed(2),
      Number(r.cess || 0).toFixed(2)
    ].join('\t')).join('\n')

    navigator.clipboard.writeText(`${header}\n${rowsText}`)
    showToast('Table 12 copied in TSV format for GST Portal / Excel!')
  }

  // Export CSV
  const handleExportCsv = () => {
    exportHsnSummaryCsv(activeMonthInfo.label, hsnRows, docRows, hsnTotals)
    showToast('GSTR-1 Table 12 & 13 CSV Downloaded!')
  }

  // Export PDF
  const handleExportPdf = () => {
    try {
      generateHsnSummaryPdf({
        monthLabel: activeMonthInfo.label,
        financialYear: activeMonthInfo.financialYear,
        hsnRows,
        docRows,
        totals: hsnTotals,
        save: true
      })
      showToast('Official GSTR-1 HSN & Docs PDF Downloaded!')
    } catch (err) {
      console.error('Error generating PDF:', err)
      showToast('Error generating PDF. Please verify table inputs.')
    }
  }

  // Print Report
  const handlePrint = () => {
    window.print()
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      {/* Standardized Module Header */}
      <div className="module-top-header">
        <div className="module-top-left">
          <button
            type="button"
            onClick={onBack}
            className="module-back-btn"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div>
            <h2 className="module-page-title">HSN Summary & Documents Issued</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'var(--tag-bg)', color: 'var(--text-secondary)' }}>
                Module 09
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>
                GSTR-1 Table 12 (HSN) & Table 13 (Documents Issued)
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="module-top-actions">
          <button
            type="button"
            onClick={() => loadDocuments(true)}
            disabled={refreshing}
            className="btn-secondary"
            style={{
              padding: '0.5rem 0.85rem',
              fontSize: '0.825rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: refreshing ? 'not-allowed' : 'pointer'
            }}
            title="Refresh documents from cloud and local storage"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Sync Data'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-secondary"
            style={{
              padding: '0.5rem 0.85rem',
              fontSize: '0.825rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            title="Export CSV for GST Portal / Offline Tool"
          >
            <FileSpreadsheet size={15} style={{ color: '#16a34a' }} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="btn-primary"
            style={{
              padding: '0.5rem 0.95rem',
              fontSize: '0.825rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '8px',
              border: 'none',
              background: '#1e3a2b',
              color: '#ffffff',
              cursor: 'pointer'
            }}
            title="Download official A4 statement PDF"
          >
            <Download size={15} />
            Download PDF
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-secondary"
            style={{
              padding: '0.5rem 0.85rem',
              fontSize: '0.825rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            title="Print statement"
          >
            <Printer size={15} />
            Print
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0f172a',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 700,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <CheckCircle2 size={18} style={{ color: '#4ade80' }} />
          {toastMessage}
        </div>
      )}

      {/* Month Navigation & Tax Period Banner */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Month Selector Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tax Period:
            </span>

            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--tag-bg)', padding: '0.2rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => handleNavigateMonth('prev')}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                title="Previous Month"
              >
                <ChevronLeft size={18} />
              </button>

              <select
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                style={{
                  padding: '0.45rem 0.85rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.docCount} records)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleNavigateMonth('next')}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                title="Next Month"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                background: isModified ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                color: isModified ? '#ca8a04' : '#15803d',
                border: isModified ? '1px solid #facc15' : '1px solid #86efac'
              }}
            >
              {isModified ? 'Manual Overrides Applied' : 'Auto-calculated from Invoices'}
            </span>

            {isModified && (
              <button
                type="button"
                onClick={handleResetToAuto}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--tag-bg)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
                title="Discard manual edits and recalculate from in-system invoices"
              >
                <RotateCcw size={13} /> Reset to Invoices
              </button>
            )}
          </div>

          {/* Filing Metadata */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            <div>
              <span style={{ fontWeight: 600 }}>Financial Year:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{activeMonthInfo.financialYear}</strong>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
              <span style={{ fontWeight: 600 }}>GSTR-1 Filing Due:</span>{' '}
              <strong style={{ color: '#16a34a' }}>11th {activeMonthInfo.filingDueMonth}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        {/* Card 1: Total Taxable */}
        <div
          style={{
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Total Taxable Value
            </span>
            <Receipt size={17} style={{ color: '#2d6a4f' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            ₹{formatCurrency(hsnTotals.totalTaxableValue)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Across all HSN outward supplies
          </div>
        </div>

        {/* Card 2: Total Integrated Tax */}
        <div
          style={{
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Total Integrated Tax (IGST)
            </span>
            <TrendingUp size={17} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#2563eb', letterSpacing: '-0.02em' }}>
            ₹{formatCurrency(hsnTotals.totalIgst)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Total GST Liability: ₹{formatCurrency(hsnTotals.totalTaxAmount)}
          </div>
        </div>

        {/* Card 3: Mahogany & Manjiyam Load (4407) */}
        <div
          style={{
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Mahogany / Manjiyam (4407)
            </span>
            <Boxes size={17} style={{ color: '#b45309' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {hsnTotals.totalQuantityCbm} <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b45309' }}>CBM</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            UQC: CBM (Auto-converted from CFT)
          </div>
        </div>

        {/* Card 4: Vatta Pencil Slats (44219140) */}
        <div
          style={{
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Vatta Pencil Slats (44219140)
            </span>
            <Layers size={17} style={{ color: '#15803d' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {hsnTotals.totalQuantityBags.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#15803d' }}>BAGS</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            UQC: BAG (Total dispatched in period)
          </div>
        </div>
      </div>

      {/* SECTION 1: TABLE 12 - HSN-WISE SUMMARY OF OUTWARD SUPPLIES */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '14px',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          overflow: 'hidden'
        }}
      >
        {/* Section Header */}
        <div
          style={{
            padding: '1.1rem 1.5rem',
            background: 'var(--tag-bg, #f8fafc)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              12. HSN-wise Summary of Outward Supplies
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
              Report HSN code, UQC, total quantity, taxable value and integrated tax for GSTR-1 Table 12
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleCopyTable12ForPortal}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Copy entire table for direct Excel / Portal entry"
            >
              <Copy size={13} /> Copy Table (TSV)
            </button>

            <button
              type="button"
              onClick={handleAddHsnRow}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: '#1e3a2b',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <PlusCircle size={14} /> Add HSN Row
            </button>
          </div>
        </div>

        {/* Table 12 Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1050px', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', width: '50px' }}>Sr No.</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', width: '120px' }}>HSN ⬍</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Description as per HSN Code</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', width: '80px' }}>UQC</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'right', width: '120px' }}>Total Quantity</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'right', width: '160px' }}>Total taxable value (₹)</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', width: '90px' }}>Rate (%)</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'right', width: '150px' }}>Integrated tax (₹)</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'right', width: '110px' }}>Central tax (₹)</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'right', width: '110px' }}>State/UT tax (₹)</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', width: '60px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hsnRows.map((row, idx) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: idx % 2 === 0 ? 'var(--card-bg)' : 'var(--tag-bg)'
                  }}
                >
                  {/* Sr No */}
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {idx + 1}
                  </td>

                  {/* HSN */}
                  <td style={{ padding: '0.7rem 0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="text"
                        value={row.hsn}
                        onChange={(e) => handleUpdateHsnRow(row.id, 'hsn', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-primary)',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopySingleValue(row.hsn, `hsn_${row.id}`)}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                        title="Copy HSN"
                      >
                        {copiedKey === `hsn_${row.id}` ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>

                  {/* Description as per HSN Code */}
                  <td style={{ padding: '0.7rem 0.85rem' }}>
                    <input
                      type="text"
                      value={row.hsnDescription}
                      onChange={(e) => handleUpdateHsnRow(row.id, 'hsnDescription', e.target.value)}
                      placeholder="e.g. WOOD SAWN OR CHIPPED.. / Pencil slats"
                      style={{
                        width: '100%',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.825rem'
                      }}
                    />
                    {row.originalCft > 0 && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Derived from {row.originalCft.toFixed(2)} CFT @ 0.0283168466
                      </div>
                    )}
                  </td>

                  {/* UQC */}
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                    <select
                      value={row.uqc}
                      onChange={(e) => handleUpdateHsnRow(row.id, 'uqc', e.target.value)}
                      style={{
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="CBM">CBM</option>
                      <option value="BAG">BAG</option>
                      <option value="NOS">NOS</option>
                      <option value="CFT">CFT</option>
                      <option value="KGS">KGS</option>
                      <option value="OTH">OTH</option>
                    </select>
                  </td>

                  {/* Total Quantity */}
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                      <input
                        type="number"
                        step="any"
                        value={row.quantity}
                        onChange={(e) => handleUpdateHsnRow(row.id, 'quantity', e.target.value)}
                        style={{
                          width: '85px',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-primary)',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopySingleValue(row.quantity, `qty_${row.id}`)}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                        title="Copy Quantity"
                      >
                        {copiedKey === `qty_${row.id}` ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>

                  {/* Total Taxable Value */}
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                      <input
                        type="number"
                        step="any"
                        value={row.taxableValue}
                        onChange={(e) => handleUpdateHsnRow(row.id, 'taxableValue', e.target.value)}
                        style={{
                          width: '120px',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-primary)',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopySingleValue(row.taxableValue, `tax_${row.id}`)}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                        title="Copy Taxable Value"
                      >
                        {copiedKey === `tax_${row.id}` ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>

                  {/* Rate (%) */}
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                    <select
                      value={row.rate}
                      onChange={(e) => handleUpdateHsnRow(row.id, 'rate', Number(e.target.value))}
                      style={{
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                      <option value={0}>0%</option>
                    </select>
                  </td>

                  {/* Integrated Tax (IGST) */}
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                      <input
                        type="number"
                        step="any"
                        value={row.igst}
                        onChange={(e) => handleUpdateHsnRow(row.id, 'igst', e.target.value)}
                        style={{
                          width: '110px',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: '#2563eb',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopySingleValue(row.igst, `igst_${row.id}`)}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                        title="Copy Integrated Tax"
                      >
                        {copiedKey === `igst_${row.id}` ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>

                  {/* Central Tax (CGST) */}
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="any"
                      value={row.cgst}
                      onChange={(e) => handleUpdateHsnRow(row.id, 'cgst', e.target.value)}
                      style={{
                        width: '80px',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}
                    />
                  </td>

                  {/* State/UT Tax (SGST) */}
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="any"
                      value={row.sgst}
                      onChange={(e) => handleUpdateHsnRow(row.id, 'sgst', e.target.value)}
                      style={{
                        width: '80px',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}
                    />
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                    {row.isCustom ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteHsnRow(row.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        title="Delete custom row"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Standard</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Table 12 Footer Totals */}
            <tfoot>
              <tr
                style={{
                  background: 'var(--tag-bg, #f8fafc)',
                  borderTop: '2px solid var(--border-color)',
                  fontWeight: 800,
                  fontSize: '0.9rem'
                }}
              >
                <td colSpan={5} style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-primary)' }}>
                  Total Taxable Value & Tax Amounts:
                </td>
                <td style={{ padding: '1rem 0.85rem', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 900 }}>
                  ₹{formatCurrency(hsnTotals.totalTaxableValue)}
                </td>
                <td style={{ padding: '1rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  -
                </td>
                <td style={{ padding: '1rem 0.85rem', textAlign: 'right', color: '#2563eb', fontWeight: 900 }}>
                  ₹{formatCurrency(hsnTotals.totalIgst)}
                </td>
                <td style={{ padding: '1rem 0.85rem', textAlign: 'right', color: 'var(--text-primary)' }}>
                  {hsnTotals.totalCgst > 0 ? `₹${formatCurrency(hsnTotals.totalCgst)}` : '-'}
                </td>
                <td style={{ padding: '1rem 0.85rem', textAlign: 'right', color: 'var(--text-primary)' }}>
                  {hsnTotals.totalSgst > 0 ? `₹${formatCurrency(hsnTotals.totalSgst)}` : '-'}
                </td>
                <td style={{ padding: '1rem 0.85rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleCopySingleValue(hsnTotals.totalIgst, 'total_igst')}
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
                    title="Copy Total Integrated Tax"
                  >
                    {copiedKey === 'total_igst' ? <Check size={16} /> : <Copy size={15} />}
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 2: TABLE 13 - DOCUMENTS ISSUED DURING THE TAX PERIOD */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '14px',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          overflow: 'hidden'
        }}
      >
        {/* Section Header */}
        <div
          style={{
            padding: '1.1rem 1.5rem',
            background: 'var(--tag-bg, #f8fafc)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              13. Documents Issued During the Tax Period
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
              Report Serial No From, Serial No To, Total Issued, Cancelled and Net Issued for GSTR-1 Table 13
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddDocRow}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: 'none',
              background: '#1e3a2b',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <PlusCircle size={14} /> Add Document Series
          </button>
        </div>

        {/* Table 13 Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', width: '50px' }}>Sr No.</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Nature of Document</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', width: '140px' }}>Sr No. From</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', width: '140px' }}>Sr No. To</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', width: '120px' }}>Total Number</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', width: '100px' }}>Cancelled</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', width: '110px' }}>Net Issued</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', width: '60px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docRows.map((doc, idx) => (
                <tr
                  key={doc.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: idx % 2 === 0 ? 'var(--card-bg)' : 'var(--tag-bg)'
                  }}
                >
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '0.7rem 0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {doc.isCustom ? (
                      <input
                        type="text"
                        value={doc.natureOfDoc}
                        onChange={(e) => handleUpdateDocRow(doc.id, 'natureOfDoc', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-primary)',
                          fontWeight: 700
                        }}
                      />
                    ) : (
                      doc.natureOfDoc
                    )}
                  </td>
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                    <input
                      type="text"
                      value={doc.fromNo}
                      onChange={(e) => handleUpdateDocRow(doc.id, 'fromNo', e.target.value)}
                      style={{
                        width: '100px',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        fontWeight: 700
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                    <input
                      type="text"
                      value={doc.toNo}
                      onChange={(e) => handleUpdateDocRow(doc.id, 'toNo', e.target.value)}
                      style={{
                        width: '100px',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        fontWeight: 700
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={doc.totalNumber}
                      onChange={(e) => handleUpdateDocRow(doc.id, 'totalNumber', e.target.value)}
                      style={{
                        width: '75px',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        fontWeight: 800
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={doc.cancelled}
                      onChange={(e) => handleUpdateDocRow(doc.id, 'cancelled', e.target.value)}
                      style={{
                        width: '65px',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: doc.cancelled > 0 ? '#ef4444' : 'var(--text-primary)',
                        textAlign: 'center',
                        fontWeight: 700
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: 900, color: '#16a34a' }}>
                    {doc.netIssued}
                  </td>
                  <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                    {doc.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDocRow(doc.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        title="Delete series"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Table 13 Footer */}
            <tfoot>
              <tr
                style={{
                  background: 'var(--tag-bg, #f8fafc)',
                  borderTop: '2px solid var(--border-color)',
                  fontWeight: 800,
                  fontSize: '0.9rem'
                }}
              >
                <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-primary)' }}>
                  Total Documents Issued:
                </td>
                <td style={{ padding: '1rem 0.85rem', textAlign: 'center', color: 'var(--text-primary)', fontWeight: 900 }}>
                  {docTotals.totalIssued}
                </td>
                <td style={{ padding: '1rem 0.85rem', textAlign: 'center', color: docTotals.totalCancelled > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                  {docTotals.totalCancelled}
                </td>
                <td style={{ padding: '1rem 0.85rem', textAlign: 'center', color: '#16a34a', fontWeight: 900 }}>
                  {docTotals.totalNet}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 3: INVOICES DRILL-DOWN / AUDIT DRAWER */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '14px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          overflow: 'hidden'
        }}
      >
        <button
          type="button"
          onClick={() => setShowInvoicesDrawer(prev => !prev)}
          style={{
            width: '100%',
            padding: '1rem 1.5rem',
            background: 'var(--tag-bg, #f8fafc)',
            border: 'none',
            borderBottom: showInvoicesDrawer ? '1px solid var(--border-color)' : 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Invoices Verification & Source Breakdown ({monthDocs.length} Total Records)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              View all contributing Vatta invoices, Mahogany & Manjiyam timber bills, and notes for {activeMonthInfo.label}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
            {showInvoicesDrawer ? 'Hide Invoices' : 'View Invoices'}
            {showInvoicesDrawer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showInvoicesDrawer && (
          <div style={{ padding: '1.25rem 1.5rem' }}>
            {monthDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                <AlertCircle size={28} style={{ margin: '0 auto 0.5rem', color: '#94a3b8' }} />
                <p style={{ margin: 0, fontWeight: 700 }}>No documents registered for {activeMonthInfo.label}.</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
                  Create invoices in Module 01 (Vatta) or Module 03 (Mahogany & Manjiyam), and they will automatically appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.25rem' }}>
                
                {/* Column 1: Vatta Invoices (HSN 44219140) */}
                <div style={{ background: 'var(--tag-bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Vatta Invoices ({vattaInvoices.length})
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>
                      HSN 44219140 • BAG
                    </span>
                  </div>
                  {vattaInvoices.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.75rem 0' }}>No Vatta invoices this month.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                      {vattaInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          style={{
                            background: 'var(--card-bg)',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.825rem'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                              Inv #{inv.docNo} • <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{inv.docDate || 'No Date'}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {inv.receiverName} • {inv.quantity}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>₹{formatCurrency(inv.taxableAmount)}</div>
                            <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>IGST: ₹{formatCurrency(inv.igstAmount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Column 2: Timber Invoices (HSN 4407) */}
                <div style={{ background: 'var(--tag-bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Timber Invoices ({timberInvoices.length})
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>
                      HSN 4407 • CBM
                    </span>
                  </div>
                  {timberInvoices.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.75rem 0' }}>No Timber invoices this month.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                      {timberInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          style={{
                            background: 'var(--card-bg)',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.825rem'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                              Inv #{inv.docNo} • <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{inv.docDate || 'No Date'}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {inv.receiverName} • {inv.quantity} ({inv.totalCbm ? `${inv.totalCbm} CBM` : ''})
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>₹{formatCurrency(inv.taxableAmount)}</div>
                            <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>IGST: ₹{formatCurrency(inv.igstAmount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
