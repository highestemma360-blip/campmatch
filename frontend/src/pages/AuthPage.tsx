import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CampmatchLogo, CloseXIcon } from '../components/Icons'
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
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
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

    fetch('/api/auth-config', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return null
        return r.json()
      })
      .then((d) => {
        if (!d || cancelled) return
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
                credentials: 'include',
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
              setAuthModalOpen(false)
              authRef.current(d.access_token || d.token)
            } catch {
              setErr('Unable to complete Google sign-in. Check your connection and try again.')
            } finally {
              setLoading(false)
            }
          },
        })
        setGoogleStatus('ready')
      } catch {
        if (!cancelled) setGoogleStatus('unavailable')
      }
    }

    return () => {
      cancelled = true
    }
  }, [])

  // Render Google Sign-In button once the client is ready and the ref exists.
  useEffect(() => {
    if (googleStatus !== 'ready' || !googleButtonRef.current) return
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      logo_alignment: 'left',
      text: 'continue_with',
      width: '100%',
    })
  }, [googleStatus, googleButtonRef.current])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setErr('Please enter your email and password.')
      return
    }
    if (authTab === 'signup' && password !== confirmPw) {
      setErr('Passwords do not match.')
      return
    }
    setErr('')
    setLoading(true)
    try {
      const adminRes = await fetch('/api/admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: email.trim(), password }),
      })
      if (adminRes.ok) {
        const d = await adminRes.json()
        setAuthModalOpen(false)
        onAuth(d.access_token || d.token, true)
        return
      }
      const endpoint = authTab === 'signup' ? '/api/signup' : '/api/login'
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setErr(typeof d.detail === 'string' ? d.detail : 'Authentication failed.')
      } else {
        setAuthModalOpen(false)
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

  // Body scroll lock when modal open
  const lockBodyScroll = useCallback(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
  }, [])

  const unlockBodyScroll = useCallback(() => {
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width = ''
  }, [])

  useEffect(() => {
    if (authModalOpen) {
      lockBodyScroll()
    } else {
      unlockBodyScroll()
    }
    return () => {
      unlockBodyScroll()
    }
  }, [authModalOpen, lockBodyScroll, unlockBodyScroll])

  // Scroll reveal: add .visible to .reveal elements as they enter the viewport.
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -80px 0px' },
    )
    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    }, 100)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  const openAuth = (tab: 'signin' | 'signup') => {
    setAuthTab(tab)
    setEmail('')
    setPassword('')
    setConfirmPw('')
    setShowPw(false)
    setErr('')
    setLoading(false)
    setAuthModalOpen(true)
  }

  const googleEnabled = googleStatus === 'ready'

  return (
    <div className="auth-shell">
      {banner && (
        <div
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'rgba(245, 158, 11, 0.14)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#ffd84d',
            fontSize: 13,
            fontWeight: 700,
            textAlign: 'center',
            overflowWrap: 'break-word',
          }}
        >
          {banner}
        </div>
      )}

      {/* Hero — single brand lockup, no top bar clutter */}
      <section className="hero-section reveal">
        <div className="hero-brand">
          <CampmatchLogo iconSize={26} fontSize={20} gap={10} />
        </div>
        <div className="hero-content">
          <h1 className="display-headline">
            Meet students from{' '}
            <span className="coral-accent">your campus.</span>
          </h1>
          <p className="hero-subtitle subheadline">
            Verified university students in Ghana — for dates, new friends, and study partners.
          </p>
          <div className="hero-ctas">
            {googleEnabled ? (
              <>
                <div className="auth-modal-google-btn-wrapper">
                  <div id="google-btn" ref={googleButtonRef} style={{ width: '100%' }} />
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-full"
                  onClick={() => openAuth('signin')}
                >
                  Sign in with campus email
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={() => openAuth('signup')}
                >
                  Create account
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-full"
                  onClick={() => openAuth('signin')}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
          <div className="scroll-invite" role="button" tabIndex={0} onClick={() => {
            const el = document.querySelector('.connect-section')
            el?.scrollIntoView({ behavior: 'smooth' })
          }}>
            Find your people across Ghana’s campuses →
          </div>
        </div>
      </section>

      {/* Section 1: Three Ways to Connect — editorial list */}
      <section className="section connect-section reveal" id="connect">
        <div className="section-inner">
          <div className="eyebrow">What Campmatch Offers</div>
          <h2 className="section-heading">More than just dating on campus.</h2>
          <p className="subheadline">
            Choose how you want to connect. Every connection starts with a verified student badge.
          </p>
          <div className="connect-list reveal-stagger">
            <div className="connect-item reveal stagger-1">
              <span className="connect-item-number">01</span>
              <h3 className="connect-item-title">Campus Dating</h3>
              <p className="connect-item-desc">
                Meet verified students on your campus or nearby universities for genuine relationships.
              </p>
            </div>
            <div className="connect-item reveal stagger-2">
              <span className="connect-item-number">02</span>
              <h3 className="connect-item-title">New Friends</h3>
              <p className="connect-item-desc">
                Fresh on campus or looking to expand your circle? Connect by hall, faculty, or shared interests.
              </p>
            </div>
            <div className="connect-item reveal stagger-3">
              <span className="connect-item-number">03</span>
              <h3 className="connect-item-title">Study Partners</h3>
              <p className="connect-item-desc">
                Pair up with classmates or students in your course for library sessions, projects, and exam prep.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: How .edu.gh Verification Works */}
      <section className="section reveal">
        <div className="section-inner">
          <div className="eyebrow">Student Verification</div>
          <h2 className="section-heading">Real students. Zero outsiders.</h2>
          <p className="subheadline">
            Campmatch is designed for university students in Ghana. Our student-focused verification helps create a community where students can connect with greater confidence.
          </p>
          <div className="verify-flow reveal-stagger">
            <div className="verify-step reveal stagger-1">
              <div className="verify-step-number">01</div>
              <div className="verify-step-content">
                <h3 className="verify-step-title">Enter your university email</h3>
                <p className="verify-step-desc">
                  Sign up with your institutional email (e.g., student@st.umat.edu.gh, name@ug.edu.gh).
                </p>
              </div>
            </div>
            <div className="verify-step reveal stagger-2">
              <div className="verify-step-number">02</div>
              <div className="verify-step-content">
                <h3 className="verify-step-title">Confirm your verification code</h3>
                <p className="verify-step-desc">
                  Enter the one-time code sent to your university inbox to unlock your verified student badge.
                </p>
              </div>
            </div>
            <div className="verify-step reveal stagger-3">
              <div className="verify-step-number">03</div>
              <div className="verify-step-content">
                <h3 className="verify-step-title">Choose your intent and connect</h3>
                <p className="verify-step-desc">
                  Select Dating, Friends, or Study. Set campus filters and start matching mutually with verified students.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Ghanaian Campuses — typographic strip */}
      <section className="section reveal">
        <div className="section-inner">
          <div className="eyebrow">Supported Campuses</div>
          <h2 className="section-heading">Built for universities across Ghana.</h2>
          <p className="subheadline">
            We support institutional .edu.gh domains from universities and technical colleges nationwide.
          </p>
          <div className="campus-list reveal-stagger">
            <span className="campus-item reveal stagger-1">UG Legon</span>
            <span className="campus-item reveal stagger-2">KNUST</span>
            <span className="campus-item reveal stagger-3">UCC</span>
            <span className="campus-item reveal stagger-4">UMaT</span>
            <span className="campus-item reveal stagger-5">Ashesi</span>
            <span className="campus-item reveal stagger-5">UEW</span>
            <span className="campus-item reveal stagger-5">UDS</span>
            <span className="campus-item reveal stagger-5">Technical Universities</span>
          </div>
          <div className="campus-request reveal">
            Don’t see your .edu.gh domain? Request your campus.
          </div>
        </div>
      </section>

      {/* Section 4: Campus Safety & Privacy */}
      <section className="section reveal">
        <div className="section-inner">
          <div className="eyebrow">Campus Trust &amp; Privacy</div>
          <h2 className="section-heading">Built for campus trust and privacy.</h2>
          <p className="subheadline">
            Your safety and privacy come first. Every feature is designed around the university student experience.
          </p>
          <div className="safety-list reveal-stagger">
            <div className="safety-item reveal stagger-1">
              <div className="safety-item-content">
                <h3 className="safety-item-title">Institutional .edu.gh verification</h3>
                <p className="safety-item-desc">
                  Every profile is tied to an active university email domain — no outsiders.
                </p>
              </div>
            </div>
            <div className="safety-item reveal stagger-2">
              <div className="safety-item-content">
                <h3 className="safety-item-title">Double opt-in chat</h3>
                <p className="safety-item-desc">
                  No unsolicited DMs — messaging only opens when both students match.
                </p>
              </div>
            </div>
            <div className="safety-item reveal stagger-3">
              <div className="safety-item-content">
                <h3 className="safety-item-title">Visibility &amp; controls</h3>
                <p className="safety-item-desc">
                  Filter who sees you by campus or mode, and block or report anyone anytime.
                </p>
              </div>
            </div>
            <div className="safety-item reveal stagger-4">
              <div className="safety-item-content">
                <h3 className="safety-item-title">Meet smart on campus</h3>
                <p className="safety-item-desc">
                  First meetups in busy public campus spots — libraries, student centers, cafés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Bottom CTA */}
      <section className="bottom-cta reveal">
        <div className="bottom-cta-inner reveal">
          <h2 className="bottom-cta-heading">Your next campus connection starts here.</h2>
          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={() => openAuth('signup')}
          >
            Join Campmatch Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer reveal">
        <div className="footer-brand">
          <CampmatchLogo iconSize={24} fontSize={17} gap={6} />
        </div>
        <div className="footer-links">
          <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setAuthModalOpen(false); }}>
            How It Works
          </a>
          <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setAuthModalOpen(false); }}>
            Safety
          </a>
          <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setAuthModalOpen(false); }}>
            Supported Campuses
          </a>
          <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setLegalModal('privacy'); }}>
            Privacy Policy
          </a>
          <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setLegalModal('terms'); }}>
            Terms of Service
          </a>
          <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); }}>
            Support
          </a>
        </div>
        <div className="footer-copy">
          © {new Date().getFullYear()} Campmatch. Built for university students in Ghana.
        </div>
      </footer>

      {/* Auth Modal */}
      {authModalOpen && (
        <div className="auth-modal-backdrop" onClick={() => setAuthModalOpen(false)}>
          <div
            className="auth-modal-body"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: `calc(24px + env(safe-area-inset-bottom, 0px))` }}
          >
            <button
              type="button"
              className="auth-modal-close"
              onClick={() => setAuthModalOpen(false)}
              aria-label="Close"
            >
              <CloseXIcon size={24} />
            </button>

            <div className="auth-modal-tabs">
              <button
                type="button"
                className={`auth-tab-btn ${authTab === 'signin' ? 'active' : ''}`}
                onClick={() => setAuthTab('signin')}
                aria-pressed={authTab === 'signin'}
              >
                Sign in
              </button>
              {!googleEnabled && (
                <button
                  type="button"
                  className={`auth-tab-btn ${authTab === 'signup' ? 'active' : ''}`}
                  onClick={() => setAuthTab('signup')}
                  aria-pressed={authTab === 'signup'}
                >
                  Create account
                </button>
              )}
            </div>

            <div className="auth-modal-header">
              <h2 className="auth-modal-title">
                {authTab === 'signup' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="auth-modal-subtitle">
                {authTab === 'signup'
                  ? 'Join your verified campus community.'
                  : 'Sign in to your Campmatch account.'}
              </p>
            </div>

            {err && (
              <div className="auth-modal-err" role="alert">
                {err}
              </div>
            )}

            {maintenance && (
              <div style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(245, 158, 11, 0.14)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#ffd84d',
                fontSize: 12.5,
                fontWeight: 700,
                textAlign: 'center',
              }}
              >
                Scheduled maintenance is active. Existing students can still sign in.
              </div>
            )}

            <form onSubmit={submit} className="auth-modal-form">
              <div className="auth-modal-google-btn-wrapper">
                {googleEnabled && (
                  <div id="google-btn" ref={googleButtonRef} style={{ width: '100%' }} />
                )}
              </div>

              {googleEnabled ? (
                <div className="auth-modal-or-divider">
                  <div />
                  <span>Or continue with email</span>
                  <div />
                </div>
              ) : null}

              <label className="auth-modal-field-label">Student Email</label>
              <input
                type="email"
                className="auth-modal-input"
                placeholder="name@ug.edu.gh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <label className="auth-modal-field-label">Password</label>
              <div className="auth-modal-pw-wrapper">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="auth-modal-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={authTab === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  className="auth-modal-pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>

              {authTab === 'signup' && (
                <>
                  <label className="auth-modal-field-label">Confirm Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="auth-modal-input"
                    placeholder="••••••••"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </>
              )}

              <button
                type="submit"
                className="auth-modal-btn"
                disabled={loading}
              >
                {loading ? 'Signing in…' : authTab === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <div className="auth-modal-domain-hint">
              Accepted domains include {domainHint}. Verification is required for all student accounts.
            </div>

            <div className="auth-modal-footer-note">
              By continuing, you agree to our{' '}
              <button
                type="button"
                onClick={() => setLegalModal('terms')}
                style={{ border: 'none', background: 'none', color: '#ff4f5e', fontWeight: 800, padding: 0, cursor: 'pointer', fontSize: 'inherit' }}
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => setLegalModal('privacy')}
                style={{ border: 'none', background: 'none', color: '#ff4f5e', fontWeight: 800, padding: 0, cursor: 'pointer', fontSize: 'inherit' }}
              >
                Privacy Policy
              </button>
              .
            </div>
          </div>
        </div>
      )}

      {legalModal && (
        <div className="auth-modal-backdrop" onClick={() => setLegalModal(null)}>
          <div
            className="auth-modal-body"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90dvh', overflowY: 'auto', paddingBottom: `calc(24px + env(safe-area-inset-bottom, 0px))` }}
          >
            <button
              type="button"
              className="auth-modal-close"
              onClick={() => setLegalModal(null)}
              aria-label="Close"
            >
              <CloseXIcon size={24} />
            </button>
            <div className="auth-modal-header">
              <h2 className="auth-modal-title">
                {legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </h2>
            </div>
            <div style={{ whiteSpace: 'pre-line', fontSize: 13.5, lineHeight: 1.6, color: '#c4c5d1', marginTop: 12 }}>
              {legalModal === 'terms' ? TERMS_SUMMARY : PRIVACY_SUMMARY}
            </div>
            <button
              type="button"
              className="auth-modal-btn"
              style={{ marginTop: 24 }}
              onClick={() => setLegalModal(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}