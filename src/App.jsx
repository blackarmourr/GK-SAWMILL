import React, { useState, useEffect } from 'react'
import {
  Calculator,
  Receipt,
  Layers,
  Ruler,
  ArrowRight,
  Info,
  TreePine,
  FileText
} from 'lucide-react'
import MahoganyManjiyamChartGenerator from './components/MahoganyManjiyamChartGenerator'
import MahoganyManjiyamInvoiceGenerator from './components/MahoganyManjiyamInvoiceGenerator'
import VattaMeasurementCalculator from './components/VattaMeasurementCalculator'
import KeralaVatBillGenerator from './components/KeralaVatBillGenerator'
import VattaInvoiceGenerator from './components/VattaInvoiceGenerator'
import CreditNoteGenerator from './components/CreditNoteGenerator'
import DebitNoteGenerator from './components/DebitNoteGenerator'
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
  }
]

function App() {
  const [currentView, setCurrentView] = useState('home')
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
    if (mod.id === 'debit-note') {
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
              <div className="logo-icon-wrapper">
                <TreePine size={24} strokeWidth={2.2} />
              </div>
              <div className="brand-titles">
                <h1>G.K. SAWMILL</h1>
              </div>
            </div>

            <div className="header-right-actions">
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      {currentView === 'debit-note' ? (
        <main style={{ flex: 1 }}>
          <DebitNoteGenerator
            onBack={() => setCurrentView('home')}
            onOpenVattaInvoice={() => setCurrentView('vatta-invoice')}
            onOpenCreditNote={() => setCurrentView('credit-note')}
          />
        </main>
      ) : currentView === 'credit-note' ? (
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
          {/* Modules Grid */}
          <div className="modules-grid">
            {MODULES.map((module) => {
              const Icon = module.icon
              return (
                <div
                  key={module.id}
                  className="compact-module-card"
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
                  <div className="compact-card-left">
                    <div
                      className="compact-card-icon"
                      style={{ background: module.themeColor }}
                    >
                      <Icon size={20} strokeWidth={2.2} />
                    </div>
                    <div className="compact-card-details">
                      <span className="compact-card-badge">{module.number}</span>
                      <h3 className="compact-card-title">{module.title}</h3>
                    </div>
                  </div>
                  <div className="compact-card-action">
                    <span className="compact-open-btn">
                      Open <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Informational Callout */}
          <div className="info-callout">
            <Info size={20} className="info-icon" />
            <div className="info-content">
              <h3>Industrial Timber Suite Operations</h3>
              <p>
                The sawmill workspace is equipped with specialized tools: Module 1 (Vatta GST Invoice Generator), Module 2 (Vatta Measurement Calculator), Module 3 (Mahogany & Manjiyam Invoice Generator), Module 4 (Mahogany & Manjiyam Size Chart), Module 5 (Kerala VAT Bill Generator), Module 6 (Credit Note Generator), and Module 7 (Debit Note Generator) with automated piece totals, volume calculations, customer directories, and authentic print-ready A4 PDF exports.
              </p>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">G.K. SAWMILL</div>
          <div className="footer-sub">Industrial Timber & Invoicing Suite</div>
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
