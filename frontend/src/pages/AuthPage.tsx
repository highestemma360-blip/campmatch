import React, { useState, useEffect, useRef } from 'react'
import { CampmatchLogo, VerifiedBadge, ShieldIcon } from '../components/Icons'
import { TERMS_SUMMARY, PRIVACY_SUMMARY } from '../constants'

interface AuthPageProps {
  onAuth: (token: string) => void
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
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [umatOnly, setUmatOnly] = useState(true)
  const [schools, setSchools] = useState<string[]>(['UMaT'])
  const [domains, setDomains] = useState<string[]>([])
  const [signupsEnabled, setSignupsEnabled] = useState(true)
  const [maintenance, setMaintenance] = useState(false)
  const [banner, setBanner] = useState('')
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const authRef = useRef(onAuth)
  authRef.current = onAuth

  useEffect(() => {
    let cancelled = false

    fetch('/api/auth-config')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        setUmatOnly(Boolean(d.umat_only))
        if (Array.isArray(d.schools) && d.schools.length) setSchools(d.schools)
        if (Array.isArray(d.domains)) setDomains(d.domains)
        setSignupsEnabled(d.signups_enabled !== false)
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
              authRef.current(d.token)
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
            width: 336,
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
      setErr('Enter your student email and password.')
      return
    }
    setErr('')
    setLoading(true)
    try {
      const r = await fetch('/api/' + mode, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const d = await r.json()
      if (!r.ok) {
        setErr(typeof d.detail === 'string' ? d.detail : 'Authentication failed.')
      } else {
        onAuth(d.token)
      }
    } catch {
      setErr('Unable to reach server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const domainHint = domains.length
    ? domains.map(d => '@' + d.replace(/^@/, '')).slice(0, 3).join(', ')
    : umatOnly
      ? '@st.umat.edu.gh'
      : 'approved university domains'

  return (
    <div
      style={{
        height: '100dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background:
          'radial-gradient(circle at 18% 18%, rgba(255, 76, 94, 0.2), transparent 44%), radial-gradient(circle at 82% 82%, rgba(255, 170, 0, 0.14), transparent 44%), #08090d',
        padding: 'calc(18px + env(safe-area-inset-top, 0px)) 18px calc(24px + env(safe-area-inset-bottom, 0px))',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {banner && (
        <div
          style={{
            maxWidth: 920,
            width: '100%',
            marginBottom: 16,
            padding: '10px 16px',
            borderRadius: 12,
            background: 'rgba(245, 158, 11, 0.14)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#ffd84d',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {banner}
        </div>
      )}

      <div className="auth-grid" style={{ margin: 'auto 0' }}>
        <div className="auth-hero-copy" style={{ color: '#fff', padding: '8px 4px' }}>
          <div style={{ marginBottom: 16 }}>
            <CampmatchLogo iconSize={42} fontSize={34} gap={12} />
          </div>

          <h1
            className="auth-hero-sub"
            style={{
              fontSize: 'clamp(30px, 4.6vw, 46px)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-1.2px',
              margin: '0 0 14px',
            }}
          >
            Meet real students on{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #FF4F5E, #FF7534, #FFA800)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              your campus.
            </span>
          </h1>

          <p
            style={{
              color: '#9ba6bc',
              fontSize: 15,
              lineHeight: 1.55,
              margin: '0 0 16px',
              maxWidth: 420,
            }}
          >
            Sign in with your university Google account. Verified students only — consumer Gmail
            accounts and unapproved domains are declined automatically.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'inherit', gap: 8, marginBottom: 14 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(29, 161, 242, 0.13)',
                border: '1px solid rgba(29, 161, 242, 0.32)',
                fontSize: 12,
                fontWeight: 700,
                color: '#7dd3fc',
              }}
            >
              <VerifiedBadge size={15} /> Verified .edu.gh Access
            </span>
            <span
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(255, 170, 0, 0.11)',
                border: '1px solid rgba(255, 170, 0, 0.28)',
                fontSize: 12,
                fontWeight: 700,
                color: '#ffd84d',
              }}
            >
              Date · BFF · Study
            </span>
          </div>

          <div className="auth-schools-row">
            {schools.slice(0, 8).map(s => (
              <span
                key={s}
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.72)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {s}
              </span>
            ))}
            {schools.length > 8 && (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.72)',
                }}
              >
                +{schools.length - 8} more
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            background: '#12151f',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 26,
            padding: '28px 26px',
            boxShadow: '0 28px 70px rgba(0,0,0,0.65)',
            color: '#fff',
          }}
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
              }}
            >
              Scheduled maintenance is active. Existing students can still sign in.
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: '-0.4px' }}>
              Continue with Google
            </div>
            <div style={{ fontSize: 12.5, color: '#8e98ad', marginTop: 5, lineHeight: 1.5 }}>
              Use your school-issued Google account. Only {domainHint} accounts are accepted.
            </div>
          </div>

          <div id="google-btn" ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />

          {googleStatus === 'unavailable' && (
            <div
              style={{
                marginTop: 8,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                color: '#9fc9e6',
                fontSize: 12.5,
                lineHeight: 1.55,
                textAlign: 'center',
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
                justifyContent: 'center',
                gap: 6,
                fontSize: 11.5,
                color: '#6f7a90',
                textAlign: 'center',
              }}
            >
              <ShieldIcon size={13} /> Non-school Gmail accounts are blocked automatically.
            </div>
          )}

          {err && (
            <div
              style={{
                marginTop: 14,
                padding: '11px 14px',
                borderRadius: 12,
                background: 'rgba(255, 68, 88, 0.14)',
                border: '1px solid rgba(255, 68, 88, 0.35)',
                color: '#ff6b7a',
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.5,
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
              marginTop: 18,
              width: '100%',
              padding: '9px 12px',
              borderRadius: 12,
              border: 'none',
              background: 'transparent',
              color: '#8e98ad',
              fontSize: 12.5,
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  background: '#1b1f2d',
                  padding: 4,
                  borderRadius: 999,
                  margin: '8px 0 20px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setErr('')
                  }}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 999,
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    background: mode === 'login' ? 'var(--brand-grad)' : 'transparent',
                    color: mode === 'login' ? '#fff' : '#8e98ad',
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  disabled={!signupsEnabled}
                  onClick={() => {
                    setMode('signup')
                    setErr('')
                  }}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 999,
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    background: mode === 'signup' ? 'var(--brand-grad)' : 'transparent',
                    color: mode === 'signup' ? '#fff' : '#8e98ad',
                  }}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={submit}>
                <label className="field-label" style={{ color: '#9aa4b8', marginTop: 0 }}>
                  Student Email
                </label>
                <input
                  type="email"
                  className="modern-input"
                  style={{ background: '#181c28', color: '#fff', borderColor: 'rgba(255,255,255,0.1)' }}
                  placeholder={umatOnly ? 'student@st.umat.edu.gh' : 'student@st.umat.edu.gh / @st.ug.edu.gh'}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />

                <label className="field-label" style={{ color: '#9aa4b8' }}>
                  Password {mode === 'signup' && '(8+ characters)'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="modern-input"
                    style={{ background: '#181c28', color: '#fff', borderColor: 'rgba(255,255,255,0.1)', paddingRight: 64 }}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      color: '#8e98ad',
                      fontSize: 11.5,
                      fontWeight: 700,
                    }}
                  >
                    {showPw ? 'HIDE' : 'SHOW'}
                  </button>
                </div>

                <button className="btn-brand" type="submit" disabled={loading} style={{ marginTop: 18 }}>
                  {loading ? 'Signing in...' : mode === 'login' ? 'Sign In' : 'Create Student Account'}
                </button>
              </form>
            </>
          )}

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: '#69748c', lineHeight: 1.5 }}>
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
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 12 }}>
              {legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            </div>
            <div style={{ whiteSpace: 'pre-line', fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {legalModal === 'terms' ? TERMS_SUMMARY : PRIVACY_SUMMARY}
            </div>
            <button className="btn-brand" style={{ marginTop: 20 }} onClick={() => setLegalModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
