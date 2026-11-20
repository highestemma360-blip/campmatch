import React, { useState } from 'react'
import { ProfileCard, CurrentUser } from '../types'
import { makeAvatarPlaceholder } from '../constants'
import { SendIcon, CampmatchMark } from './Icons'

interface MatchCelebrationProps {
  me: CurrentUser | null
  matched: ProfileCard
  onSendQuickMessage: (text: string) => void
  onGoToMatches: () => void
  onClose: () => void
}

export function MatchCelebration({
  me,
  matched,
  onSendQuickMessage,
  onGoToMatches,
  onClose,
}: MatchCelebrationProps) {
  const [quickMsg, setQuickMsg] = useState('')

  function submitQuick() {
    if (!quickMsg.trim()) {
      onGoToMatches()
      return
    }
    onSendQuickMessage(quickMsg.trim())
  }

  const firstName = matched.name.split(' ')[0]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'radial-gradient(circle at top, rgba(253,38,122,0.32), rgba(6,8,13,0.96) 62%)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'calc(24px + env(safe-area-inset-top, 0px)) 24px calc(24px + env(safe-area-inset-bottom, 0px))',
        color: '#fff',
        animation: 'fadeIn 0.22s ease',
      }}
    >
      <div
        style={{
          fontSize: 44,
          fontWeight: 900,
          fontStyle: 'italic',
          letterSpacing: '-1.2px',
          background: 'linear-gradient(90deg, #FD267A, #FF7854, #FFC629)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
          lineHeight: 1.08,
        }}
      >
        It’s a Match
      </div>

      <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: 14.5, marginTop: 6, marginBottom: 28, textAlign: 'center' }}>
        You and <strong>{matched.name}</strong> liked each other. Start the conversation within 24 hours.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26, position: 'relative' }}>
        <img
          className="match-card-left"
          src={me?.photo_urls?.[0] || makeAvatarPlaceholder(me?.name)}
          alt="You"
          style={{
            width: 132,
            height: 170,
            objectFit: 'cover',
            borderRadius: 22,
            border: '3px solid #fff',
            boxShadow: '0 20px 44px rgba(0,0,0,0.55)',
          }}
        />
        <div
          className="match-heart-core"
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: '#0e1017',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
            boxShadow: '0 8px 26px rgba(255,76,94,0.55)',
            border: '2.5px solid rgba(255,170,0,0.65)',
          }}
        >
          <CampmatchMark size={28} />
        </div>
        <img
          className="match-card-right"
          src={matched.photo_urls?.[0] || makeAvatarPlaceholder(matched.name)}
          alt={matched.name}
          style={{
            width: 132,
            height: 170,
            objectFit: 'cover',
            borderRadius: 22,
            border: '3px solid #FFC629',
            boxShadow: '0 20px 44px rgba(0,0,0,0.55)',
          }}
        />
      </div>

      {matched.opening_move && (
        <div
          style={{
            width: '100%',
            maxWidth: 370,
            background: 'rgba(255, 198, 41, 0.13)',
            border: '1px solid rgba(255, 198, 41, 0.34)',
            borderRadius: 16,
            padding: '12px 16px',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#FFD84D', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {firstName}’s Opening Move
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{matched.opening_move}</div>
        </div>
      )}

      <div
        style={{
          width: '100%',
          maxWidth: 370,
          display: 'flex',
          gap: 8,
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 999,
          padding: '6px 6px 6px 18px',
          marginBottom: 14,
        }}
      >
        <input
          value={quickMsg}
          onChange={e => setQuickMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitQuick()}
          placeholder={`Send a message to ${firstName}...`}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            color: '#fff',
            fontSize: 14.5,
            outline: 'none',
          }}
        />
        <button
          onClick={submitQuick}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--brand-grad)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Send message"
        >
          <SendIcon size={19} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
        {['Hey, great matching with you!', 'How is your week going?', 'Grab coffee on campus sometime?'].map(preset => (
          <button
            key={preset}
            onClick={() => onSendQuickMessage(preset)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {preset}
          </button>
        ))}
      </div>

      <button
        onClick={onClose}
        style={{
          border: 'none',
          background: 'rgba(255,255,255,0.12)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          padding: '12px 24px',
          minHeight: 44,
          minWidth: 44,
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Keep swiping"
      >
        Keep Swiping
      </button>
    </div>
  )
}
