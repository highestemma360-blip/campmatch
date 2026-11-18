import React, { useState, useEffect, useRef } from 'react'
import { ProfileCard, CurrentUser, SwipeQuota } from '../types'
import { makeAvatarPlaceholder, EXPLORE_MAP } from '../constants'
import {
  RewindIcon,
  CloseXIcon,
  StarIcon,
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
  onSwipe: (liked: boolean, superLike?: boolean) => void
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
  const [fxAction, setFxAction] = useState<'like' | 'super' | 'nope' | null>(null)
  const startRef = useRef<{ x: number; y: number; pivotTop: boolean; moved: boolean } | null>(null)

  const topCard = deck[0]
  const secondCard = deck[1]
  const thirdCard = deck[2]

  useEffect(() => {
    setPhotoIdx(0)
    setDrag({ x: 0, y: 0, pivotTop: true, active: false })
    setFlyOut(null)
  }, [topCard?.id])

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
      } else if (e.key === 'Enter') {
        e.preventDefault()
        triggerSwipe('up')
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

  function triggerSwipe(dir: 'left' | 'right' | 'up') {
    if (!topCard || flyOut) return
    if (quota?.limited && quota.remaining !== null && quota.remaining <= 0) {
      onOpenPlus()
      return
    }
    setFlyOut(dir)
    const fx = dir === 'right' ? 'like' : dir === 'up' ? 'super' : 'nope'
    setFxAction(fx)
    setTimeout(() => setFxAction(null), 500)

    setTimeout(() => {
      if (dir === 'right') onSwipe(true, false)
      else if (dir === 'left') onSwipe(false, false)
      else onSwipe(true, true)
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
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      startRef.current.moved = true
    }
    setDrag({ x: dx, y: dy, pivotTop: startRef.current.pivotTop, active: true })
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!startRef.current) return
    const wasMoved = startRef.current.moved
    const dx = drag.x
    const dy = drag.y
    startRef.current = null

    if (!wasMoved && topCard) {
      const rect = e.currentTarget.getBoundingClientRect()
      const relX = e.clientX - rect.left
      const relY = e.clientY - rect.top
      const photosCount = topCard.photo_urls?.length || 1
      if (relY > rect.height * 0.74) {
        onInspect(topCard)
      } else if (relX < rect.width * 0.42) {
        setPhotoIdx(i => Math.max(0, i - 1))
      } else {
        setPhotoIdx(i => (i < photosCount - 1 ? i + 1 : 0))
      }
      setDrag({ x: 0, y: 0, pivotTop: true, active: false })
      return
    }

    if (dx > 95) {
      triggerSwipe('right')
    } else if (dx < -95) {
      triggerSwipe('left')
    } else if (dy < -115 && Math.abs(dx) < 90) {
      triggerSwipe('up')
    } else {
      setDrag({ x: 0, y: 0, pivotTop: true, active: false })
    }
  }

  const likeOpacity = flyOut === 'right' ? 1 : Math.min(1, Math.max(0, (drag.x - 24) / 85))
  const nopeOpacity = flyOut === 'left' ? 1 : Math.min(1, Math.max(0, (-drag.x - 24) / 85))
  const superOpacity = flyOut === 'up' ? 1 : Math.min(1, Math.max(0, (-drag.y - 40) / 85))

  const rotSign = drag.pivotTop ? 1 : -1
  const rotation = drag.x * 0.058 * rotSign
  let cardTransform = `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${rotation}deg)`
  let cardTransition = drag.active
    ? 'none'
    : 'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)'

  if (flyOut === 'right') {
    cardTransform = `translate3d(600px, ${drag.y - 18}px, 0) rotate(${26 * rotSign}deg) scale(1.04)`
    cardTransition = 'transform 0.26s cubic-bezier(0.32, 0, 0.67, 0), opacity 0.26s ease'
  } else if (flyOut === 'left') {
    cardTransform = `translate3d(-600px, ${drag.y - 18}px, 0) rotate(${-26 * rotSign}deg) scale(1.04)`
    cardTransition = 'transform 0.26s cubic-bezier(0.32, 0, 0.67, 0), opacity 0.26s ease'
  } else if (flyOut === 'up') {
    cardTransform = 'translate3d(0px, -720px, 0) scale(0.9)'
    cardTransition = 'transform 0.26s cubic-bezier(0.32, 0, 0.67, 0), opacity 0.26s ease'
  }

  let tintBackground = 'transparent'
  let tintOpacity = 0
  if (likeOpacity > 0.05) {
    tintBackground = 'radial-gradient(circle at top left, rgba(34, 197, 94, 0.42), transparent 68%)'
    tintOpacity = likeOpacity
  } else if (nopeOpacity > 0.05) {
    tintBackground = 'radial-gradient(circle at top right, rgba(255, 68, 88, 0.42), transparent 68%)'
    tintOpacity = nopeOpacity
  } else if (superOpacity > 0.05) {
    tintBackground = 'radial-gradient(circle at bottom center, rgba(56, 189, 248, 0.48), transparent 72%)'
    tintOpacity = superOpacity
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
      {/* Top Status Strip: Active Explore Filter or Free Daily Swipe Quota */}
      {(activeVibeLabel || quota?.limited) && (
        <div
          style={{
            margin: '8px 14px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          {activeVibeLabel ? (
            <div
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                background: 'rgba(253, 38, 122, 0.14)',
                border: '1px solid rgba(253, 38, 122, 0.32)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span>Filter: {activeVibeLabel}</span>
              {onClearVibe && (
                <button
                  onClick={onClearVibe}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--tinder-pink)',
                    fontWeight: 800,
                    fontSize: 11.5,
                    padding: 0,
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          ) : (
            <div />
          )}

          {quota?.limited && quota.daily_limit !== null && (
            <button
              onClick={onOpenPlus}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                border: '1px solid var(--border-strong)',
                background: quota.remaining === 0 ? 'rgba(255, 68, 88, 0.14)' : 'var(--bg-elevated)',
                color: quota.remaining === 0 ? '#ff5a67' : 'var(--text-secondary)',
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              {quota.remaining} of {quota.daily_limit} daily swipes left
            </button>
          )}
        </div>
      )}

      {/* Animated Action Burst Overlay */}
      {fxAction && (
        <div className="swipe-fx-burst">
          <div className={`fx-badge-circle ${fxAction}`}>
            {fxAction === 'like' && <HeartIcon size={44} />}
            {fxAction === 'super' && <StarIcon size={44} />}
            {fxAction === 'nope' && <CloseXIcon size={42} />}
          </div>
        </div>
      )}

      {topCard ? (
        <>
          <div className="deck-arena">
            {thirdCard && (
              <div className="swipe-card behind-2">
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
              <img
                className="card-photo"
                src={
                  topCard.photo_urls?.[photoIdx] ||
                  topCard.photo_urls?.[0] ||
                  makeAvatarPlaceholder(topCard.name)
                }
                onError={e => {
                  ;(e.currentTarget as HTMLImageElement).src = makeAvatarPlaceholder(topCard.name)
                }}
                alt={topCard.name}
              />

              {/* Directional Tint Glow Wash */}
              <div
                className="card-tint-wash"
                style={{ background: tintBackground, opacity: tintOpacity }}
              />

              {(topCard.photo_urls?.length || 0) > 1 && (
                <div className="story-bars">
                  {topCard.photo_urls.map((_, idx) => (
                    <div key={idx} className={`story-bar ${idx === photoIdx ? 'active' : ''}`} />
                  ))}
                </div>
              )}

              <div className="card-top-badges">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {topCard.super_liked_me && (
                    <span className="pill-badge super-banner">
                      <StarIcon size={12} /> Super Liked You
                    </span>
                  )}
                  {topCard.is_boosted && !topCard.super_liked_me && (
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
                </div>

                {topCard.compatibility && (
                  <span className="pill-badge match-score">{topCard.compatibility}% Match</span>
                )}
              </div>

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
              {superOpacity > 0.04 && (
                <div className="swipe-stamp super" style={{ opacity: superOpacity }}>
                  SUPER LIKE
                </div>
              )}

              <div className="card-overlay">
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.1 }}>
                        {topCard.name}
                      </span>
                      <span style={{ fontSize: 24, fontWeight: 500, opacity: 0.92 }}>{topCard.age}</span>
                      {topCard.verified !== false && <VerifiedBadge size={20} />}
                    </div>

                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', marginTop: 4, fontWeight: 600 }}>
                      {topCard.school || ''} · Level {topCard.level} · {topCard.course}
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
                      {topCard.distance_km != null && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MapPinIcon size={13} /> {topCard.distance_km} km away
                        </span>
                      )}
                      {topCard.hall && <span>{topCard.hall}</span>}
                    </div>
                  </div>

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
                </div>

                {photoIdx === 1 && topCard.prompts && topCard.prompts[0] ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 13px',
                      borderRadius: 14,
                      background: 'rgba(255, 198, 41, 0.15)',
                      border: '1px solid rgba(255, 198, 41, 0.36)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#FFD84D', textTransform: 'uppercase' }}>
                      {topCard.prompts[0].question}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2, color: '#fff' }}>
                      {topCard.prompts[0].answer}
                    </div>
                  </div>
                ) : (
                  topCard.bio && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13.8,
                        lineHeight: 1.38,
                        color: 'rgba(255,255,255,0.86)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {topCard.bio}
                    </div>
                  )
                )}

                <div className="card-chip-row">
                  {(topCard.explore_vibes || []).slice(0, 2).map(vid => {
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
                  {topCard.looking_for && <span className="card-chip">{topCard.looking_for}</span>}
                  {(topCard.interests || []).slice(0, 2).map(tag => (
                    <span key={tag} className="card-chip">
                      {tag}
                    </span>
                  ))}
                  {topCard.spotify_anthem && (
                    <span className="card-chip">
                      <MusicIcon size={12} /> {topCard.spotify_anthem}
                    </span>
                  )}
                </div>
              </div>
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
              className="dock-btn sm super"
              onClick={() => triggerSwipe('up')}
              title="Super Like (Enter)"
            >
              <StarIcon size={22} />
            </button>

            <button
              className="dock-btn lg like"
              onClick={() => triggerSwipe('right')}
              title="Like (Right Arrow)"
            >
              <HeartIcon size={29} />
            </button>

            <button
              className="dock-btn sm boost"
              onClick={onBoost}
              title="30-minute Campus Spotlight"
              style={isBoosted ? { background: 'var(--boost-grad)', color: '#fff', borderColor: 'transparent' } : undefined}
            >
              <BoltIcon size={20} />
            </button>
          </div>

          <div className="desktop-shortcuts">
            <span><kbd className="kbd-pill">←</kbd>Pass</span>
            <span><kbd className="kbd-pill">→</kbd>Like</span>
            <span><kbd className="kbd-pill">Space</kbd>Next Photo</span>
            <span><kbd className="kbd-pill">↑</kbd>Open Card</span>
            <span><kbd className="kbd-pill">Enter</kbd>Super Like</span>
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
    </div>
  )
}
