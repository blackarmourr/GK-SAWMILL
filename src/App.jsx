import React, { useState, useEffect } from 'react'
import {
  Calculator,
  Receipt,
  Layers,
  Scale,
  Ruler,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  HardDrive,
  Info,
  CheckCircle2,
  TreePine,
  Sparkles,
  X,
  FileText,
  Cloud,
  Lock
} from 'lucide-react'
import MahoganyManjiyamChartGenerator from './components/MahoganyManjiyamChartGenerator'
import MahoganyManjiyamInvoiceGenerator from './components/MahoganyManjiyamInvoiceGenerator'
import VattaMeasurementCalculator from './components/VattaMeasurementCalculator'
import KeralaVatBillGenerator from './components/KeralaVatBillGenerator'
import VattaInvoiceGenerator from './components/VattaInvoiceGenerator'
import CreditNoteGenerator from './components/CreditNoteGenerator'
import AuthModal from './components/AuthModal'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient'

const MODULES = [
  {
    id: 'vatta-invoice',
    number: 'Module 01',
    title: 'Vatta GST Invoice Generator',
    subtitle: 'Official Form GST Invoice - I & Standard Vatta Billing',
    description:
      'Generate authentic A4 GST Invoices (Form GST Invoice-I) for Vatta wood pencil slats with automated bag-to-piece conversions, rate per 1,000 pieces pricing, customer profile management, and print-ready A4 PDF generation.',
    formula: 'Total Pieces = Bags × Pcs/Bag  •  Line Total = (Pieces ÷ 1,000) × Rate/1000',
    features: [
      'Automatic bag-to-pieces conversion for all 6 standard Vatta ply sizes',
      'Pricing per 1,000 pieces with intra-state / inter-state GST calculations',
      'Receiver & Despatched party directory, transit docs, and print-ready A4 PDF export'
    ],
    icon: Calculator,
    badgeColor: '#1e3a2b',
    isVattaInvoice: true
  },
  {
    id: 'vatta-measurement',
    number: 'Module 02',
    title: 'Vatta Measurement Calculator',
    subtitle: 'Ply Dimensions & Cubic Metres (CBM)',
    description:
      'Generate official Vatta wood pencil slats measurement sheets by entering bag quantities. Automatically computes total pieces and CBM volume using fixed ply dimensions, and exports print-ready A4 PDFs.',
    formula: 'CBM = (Length × Width × Thickness × Total Pieces) / 1,000,000,000',
    features: [
      'Fixed 8-Ply to 3-Ply dimensions & pieces-per-bag standards',
      'Automatic piece totals and unrounded precision CBM volume',
      'Lorry, Invoice & Pass recording with instant A4 PDF export'
    ],
    icon: Layers,
    badgeColor: '#2d6a4f',
    isVatta: true
  },
  {
    id: 'mahogany-manjiyam-invoice',
    number: 'Module 03',
    title: 'Mahogany & Manjiyam Invoice Generator',
    subtitle: 'Official Form GST Invoice - I & Auto CFT',
    description:
      'Generate authentic A4 GST Invoices for Mahogany and Manjiyam timber sales. Automatically derives CFT from taxable amounts, calculates CBM volume, manages customer profiles, and exports print-ready PDFs.',
    formula: 'CFT = Taxable Value ÷ Rate/CFT  •  CBM = CFT × 0.0283168466',
    features: [
      'Automatic CFT derivation from taxable value and rates',
      'Standard HSN 4407 timber billing with 18% GST (IGST / CGST+SGST)',
      'Customer profile directory, live CBM volume, & A4 PDF export'
    ],
    icon: Receipt,
    badgeColor: '#1e3a2b',
    isInvoice: true
  },
  {
    id: 'mahogany-manjiyam-size-chart',
    number: 'Module 04',
    title: 'Mahogany & Manjiyam Size Chart Generator',
    subtitle: 'Canva-Ready Timber Tally & Sawmill Slips',
    description:
      'Generate optimized wood dimension cutting schedules for Mahogany (up to 15 standard rows) and Manjiyam (up to 10 standard rows) matching target CFT budgets with piece count optimization and printable A4 charts.',
    formula: 'CFT = (Width × Thick × Length × Nos) / 144  •  CBM = CFT × 0.0283168466',
    features: [
      'Deterministic integer optimization for piece counts (Nos)',
      'Configurable row count & standard dimension preservation',
      'A4 print-ready PDF export without Canva, plus sawmill slip & CSV'
    ],
    icon: Ruler,
    badgeColor: '#925c38',
    isSizeChart: true
  },
  {
    id: 'kerala-vat-bill',
    number: 'Module 05',
    title: 'Kerala VAT Bill Generator',
    subtitle: 'INTERSTATE PURCHASE / STOCK TRANSFER BILL',
    description:
      'Create Kerala VAT Form 8F bills using saved consignee, transporter, carrier and driver information. Generate print-ready A4 PDFs.',
    formula: 'Form No. 8F  •  Interstate Stock Transfer / Purchase  •  Rule 66(6)',
    features: [
      '12 numbered fields matching official Kerala VAT Form 8F',
      'Consignee, carrier, transporter & driver directory persistence',
      'Print-ready single page A4 PDF export with declaration & signature'
    ],
    icon: FileText,
    badgeColor: '#1e3a2b',
    isVat: true
  },
  {
    id: 'credit-note',
    number: 'Module 06',
    title: 'Credit Note Generator',
    subtitle: 'Form GST Credit Note (Vatta Wood Pencil Slats)',
    description:
      'Generate official Credit Notes (Section 34 CGST Act) against saved Vatta GST invoices with item rejection, price adjustment, tax recalculations, and authentic print-ready A4 PDFs.',
    formula: 'Taxable Credited + GST (IGST / CGST+SGST) + Round Off = Net Value',
    features: [
      'Exclusively for Vatta Wood invoices (segregated from timber sales)',
      'Itemized rejected piece calculator or direct taxable value entry',
      'Over-crediting protection & authentic A4 PDF export matching official sample'
    ],
    icon: FileText,
    badgeColor: '#1e3a2b',
    isCreditNote: true
  }
]

function App() {
  const [currentView, setCurrentView] = useState('home')
  const [activeModal, setActiveModal] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [cloudSession, setCloudSession] = useState(null)

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setCloudSession(session)
      })
      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setCloudSession(session)
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  const handleCardClick = (mod) => {
    if (mod.id === 'credit-note') {
      setCurrentView('credit-note')
    } else if (mod.id === 'vatta-invoice') {
      setCurrentView('vatta-invoice')
    } else if (mod.id === 'kerala-vat-bill') {
      setCurrentView('kerala-vat')
    } else if (mod.id === 'vatta-measurement') {
      setCurrentView('vatta-measurement')
    } else if (mod.id === 'mahogany-manjiyam-invoice') {
      setCurrentView('invoice-generator')
    } else if (mod.id === 'mahogany-manjiyam-size-chart') {
      setCurrentView('size-chart')
    } else {
      setActiveModal(mod)
    }
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="brand-logo-title" onClick={() => setCurrentView('home')} style={{ cursor: 'pointer' }}>
              <div className="logo-icon-wrapper">
                <TreePine size={32} strokeWidth={2.2} />
              </div>
              <div className="brand-titles">
                <h1>G.K. Saw Mill Calculator</h1>
                <p>Industrial Timber Volume & Invoicing Suite</p>
              </div>
            </div>

            <div className="status-badges">
              {currentView === 'home' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentView('vatta-invoice')}
                    style={{
                      background: '#1e3a2b',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      color: '#ffffff',
                      padding: '0.42rem 0.9rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                    }}
                  >
                    <Calculator size={14} />
                    Vatta Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('vatta-measurement')}
                    style={{
                      background: '#2d6a4f',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      color: '#ffffff',
                      padding: '0.42rem 0.9rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                    }}
                  >
                    <Layers size={14} />
                    Vatta Measurement
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('invoice-generator')}
                    style={{
                      background: '#1e3a2b',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      color: '#ffffff',
                      padding: '0.42rem 0.9rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                    }}
                  >
                    <Receipt size={14} />
                    Invoice Generator
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('size-chart')}
                    style={{
                      background: '#d4a373',
                      border: 'none',
                      color: '#1e3a2b',
                      padding: '0.42rem 0.9rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                    }}
                  >
                    <Sparkles size={14} />
                    Size Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('kerala-vat')}
                    style={{
                      background: '#1e3a2b',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      color: '#ffffff',
                      padding: '0.42rem 0.9rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                    }}
                  >
                    <FileText size={14} />
                    Kerala VAT Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('credit-note')}
                    style={{
                      background: '#1e3a2b',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      color: '#ffffff',
                      padding: '0.42rem 0.9rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                    }}
                  >
                    <FileText size={14} />
                    Credit Note
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentView('home')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      color: '#ffffff',
                      padding: '0.42rem 0.9rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    &larr; Back to Dashboard
                  </button>
                  {currentView !== 'vatta-invoice' && (
                    <button
                      type="button"
                      onClick={() => setCurrentView('vatta-invoice')}
                      style={{
                        background: '#ffffff',
                        border: 'none',
                        color: '#1e3a2b',
                        padding: '0.42rem 0.9rem',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Calculator size={14} />
                      Vatta Invoice
                    </button>
                  )}
                  {currentView !== 'credit-note' && (
                    <button
                      type="button"
                      onClick={() => setCurrentView('credit-note')}
                      style={{
                        background: '#ffffff',
                        border: 'none',
                        color: '#1e3a2b',
                        padding: '0.42rem 0.9rem',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <FileText size={14} />
                      Credit Note
                    </button>
                  )}
                  {currentView !== 'vatta-measurement' && (
                    <button
                      type="button"
                      onClick={() => setCurrentView('vatta-measurement')}
                      style={{
                        background: '#2d6a4f',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        color: '#ffffff',
                        padding: '0.42rem 0.9rem',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Layers size={14} />
                      Vatta Sheet
                    </button>
                  )}
                  {currentView !== 'invoice-generator' && (
                    <button
                      type="button"
                      onClick={() => setCurrentView('invoice-generator')}
                      style={{
                        background: '#ffffff',
                        border: 'none',
                        color: '#1e3a2b',
                        padding: '0.42rem 0.9rem',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Receipt size={14} />
                      Invoice
                    </button>
                  )}
                  {currentView !== 'size-chart' && (
                    <button
                      type="button"
                      onClick={() => setCurrentView('size-chart')}
                      style={{
                        background: '#d4a373',
                        border: 'none',
                        color: '#1e3a2b',
                        padding: '0.42rem 0.9rem',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Sparkles size={14} />
                      Size Chart
                    </button>
                  )}
                  {currentView !== 'kerala-vat' && (
                    <button
                      type="button"
                      onClick={() => setCurrentView('kerala-vat')}
                      style={{
                        background: '#ffffff',
                        border: 'none',
                        color: '#1e3a2b',
                        padding: '0.42rem 0.9rem',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <FileText size={14} />
                      Kerala VAT
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="badge-pill"
                style={{
                  background: cloudSession ? '#dcfce7' : isSupabaseConfigured ? '#eafbf0' : '#f1f5f9',
                  color: cloudSession ? '#15803d' : isSupabaseConfigured ? '#166534' : '#334155',
                  border: cloudSession ? '1px solid #86efac' : isSupabaseConfigured ? '1.5px solid #22c55e' : '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  boxShadow: isSupabaseConfigured ? '0 1px 4px rgba(34, 197, 94, 0.2)' : 'none'
                }}
              >
                <Cloud size={14} color={isSupabaseConfigured ? '#16a34a' : '#64748b'} />
                {cloudSession
                  ? 'Cloud Active'
                  : isSupabaseConfigured
                  ? 'Supabase Live ⚡'
                  : 'Local Storage Mode'}
              </button>
              <span className="badge-pill status-online">
                <span className="status-dot"></span>
                System Ready
              </span>
              <span className="badge-pill">
                <Smartphone size={14} />
                Mobile & PC
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      {currentView === 'credit-note' ? (
        <main style={{ flex: 1 }}>
          <CreditNoteGenerator
            onBack={() => setCurrentView('home')}
            onOpenVattaInvoice={() => setCurrentView('vatta-invoice')}
            onOpenVattaMeasurement={() => setCurrentView('vatta-measurement')}
          />
        </main>
      ) : currentView === 'vatta-invoice' ? (
        <main style={{ flex: 1 }}>
          <VattaInvoiceGenerator
            onBack={() => setCurrentView('home')}
            onOpenMeasurement={() => setCurrentView('vatta-measurement')}
            onOpenMahoganyInvoice={() => setCurrentView('invoice-generator')}
            onOpenSizeChart={() => setCurrentView('size-chart')}
            onOpenKeralaVat={() => setCurrentView('kerala-vat')}
          />
        </main>
      ) : currentView === 'kerala-vat' ? (
        <main style={{ flex: 1 }}>
          <KeralaVatBillGenerator
            onBack={() => setCurrentView('home')}
            onOpenVatta={() => setCurrentView('vatta-measurement')}
            onOpenInvoice={() => setCurrentView('invoice-generator')}
            onOpenSizeChart={() => setCurrentView('size-chart')}
          />
        </main>
      ) : currentView === 'vatta-measurement' ? (
        <main style={{ flex: 1 }}>
          <VattaMeasurementCalculator
            onBack={() => setCurrentView('home')}
            onOpenInvoice={() => setCurrentView('invoice-generator')}
            onOpenSizeChart={() => setCurrentView('size-chart')}
          />
        </main>
      ) : currentView === 'invoice-generator' ? (
        <main style={{ flex: 1 }}>
          <MahoganyManjiyamInvoiceGenerator
            onBack={() => setCurrentView('home')}
            onOpenSizeChart={() => setCurrentView('size-chart')}
          />
        </main>
      ) : currentView === 'size-chart' ? (
        <main style={{ flex: 1 }}>
          <MahoganyManjiyamChartGenerator
            onBack={() => setCurrentView('home')}
            onOpenInvoice={() => setCurrentView('invoice-generator')}
          />
        </main>
      ) : (
        <main className="main-content">
          {/* Intro Banner */}
          <section className="intro-banner">
            <div className="intro-text">
              <h2>Welcome to G.K. Saw Mill Calculator</h2>
              <p>
                Select any calculator module below. All calculations and records will run quickly and save directly in your browser.
              </p>
            </div>
            <div className="intro-chips">
              <span className="feature-chip">
                <CheckCircle2 size={15} />
                Offline Ready
              </span>
              <span className="feature-chip">
                <CheckCircle2 size={15} />
                GST Invoicing
              </span>
              <span className="feature-chip">
                <CheckCircle2 size={15} />
                CFT & CBM Precision
              </span>
            </div>
          </section>

          {/* Modules Section Header */}
          <div className="section-header">
            <h2>
              <Calculator size={22} color="var(--primary)" />
              Calculator Modules
            </h2>
            <p>Six specialized calculation and documentation tools built for sawmill operations</p>
          </div>

          {/* Modules Grid */}
          <div className="modules-grid">
            {MODULES.map((module) => {
              const Icon = module.icon
              const isCreditNote = module.id === 'credit-note'
              const isVattaInvoice = module.id === 'vatta-invoice'
              const isVat = module.id === 'kerala-vat-bill'
              const isVatta = module.id === 'vatta-measurement'
              const isInvoice = module.id === 'mahogany-manjiyam-invoice'
              const isChart = module.id === 'mahogany-manjiyam-size-chart'
              const isInteractive = isCreditNote || isVattaInvoice || isVat || isVatta || isInvoice || isChart
              const themeColor = isCreditNote ? '#1e3a2b' : isVattaInvoice ? '#1e3a2b' : isVat ? '#1e3a2b' : isVatta ? '#2d6a4f' : isInvoice ? 'var(--primary)' : '#925c38'

              return (
                <div
                  key={module.id}
                  className="module-card"
                  onClick={() => handleCardClick(module)}
                  role="button"
                  tabIndex={0}
                  style={isInteractive ? { borderColor: themeColor, boxShadow: 'var(--shadow-md)' } : {}}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleCardClick(module)
                    }
                  }}
                >
                  <div className="card-top">
                    <div
                      className="card-icon-container"
                      style={
                        isInteractive
                          ? { background: themeColor, color: '#ffffff' }
                          : {}
                      }
                    >
                      <Icon size={24} strokeWidth={2} />
                    </div>
                    <span
                      className="module-index"
                      style={isInteractive ? { background: '#eaf3ed', color: themeColor, fontWeight: 800 } : {}}
                    >
                      {isInteractive ? 'Active Module' : module.number}
                    </span>
                  </div>

                  <div className="card-body">
                    <h3 className="card-title">{module.title}</h3>
                    <div className="card-subtitle">{module.subtitle}</div>
                    <p className="card-description">{module.description}</p>

                    {module.formula && (
                      <div className="card-formula-box">
                        <span className="formula-label">Formula / Standard:</span>
                        <code>{module.formula}</code>
                      </div>
                    )}

                    <ul className="card-feature-list">
                      {module.features.map((feature, idx) => (
                        <li key={idx} className="card-feature-item">
                          <span className="feature-bullet"></span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="card-action-btn"
                      style={
                        isInteractive
                          ? {
                              background: themeColor,
                              color: '#ffffff',
                              borderColor: themeColor
                            }
                          : {}
                      }
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCardClick(module)
                      }}
                    >
                      <span>
                        {isCreditNote
                          ? 'Open Credit Note Generator'
                          : isVattaInvoice
                          ? 'Open Invoice Generator'
                          : isVat
                          ? 'Open VAT Bill Generator'
                          : isVatta
                          ? 'Open Measurement Sheet'
                          : isInvoice
                          ? 'Open Invoice Generator'
                          : isChart
                          ? 'Open Size Chart Generator'
                          : 'View Specifications'}
                      </span>
                      <span
                        className="btn-tag"
                        style={isInteractive ? { background: 'rgba(255, 255, 255, 0.25)', color: '#ffffff' } : {}}
                      >
                        {isCreditNote ? 'Section 34 ⚡' : isVattaInvoice ? 'Form GST-I ⚡' : isVat ? 'Form 8F ⚡' : isVatta ? 'A4 Sheet ⚡' : isInvoice ? 'A4 Invoice ⚡' : isChart ? 'Canva Ready ⚡' : 'Next Step →'}
                      </span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Informational Callout */}
          <div className="info-callout">
            <Info size={22} className="info-icon" />
            <div className="info-content">
              <h3>Industrial Timber Suite Operations</h3>
              <p>
                The sawmill workspace is equipped with specialized tools. Module 1 (Vatta GST Invoice Generator), Module 2 (Vatta Measurement Calculator), Module 3 (Mahogany & Manjiyam Invoice Generator), Module 4 (Mahogany & Manjiyam Size Chart Generator), Module 5 (Kerala VAT Bill Generator), and Module 6 (Credit Note Generator) are fully operational with automated piece totals, unrounded CBM volume calculations, customer & carrier directories, and authentic print-ready A4 PDF exports.
              </p>
            </div>
          </div>
        </main>
      )}

      {/* Module Overview Preview Modal */}
      {activeModal && (
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
          onClick={closeModal}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                border: 'none',
                background: '#f1f5f9',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  background: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  padding: '0.6rem',
                  borderRadius: '10px',
                  display: 'flex'
                }}
              >
                <activeModal.icon size={24} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--wood-accent)'
                  }}
                >
                  {activeModal.number}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {activeModal.title}
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              {activeModal.description}
            </p>

            {activeModal.formula && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.825rem'
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>Formula:</div>
                <code style={{ color: '#0f172a' }}>{activeModal.formula}</code>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Features ready for calculation logic:
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {activeModal.features.map((feat, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                    <CheckCircle2 size={15} color="var(--primary)" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Understood, Proceed to Next Step
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div>
            <div className="footer-brand">G.K. Saw Mill Calculator</div>
            <div className="footer-sub">Built with React + Vite • Optimized for Windows & Android</div>
          </div>
          <div className="footer-sub">
            Phase 1 Completed • Ready for Module Logic Integration
          </div>
        </div>
      </footer>
      {/* Supabase Authentication & Cloud Access Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthChange={setCloudSession}
      />
    </div>
  )
}

export default App
