import React, { useState, useEffect, useRef } from 'react'
import { CampmatchLogo, VerifiedBadge, ShieldIcon, CheckIcon, HeartIcon, DownloadIcon, ArrowLeftIcon } from '../components/Icons'
import { TERMS_SUMMARY, PRIVACY_SUMMARY } from '../constants'
import { InstallPrompt } from '../components/InstallPrompt'
import { useInstallPrompt } from '../utils/useInstallPrompt'

interface AuthPageProps {
  onAuth: (token: string | { access_token: string; refresh_token?: string }, isAdmin?: boolean) => void
}

function loadGoogleScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-campmatch-gsi]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google script failed')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.campmatchGsi = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google script failed'))
    document.head.appendChild(script)
  })
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState<string[]>([])
  const [domains, setDomains] = useState<string[]>([])
  const [maintenance, setMaintenance] = useState(false)
  const [banner, setBanner] = useState('')
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const authRef = useRef(onAuth)
  authRef.current = onAuth

  const install = useInstallPrompt({
    enabled: true,
    blocked: false,
    delayMs: 3000,
  })

  useEffect(() => {
    let cancelled = false

    fetch('/api/auth-config')
      .then(async (r) => {
        if (!r.ok) return null
        return r.json()
      })
      .then((d) => {
        if (!d) return
        if (Array.isArray(d.schools) && d.schools.length) setSchools(d.schools)
        if (Array.isArray(d.domains)) setDomains(d.domains)
        setMaintenance(Boolean(d.maintenance_mode))
        setBanner(d.announcement_banner || '')

        const clientId =
          (d.google_client_id as string) || (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || ''
        setGoogleClientId(clientId)
        if (!clientId) {
          setGoogleStatus('unavailable')
          return
        }
        initGoogle(clientId)
      })
      .catch(() => setGoogleStatus('unavailable'))

    async function initGoogle(clientId: string) {
      setGoogleStatus('loading')
      try {
        await loadGoogleScript()
        if (cancelled) return
        if (!window.google?.accounts?.id) {
          setGoogleStatus('unavailable')
          return
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: async (response: any) => {
            setErr('')
            setLoading(true)
            try {
              const r = await fetch('/api/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
              })
              const d = await r.json().catch(() => ({}))
              if (!r.ok) {
                setErr(
                  typeof d.detail === 'string'
                    ? d.detail
                    : 'This Google account is not approved. Use your university-issued Google account.'
                )
                return
              }
              authRef.current(d.access_token || d.token)
            } catch {
              setErr('Unable to complete Google sign-in. Check your connection and try again.')
            } finally {
              setLoading(false)
            }
          },
        })

        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            logo_alignment: 'left',
            text: 'continue_with',
            width: '100%',
          })
        }
        setGoogleStatus('ready')
      } catch {
        if (!cancelled) setGoogleStatus('unavailable')
      }
    }

    return () => {
      cancelled = true
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setErr('Please enter your email and password.')
      return
    }
    setErr('')
    setLoading(true)
    try {
      const adminRes = await fetch('/api/admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email.trim(), password }),
      })
      if (adminRes.ok) {
        const d = await adminRes.json()
        onAuth(d.access_token || d.token, true)
        return
      }
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const d = await r.json()
      if (!r.ok) {
        setErr(typeof d.detail === 'string' ? d.detail : 'Authentication failed.')
      } else {
        onAuth(d.access_token || d.token)
      }
    } catch {
      setErr('Unable to reach server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const domainHint = domains.length
    ? domains.map((d) => '@' + d.replace(/^@/, '')).slice(0, 3).join(', ')
    : 'approved university domains'

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        height: '100%',
        overflowX: 'hidden',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background:
          'radial-gradient(circle at 20% 20%, rgba(255, 79, 94, 0.18), transparent 42%), radial-gradient(circle at 80% 80%, rgba(255, 170, 0, 0.12), transparent 42%), #0a0b0f',
        padding:
          'calc(16px + env(safe-area-inset-top, 0px)) 16px calc(24px + env(safe-area-inset-bottom, 0px))',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
        touchAction: 'manipulation',
      }}
    >
      {banner && (
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            marginBottom: 14,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(245, 158, 11, 0.14)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#ffd84d',
            fontSize: 12.5,
            fontWeight: 700,
            textAlign: 'center',
            overflowWrap: 'break-word',
          }}
        >
          {banner}
        </div>
      )}

      {/* Hero Section — Mobile First */}
      <div className="hero-section">
        <div className="hero-brand">
          <CampmatchLogo iconSize={48} fontSize={36} gap={14} />
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            Meet students from{' '}
            <span className="gradient-text">your campus.</span>
          </h1>
          <p className="hero-subtitle">
            Verified university students in Ghana — for dates, new friends, and study partners.
          </p>

          <div className="social-proof">
            <VerifiedBadge size={16} />
            <span>{schools.length > 1 ? `${schools.length} universities` : 'Verified students only'}</span>
          </div>
        </div>
      </div>

      {/* Sign-In Card */}
      <div className="signin-card">
        {maintenance && (
          <div
            style={{
              marginBottom: 16,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.14)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#ffd84d',
              fontSize: 12.5,
              fontWeight: 700,
              overflowWrap: 'break-word',
            }}
          >
            Scheduled maintenance is active. Existing students can still sign in.
          </div>
        )}

        <div className="form-header">
          <h2 className="form-title">Sign in</h2>
          <p className="form-subtitle">Join your campus community</p>
        </div>

        {/* Primary CTA — Continue with Google */}
        <div className="google-btn-wrapper">
          <div id="google-btn" ref={googleButtonRef} style={{ width: '100%' }} />
        </div>

        {googleStatus === 'ready' && (
          <div style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12.5,
            color: '#64748b',
            overflowWrap: 'break-word',
          }}
          >
            <ShieldIcon size={14} /> Non-school Gmail accounts blocked automatically.
          </div>
        )}

        {googleStatus === 'unavailable' && (
          <div style={{
            marginTop: 14,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#7dd3fc',
            fontSize: 12.5,
            lineHeight: 1.55,
            textAlign: 'center',
            overflowWrap: 'break-word',
          }}
          >
            Google sign-in is not configured yet. Add a GOOGLE_CLIENT_ID on the server and it will appear here automatically.
          </div>
        )}

        {err && (
          <div
            role="alert"
            style={{
              marginTop: 14,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255, 68, 88, 0.12)',
              border: '1px solid rgba(255, 68, 88, 0.35)',
              color: '#ff6b7a',
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.5,
              overflowWrap: 'break-word',
            }}
          >
            {err}
          </div>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 6px' }}>
          <div style={{ flex: 1, borderTop: '1px solid rgba(17, 20, 29, 0.12)' }} />
          <span style={{
            fontSize: 12,
            fontWeight: 800,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
          >
            Or continue with email
          </span>
          <div style={{ flex: 1, borderTop: '1px solid rgba(17, 20, 29, 0.12)' }} />
        </div>

        {/* Email sign-in toggle */}
        <button
          type="button"
          onClick={() => {
            setShowEmailForm(v => !v)
            setErr('')
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 16,
            border: 'none',
            background: 'transparent',
            color: '#64748b',
            fontSize: 15,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minHeight: 48,
          }}
          aria-expanded={showEmailForm}
          aria-controls="email-signin-form"
        >
          {showEmailForm ? 'Hide email sign-in' : 'Use student email & password instead'}
        </button>

        {showEmailForm && (
          <form onSubmit={submit} id="email-signin-form" style={{ marginTop: 18 }}>
            <label className="field-label">Student Email</label>
            <input
              type="email"
              className="modern-input"
              style={{
                background: '#f3f5fa',
                color: '#11141d',
                borderColor: 'rgba(17, 20, 29, 0.12)',
                minHeight: 48,
                fontSize: 16,
              }}
              placeholder="you@university.edu.gh"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <label className="field-label">Password</label>
            <div style={{ position: 'relative', minHeight: 48 }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="modern-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  background: '#f3f5fa',
                  color: '#11141d',
                  borderColor: 'rgba(17, 20, 29, 0.12)',
                  paddingRight: 72,
                  minHeight: 48,
                  fontSize: 16,
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  color: '#94a3b8',
                  fontSize: 13,
                  fontWeight: 800,
                  minHeight: 40,
                  minWidth: 40,
                }}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>

            <button className="btn-brand btn-tactile" type="submit" disabled={loading} style={{ marginTop: 22, minHeight: 48, width: '100%' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          )}

          <div style={{ marginTop: 22, textAlign: 'center', fontSize: 12, color: '#94a3b8', lineHeight: 1.5, overflowWrap: 'break-word' }}>
            By continuing, you agree to our{' '}
            <button
              type="button"
              onClick={() => setLegalModal('terms')}
              style={{ border: 'none', background: 'none', color: '#ff4f5e', textDecoration: 'underline', padding: 0, fontSize: 12, fontWeight: 800 }}
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => setLegalModal('privacy')}
              style={{ border: 'none', background: 'none', color: '#ff4f5e', textDecoration: 'underline', padding: 0, fontSize: 12, fontWeight: 800 }}
            >
              Privacy Policy
            </button>
            {'.'}
          </div>
        </div>

      {legalModal && (
        <div className="sheet-backdrop" onClick={() => setLegalModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 19, fontWeight: 900, marginBottom: 12, overflowWrap: 'break-word', color: '#11141d' }}>
              {legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            </div>
            <div style={{ whiteSpace: 'pre-line', fontSize: 13.5, lineHeight: 1.6, color: '#64748b', overflowWrap: 'break-word' }}>
              {legalModal === 'terms' ? TERMS_SUMMARY : PRIVACY_SUMMARY}
            </div>
            <button className="btn-brand" style={{ marginTop: 20, minHeight: 44 }} onClick={() => setLegalModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {install.visible && (
        <InstallPrompt
          platform={install.platform}
          canPrompt={install.canPrompt}
          onInstall={install.install}
          onClose={install.close}
          nextReminderSeconds={install.nextReminderSeconds}
        />
      )}
    </div>
  )
}