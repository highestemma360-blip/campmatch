import React, { useState, useEffect } from 'react'
import { CampmatchLogo, VerifiedBadge } from '../components/Icons'
import { TERMS_SUMMARY, PRIVACY_SUMMARY } from '../constants'

interface AuthPageProps {
  onAuth: (token: string) => void
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
  const [signupsEnabled, setSignupsEnabled] = useState(true)
  const [maintenance, setMaintenance] = useState(false)
  const [banner, setBanner] = useState('')
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null)

  useEffect(() => {
    fetch('/api/auth-config')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) {
          setUmatOnly(Boolean(d.umat_only))
          if (Array.isArray(d.schools) && d.schools.length) setSchools(d.schools)
          setSignupsEnabled(d.signups_enabled !== false)
          setMaintenance(Boolean(d.maintenance_mode))
          setBanner(d.announcement_banner || '')
        }
      })
      .catch(() => {})

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
    if (!clientId || !window.google) return
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          const r = await fetch('/api/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential }),
          })
          const d = await r.json()
          if (!r.ok) return setErr(d.detail || 'Google sign-in failed.')
          onAuth(d.token)
        },
      })
      const btn = document.getElementById('google-btn')
      if (btn) {
        window.google.accounts.id.renderButton(btn, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          width: 320,
          text: 'continue_with',
        })
      }
    } catch {
      // Ignore GIS script race
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
            Verified university accounts, screened portrait photos, and dedicated Date, BFF, and Study modes.
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
              Scheduled maintenance is active. Administrator sign-in remains available.
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#1b1f2d',
              padding: 4,
              borderRadius: 999,
              marginBottom: 22,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setErr('')
              }}
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                border: 'none',
                fontWeight: 800,
                fontSize: 13.5,
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
                padding: '10px 14px',
                borderRadius: 999,
                border: 'none',
                fontWeight: 800,
                fontSize: 13.5,
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

            {err && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 13px',
                  borderRadius: 12,
                  background: 'rgba(255, 68, 88, 0.14)',
                  border: '1px solid rgba(255, 68, 88, 0.35)',
                  color: '#ff6b7a',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {err}
              </div>
            )}

            <button className="btn-brand" type="submit" disabled={loading} style={{ marginTop: 18 }}>
              {loading ? 'Signing in...' : mode === 'login' ? 'Sign In' : 'Create Student Account'}
            </button>
          </form>

          {Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  margin: '16px 0',
                  color: '#5f697d',
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <span>OR</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>
              <div id="google-btn" style={{ display: 'flex', justifyContent: 'center' }} />
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
