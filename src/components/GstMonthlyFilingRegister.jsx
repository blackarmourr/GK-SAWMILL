import React, { useState, useEffect, useMemo } from 'react'
import {
  FolderArchive,
  Folder,
  FolderOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  FileText,
  Receipt,
  Layers,
  ArrowUpRight,
  PlusCircle,
  AlertCircle,
  X,
  FileCheck2,
  Building2,
  TrendingUp,
  CreditCard
} from 'lucide-react'
import {
  fetchAllGstDocuments,
  getAvailableMonths,
  filterDocumentsByMonth,
  calculateGstSummary,
  formatCurrency,
  exportGstr1Csv,
  deleteDocumentRecord,
  MONTH_NAMES,
  getYearMonthKey,
  getMonthYearLabel
} from '../data/gstMonthlyRegisterService.js'
import { generateVattaInvoicePdf } from '../utils/vattaInvoicePdfGenerator.js'
import { generateInvoicePdf } from '../utils/invoicePdfGenerator.js'
import { generateCreditNotePdf } from '../utils/creditNotePdfGenerator.js'
import { generateDebitNotePdf } from '../utils/debitNotePdfGenerator.js'
import { downloadVatPdf } from '../utils/vatPdfGenerator.js'
import { DEFAULT_VATTA_BUSINESS_SETTINGS } from '../data/vattaInvoiceSettings.js'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'

export default function GstMonthlyFilingRegister({
  onBack,
  onOpenVattaInvoice,
  onOpenTimberInvoice,
  onOpenCreditNote,
  onOpenDebitNote,
  onOpenKeralaVat
}) {
  // All combined documents from cloud & local storage
  const [allDocs, setAllDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Current selected month folder (default: current calendar month, e.g. "2026-10")
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => getYearMonthKey(new Date()))

  // Active filter tab: 'ALL' | 'VATTA' | 'TIMBER' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'KERALA_VAT'
  const [filterType, setFilterType] = useState('ALL')

  // Search input
  const [searchQuery, setSearchQuery] = useState('')

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  // Printable Statement Modal
  const [showPrintModal, setShowPrintModal] = useState(false)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Load documents
  const loadDocuments = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const docs = await fetchAllGstDocuments()
      setAllDocs(docs)
      if (isManual) {
        showToast(`Refreshed! Found ${docs.length} total records across all modules.`)
      }
    } catch (err) {
      console.error('Error loading documents:', err)
      showToast('Error syncing documents. Showing local data.')
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

  // Current active month object
  const activeMonth = useMemo(() => {
    const found = availableMonths.find(m => m.key === selectedMonthKey)
    if (found) return found
    return {
      key: selectedMonthKey,
      label: getMonthYearLabel(selectedMonthKey),
      filingDueMonth: 'Next Month',
      financialYear: 'Current FY',
      isCurrentMonth: selectedMonthKey === getYearMonthKey(new Date())
    }
  }, [availableMonths, selectedMonthKey])

  // Filter documents belonging to the selected month
  const monthDocs = useMemo(() => {
    return filterDocumentsByMonth(allDocs, selectedMonthKey)
  }, [allDocs, selectedMonthKey])

  // Filter by document type & search query
  const displayedDocs = useMemo(() => {
    return monthDocs.filter(doc => {
      // Type filter
      if (filterType !== 'ALL' && doc.sourceType !== filterType) {
        return false
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchNo = (doc.docNo || '').toLowerCase().includes(q)
        const matchParty = (doc.receiverName || '').toLowerCase().includes(q)
        const matchGst = (doc.receiverGstin || '').toLowerCase().includes(q)
        const matchEway = (doc.ewayBillNo || '').toLowerCase().includes(q)
        const matchRef = (doc.referenceNo || '').toLowerCase().includes(q)
        return matchNo || matchParty || matchGst || matchEway || matchRef
      }
      return true
    })
  }, [monthDocs, filterType, searchQuery])

  // Summary calculations for GSTR-1 and GSTR-3B for this month
  const gstTotals = useMemo(() => {
    return calculateGstSummary(monthDocs)
  }, [monthDocs])

  // Switch month helper (prev / next)
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

  // Copy GSTIN or details to clipboard
  const handleCopyText = (text, id) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    showToast(`Copied "${text}" to clipboard!`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Copy full portal line for an invoice
  const handleCopyPortalLine = (doc) => {
    const text = `Invoice: ${doc.docNo} | Date: ${doc.docDate} | GSTIN: ${doc.receiverGstin} | Recipient: ${doc.receiverName} | Taxable: ₹${formatCurrency(doc.taxableAmount)} | IGST: ₹${formatCurrency(doc.igstAmount)} | Total: ₹${formatCurrency(doc.grandTotal)}`
    navigator.clipboard.writeText(text)
    showToast(`Copied GST Portal summary for ${doc.docNo}!`)
  }

  // Download PDF directly from register
  const handleDownloadPdf = (doc) => {
    try {
      if (doc.sourceType === 'VATTA') {
        const payload = doc.rawRecord.invoiceData
          ? { ...DEFAULT_VATTA_BUSINESS_SETTINGS, ...doc.rawRecord.invoiceData, ...doc.rawRecord.totals }
          : doc.rawRecord
        generateVattaInvoicePdf(payload, true)
      } else if (doc.sourceType === 'TIMBER') {
        generateInvoicePdf(doc.rawRecord, true)
      } else if (doc.sourceType === 'CREDIT_NOTE') {
        generateCreditNotePdf(doc.rawRecord, true)
      } else if (doc.sourceType === 'DEBIT_NOTE') {
        generateDebitNotePdf(doc.rawRecord, true)
      } else if (doc.sourceType === 'KERALA_VAT') {
        downloadVatPdf(doc.rawRecord)
      }
      showToast(`Downloading PDF for ${doc.docNo}...`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      showToast(`Failed to generate PDF: ${err.message}`)
    }
  }

  // Print PDF directly
  const handlePrintPdf = (doc) => {
    try {
      let docInstance = null
      if (doc.sourceType === 'VATTA') {
        const payload = doc.rawRecord.invoiceData
          ? { ...DEFAULT_VATTA_BUSINESS_SETTINGS, ...doc.rawRecord.invoiceData, ...doc.rawRecord.totals }
          : doc.rawRecord
        docInstance = generateVattaInvoicePdf(payload, false)
      } else if (doc.sourceType === 'TIMBER') {
        docInstance = generateInvoicePdf(doc.rawRecord, false)
      } else if (doc.sourceType === 'CREDIT_NOTE') {
        const res = generateCreditNotePdf(doc.rawRecord, false)
        docInstance = res.doc || res
      } else if (doc.sourceType === 'DEBIT_NOTE') {
        const res = generateDebitNotePdf(doc.rawRecord, false)
        docInstance = res.doc || res
      }

      if (docInstance && docInstance.autoPrint) {
        docInstance.autoPrint()
        const blobUrl = docInstance.output('bloburl')
        window.open(blobUrl, '_blank')
      } else {
        handleDownloadPdf(doc)
      }
    } catch (err) {
      console.error('Error printing PDF:', err)
      handleDownloadPdf(doc)
    }
  }

  // Open document in its respective editor/generator
  const handleOpenDoc = (doc) => {
    if (doc.sourceType === 'VATTA') {
      if (onOpenVattaInvoice) onOpenVattaInvoice(doc.rawRecord)
    } else if (doc.sourceType === 'TIMBER') {
      if (onOpenTimberInvoice) onOpenTimberInvoice(doc.rawRecord)
    } else if (doc.sourceType === 'CREDIT_NOTE') {
      if (onOpenCreditNote) onOpenCreditNote(doc.rawRecord)
    } else if (doc.sourceType === 'DEBIT_NOTE') {
      if (onOpenDebitNote) onOpenDebitNote(doc.rawRecord)
    } else if (doc.sourceType === 'KERALA_VAT') {
      if (onOpenKeralaVat) onOpenKeralaVat(doc.rawRecord)
    }
  }

  // Delete document
  const handleDeleteDoc = async (doc) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${doc.gstDocType} "${doc.docNo}" for ${doc.receiverName}?\nThis will remove it from both local history and Supabase cloud.`
    )
    if (!confirmDelete) return

    const ok = await deleteDocumentRecord(doc)
    if (ok) {
      setAllDocs(prev => prev.filter(d => !(d.sourceType === doc.sourceType && d.id === doc.id)))
      showToast(`Deleted ${doc.docNo} from register.`)
    } else {
      showToast('Error deleting document.')
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    if (monthDocs.length === 0) {
      showToast('No documents to export for this month.')
      return
    }
    exportGstr1Csv(activeMonth.label, monthDocs, gstTotals)
    showToast(`Exported GSTR-1 CSV for ${activeMonth.label}!`)
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.25rem 1rem 3rem' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            background: 'var(--primary, #1e3a2b)',
            color: '#ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            fontSize: '0.9rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <Check size={18} color="#34d399" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation & Brand Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-color, #e2dcd2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={onBack}
            className="back-nav-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary, #1e293b)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            &larr; Back to Dashboard
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'var(--primary, #1e3a2b)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FolderArchive size={18} />
              </div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                GST Monthly Register & GSTR-1 Filing
              </h1>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px',
                  background: '#2d6a4f',
                  color: '#ffffff',
                  letterSpacing: '0.04em'
                }}
              >
                MODULE 08
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
              Monthly outward invoice dossier for GSTR-1 return filing & GSTR-3B tax payment
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.8rem',
              borderRadius: '8px',
              background: 'var(--tag-bg, #f5efe6)',
              border: '1px solid var(--border-color, #e2dcd2)',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-secondary)'
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isSupabaseConfigured ? '#10b981' : '#f59e0b'
              }}
            />
            <span>{isSupabaseConfigured ? 'Cloud Live Sync' : 'Offline Cache'}</span>
          </div>

          <button
            type="button"
            onClick={() => loadDocuments(true)}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary, #1e293b)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: refreshing ? 'not-allowed' : 'pointer'
            }}
            title="Refresh records from Supabase cloud and local history"
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.05rem',
              borderRadius: '8px',
              border: 'none',
              background: '#2d6a4f',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(45, 106, 79, 0.25)'
            }}
            title="Export CSV formatted for GSTR-1 filing (Tables 4 & 9B)"
          >
            <FileSpreadsheet size={15} />
            <span>Export GSTR-1 CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <Printer size={15} />
            <span>Print Monthly Statement</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MONTHLY FOLDER SELECTION BAR (The "Folders")
          ========================================================================= */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '14px',
          border: '1px solid var(--card-border, #e6dfd5)',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem',
            marginBottom: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderOpen size={20} color="var(--wood-accent, #925c38)" />
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Select Monthly Invoices Folder
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              ({activeMonth.financialYear})
            </span>
          </div>

          {/* Month Stepper Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => handleNavigateMonth('prev')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--tag-bg, #f5efe6)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Previous Month"
            >
              <ChevronLeft size={14} /> Prev
            </button>

            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                background: 'var(--primary-soft, #eaf3ed)',
                color: 'var(--primary, #1e3a2b)'
              }}
            >
              {activeMonth.label}
            </span>

            <button
              type="button"
              onClick={() => handleNavigateMonth('next')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--tag-bg, #f5efe6)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Next Month"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Visual Folder Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            overflowX: 'auto',
            paddingBottom: '0.35rem',
            scrollbarWidth: 'thin'
          }}
        >
          {availableMonths.map((m) => {
            const isSelected = m.key === selectedMonthKey
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedMonthKey(m.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid var(--primary, #1e3a2b)' : '1px solid var(--border-color, #e2dcd2)',
                  background: isSelected ? 'var(--primary, #1e3a2b)' : 'var(--tag-bg, #f5efe6)',
                  color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.83rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 10px rgba(30, 58, 43, 0.2)' : 'none'
                }}
              >
                {isSelected ? <FolderOpen size={16} color="#34d399" /> : <Folder size={16} />}
                <span>{m.label}</span>
                {m.isCurrentMonth && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '12px',
                      background: isSelected ? '#34d399' : '#1e3a2b',
                      color: isSelected ? '#0b130e' : '#ffffff'
                    }}
                  >
                    CURRENT
                  </span>
                )}
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.06)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  {m.docCount}
                </span>
              </button>
            )
          })}
        </div>

        {/* GST Filing Notice Banner for Active Month */}
        <div
          style={{
            marginTop: '0.85rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: 'var(--tag-bg, #f5efe6)',
            borderLeft: '4px solid var(--primary, #1e3a2b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem',
            fontSize: '0.82rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <Calendar size={16} color="var(--wood-accent)" />
            <span>
              <strong>{activeMonth.label} Generated Invoices Folder</strong> — All loads & documents generated during this calendar month.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--primary)',
                background: 'var(--card-bg)',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}
            >
              📅 GSTR-1 Filing Period: <strong>{activeMonth.filingDueMonth}</strong> (Due by 11th)
            </span>
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#925c38',
                background: 'var(--card-bg)',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}
            >
              💳 GSTR-3B Tax Due: <strong>{activeMonth.filingDueMonth}</strong> (Due by 20th)
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          EXECUTIVE GST SUMMARY CARDS (GSTR-1 & GSTR-3B Table 3.1 Reconciliation)
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}
      >
        {/* Card 1: Gross Invoices */}
        <div
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--card-border, #e6dfd5)',
            padding: '1rem 1.15rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              GROSS TAX INVOICES (B2B)
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '6px',
                background: '#eaf3ed',
                color: '#1e3a2b'
              }}
            >
              Table 4
            </span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ₹{formatCurrency(gstTotals.invoicesTaxable)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {gstTotals.invoiceCount} Invoices (Vatta + Timber)
          </div>
        </div>

        {/* Card 2: Debit Notes */}
        <div
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--card-border, #e6dfd5)',
            padding: '1rem 1.15rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              DEBIT NOTES (INCENTIVES)
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '6px',
                background: '#fef3c7',
                color: '#92400e'
              }}
            >
              + Table 9B
            </span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706' }}>
            + ₹{formatCurrency(gstTotals.debitTaxable)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {gstTotals.debitCount} Notes • Annual Bonus / Incentive
          </div>
        </div>

        {/* Card 3: Credit Notes */}
        <div
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--card-border, #e6dfd5)',
            padding: '1rem 1.15rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              CREDIT NOTES (REJECTIONS)
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '6px',
                background: '#e0e7ff',
                color: '#3730a3'
              }}
            >
              - Table 9B
            </span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4f46e5' }}>
            - ₹{formatCurrency(gstTotals.creditTaxable)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {gstTotals.creditCount} Notes • Rejection refunds
          </div>
        </div>

        {/* Card 4: Net Taxable Turnover */}
        <div
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '12px',
            border: '2px solid var(--primary, #1e3a2b)',
            padding: '1rem 1.15rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary, #1e3a2b)' }}>
              NET TAXABLE OUTWARD SUPPLIES
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '6px',
                background: 'var(--primary)',
                color: '#ffffff'
              }}
            >
              GSTR-3B 3.1(a)
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--primary, #1e3a2b)' }}>
            ₹{formatCurrency(gstTotals.netTaxable)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Net Turnover: ₹{formatCurrency(gstTotals.netInvoiceTurnover)}
          </div>
        </div>

        {/* Card 5: Net Output GST Tax Liability */}
        <div
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--card-border, #e6dfd5)',
            padding: '1rem 1.15rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              NET GST TAX LIABILITY PAYABLE
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '6px',
                background: '#ecfdf5',
                color: '#065f46'
              }}
            >
              Output Tax
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#059669' }}>
            ₹{formatCurrency(gstTotals.netTaxPayable)}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'var(--tag-bg)' }}>
              IGST: ₹{formatCurrency(gstTotals.netIgst)}
            </span>
            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'var(--tag-bg)' }}>
              CGST: ₹{formatCurrency(gstTotals.netCgst)}
            </span>
            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'var(--tag-bg)' }}>
              SGST: ₹{formatCurrency(gstTotals.netSgst)}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TOOLBAR: CATEGORY TABS & LIVE SEARCH
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.85rem',
          marginBottom: '1rem',
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '12px',
          border: '1px solid var(--card-border, #e6dfd5)',
          padding: '0.75rem 1rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {/* Category Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Documents', count: monthDocs.length },
            { id: 'VATTA', label: 'Vatta Wood (B2B)', count: monthDocs.filter(d => d.sourceType === 'VATTA').length },
            { id: 'TIMBER', label: 'Timber (Mahogany/Manjiyam)', count: monthDocs.filter(d => d.sourceType === 'TIMBER').length },
            { id: 'CREDIT_NOTE', label: 'Credit Notes (CDNR)', count: monthDocs.filter(d => d.sourceType === 'CREDIT_NOTE').length },
            { id: 'DEBIT_NOTE', label: 'Debit Notes (CDNR)', count: monthDocs.filter(d => d.sourceType === 'DEBIT_NOTE').length },
            { id: 'KERALA_VAT', label: 'Kerala VAT Bills', count: monthDocs.filter(d => d.sourceType === 'KERALA_VAT').length }
          ].map(tab => {
            const active = filterType === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.8rem',
                  borderRadius: '8px',
                  border: active ? '1px solid var(--primary, #1e3a2b)' : '1px solid var(--border-color, #e2dcd2)',
                  background: active ? 'var(--primary, #1e3a2b)' : 'var(--tag-bg, #f5efe6)',
                  color: active ? '#ffffff' : 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '0.05rem 0.35rem',
                    borderRadius: '10px',
                    background: active ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.08)',
                    color: active ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Live Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--input-border, #cbd5e1)',
            background: 'var(--input-bg, #ffffff)',
            width: '280px',
            maxWidth: '100%'
          }}
        >
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search invoice, GSTIN, party..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.82rem',
              color: 'var(--input-text)',
              width: '100%'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          DOCUMENT LISTING DATA TABLE
          ========================================================================= */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '14px',
          border: '1px solid var(--card-border, #e6dfd5)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="spin-icon" style={{ marginBottom: '0.5rem' }} />
            <div>Loading monthly invoice register...</div>
          </div>
        ) : displayedDocs.length === 0 ? (
          /* Empty State */
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--tag-bg, #f5efe6)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--wood-accent, #925c38)',
                marginBottom: '1rem'
              }}
            >
              <FolderOpen size={32} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.4rem', color: 'var(--text-primary)' }}>
              No Invoices Found for {activeMonth.label}
            </h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.86rem', color: 'var(--text-muted)', maxWidth: '480px', marginInline: 'auto' }}>
              {searchQuery
                ? `No documents matched "${searchQuery}". Try clearing your search.`
                : `There are currently no invoices, credit notes, or debit notes generated with an invoice date in ${activeMonth.label}.`}
            </p>

            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onOpenVattaInvoice && onOpenVattaInvoice()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary, #1e3a2b)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <PlusCircle size={15} /> Create Vatta Invoice
              </button>
              <button
                type="button"
                onClick={() => onOpenTimberInvoice && onOpenTimberInvoice()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Create Timber Invoice
              </button>
              <button
                type="button"
                onClick={() => onOpenDebitNote && onOpenDebitNote()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Create Debit Note
              </button>
              <button
                type="button"
                onClick={() => onOpenCreditNote && onOpenCreditNote()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Create Credit Note
              </button>
            </div>
          </div>
        ) : (
          /* Data Table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--table-head-bg, #f8fafc)',
                    borderBottom: '2px solid var(--border-color, #e2dcd2)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <th style={{ padding: '0.75rem 0.6rem 0.75rem 1rem', width: '40px' }}>#</th>
                  <th style={{ padding: '0.75rem 0.8rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 0.8rem' }}>Doc No & Date</th>
                  <th style={{ padding: '0.75rem 0.8rem' }}>Recipient & Place of Supply</th>
                  <th style={{ padding: '0.75rem 0.8rem' }}>GSTIN</th>
                  <th style={{ padding: '0.75rem 0.8rem', textAlign: 'right' }}>Taxable Value (₹)</th>
                  <th style={{ padding: '0.75rem 0.8rem', textAlign: 'center' }}>Rate</th>
                  <th style={{ padding: '0.75rem 0.8rem', textAlign: 'right' }}>IGST / Tax (₹)</th>
                  <th style={{ padding: '0.75rem 0.8rem', textAlign: 'right' }}>Total Value (₹)</th>
                  <th style={{ padding: '0.75rem 1rem 0.75rem 0.8rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedDocs.map((doc, idx) => {
                  const isCreditNote = doc.sourceType === 'CREDIT_NOTE'
                  const isDebitNote = doc.sourceType === 'DEBIT_NOTE'
                  const isVatta = doc.sourceType === 'VATTA'
                  const isTimber = doc.sourceType === 'TIMBER'
                  const isVatBill = doc.sourceType === 'KERALA_VAT'

                  // Type pill color styling
                  let badgeBg = '#eaf3ed'
                  let badgeColor = '#1e3a2b'
                  let badgeBorder = '#bbf7d0'
                  if (isCreditNote) {
                    badgeBg = '#e0e7ff'
                    badgeColor = '#3730a3'
                    badgeBorder = '#c7d2fe'
                  } else if (isDebitNote) {
                    badgeBg = '#fef3c7'
                    badgeColor = '#92400e'
                    badgeBorder = '#fde68a'
                  } else if (isTimber) {
                    badgeBg = '#f5efe6'
                    badgeColor = '#925c38'
                    badgeBorder = '#e6dfd5'
                  } else if (isVatBill) {
                    badgeBg = '#f1f5f9'
                    badgeColor = '#475569'
                    badgeBorder = '#cbd5e1'
                  }

                  return (
                    <tr
                      key={`${doc.sourceType}_${doc.id}_${idx}`}
                      style={{
                        borderBottom: '1px solid var(--border-color, #f0ebe1)',
                        transition: 'background 0.1s ease',
                        background: isCreditNote ? 'rgba(79, 70, 229, 0.02)' : isDebitNote ? 'rgba(217, 119, 6, 0.02)' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--tag-bg, #f5efe6)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isCreditNote ? 'rgba(79, 70, 229, 0.02)' : isDebitNote ? 'rgba(217, 119, 6, 0.02)' : 'transparent'
                      }}
                    >
                      {/* # */}
                      <td style={{ padding: '0.75rem 0.6rem 0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* Type */}
                      <td style={{ padding: '0.75rem 0.8rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`,
                            display: 'inline-block'
                          }}
                        >
                          {doc.gstDocType}
                        </span>
                      </td>

                      {/* Doc No & Date */}
                      <td style={{ padding: '0.75rem 0.8rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {doc.docNo}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          📅 {doc.docDate || 'No Date'}
                        </div>
                        {doc.referenceNo && (
                          <div style={{ fontSize: '0.69rem', color: 'var(--wood-accent)', marginTop: '0.1rem' }}>
                            Ref: {doc.referenceNo}
                          </div>
                        )}
                      </td>

                      {/* Recipient & Place of Supply */}
                      <td style={{ padding: '0.75rem 0.8rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {doc.receiverName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.05rem 0.35rem',
                              borderRadius: '4px',
                              background: 'var(--tag-bg)',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {doc.placeOfSupply || doc.receiverState || 'State'}
                          </span>
                          {doc.ewayBillNo && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              E-Way: {doc.ewayBillNo}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* GSTIN */}
                      <td style={{ padding: '0.75rem 0.8rem', whiteSpace: 'nowrap' }}>
                        {doc.receiverGstin ? (
                          <button
                            type="button"
                            onClick={() => handleCopyText(doc.receiverGstin, `gstin_${doc.id}`)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--card-bg)',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              cursor: 'pointer'
                            }}
                            title="Click to copy recipient GSTIN"
                          >
                            <span>{doc.receiverGstin}</span>
                            {copiedId === `gstin_${doc.id}` ? (
                              <Check size={12} color="#10b981" />
                            ) : (
                              <Copy size={12} color="var(--text-muted)" />
                            )}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>

                      {/* Taxable Value */}
                      <td
                        style={{
                          padding: '0.75rem 0.8rem',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          color: isCreditNote ? '#4f46e5' : isDebitNote ? '#d97706' : 'var(--text-primary)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isCreditNote ? '-' : ''}₹{formatCurrency(doc.taxableAmount)}
                      </td>

                      {/* Tax Rate */}
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'center', fontWeight: 600 }}>
                        {doc.gstRate ? `${doc.gstRate}%` : '-'}
                      </td>

                      {/* IGST / Taxes */}
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {isCreditNote ? '-' : ''}₹{formatCurrency(doc.totalTax)}
                        </div>
                        {doc.igstAmount > 0 ? (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            IGST: ₹{formatCurrency(doc.igstAmount)}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            C+S: ₹{formatCurrency(doc.cgstAmount + doc.sgstAmount)}
                          </div>
                        )}
                      </td>

                      {/* Grand Total Value */}
                      <td
                        style={{
                          padding: '0.75rem 0.8rem',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          color: isCreditNote ? '#4f46e5' : 'var(--text-primary)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isCreditNote ? '-' : ''}₹{formatCurrency(doc.grandTotal)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 1rem 0.75rem 0.8rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          {/* Open / Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenDoc(doc)}
                            style={{
                              padding: '0.35rem 0.55rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--card-bg)',
                              color: 'var(--primary)',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                            title="Open in generator to view or edit"
                          >
                            <ExternalLink size={12} />
                            <span>Open</span>
                          </button>

                          {/* Download PDF */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(doc)}
                            style={{
                              padding: '0.35rem 0.55rem',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'var(--primary, #1e3a2b)',
                              color: '#ffffff',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                            title="Download PDF"
                          >
                            <Download size={12} />
                            <span>PDF</span>
                          </button>

                          {/* Print PDF */}
                          <button
                            type="button"
                            onClick={() => handlePrintPdf(doc)}
                            style={{
                              padding: '0.35rem 0.45rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--card-bg)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}
                            title="Print PDF"
                          >
                            <Printer size={13} />
                          </button>

                          {/* Copy Portal Line */}
                          <button
                            type="button"
                            onClick={() => handleCopyPortalLine(doc)}
                            style={{
                              padding: '0.35rem 0.45rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--card-bg)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}
                            title="Copy summary for GST portal data entry"
                          >
                            <Copy size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc)}
                            style={{
                              padding: '0.35rem 0.45rem',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              background: '#fff1f2',
                              color: '#b91c1c',
                              cursor: 'pointer'
                            }}
                            title="Delete document"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Table Footer Summary Row */}
              <tfoot>
                <tr
                  style={{
                    background: 'var(--tag-bg, #f5efe6)',
                    borderTop: '2px solid var(--border-color)',
                    fontWeight: 800,
                    fontSize: '0.86rem'
                  }}
                >
                  <td colSpan={5} style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    MONTHLY REGISTER TOTALS ({displayedDocs.length} Documents):
                  </td>
                  <td style={{ padding: '0.85rem 0.8rem', textAlign: 'right', color: 'var(--primary, #1e3a2b)' }}>
                    ₹{formatCurrency(gstTotals.netTaxable)}
                  </td>
                  <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center' }}>-</td>
                  <td style={{ padding: '0.85rem 0.8rem', textAlign: 'right', color: '#059669' }}>
                    ₹{formatCurrency(gstTotals.netTaxPayable)}
                  </td>
                  <td style={{ padding: '0.85rem 0.8rem', textAlign: 'right', color: 'var(--primary, #1e3a2b)' }}>
                    ₹{formatCurrency(gstTotals.netInvoiceTurnover)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem 0.85rem 0.8rem' }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          PRINTABLE MONTHLY STATEMENT MODAL
          ========================================================================= */}
      {showPrintModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              borderRadius: '16px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              position: 'relative'
            }}
          >
            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.75rem'
              }}
              className="no-print"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={20} color="#1e3a2b" />
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e3a2b' }}>
                  Printable Monthly GST Statement ({activeMonth.label})
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#1e3a2b',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={15} /> Print Report
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  style={{
                    padding: '0.5rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--tag-bg, #f8fafc)',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Official Report Content */}
            <div id="printable-gst-statement">
              {/* Sawmill Letterhead */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a2b', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#1e3a2b', letterSpacing: '0.04em' }}>
                  G.K. SAW MILL
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', marginTop: '0.2rem' }}>
                  KATOOR, NEDUMPANA - P.O., KOLLAM, KERALA - 691576
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', marginTop: '0.1rem' }}>
                  Telephone: 9446786175 • Email: anilkumarkottiyam175@gmail.com
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', marginTop: '0.35rem' }}>
                  GSTIN: 32AHOPG1823G1ZP (STATE CODE: 32 - KERALA)
                </div>
              </div>

              {/* Document Subheader */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: 'var(--tag-bg, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '0.85rem 1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    Report Purpose
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e3a2b' }}>
                    Monthly Outward Register (GSTR-1 & 3B Reconciliation)
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    Tax Period
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                    {activeMonth.label} ({activeMonth.financialYear})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Filing Due: {activeMonth.filingDueMonth}
                  </div>
                </div>
              </div>

              {/* Documents Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ background: '#1e3a2b', color: '#ffffff' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Doc Type</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Doc No</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Recipient</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>GSTIN</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Taxable (₹)</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>IGST (₹)</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthDocs.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.45rem 0.5rem' }}>{i + 1}</td>
                      <td style={{ padding: '0.45rem 0.5rem', fontWeight: 700 }}>{d.sourceLabel}</td>
                      <td style={{ padding: '0.45rem 0.5rem', fontWeight: 800 }}>{d.docNo}</td>
                      <td style={{ padding: '0.45rem 0.5rem' }}>{d.docDate}</td>
                      <td style={{ padding: '0.45rem 0.5rem' }}>{d.receiverName}</td>
                      <td style={{ padding: '0.45rem 0.5rem', fontFamily: 'monospace' }}>{d.receiverGstin}</td>
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>
                        {d.sourceType === 'CREDIT_NOTE' ? '-' : ''}₹{formatCurrency(d.taxableAmount)}
                      </td>
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>
                        {d.sourceType === 'CREDIT_NOTE' ? '-' : ''}₹{formatCurrency(d.igstAmount)}
                      </td>
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontWeight: 800 }}>
                        {d.sourceType === 'CREDIT_NOTE' ? '-' : ''}₹{formatCurrency(d.grandTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tax Reconciliation Summary Table */}
              <div
                style={{
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '8px',
                  padding: '1rem',
                  background: 'var(--tag-bg, #f8fafc)',
                  marginBottom: '2rem'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.5rem', color: '#1e3a2b' }}>
                  GSTR-1 & GSTR-3B Tax Return Summary
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    Total Invoices Taxable: <strong>₹{formatCurrency(gstTotals.invoicesTaxable)}</strong> ({gstTotals.invoiceCount} bills)
                  </div>
                  <div>
                    Debit Notes Additions: <strong>+ ₹{formatCurrency(gstTotals.debitTaxable)}</strong> ({gstTotals.debitCount} notes)
                  </div>
                  <div>
                    Credit Notes Deductions: <strong style={{ color: '#4f46e5' }}>- ₹{formatCurrency(gstTotals.creditTaxable)}</strong> ({gstTotals.creditCount} notes)
                  </div>
                  <div>
                    NET TAXABLE OUTWARD SUPPLIES: <strong style={{ color: '#1e3a2b', fontSize: '0.95rem' }}>₹{formatCurrency(gstTotals.netTaxable)}</strong>
                  </div>
                  <div>
                    Integrated GST (IGST): <strong>₹{formatCurrency(gstTotals.netIgst)}</strong>
                  </div>
                  <div>
                    CGST + SGST: <strong>₹{formatCurrency(gstTotals.netCgst + gstTotals.netSgst)}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', paddingTop: '0.4rem', borderTop: '1px solid #cbd5e1', fontSize: '1rem', color: '#059669' }}>
                    TOTAL OUTPUT TAX LIABILITY PAYABLE: <strong>₹{formatCurrency(gstTotals.netTaxPayable)}</strong>
                  </div>
                </div>
              </div>

              {/* Signature block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
                <div style={{ textAlign: 'center', minWidth: '180px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Prepared By:</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px solid #000', fontSize: '0.82rem', fontWeight: 700 }}>
                    Accountant / Clerk
                  </div>
                </div>

                <div style={{ textAlign: 'center', minWidth: '220px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>For G.K. SAW MILL:</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px solid #000', fontSize: '0.82rem', fontWeight: 800 }}>
                    Proprietor / Authorized Signatory
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
