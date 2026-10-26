import React, { useState, useEffect } from 'react'
import {
  Calculator,
  Receipt,
  Layers,
  Ruler,
  ArrowRight,
  TreePine,
  FileText,
  FolderArchive,
  Laptop,
  Download,
  X,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react'
import MahoganyManjiyamChartGenerator from './components/MahoganyManjiyamChartGenerator'
import MahoganyManjiyamInvoiceGenerator from './components/MahoganyManjiyamInvoiceGenerator'
import VattaMeasurementCalculator from './components/VattaMeasurementCalculator'
import KeralaVatBillGenerator from './components/KeralaVatBillGenerator'
import VattaInvoiceGenerator from './components/VattaInvoiceGenerator'
import CreditNoteGenerator from './components/CreditNoteGenerator'
import DebitNoteGenerator from './components/DebitNoteGenerator'
import GstMonthlyFilingRegister from './components/GstMonthlyFilingRegister'
import AuthModal from './components/AuthModal'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient'

const MODULES = [
  {
    id: 'vatta-invoice',
    number: 'Module 01',
    title: 'Vatta GST Invoice Generator',
    icon: Calculator,
    themeColor: '#1e3a2b'
  },
  {
    id: 'vatta-measurement',
    number: 'Module 02',
    title: 'Vatta Measurement Calculator',
    icon: Layers,
    themeColor: '#2d6a4f'
  },
  {
    id: 'mahogany-manjiyam-invoice',
    number: 'Module 03',
    title: 'Mahogany & Manjiyam Invoice Generator',
    icon: Receipt,
    themeColor: '#1e3a2b'
  },
  {
    id: 'mahogany-manjiyam-size-chart',
    number: 'Module 04',
    title: 'Mahogany & Manjiyam Size Chart',
    icon: Ruler,
    themeColor: '#925c38'
  },
  {
    id: 'kerala-vat-bill',
    number: 'Module 05',
    title: 'Kerala VAT Bill Generator',
    icon: FileText,
    themeColor: '#1e3a2b'
  },
  {
    id: 'credit-note',
    number: 'Module 06',
    title: 'Credit Note Generator',
    icon: FileText,
    themeColor: '#1e3a2b'
  },
  {
    id: 'debit-note',
    number: 'Module 07',
    title: 'Debit Note Generator',
    icon: FileText,
    themeColor: '#1e3a2b'
  },
  {
    id: 'gst-monthly-filing',
    number: 'Module 08',
    title: 'GST Monthly Invoices & Filing (GSTR-1)',
    icon: FolderArchive,
    themeColor: '#1b4332'
  }
]

function App() {
  const [currentView, setCurrentView] = useState('home')
  const [docToLoad, setDocToLoad] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [cloudSession, setCloudSession] = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isAppInstalled, setIsAppInstalled] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('gk_sawmill_theme') || 'light'
    } catch {
      return 'light'
    }
  })

  // Listen for PWA beforeinstallprompt event for laptop / desktop installation
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsAppInstalled(true)
    }

    const handlePrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleInstalled = () => {
      setIsAppInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setIsAppInstalled(true)
      }
      setDeferredPrompt(null)
    } else {
      setShowInstallModal(true)
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('gk_sawmill_theme', theme)
    } catch {}
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

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
    setDocToLoad(null)
    if (mod.id === 'gst-monthly-filing') {
      setCurrentView('gst-monthly-filing')
    } else if (mod.id === 'debit-note') {
      setCurrentView('debit-note')
    } else if (mod.id === 'credit-note') {
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
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="brand-section">
            <div
              className="brand-logo-title"
              onClick={() => setCurrentView('home')}
              style={{ cursor: 'pointer' }}
            >
              <div className="logo-icon-wrapper" style={{ padding: 0, overflow: 'hidden', background: 'transparent' }}>
                <img
                  src="/logo.svg"
                  alt="G.K. Sawmill Logo"
                  style={{ width: '32px', height: '32px', display: 'block', borderRadius: '7px' }}
                />
              </div>
              <div className="brand-titles">
                <h1>G.K. SAWMILL</h1>
              </div>
            </div>

            <div className="header-right-actions">
              {!isAppInstalled && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="back-nav-btn install-app-btn"
                  title="Install G.K. Sawmill as a native desktop app on your laptop"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'rgba(212, 163, 115, 0.18)',
                    color: '#f6f2ea',
                    border: '1px solid rgba(212, 163, 115, 0.45)',
                    fontWeight: 700
                  }}
                >
                  <Laptop size={14} color="#d4a373" />
                  <span>Install on Laptop</span>
                </button>
              )}
              {currentView !== 'gst-monthly-filing' && (
                <button
                  type="button"
                  onClick={() => {
                    setDocToLoad(null)
                    setCurrentView('gst-monthly-filing')
                  }}
                  className="back-nav-btn"
                  title="Open Monthly Invoices & GSTR-1 Filing Register"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <FolderArchive size={14} />
                  <span>GST Filing Folder</span>
                </button>
              )}
              {currentView !== 'home' && (
                <button
                  type="button"
                  onClick={() => setCurrentView('home')}
                  className="back-nav-btn"
                >
                  &larr; Back to Dashboard
                </button>
              )}
              <div
                className="server-signal"
                title={
                  cloudSession
                    ? 'Server Live • Supabase Cloud Active'
                    : isSupabaseConfigured
                    ? 'Server Live • Supabase Connected'
                    : 'Server Live (System Online)'
                }
                onClick={() => setAuthModalOpen(true)}
              >
                <span className="live-green-dot" />
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-toggle-btn"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Dark and Light Mode"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      {currentView === 'gst-monthly-filing' ? (
        <main style={{ flex: 1 }}>
          <GstMonthlyFilingRegister
            onBack={() => setCurrentView('home')}
            onOpenVattaInvoice={(rec) => {
              setDocToLoad(rec)
              setCurrentView('vatta-invoice')
            }}
            onOpenTimberInvoice={(rec) => {
              setDocToLoad(rec)
              setCurrentView('invoice-generator')
            }}
            onOpenCreditNote={(rec) => {
              setDocToLoad(rec)
              setCurrentView('credit-note')
            }}
            onOpenDebitNote={(rec) => {
              setDocToLoad(rec)
              setCurrentView('debit-note')
            }}
            onOpenKeralaVat={(rec) => {
              setDocToLoad(rec)
              setCurrentView('kerala-vat')
            }}
          />
        </main>
      ) : currentView === 'debit-note' ? (
        <main style={{ flex: 1 }}>
          <DebitNoteGenerator
            initialRecord={docToLoad}
            onBack={() => setCurrentView('home')}
            onOpenVattaInvoice={() => setCurrentView('vatta-invoice')}
            onOpenCreditNote={() => setCurrentView('credit-note')}
          />
        </main>
      ) : currentView === 'credit-note' ? (
        <main style={{ flex: 1 }}>
          <CreditNoteGenerator
            initialRecord={docToLoad}
            onBack={() => setCurrentView('home')}
            onOpenVattaInvoice={() => setCurrentView('vatta-invoice')}
            onOpenVattaMeasurement={() => setCurrentView('vatta-measurement')}
          />
        </main>
      ) : currentView === 'vatta-invoice' ? (
        <main style={{ flex: 1 }}>
          <VattaInvoiceGenerator
            initialRecord={docToLoad}
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
            initialRecord={docToLoad}
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
            initialRecord={docToLoad}
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
          {/* Square Modules Grid */}
          <div className="modules-grid square-grid">
            {MODULES.map((module) => {
              const Icon = module.icon
              return (
                <div
                  key={module.id}
                  className="square-module-card"
                  style={{ '--card-accent': module.themeColor }}
                  onClick={() => handleCardClick(module)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleCardClick(module)
                    }
                  }}
                >
                  <div className="square-card-top">
                    <span className="square-card-badge">{module.number}</span>
                  </div>

                  <div
                    className="square-card-icon"
                    style={{ background: module.themeColor }}
                  >
                    <Icon size={24} strokeWidth={2.2} />
                  </div>

                  <h3 className="square-card-title">{module.title}</h3>

                  <div className="square-card-action">
                    <span className="square-open-btn">
                      Open <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      )}

      {/* PWA Laptop Installation Guide Modal */}
      {showInstallModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowInstallModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--card-border, #e6dfd5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img
                  src="/logo.svg"
                  alt="G.K. Sawmill"
                  style={{ width: '42px', height: '42px', borderRadius: '10px' }}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Install G.K. Sawmill on Laptop
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Native desktop experience with desktop shortcut &amp; taskbar icon
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '0.2rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.86rem', lineHeight: 1.5 }}>
              <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--tag-bg)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Laptop size={16} /> Method 1: Browser Address Bar (Instant)
                </div>
                <div>
                  Look at the <strong>right side of your browser URL bar</strong> in Chrome or Edge. Click the <strong>Install G.K. Sawmill (icon with down arrow or computer)</strong> to install immediately.
                </div>
              </div>

              <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--tag-bg)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 800, color: 'var(--wood-accent)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Download size={16} /> Method 2: Browser Menu
                </div>
                <div>
                  1. Click the <strong>three dots (&vellip;)</strong> in top-right of Chrome or Edge.<br />
                  2. Select <strong>"Save and share"</strong> or <strong>"Apps"</strong>.<br />
                  3. Click <strong>"Install G.K. Sawmill"</strong>.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>
                <CheckCircle2 size={16} />
                <span>Runs standalone like an installed Windows software without browser tabs!</span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

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
