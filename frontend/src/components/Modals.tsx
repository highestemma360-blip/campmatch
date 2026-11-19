import React, { useState, useEffect } from 'react'
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
  token?: string
  userName?: string
  onCheckout: () => void
  onSuccess?: () => void
  onClose: () => void
}

interface PaymentConfig {
  provider: string
  enabled: boolean
  configured: boolean
  environment: string
  channels: string[]
  price_ghs: number
  duration_days: number
  discount_enabled?: boolean
  discount_percent?: number
}

const CHANNEL_LABELS: Record<string, string> = {
  MTN: 'MTN MoMo',
  TELECEL: 'Telecel Cash',
  AT: 'AT Money',
}

const CONFETTI_PIECES = [
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

export function PlusModal({
  isPremium,
  plusConfig,
  quota,
  token,
  userName,
  onCheckout,
  onSuccess,
  onClose,
}: PlusModalProps) {
  const perks = [
    { title: 'Unlimited Daily Swipes', desc: `Remove the ${plusConfig.free_daily_swipe_limit}-swipe daily free cap.` },
    { title: 'See Who Likes You', desc: 'View your full Beeline grid and match immediately.' },
    { title: 'Rewind Last Swipe', desc: 'Undo accidental passes and bring profiles back.' },
    { title: '10 Daily Super Likes', desc: 'Prioritize your card in potential matches’ decks.' },
    { title: 'Read Receipts', desc: 'See the moment your messages are opened.' },
    { title: 'Match Extensions & Spotlights', desc: 'Extend 24-hour match timers and boost visibility.' },
  ]

  const hitDailyCap = Boolean(quota?.limited && quota.remaining !== null && quota.remaining <= 0)
  const firstName = userName ? userName.split(' ')[0] : ''

  const [cfg, setCfg] = useState<PaymentConfig | null>(null)
  const [channel, setChannel] = useState('MTN')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [needOtp, setNeedOtp] = useState(false)
  const [reference, setReference] = useState('')
  const [plan, setPlan] = useState('1m')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'idle' | 'waiting' | 'success' | 'failed'>('idle')
  const [message, setMessage] = useState('')
  const [showHosted, setShowHosted] = useState(false)

  useEffect(() => {
    fetch('/api/payments/config')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        setCfg(d)
        if (Array.isArray(d.channels) && d.channels.length) {
          setChannel(d.channels.includes('MTN') ? 'MTN' : d.channels[0])
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!token || !reference || status !== 'waiting' || needOtp) return
    let stop = false
    const check = async () => {
      try {
        const r = await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`, {
          headers: { Authorization: 'Bearer ' + token },
        })
        if (!r.ok) return
        const d = await r.json()
        if (stop) return
        if (d.status === 'success') {
          setStatus('success')
          setMessage('Payment confirmed. Campmatch Plus has been activated.')
          onSuccess?.()
        } else if (d.status === 'failed') {
          setStatus('failed')
          setMessage(d.reason || 'The Mobile Money payment was declined or cancelled.')
        }
      } catch {
        // Keep polling through transient network errors.
      }
    }
    const timer = setInterval(check, 3000)
    check()
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [reference, status, needOtp, token])

  async function collectMomo(otpCode?: string) {
    if (!token) {
      setMessage('Your session expired. Please sign in again.')
      return
    }
    const digits = phone.replace(/\D/g, '')
    if (!otpCode && digits.length < 9) {
      setMessage('Enter a valid Ghana Mobile Money number (e.g. 0241234567).')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const r = await fetch('/api/payments/moolre/collect', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          payer: phone,
          otpcode: otpCode || undefined,
          reference: reference || undefined,
          description: 'Campmatch Plus',
          plan,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setStatus('idle')
        setMessage(typeof d.detail === 'string' ? d.detail : 'Unable to start the Mobile Money payment.')
        return
      }
      setReference(d.reference || reference)
      if (d.step === 'otp_required') {
        setNeedOtp(true)
        setStatus('waiting')
        setMessage(d.message || 'Enter the SMS verification code sent to your phone.')
      } else {
        setNeedOtp(false)
        setOtp('')
        setStatus('waiting')
        setMessage(d.message || 'Approve the prompt on your phone to complete payment.')
      }
    } catch {
      setMessage('Unable to reach the payment server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const price = cfg?.price_ghs ?? plusConfig.price_ghs
  const days = cfg?.duration_days ?? plusConfig.duration_days
  const momoAvailable = Boolean(cfg?.configured && cfg?.enabled)
  const channels = cfg?.channels?.length ? cfg.channels : ['MTN', 'TELECEL', 'AT']
  const discountEnabled = plusConfig.discount_enabled && cfg?.discount_enabled
  const displayPrice = discountEnabled ? price * (100 - (plusConfig.discount_percent || 0)) / 100 : price
  const displayDays = days

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden', maxHeight: '92dvh', overflowY: 'auto' }}>
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

          {status === 'success' ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '22px 10px 14px',
                position: 'relative',
              }}
            >
              {/* Confetti burst behind the checkmark. */}
              {CONFETTI_PIECES.map((piece, i) => {
                return (
                  <span
                    key={i}
                    className="plus-confetti-pop"
                    style={{
                      left: piece.left,
                      width: piece.size,
                      height: piece.size * 1.6,
                      background: piece.color,
                      animationDelay: piece.delay,
                      animationDuration: '0.6s',
                    }}
                  />
                )
              })}
              <div
                style={{
                  position: 'relative',
                  width: 92,
                  height: 92,
                  margin: '0 auto 16px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle at 50% 35%, rgba(248,193,74,0.24), rgba(248,193,74,0.05))',
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
                  marginBottom: 10,
                }}
              >
                CAMPMATCH PLUS
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
                {firstName ? `You're in, ${firstName}` : "You're in"}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'rgba(255,255,255,0.72)',
                  maxWidth: 260,
                  margin: '8px auto 0',
                }}
              >
                Your subscription is active — unlimited swipes and all Plus features are unlocked now.
              </div>
              <button
                onClick={() => onSuccess?.()}
                style={{
                  marginTop: 18,
                  width: '100%',
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
                Continue swiping
              </button>
            </div>
          ) : isPremium ? (
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
          ) : !plusConfig.enabled ? (
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
          ) : !momoAvailable ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  lineHeight: 1.55,
                  textAlign: 'center',
                }}
              >
                Mobile Money checkout is being activated for Campmatch. Try the hosted payment link, or
                check back shortly if it is still being configured.
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, fontSize: 13, color: '#f59e0b' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>Plan</div>
                  <select
                    onChange={e => setPlan(e.target.value)}
                    defaultValue="1m"
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #555' }}
                  >
                    <option value="1m">1 Month</option>
                    <option value="3m">3 Months</option>
                    <option value="12m">12 Months</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>Price</div>
                  <span style={{ fontWeight: 800, color: '#f59e0b' }}>
                    GHS {displayPrice.toFixed(2)} / {displayDays} days
                  </span>
                </div>
              </div>
              <button className="btn-gold" onClick={onCheckout}>
                Open Secure Checkout — GHS {displayPrice.toFixed(2)}
              </button>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 15 }}>Pay with Mobile Money</div>
                <div style={{ fontWeight: 900, fontSize: 18, color: '#f59e0b' }}>
                  GHS {price.toFixed(2)}
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700 }}>
                    {' '}
                    / {days} days
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 12 }}>
                {channels.map(ch => (
                  <button
                    key={ch}
                    type="button"
                    disabled={status === 'waiting' || busy}
                    onClick={() => setChannel(ch)}
                    className={`selectable-chip ${channel === ch ? 'selected' : ''}`}
                    style={{ padding: '9px 6px', fontSize: 11.5, fontWeight: 800 }}
                  >
                    {CHANNEL_LABELS[ch] || ch}
                  </button>
                ))}
              </div>

              <label className="field-label" style={{ marginTop: 0 }}>
                Mobile Money Number
              </label>
              <input
                className="modern-input"
                inputMode="tel"
                autoComplete="tel"
                placeholder="024 123 4567"
                value={phone}
                disabled={status === 'waiting' || busy}
                onChange={e => setPhone(e.target.value)}
              />

              {needOtp && (
                <>
                  <label className="field-label">SMS Verification Code</label>
                  <input
                    className="modern-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter the code sent to your phone"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                  />
                  <button
                    className="btn-gold"
                    style={{ marginTop: 12 }}
                    disabled={busy || !otp.trim()}
                    onClick={() => collectMomo(otp.trim())}
                  >
                    {busy ? 'Verifying...' : 'Confirm Code & Pay'}
                  </button>
                </>
              )}

              {!needOtp && (
                <button
                  className="btn-gold"
                  style={{ marginTop: 12 }}
                  disabled={busy || status === 'waiting'}
                  onClick={() => collectMomo()}
                >
                  {busy
                    ? 'Starting payment...'
                    : status === 'waiting'
                      ? 'Approve on your phone...'
                      : `Pay GHS ${price.toFixed(2)} with ${CHANNEL_LABELS[channel] || channel}`}
                </button>
              )}

              {status === 'waiting' && !needOtp && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '11px 13px',
                    borderRadius: 12,
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.26)',
                    color: '#7dd3fc',
                    fontSize: 12.5,
                    fontWeight: 600,
                    lineHeight: 1.55,
                  }}
                >
                  {message || 'Approve the Mobile Money prompt on your phone.'} This screen updates
                  automatically once payment is confirmed.
                </div>
              )}

              {message && status !== 'waiting' && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '11px 13px',
                    borderRadius: 12,
                    background:
                      status === 'failed' ? 'rgba(255,68,88,0.14)' : 'rgba(245,158,11,0.12)',
                    border:
                      status === 'failed'
                        ? '1px solid rgba(255,68,88,0.35)'
                        : '1px solid rgba(245,158,11,0.3)',
                    color: status === 'failed' ? '#ff6b7a' : '#ffd84d',
                    fontSize: 12.5,
                    fontWeight: 600,
                    lineHeight: 1.55,
                  }}
                >
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowHosted(v => !v)}
                style={{
                  marginTop: 12,
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {showHosted ? 'Hide hosted checkout' : 'Prefer card or another network?'}
              </button>

              {showHosted && (
                <button className="btn-ghost" style={{ marginTop: 4 }} onClick={onCheckout}>
                  Open Secure Hosted Checkout
                </button>
              )}

              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                Secured by Moolre · {cfg?.environment === 'sandbox' ? 'Sandbox mode' : 'Live payments'}
              </div>
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
