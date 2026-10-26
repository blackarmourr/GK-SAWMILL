import React, { useState, useEffect } from 'react'
import {
  Lock,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  LogOut,
  Cloud,
  CloudOff,
  UserCheck
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

export default function AuthModal({ isOpen, onClose, onAuthChange }) {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup'
  const [pinging, setPinging] = useState(false)
  const [pingResult, setPingResult] = useState(null)

  const handleTestPing = async () => {
    if (!isSupabaseConfigured || !supabase) return
    setPinging(true)
    setPingResult(null)
    try {
      const tables = [
        { name: 'vatta_invoices', label: 'Vatta Invoices' },
        { name: 'credit_notes', label: 'Credit Notes' },
        { name: 'debit_notes', label: 'Debit Notes' },
        { name: 'timber_invoices', label: 'Timber Invoices' },
        { name: 'kerala_vat_bills', label: 'Kerala VAT Bills' },
        { name: 'vatta_measurement_sheets', label: 'Measurement Sheets' },
        { name: 'business_parties', label: 'Parties Directory' }
      ]

      const checks = await Promise.all(
        tables.map(t => supabase.from(t.name).select('*', { count: 'exact', head: true }))
      )

      const missing = []
      const active = []

      checks.forEach((res, i) => {
        if (res.error) {
          missing.push(tables[i].label)
        } else {
          active.push(tables[i].label)
        }
      })

      if (missing.length === 0) {
        setPingResult({
          success: true,
          message: '✓ All 7 Sawmill Database Tables are Live, Connected & Verified!'
        })
      } else {
        setPingResult({
          success: false,
          message: `Active (${active.length}/7): ${active.join(', ')}. Need SQL setup in Supabase (${missing.length}): ${missing.join(', ')}. Run the updated schema.sql in Supabase SQL editor.`
        })
      }
    } catch (err) {
      setPingResult({
        success: false,
        message: `Connection error: ${err.message || 'Failed to ping Supabase'}`
      })
    } finally {
      setPinging(false)
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (onAuthChange) onAuthChange(session)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (onAuthChange) onAuthChange(session)
    })

    return () => subscription.unsubscribe()
  }, [onAuthChange])

  if (!isOpen) return null

  const handleSignIn = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.')
      return
    }

    setLoading(true)
    try {
      if (authMode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        })
        if (error) throw error
        setSession(data.session)
        setSuccessMsg('Successfully signed in to Supabase Cloud!')
        setTimeout(() => {
          onClose()
        }, 1200)
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim()
        })
        if (error) throw error
        if (data.session) {
          setSession(data.session)
          setSuccessMsg('Account created and signed in successfully!')
          setTimeout(() => {
            onClose()
          }, 1200)
        } else {
          setSuccessMsg('Confirmation email sent! Please check your inbox.')
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      if (supabase) {
        await supabase.auth.signOut()
      }
      setSession(null)
      setSuccessMsg('Signed out of cloud session. Running in local mode.')
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to sign out.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '16px',
          maxWidth: '460px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color, #e2e8f0)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a2b 0%, #2d6a4f 100%)',
            color: '#ffffff',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Lock size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                Supabase Cloud Access
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.85 }}>
                Multi-Device Sync & Remote Document Storage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {!isSupabaseConfigured ? (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '1rem',
                fontSize: '0.85rem',
                color: '#92400e',
                display: 'flex',
                gap: '0.75rem'
              }}
            >
              <CloudOff size={24} style={{ flexShrink: 0, color: '#d97706' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Supabase Key Not Detected
                </strong>
                The application is operating in <strong>Secure Local Mode</strong>. All invoices, credit notes, and party profiles are securely preserved in this browser’s local storage.
                <div style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}>
                  To enable multi-device sync, provide <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in your environment.
                </div>
              </div>
            </div>
          ) : session ? (
            <div>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem'
                  }}
                >
                  <UserCheck size={26} />
                </div>
                <h4 style={{ margin: '0 0 0.25rem', color: '#166534', fontSize: '1rem' }}>
                  Authenticated & Synced
                </h4>
                <div style={{ fontSize: '0.85rem', color: '#15803d', wordBreak: 'break-all' }}>
                  {session.user?.email}
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'var(--card-bg, #ffffff)',
                    border: '1px solid #86efac',
                    borderRadius: '9999px',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    color: '#15803d',
                    fontWeight: 700,
                    marginTop: '0.75rem'
                  }}
                >
                  <Cloud size={13} />
                  Cloud Storage Active
                </div>
              </div>

              {successMsg && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: '#166534',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <CheckCircle2 size={16} />
                  {successMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--tag-bg, #f8fafc)',
                    color: 'var(--text-secondary, #475569)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <LogOut size={16} />
                  {loading ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: '#166534' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    Supabase Project Connected
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '0.15rem' }}>
                    njeohgetjjyvblwnttqv.supabase.co
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={pinging}
                  style={{
                    background: 'var(--card-bg, #ffffff)',
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#15803d',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  {pinging ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {pingResult && (
                <div
                  style={{
                    background: pingResult.success ? '#f0fdf4' : '#fef2f2',
                    border: pingResult.success ? '1px solid #86efac' : '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: pingResult.success ? '#166534' : '#991b1b',
                    marginBottom: '1rem'
                  }}
                >
                  {pingResult.message}
                </div>
              )}

              <form onSubmit={handleSignIn}>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.35rem'
                  }}
                >
                  Sawmill Account Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
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
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@gksawmill.com"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.35rem'
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound
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
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {errorMsg && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: '#dc2626',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <AlertCircle size={16} />
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: '#166534',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <CheckCircle2 size={16} />
                  {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#1e3a2b',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 10px rgba(30, 58, 43, 0.25)'
                }}
              >
                <Lock size={16} />
                {loading
                  ? 'Authenticating...'
                  : authMode === 'signin'
                  ? 'Sign In to Supabase'
                  : 'Create Business Account'}
              </button>

              <div
                style={{
                  marginTop: '1rem',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: '#64748b'
                }}
              >
                {authMode === 'signin' ? (
                  <span>
                    Need to set up a new sawmill user?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2d6a4f',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Register Account
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2d6a4f',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Sign In
                    </button>
                  </span>
                )}
              </div>
            </form>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
