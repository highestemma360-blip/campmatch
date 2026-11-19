import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

interface PlusSuccessModalProps {
  userName?: string
  premiumUntil?: string | null
  onClose: () => void
}

const CONFETTI = [
  { left: '8%', delay: '0s', color: '#f8c14a', size: 9 },
  { left: '18%', delay: '0.15s', color: '#ff4f7a', size: 7 },
  { left: '29%', delay: '0.05s', color: '#3ddc97', size: 8 },
  { left: '41%', delay: '0.28s', color: '#5aa9ff', size: 6 },
  { left: '52%', delay: '0.1s', color: '#f8c14a', size: 10 },
  { left: '63%', delay: '0.33s', color: '#ff7a59', size: 7 },
  { left: '74%', delay: '0.02s', color: '#b388ff', size: 8 },
  { left: '84%', delay: '0.22s', color: '#3ddc97', size: 6 },
  { left: '93%', delay: '0.12s', color: '#ff4f7a', size: 9 },
]

/**
 * Celebratory confirmation shown the moment Campmatch Plus activates. The
 * payment watcher and the realtime plus_activated event both trigger it, so
 * students see this without refreshing.
 */
export function PlusSuccessModal({ userName, premiumUntil, onClose }: PlusSuccessModalProps) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const timer = window.setTimeout(() => closeRef.current(), 9000)
    return () => window.clearTimeout(timer)
  }, [])

  const untilLabel = premiumUntil
    ? new Date(premiumUntil).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''

  const firstName = userName ? userName.split(' ')[0] : ''

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Campmatch Plus activated"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10100,
        background: 'rgba(6, 8, 12, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 22,
      }}
    >
      <div
        className="plus-success-card"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 350,
          padding: '30px 24px 24px',
          borderRadius: 24,
          textAlign: 'center',
          overflow: 'hidden',
          background:
            'radial-gradient(120% 90% at 50% 0%, #3b2a06 0%, #1b1709 52%, #0c0b06 100%)',
          border: '1px solid rgba(248, 193, 74, 0.34)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
        }}
      >
        {CONFETTI.map((piece, i) => (
          <span
            key={i}
            className="plus-confetti"
            style={
              {
                left: piece.left,
                width: piece.size,
                height: piece.size * 1.6,
                background: piece.color,
                animationDelay: piece.delay,
              } as CSSProperties
            }
          />
        ))}

        <div
          style={{
            width: 92,
            height: 92,
            margin: '0 auto 18px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 35%, rgba(248,193,74,0.24), rgba(248,193,74,0.05))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="76" height="76" viewBox="0 0 76 76" fill="none" aria-hidden="true">
            <circle
              cx="38"
              cy="38"
              r="32"
              stroke="#f8c14a"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="202"
              strokeDashoffset="202"
              className="plus-check-ring"
              transform="rotate(-90 38 38)"
            />
            <path
              d="M24 39.5L33.5 49L53 28.5"
              stroke="#f8c14a"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="46"
              strokeDashoffset="46"
              className="plus-check-mark"
            />
          </svg>
        </div>

        <div
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #f8c14a, #f2ac2b)',
            color: '#1b1408',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.9,
            marginBottom: 12,
          }}
        >
          CAMPMATCH PLUS
        </div>

        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
          {firstName ? `You're in, ${firstName}` : "You're in"}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          Your subscription is active. Unlimited swipes, See Who Likes You, Rewind, read receipts
          and more are unlocked right now.
        </div>
        {untilLabel && (
          <div
            style={{
              marginTop: 12,
              fontSize: 11.5,
              fontWeight: 800,
              color: '#f8c14a',
              letterSpacing: 0.3,
            }}
          >
            Active until {untilLabel}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 20,
            padding: '13px 16px',
            border: 'none',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #f8c14a, #f2ac2b)',
            color: '#1b1408',
            fontSize: 14,
            fontWeight: 900,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Start matching
        </button>
      </div>
    </div>
  )
}
