import React, { useState } from 'react'
import { CurrentUser, ProfileCard, PlusConfig, SwipeQuota } from '../types'
import { LEVELS } from '../constants'
import { CloseXIcon, CheckCircleIcon } from './Icons'

interface DiscoveryModalProps {
  me: CurrentUser
  onSave: (patch: Partial<CurrentUser>) => void
  onClose: () => void
}

export function DiscoveryModal({ me, onSave, onClose }: DiscoveryModalProps) {
  const [interestedIn, setInterestedIn] = useState(me.interested_in || 'female')
  const [minAge, setMinAge] = useState(me.min_age || 18)
  const [maxAge, setMaxAge] = useState(me.max_age || 28)
  const [maxDistance, setMaxDistance] = useState(me.max_distance_km || 50)
  const [selectedLevels, setSelectedLevels] = useState<string[]>(
    me.preferred_levels ? me.preferred_levels.split(',').filter(Boolean) : []
  )

  function toggleLevel(lvl: string) {
    setSelectedLevels(prev =>
      prev.includes(lvl) ? prev.filter(x => x !== lvl) : [...prev, lvl]
    )
  }

  function apply() {
    onSave({
      interested_in: interestedIn,
      min_age: Number(minAge),
      max_age: Math.max(Number(minAge), Number(maxAge)),
      max_distance_km: Number(maxDistance),
      preferred_levels: selectedLevels.join(','),
    })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Discovery Preferences</div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', padding: 4 }}
          >
            <CloseXIcon size={20} />
          </button>
        </div>

        <label className="field-label">Show Me</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { id: 'female', label: 'Women' },
            { id: 'male', label: 'Men' },
            { id: 'everyone', label: 'Everyone' },
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              className={`selectable-chip ${interestedIn === opt.id ? 'selected' : ''}`}
              onClick={() => setInterestedIn(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
          <span className="field-label" style={{ margin: 0 }}>Maximum Distance</span>
          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--tinder-pink)' }}>{maxDistance} km</span>
        </div>
        <input
          type="range"
          min={5}
          max={250}
          step={5}
          value={maxDistance}
          onChange={e => setMaxDistance(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#FD267A', marginTop: 8 }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
          <span className="field-label" style={{ margin: 0 }}>Age Range</span>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{minAge} – {maxAge}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Min Age</div>
            <input
              type="number"
              className="modern-input"
              min={18}
              max={50}
              value={minAge}
              onChange={e => setMinAge(Number(e.target.value))}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Max Age</div>
            <input
              type="number"
              className="modern-input"
              min={18}
              max={60}
              value={maxAge}
              onChange={e => setMaxAge(Number(e.target.value))}
            />
          </div>
        </div>

        <label className="field-label">Academic Levels (Empty = All)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {LEVELS.map(l => (
            <button
              key={l}
              type="button"
              className={`selectable-chip ${selectedLevels.includes(l) ? 'selected' : ''}`}
              onClick={() => toggleLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>

        <button className="btn-brand" style={{ marginTop: 22 }} onClick={apply}>
          Save Preferences
        </button>
      </div>
    </div>
  )
}

interface PlusModalProps {
  isPremium: boolean
  plusConfig: PlusConfig
  quota?: SwipeQuota
  onCheckout: () => void
  onClose: () => void
}

export function PlusModal({ isPremium, plusConfig, quota, onCheckout, onClose }: PlusModalProps) {
  const perks = [
    { title: 'Unlimited Daily Swipes', desc: `Remove the ${plusConfig.free_daily_swipe_limit}-swipe daily free cap.` },
    { title: 'See Who Likes You', desc: 'View your full Beeline grid and match immediately.' },
    { title: 'Rewind Last Swipe', desc: 'Undo accidental passes and bring profiles back.' },
    { title: '10 Daily Super Likes', desc: 'Prioritize your card in potential matches’ decks.' },
    { title: 'Match Extensions & Spotlights', desc: 'Extend 24-hour match timers and boost visibility.' },
  ]

  const hitDailyCap = Boolean(quota?.limited && quota.remaining !== null && quota.remaining <= 0)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1b1608 0%, #3b2a06 55%, #d97706 140%)',
            padding: '26px 24px 20px',
            color: '#fff',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              border: 'none',
              background: 'rgba(255,255,255,0.14)',
              color: '#fff',
              width: 34,
              height: 34,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseXIcon size={16} />
          </button>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 11px',
              borderRadius: 999,
              background: 'var(--gold-grad)',
              color: '#111',
              fontSize: 10.5,
              fontWeight: 900,
              letterSpacing: 0.7,
            }}
          >
            CAMPMATCH PLUS
          </span>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 10 }}>
            {hitDailyCap ? 'Daily Free Swipe Limit Reached' : 'Upgrade to Campmatch Plus'}
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.82)', marginTop: 4 }}>
            {hitDailyCap
              ? `Free accounts include ${plusConfig.free_daily_swipe_limit} swipes per 24 hours. Upgrade now to keep swiping without limits.`
              : 'Full access to Likes You, Unlimited Swipes, Rewind, and Priority Placement.'}
          </div>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 22 }}>
            {perks.map(p => (
              <div key={p.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    background: 'rgba(245, 158, 11, 0.14)',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <CheckCircleIcon size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{p.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {isPremium ? (
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                textAlign: 'center',
                background: 'rgba(34,197,94,0.14)',
                color: '#22c55e',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              Campmatch Plus is active on your account
            </div>
          ) : plusConfig.enabled ? (
            <button className="btn-gold" onClick={onCheckout}>
              Get {plusConfig.duration_days} Days — GHS {plusConfig.price_ghs.toFixed(2)}
            </button>
          ) : (
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                textAlign: 'center',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Subscriptions are currently turned off by campus administrators — enjoy free unlimited swipes.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ReportModalProps {
  target: ProfileCard
  onSubmit: (reason: string, details: string) => void
  onClose: () => void
}

export function ReportModal({ target, onSubmit, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('Fake profile or impersonation')
  const [details, setDetails] = useState('')

  const reasons = [
    'Fake profile or impersonation',
    'Inappropriate photos or bio',
    'Harassment or abusive messages',
    'Spam or solicitation',
    'Safety concern',
  ]

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 6 }}>
          Report {target.name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Reports are confidential. {target.name} will also be blocked and hidden from your feed immediately.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {reasons.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              style={{
                textAlign: 'left',
                padding: '11px 14px',
                borderRadius: 12,
                border: reason === r ? '1.5px solid var(--tinder-pink)' : '1px solid var(--border-subtle)',
                background: reason === r ? 'rgba(253,38,122,0.12)' : 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: 13.5,
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <textarea
          className="modern-textarea"
          rows={3}
          placeholder="Additional context for moderators (optional)..."
          value={details}
          onChange={e => setDetails(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-brand"
            style={{ flex: 1 }}
            onClick={() => onSubmit(reason, details)}
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  )
}

interface DeleteAccountModalProps {
  onConfirm: (reason: string, password: string, confirmText: string) => Promise<void>
  onClose: () => void
}

export function DeleteAccountModal({ onConfirm, onClose }: DeleteAccountModalProps) {
  const [reason, setReason] = useState('Met someone on Campmatch')
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const reasons = [
    'Met someone on Campmatch',
    'Taking a break for exams',
    'Not enough matches right now',
    'Privacy preference',
    'Other',
  ]

  async function submit() {
    setErr('')
    if (!password && confirmText.trim().toUpperCase() !== 'DELETE') {
      setErr('Enter your password or type DELETE to confirm.')
      return
    }
    setBusy(true)
    try {
      await onConfirm(reason, password, confirmText)
    } catch (e: any) {
      setErr(e?.message || 'Unable to delete account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 19, fontWeight: 800, color: '#ff5a67', marginBottom: 6 }}>
          Delete Account
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
          Deleting your account immediately removes your profile, photos, and matches from public view. If you only want a temporary break, use Snooze Mode instead.
        </div>

        <label className="field-label" style={{ marginTop: 0 }}>Reason for Leaving</label>
        <select className="modern-select" value={reason} onChange={e => setReason(e.target.value)}>
          {reasons.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <label className="field-label">Confirm Password (or type DELETE below for Google accounts)</label>
        <input
          type="password"
          className="modern-input"
          placeholder="Your account password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <input
          className="modern-input"
          style={{ marginTop: 8 }}
          placeholder='Or type "DELETE" to confirm'
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
        />

        {err && (
          <div style={{ color: '#ff5a67', fontSize: 12.5, fontWeight: 600, marginTop: 10 }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            Keep Account
          </button>
          <button
            disabled={busy}
            onClick={submit}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 999,
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {busy ? 'Removing...' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
