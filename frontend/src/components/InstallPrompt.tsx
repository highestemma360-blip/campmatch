import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { isIOSNonSafari, type InstallPlatform } from '../utils/pwa'

interface InstallPromptProps {
  platform: InstallPlatform
  canPrompt: boolean
  onInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  onClose: () => void
}

function ShareIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v11" />
      <path d="M8.5 6.5L12 3l3.5 3.5" />
      <path d="M5.5 12.5v6.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-6.5" />
    </svg>
  )
}

function MenuIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="12" cy="19" r="1.9" />
    </svg>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
      <span
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(255, 79, 94, 0.14)',
          color: 'var(--tinder-pink)',
          fontSize: 11,
          fontWeight: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{children}</span>
    </div>
  )
}

/**
 * One calm invitation to install the app. Android uses the browser's native
 * install prompt when available; iPhone gets literal Add to Home Screen tips.
 */
export function InstallPrompt({ platform, canPrompt, onInstall, onClose }: InstallPromptProps) {
  const [manualOnly, setManualOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const primaryRef = useRef<HTMLButtonElement | null>(null)
  const nonSafari = platform === 'ios' && isIOSNonSafari()

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => primaryRef.current?.focus(), 160)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function runNativeInstall() {
    if (busy) return
    setBusy(true)
    try {
      const outcome = await onInstall()
      if (outcome === 'unavailable') setManualOnly(true)
    } finally {
      setBusy(false)
    }
  }

  const nativeAvailable = canPrompt && !manualOnly
  const showSteps = platform === 'ios' || !nativeAvailable

  const overlay: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 10040,
    background: 'rgba(6, 8, 12, 0.62)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '0 12px calc(12px + env(safe-area-inset-bottom, 0px))',
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        className="install-sheet"
        onClick={event => event.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 22,
          padding: '22px 20px 18px',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.4)',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close install prompt"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 30,
            height: 30,
            borderRadius: '50%',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-subtle)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 34 }}>
          <img
            src="/icon-192.png"
            alt=""
            width={52}
            height={52}
            style={{
              borderRadius: 14,
              display: 'block',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 900,
                letterSpacing: 0.7,
                textTransform: 'uppercase',
                color: 'var(--tinder-pink)',
                marginBottom: 3,
              }}
            >
              Campmatch app
            </div>
            <h3 id="install-title" style={{ margin: 0, fontSize: 19, fontWeight: 900, lineHeight: 1.2 }}>
              {platform === 'ios' ? 'Add to your Home Screen' : 'Install Campmatch'}
            </h3>
          </div>
        </div>

        <p
          style={{
            margin: '12px 0 0',
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
          }}
        >
          {nativeAvailable
            ? 'Open Campmatch full screen, launch it in one tap and get match, chat and campus alerts on your phone.'
            : platform === 'ios'
              ? 'Install Campmatch on your iPhone for full-screen browsing, faster launches and instant alerts.'
              : 'Install Campmatch for full-screen browsing, quick launches and alerts on your phone.'}
        </p>

        {showSteps && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {nonSafari && (
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: '#b45309',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                  borderRadius: 10,
                  padding: '8px 10px',
                }}
              >
                Home Screen installs work in Safari. Open this page in Safari first, then follow
                these steps.
              </div>
            )}

            {platform === 'ios' ? (
              <>
                <Step n={1}>
                  Tap the <ShareIcon /> <strong>Share</strong> button in the Safari toolbar.
                </Step>
                <Step n={2}>
                  Scroll the menu and choose <strong>Add to Home Screen</strong>.
                </Step>
                <Step n={3}>
                  Tap <strong>Add</strong> in the top corner. Campmatch appears with your other apps.
                </Step>
              </>
            ) : (
              <>
                <Step n={1}>
                  Open the browser menu (<MenuIcon />) in the top corner.
                </Step>
                <Step n={2}>
                  Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </Step>
                <Step n={3}>
                  Confirm <strong>Install</strong>. Campmatch appears with your other apps.
                </Step>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
          {nativeAvailable && (
            <button
              ref={primaryRef}
              onClick={runNativeInstall}
              disabled={busy}
              className="btn-brand"
              style={{ flex: 1, padding: '13px 16px', fontSize: 14, fontWeight: 900 }}
            >
              {busy ? 'Opening…' : 'Install app'}
            </button>
          )}
          {!nativeAvailable && (
            <button
              ref={primaryRef}
              onClick={onClose}
              className="btn-brand"
              style={{ flex: 1, padding: '13px 16px', fontSize: 14, fontWeight: 900 }}
            >
              Got it
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flexShrink: 0,
              padding: '13px 18px',
              borderRadius: 12,
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 800,
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: nativeAvailable ? 'block' : 'none',
            }}
          >
            Not now
          </button>
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 10.5,
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Works on Android and iPhone. No app store needed.
        </div>
      </div>
    </div>
  )
}
