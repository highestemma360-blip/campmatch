import React, { useState, useEffect, useRef } from 'react'
import { CampmatchLogo, VerifiedBadge, ShieldIcon, CheckIcon, HeartIcon, DownloadIcon, MoonIcon, ArrowLeftIcon } from '../components/Icons'
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
      .then((r) => (r.ok ? r.json() : null))
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
      setErr('Enter your email and password.')
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
        maxWidth: '100vw',
        overflowX: 'hidden',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background:
          'radial-gradient(circle at 18% 18%, rgba(255, 76, 94, 0.3), transparent 40%), radial-gradient(circle at 82% 82%, rgba(255, 170, 0, 0.2), transparent 40%), #0a0a0f',
        padding: 'calc(16px + env(safe-area-inset-top, 0px)) 16px calc(40px + env(safe-area-inset-bottom, 0px))',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
        touchAction: 'manipulation',
      }}
    >
      {banner && (
        <div
          style={{
            width: '100%',
            maxWidth: 1000,
            marginBottom: 20,
            padding: '10px 16px',
            borderRadius: 12,
            background: 'rgba(245, 158, 11, 0.14)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#ffd84d',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'center',
            overflowWrap: 'break-word',
          }}
        >
          {banner}
        </div>
      )}

      <div
        className="auth-grid stagger-child"
        style={{
          width: '100%',
          maxWidth: 440,
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
          padding: '0 12px',
          overflowWrap: 'break-word',
        }}
      >
        <div className="hero-glow" />
        <div className="auth-hero-copy text-reveal" style={{ color: '#fff', padding: '8px 4px', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 24 }}>
            <CampmatchLogo iconSize={44} fontSize={34} gap={12} />
            {install.canPrompt && (
              <button
                onClick={() => install.install()}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: 50,
                  border: 'none',
                  background: 'linear-gradient(135deg, #FF4F5E 0%, #FFA800 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 900,
                  letterSpacing: '-0.5px',
                  boxShadow: '0 8px 24px rgba(255, 170, 0, 0.35)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <div style={{ color: '#fff', fontSize: 18 }}>
                  <DownloadIcon size={18} />
                </div>
                <span style={{ fontWeight: 900 }}>Install App</span>
              </button>
            )}
          </div>

          <span style={{ display: 'block', animationDelay: '0.05s', fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', overflowWrap: 'break-word' }}>
            Meet students from
          </span>
          <span
            style={{
              display: 'block',
              background: 'linear-gradient(90deg, #FF4F5E, #FF7534, #FFA800)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animationDelay: '0.12s',
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '-0.5px',
              overflowWrap: 'break-word',
            }}
          >
            your campus.
          </span>

          <p
            style={{
              color: '#9ba6bc',
              fontSize: 16,
              lineHeight: 1.7,
              margin: '18px 0 24px',
              width: '100%',
              overflowWrap: 'break-word',
              animationDelay: '0.19s',
            }}
          >
            Campmatch is where verified university students in Ghana connect — for dates, new
            friends, and study partners.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              'Verified students only — no fakes',
              'Dates, BFFs and study partners',
              'Private, safe and on your campus',
            ].map((line, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 15,
                  color: '#e8ecf4',
                  width: '100%',
                  overflowWrap: 'break-word',
                  animationDelay: `${0.26 + i * 0.08}s`,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'rgba(34,197,94,0.16)',
                    color: '#22c55e',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckIcon size={12} />
                </span>
                {line}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.62)',
              animationDelay: '0.52s',
              overflowWrap: 'break-word',
              whiteSpace: 'normal',
            }}
          >
            <VerifiedBadge size={14} />
            {schools.length > 1 ? `${schools.length} universities on board` : 'University students only'}
          </div>
        </div>

        <div
          style={{
            background: '#12151f',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24,
            padding: '24px 20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
            color: '#fff',
            position: 'relative',
            zIndex: 1,
            width: '100%',
          }}
          className="card-hover"
        >
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
                fontWeight: 600,
                overflowWrap: 'break-word',
              }}
            >
              Scheduled maintenance is active. Existing students can still sign in.
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.4px', width: '100%', overflowWrap: 'break-word' }}>
              Continue with Google
            </div>
            <div style={{ fontSize: 14, color: '#8e98ad', marginTop: 6, lineHeight: 1.55, width: '100%', overflowWrap: 'break-word' }}>
              Use your school-issued Google account. Only {domainHint} accounts are accepted.
            </div>
          </div>

          <div id="google-btn" ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />

          {googleStatus === 'unavailable' && (
            <div
              style={{
                marginTop: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                color: '#9fc9e6',
                fontSize: 12.5,
                lineHeight: 1.55,
                textAlign: 'center',
                overflowWrap: 'break-word',
              }}
            >
              Google sign-in is not configured yet. Add a Google OAuth Client ID on the server
              (GOOGLE_CLIENT_ID) and it will appear here automatically.
            </div>
          )}

          {googleStatus === 'ready' && (
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: '#6f7a90',
                textAlign: 'center',
                overflowWrap: 'break-word',
              }}
            >
              <ShieldIcon size={12} /> Non-school Gmail accounts blocked automatically.
            </div>
          )}

          {err && (
            <div
              style={{
                marginTop: 14,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(255, 68, 88, 0.14)',
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

          <button
            type="button"
            onClick={() => {
              setShowEmailForm(v => !v)
              setErr('')
            }}
            style={{
              marginTop: 16,
              width: '100%',
              padding: '10px 16px',
              borderRadius: 16,
              border: 'none',
              background: 'transparent',
              color: '#8e98ad',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {showEmailForm ? 'Hide email sign-in' : 'Use student email & password instead'}
          </button>

          {showEmailForm && (
            <>
              <form onSubmit={submit}>
                <label className="field-label" style={{ color: '#9aa4b8', marginTop: 0, fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Student Email
                </label>
                <input
                  type="email"
                  className="modern-input"
                  style={{ background: '#181c28', color: '#fff', borderColor: 'rgba(255,255,255,0.1)', minHeight: 44 }}
                  placeholder="you@university.edu.gh"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />

                <label className="field-label" style={{ color: '#9aa4b8', marginTop: 16, fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative', minHeight: 44 }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="modern-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{
                      background: '#181c28',
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.1)',
                      paddingRight: 72,
                      minHeight: 44,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      color: '#8e98ad',
                      fontSize: 12,
                      fontWeight: 700,
                      minHeight: 36,
                      minWidth: 36,
                    }}
                  >
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>

                <button className="btn-brand btn-tactile" type="submit" disabled={loading} style={{ marginTop: 18, minHeight: 48 }}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </>
          )}

          <div style={{ marginTop: 22, textAlign: 'center', fontSize: 12, color: '#69748c', lineHeight: 1.5, overflowWrap: 'break-word' }}>
            By continuing, you agree to our{' '}
            <button
              type="button"
              onClick={() => setLegalModal('terms')}
              style={{ border: 'none', background: 'none', color: '#a3adc2', textDecoration: 'underline', padding: 0, fontSize: 12 }}
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => setLegalModal('privacy')}
              style={{ border: 'none', background: 'none', color: '#a3adc2', textDecoration: 'underline', padding: 0, fontSize: 12 }}
            >
              Privacy Policy
            </button>
            .
          </div>
        </div>
      </div>

      {legalModal && (
        <div className="sheet-backdrop" onClick={() => setLegalModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 12, overflowWrap: 'break-word' }}>
              {legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            </div>
            <div style={{ whiteSpace: 'pre-line', fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)', overflowWrap: 'break-word' }}>
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
