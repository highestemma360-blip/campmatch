import React, { useEffect, useState } from 'react'
import { AdminPage } from './AdminPage'
import { CampmatchMark, ShieldIcon } from '../components/Icons'

const ADMIN_TOKEN_KEY = 'campmatch_admin_token'
const ADMIN_NAME_KEY = 'campmatch_admin_name'

export function AdminPortal() {
  const [token, setToken] = useState(localStorage.getItem(ADMIN_TOKEN_KEY) || '')
  const [adminName, setAdminName] = useState(localStorage.getItem(ADMIN_NAME_KEY) || '')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(Boolean(token))
  const [toast, setToast] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    document.title = 'Campmatch Admin'

    if (!token) {
      setChecking(false)
      return
    }

    fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => (r.ok ? r.json() : null))
      .then(me => {
        if (!me || !me.is_admin) {
          signOut()
        }
      })
      .catch(() => {
        // Keep the existing session if the network is briefly unavailable.
      })
      .finally(() => setChecking(false))
  }, [])

  function notify(message: string) {
    setToast(message)
    setTimeout(() => setToast(prev => (prev === message ? '' : prev)), 3200)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) {
      setError('Enter the administrator username and password.')
      return
    }
    setLoading(true)
    try {
      const r = await fetch('/api/admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier.trim(), password }),
      })
      const d = await r.json()
      if (!r.ok) {
        setError(typeof d.detail === 'string' ? d.detail : 'Administrator sign-in failed.')
        return
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, d.token)
      localStorage.setItem(ADMIN_NAME_KEY, d.admin?.name || d.admin?.email || 'Administrator')
      setToken(d.token)
      setAdminName(d.admin?.name || d.admin?.email || 'Administrator')
      setPassword('')
    } catch {
      setError('Unable to reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function signOut() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_NAME_KEY)
    setToken('')
    setAdminName('')
    setPassword('')
    setChecking(false)
  }

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#08090D',
          color: '#94A3B8',
          fontSize: 13.5,
          fontWeight: 600,
        }}
      >
        Verifying administrator session...
      </div>
    )
  }

  if (!token) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 18px',
          background:
            'radial-gradient(circle at 15% 10%, rgba(220, 38, 38, 0.16), transparent 42%), radial-gradient(circle at 85% 90%, rgba(56, 189, 248, 0.12), transparent 42%), #08090D',
        }}
      >
        <div style={{ width: '100%', maxWidth: 430 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <CampmatchMark size={54} />
          </div>

          <div
            style={{
              background: '#111420',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 24,
              padding: '26px 24px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.28)',
                color: '#7DD3FC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <ShieldIcon size={22} />
            </div>

            <div style={{ color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: '-0.4px' }}>
              Administrator Portal
            </div>

            <form onSubmit={submit} style={{ marginTop: 20 }}>
              <label className="field-label" style={{ color: '#9AA4B8', marginTop: 0 }}>
                Username
              </label>
              <input
                className="modern-input"
                style={{ background: '#181C28', color: '#fff', borderColor: 'rgba(255,255,255,0.1)' }}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                autoComplete="username"
                placeholder="admin"
              />

              <label className="field-label" style={{ color: '#9AA4B8' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="modern-input"
                  style={{ background: '#181C28', color: '#fff', borderColor: 'rgba(255,255,255,0.1)', paddingRight: 66 }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter administrator password"
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
                    color: '#8E98AD',
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  {showPw ? 'HIDE' : 'SHOW'}
                </button>
              </div>

              {error && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 13px',
                    borderRadius: 12,
                    background: 'rgba(255, 68, 88, 0.14)',
                    border: '1px solid rgba(255, 68, 88, 0.35)',
                    color: '#FF6B7A',
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              )}

              <button className="btn-brand" type="submit" disabled={loading} style={{ marginTop: 18 }}>
                {loading ? 'Verifying...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: 'var(--bg-app)',
        overflow: 'hidden',
      }}
    >
      {toast && <div className="toast-pill">{toast}</div>}

      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: 'rgba(10, 12, 18, 0.92)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CampmatchMark size={30} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '-0.2px' }}>Campmatch Admin</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Signed in as {adminName || 'Administrator'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a
            href="/"
            className="btn-ghost"
            style={{ padding: '8px 13px', fontSize: 12, textDecoration: 'none' }}
          >
            Student App
          </a>
          <button
            onClick={signOut}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid rgba(255, 68, 88, 0.4)',
              background: 'rgba(255, 68, 88, 0.12)',
              color: '#FF6B7A',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AdminPage token={token} onNotify={notify} />
      </main>
    </div>
  )
}
