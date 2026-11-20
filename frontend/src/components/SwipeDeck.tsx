import React, { useState, useEffect, useRef } from 'react'
import { ProfileCard, CurrentUser, SwipeQuota } from '../types'
import { makeAvatarPlaceholder, EXPLORE_MAP } from '../constants'
import {
  RewindIcon,
  CloseXIcon,
  HeartIcon,
  BoltIcon,
  VerifiedBadge,
  ChevronUpIcon,
  MapPinIcon,
  MusicIcon,
} from './Icons'

interface SwipeDeckProps {
  deck: ProfileCard[]
  me: CurrentUser | null
  quota?: SwipeQuota
  justRewound?: boolean
  activeVibeLabel?: string | null
  onClearVibe?: () => void
  canRewind: boolean
  isBoosted: boolean
  onSwipe: (liked: boolean) => void
  onRewind: () => void
  onBoost: () => void
  onInspect: (card: ProfileCard) => void
  onReload: () => void
  onOpenFilters: () => void
  onOpenPlus: () => void
}

export function SwipeDeck({
  deck,
  me,
  quota,
  justRewound = false,
  activeVibeLabel,
  onClearVibe,
  canRewind,
  isBoosted,
  onSwipe,
  onRewind,
  onBoost,
  onInspect,
  onReload,
  onOpenFilters,
  onOpenPlus,
}: SwipeDeckProps) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const [drag, setDrag] = useState({ x: 0, y: 0, pivotTop: true, active: false })
  const [flyOut, setFlyOut] = useState<'left' | 'right' | 'up' | null>(null)
  const [fxAction, setFxAction] = useState<'like' | 'nope' | null>(null)
  const startRef = useRef<{ x: number; y: number; pivotTop: boolean; moved: boolean } | null>(null)

  const topCard = deck[0]
  const secondCard = deck[1]
  const thirdCard = deck[2]

  const boostedUntil = me?.boosted_until ? new Date(me.boosted_until + (me.boosted_until.includes('+') || me.boosted_until.endsWith('Z') ? '' : 'Z')).getTime() : 0
  const isBoostedActive = isBoosted && boostedUntil > Date.now()

  const [spotlightPopupOpen, setSpotlightPopupOpen] = useState(false)
  const [boostSecondsLeft, setBoostSecondsLeft] = useState(0)

  // Persist dismissal across remounts using localStorage keyed by boost
  const spotlightDismissedKey = `spotlightDismissed_${boostedUntil || 'none'}`
  const wasDismissed = useRef(localStorage.getItem(spotlightDismissedKey) === '1')

  // Countdown timer for active spotlight boost
  useEffect(() => {
    if (!isBoostedActive) {
      setBoostSecondsLeft(0)
      return
    }
    const tick = () => {
      const left = Math.max(0, Math.floor((boostedUntil - Date.now()) / 1000))
      setBoostSecondsLeft(left)
      if (left <= 0) setSpotlightPopupOpen(false)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isBoostedActive, boostedUntil])

  // Open spotlight popup when boost activates (only once per boost session)
  useEffect(() => {
    if (isBoostedActive && !spotlightPopupOpen && !wasDismissed.current) {
      setSpotlightPopupOpen(true)
    }
  }, [isBoostedActive, spotlightPopupOpen, wasDismissed.current, boostedUntil])

  // Mark as dismissed when boost expires
  useEffect(() => {
    if (!isBoostedActive) {
      setBoostSecondsLeft(0)
      localStorage.removeItem(spotlightDismissedKey)
      wasDismissed.current = false
    }
  }, [isBoostedActive, boostedUntil, spotlightDismissedKey])

  function formatBoostTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (!topCard) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        triggerSwipe('left')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        triggerSwipe('right')
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        onInspect(topCard)
      } else if (e.key === ' ') {
        e.preventDefault()
        const total = topCard.photo_urls?.length || 1
        setPhotoIdx(i => (i + 1) % total)
      } else if (e.key === 'Backspace' && canRewind) {
        e.preventDefault()
        onRewind()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [topCard, canRewind, quota, flyOut])

  function triggerSwipe(dir: 'left' | 'right') {
    if (!topCard || flyOut) return
    if (quota?.limited && quota.remaining !== null && quota.remaining <= 0) {
      onOpenPlus()
      return
    }
    setFlyOut(dir)
    const fx = dir === 'right' ? 'like' : 'nope'
    setFxAction(fx)
    setTimeout(() => setFxAction(null), 500)

    setTimeout(() => {
      if (dir === 'right') onSwipe(true)
      else onSwipe(false)
    }, 230)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pivotTop = e.clientY - rect.top < rect.height * 0.55
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX, y: e.clientY, pivotTop, moved: false }
    setDrag({ x: 0, y: 0, pivotTop, active: true })
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!startRef.current || !drag.active) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    setDrag({ x: dx, y: dy, pivotTop: drag.pivotTop, active: true })
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!startRef.current || !drag.active) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    const isFast = Math.abs(dx) > 100 || Math.abs(dy) > 100

    if (Math.abs(dx) > 120 || Math.abs(dy) > 150 || isFast) {
      if (dx > 0) triggerSwipe('right')
      else if (dx < 0) triggerSwipe('left')
      else if (dy < -120) setDrag({ x: 0, y: 0, pivotTop: true, active: false })
      else setDrag({ x: 0, y: 0, pivotTop: true, active: false })
    } else {
      setDrag({ x: 0, y: 0, pivotTop: true, active: false })
    }
    startRef.current = null
  }

  const cardWidth = 330
  const cardHeight = 520

  const cardTransform = `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 20}deg)`
  const cardTransition = drag.active ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)'

  const tintOpacity = Math.min(1, Math.abs(drag.x) / 200)
  const tintBackground = drag.x > 0 ? '#22c55e' : drag.x < 0 ? '#ef4444' : 'transparent'

  const likeOpacity = Math.min(1, Math.max(0, drag.x / 150))
  const nopeOpacity = Math.min(1, Math.max(0, -drag.x / 150))

  const topCardPhoto = topCard?.photo_urls?.[photoIdx] || makeAvatarPlaceholder(topCard?.name || '')

  return (
    <>
      {topCard ? (
        <>
          <div className="deck-arena">
            {thirdCard && (
              <div
                className="swipe-card behind-2"
                style={{
                  transform: 'scale(0.9) translateY(22px)',
                  opacity: 0.85,
                }}
              >
                <img
                  className="card-photo"
                  src={thirdCard.photo_urls?.[0] || makeAvatarPlaceholder(thirdCard.name)}
                  alt=""
                />
              </div>
            )}

            {secondCard && (
              <div
                className="swipe-card behind-1"
                style={{
                  transform:
                    Math.abs(drag.x) > 10 || Math.abs(drag.y) > 10
                      ? `scale(${Math.min(1, 0.955 + Math.min(1, Math.hypot(drag.x, drag.y) / 210) * 0.045)}) translateY(${Math.max(0, 11 - Math.min(11, Math.hypot(drag.x, drag.y) / 20))}px)`
                      : undefined,
                }}
              >
                <img
                  className="card-photo"
                  src={secondCard.photo_urls?.[0] || makeAvatarPlaceholder(secondCard.name)}
                  alt=""
                />
              </div>
            )}

            <div
              key={topCard.id}
              className={`swipe-card top-card ${justRewound ? 'rewind-enter' : ''}`}
              style={{
                transform: cardTransform,
                transition: cardTransition,
                cursor: drag.active ? 'grabbing' : 'grab',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Full-size card photo - Tinder style */}
              <div className="card-photo-container">
                <img
                  className="card-photo"
                  src={topCardPhoto}
                  onError={e => {
                    ;(e.currentTarget as HTMLImageElement).src = makeAvatarPlaceholder(topCard.name)
                  }}
                  alt={topCard.name}
                />
                {topCard.photo_urls?.length && topCard.photo_urls.length > 1 && (
                  <div className="photo-indicators">
                    {topCard.photo_urls.map((_, idx) => (
                      <div
                        key={idx}
                        className={`photo-dot ${idx === photoIdx ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                )}
                {/* Like / Nope stamps */}
                {likeOpacity > 0.04 && (
                  <div className="swipe-stamp like" style={{ opacity: likeOpacity }}>
                    LIKE
                  </div>
                )}
                {nopeOpacity > 0.04 && (
                  <div className="swipe-stamp nope" style={{ opacity: nopeOpacity }}>
                    NOPE
                  </div>
                )}
              </div>

              {/* Bottom info overlay - Tinder style */}
              <div className="card-info-overlay">
                <div className="card-info-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>
                      {topCard.name}
                    </span>
                    <span style={{ fontSize: 22, fontWeight: 600, opacity: 0.95 }}>{topCard.age}</span>
                    {topCard.verified !== false && <VerifiedBadge size={20} />}
                  </div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 3, fontWeight: 600 }}>
                    {topCard.school || ''} · Level {topCard.level} · {topCard.course}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.85)',
                      marginTop: 4,
                    }}
                  >
                    {topCard.distance_km != null && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPinIcon size={13} /> {topCard.distance_km} km away
                      </span>
                    )}
                    {topCard.hall && <span>{topCard.hall}</span>}
                  </div>
                </div>
              </div>

              {/* Badges at top */}
              <div className="card-top-badges">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {topCard.is_boosted && (
                    <span className="pill-badge boost-banner">
                      <BoltIcon size={12} /> Spotlight
                    </span>
                  )}
                  {(topCard.online || topCard.active_recently) && (
                    <span className="pill-badge" style={{ background: 'rgba(10,12,18,0.72)', color: '#fff' }}>
                      <span className="active-dot" />
                      {topCard.online ? 'Online now' : 'Recently active'}
                    </span>
                  )}
                  {topCard.compatibility && (
                    <span className="pill-badge match-score">{topCard.compatibility}% Match</span>
                  )}
                </div>
              </div>

              {/* Expand button */}
              <button
                type="button"
                className="expand-profile-btn"
                title="Open full profile"
                onClick={e => {
                  e.stopPropagation()
                  onInspect(topCard)
                }}
              >
                <ChevronUpIcon size={20} />
              </button>

              {/* Explore vibes */}
              {(topCard.explore_vibes || []).length > 0 && (
                <div className="explore-vibes-bar">
                  {(topCard.explore_vibes || []).slice(0, 3).map(vid => {
                    const rm = EXPLORE_MAP[vid]
                    return rm ? (
                      <span
                        key={vid}
                        className="card-chip"
                        style={{ borderColor: 'rgba(255,170,0,0.4)', color: '#ffd84d' }}
                      >
                        {rm.title}
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="action-dock">
            <button
              className="dock-btn sm rewind"
              onClick={onRewind}
              disabled={!canRewind}
              title="Rewind last swipe"
            >
              <RewindIcon size={20} />
            </button>

            <button
              className="dock-btn lg nope"
              onClick={() => triggerSwipe('left')}
              title="Pass (Left Arrow)"
            >
              <CloseXIcon size={27} />
            </button>

            <button
              className="dock-btn lg like"
              onClick={() => triggerSwipe('right')}
              title="Like (Right Arrow)"
            >
              <HeartIcon size={29} />
            </button>

            <button
              className={`dock-btn sm boost boost-btn-countdown`}
              onClick={onBoost}
              title={isBoostedActive ? `Spotlight active: ${formatBoostTime(boostSecondsLeft)} remaining` : '30-minute Campus Spotlight'}
              style={{
                background: isBoostedActive ? 'var(--boost-grad)' : undefined,
                color: isBoostedActive ? '#fff' : undefined,
                borderColor: isBoostedActive ? 'transparent' : undefined,
              }}
            >
              <BoltIcon size={20} />
              {isBoostedActive && (
                <span className="boost-countdown-text">{formatBoostTime(boostSecondsLeft)}</span>
              )}
            </button>
          </div>

          {spotlightPopupOpen && isBoostedActive && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(6, 8, 12, 0.7)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div
                className="spotlight-popup"
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 360,
                  padding: '28px 24px',
                  borderRadius: 24,
                  textAlign: 'center',
                  background:
                    'radial-gradient(120% 90% at 50% 0%, #3b2a06 0%, #1b1709 52%, #0c0b06 100%)',
                  border: '1px solid rgba(248, 193, 74, 0.34)',
                  boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div className="spotlight-beam" />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'var(--boost-grad)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                      boxShadow: '0 0 30px rgba(248, 193, 74, 0.4)',
                    }}
                  >
                    <BoltIcon size={32} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.4px' }}>
                    Campus Spotlight Active
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.72)', maxWidth: 260 }}>
                    Your profile is now boosted and shown to more students nearby for{' '}
                    <span className="spotlight-countdown">
                      {formatBoostTime(boostSecondsLeft)}
                    </span>
                    .
                  </div>
                  <button
                    onClick={() => {
                      wasDismissed.current = true
                      localStorage.setItem(spotlightDismissedKey, '1')
                      setSpotlightPopupOpen(false)
                    }}
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: '12px 16px',
                      border: 'none',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="desktop-shortcuts">
            <span><kbd className="kbd-pill">←</kbd>Pass</span>
            <span><kbd className="kbd-pill">→</kbd>Like</span>
            <span><kbd className="kbd-pill">Space</kbd>Next Photo</span>
            <span><kbd className="kbd-pill">↑</kbd>Open Card</span>
          </div>
        </>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div className="radar-ring">
            <img
              src={me?.photo_urls?.[0] || makeAvatarPlaceholder(me?.name)}
              alt=""
              style={{
                width: 78,
                height: 78,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--tinder-pink)',
                zIndex: 2,
              }}
            />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
            No More Profiles Nearby
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 300, lineHeight: 1.5, marginBottom: 22 }}>
            You have reviewed everyone matching your current preferences. Broaden your filters or check back soon.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={onOpenFilters}>
              Discovery Settings
            </button>
            <button className="btn-brand" style={{ width: 'auto', padding: '11px 22px' }} onClick={onReload}>
              Refresh Deck
            </button>
          </div>
        </div>
      )}
    </>
  )
}
