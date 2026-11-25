import React, { useState, useEffect } from 'react'
import { CurrentUser, ProfileCard, PromptItem } from '../types'
import {
  LEVELS,
  LOOKING_FOR_OPTIONS,
  CAMPUS_INTERESTS,
  ZODIAC_SIGNS,
  EXPLORE_VIBES,
  ExploreVibe,
  makeAvatarPlaceholder,
} from '../constants'
import {
  VerifiedBadge,
  CloseXIcon,
  ChevronDownIcon,
  MapPinIcon,
  MusicIcon,
  ArrowLeftIcon,
  BoltIcon,
  HeartIcon,
  CloseXIcon as CloseIcon,
} from '../components/Icons'

interface ProfileCardViewProps {
  me: CurrentUser | null
  token: string
  onClose: () => void
}

export function ProfileCardView({ me = null as CurrentUser | null, token, onClose }: ProfileCardViewProps) {
  const [isMine, setIsMine] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  // If no me passed (viewing someone else's card from deck), we can't view it here
  // This page is specifically for viewing YOUR OWN card as others see it
  if (!me) {
    return (
      <div className="scroll-pane" style={{ padding: '40px 16px', textAlign: 'center', minHeight: '100dvh' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(10,12,18,0.7)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 30,
            backdropFilter: 'blur(8px)',
          }}
        >
          <ArrowLeftIcon size={20} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 20 }}>
          Your Card
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>
          Sign in to view your profile card as others see it.
        </div>
      </div>
    )
  }

  const photos = me.photo_urls?.length ? me.photo_urls : [makeAvatarPlaceholder(me.name)]
  const [photoIdx, setPhotoIdx] = useState(0)

  return (
    <div className="scroll-pane" style={{ padding: '0', minHeight: '100dvh', overflow: 'hidden' }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(10,12,18,0.7)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 30,
          backdropFilter: 'blur(8px)',
        }}
      >
        <ArrowLeftIcon size={20} />
      </button>

      {/* Card - full width, centered, like Tinder deck card but full page */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        padding: '24px 16px',
        background: 'var(--bg-app)',
      }}>
        <div style={{
          position: 'relative',
          aspectRatio: '3 / 4.2',
          width: '100%',
          maxWidth: 420,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const relX = e.clientX - rect.left
              if (relX < rect.width / 2) setPhotoIdx(i => Math.max(0, i - 1))
              else setPhotoIdx(i => (i + 1) % photos.length)
            }}
            style={{ width: '100%', height: '100%', position: 'relative', cursor: 'pointer' }}
          >
            <img
              src={photos[photoIdx] || photos[0]}
              alt={me.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {photos.length > 1 && (
              <div className="story-bars">
                {photos.map((_, idx) => (
                  <div
                    key={idx}
                    className={`story-bar ${idx === photoIdx ? 'active' : ''}`}
                  />
                ))}
              </div>
            )}
            {/* Photo swipe hint */}
            <div style={{
              position: 'absolute',
              top: 12,
              left: 12,
              right: 12,
              display: 'flex',
              justifyContent: 'space-between',
              pointerEvents: 'none',
              opacity: photoIdx > 0 || photoIdx < photos.length - 1 ? 0.6 : 0,
              transition: 'opacity 0.2s ease',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 50,
                background: 'rgba(0,0,0,0.4)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: 50,
                background: 'rgba(0,0,0,0.4)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          </div>
          {/* Card info overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(transparent 46%, rgba(8,9,13,0.94) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '20px',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <span style={{ fontSize: 27, fontWeight: 800 }}>{me.name || 'Your Name'}</span>
              <span style={{ fontSize: 23, opacity: 0.92 }}>{me.age}</span>
              {me.verified !== false && <VerifiedBadge size={20} />}
            </div>
            <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 3, fontWeight: 600 }}>
              {me.school || ''} · Level {me.level} · {me.course}
            </div>
            {me.hall && (
              <div style={{ fontSize: 12.5, opacity: 0.78, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPinIcon size={12} /> {me.hall}
              </div>
            )}
            {me.distance_km != null && (
              <div style={{ fontSize: 12.5, opacity: 0.78, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 50, background: 'var(--tinder-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }} />
                  {me.distance_km} km away
                </span>
              </div>
            )}
            {me.distance_km == null && (
              <div style={{ fontSize: 12.5, opacity: 0.78, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Distance not set</span>
              </div>
            )}
            {me.bio && (
              <div style={{ fontSize: 13.5, opacity: 0.88, marginTop: 10, lineHeight: 1.4, maxHeight: 120, overflow: 'hidden' }}>
                {me.bio}
              </div>
            )}
            <div className="card-chip-row" style={{ marginTop: 10 }}>
              <span className="card-chip">{me.looking_for}</span>
              {me.interests?.slice(0, 4).map(t => (
                <span key={t} className="card-chip">{t}</span>
              ))}
              {me.spotify_anthem && (
                <span className="card-chip">
                  <MusicIcon size={11} /> {me.spotify_anthem}
                </span>
              )}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(me.explore_vibes || []).slice(0, 3).map(vid => {
                const vibe = EXPLORE_VIBES.find(v => v.id === vid)
                return vibe ? (
                  <span key={vid} className="card-chip" style={{ borderColor: 'rgba(255,170,0,0.4)', color: '#ffd84d' }}>
                    {vibe.title}
                  </span>
                ) : null
              })}
            </div>
            <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.75, display: 'flex', gap: 8 }}>
              <span>Mode: {me.mode}</span>
              <span>{me.is_premium ? 'Plus Member' : 'Free'}</span>
              {me.is_boosted && <span style={{ color: 'var(--boost-purple)', fontWeight: 700 }}>Spotlight Active</span>}
            </div>
          </div>
        </div>

        {/* Action buttons below card */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => setShowEdit(true)}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Edit Profile
          </button>
          <button
            onClick={() => {
              window.open(`https://wa.me/?text=Check out my Campmatch profile: ${window.location.origin}/profile`, '_blank')
            }}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: 'none',
              background: '#25d366',
              color: '#fff',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(37,211,102,0.3)',
            }}
          >
            Share Profile
          </button>
        </div>

        {/* Edit hint */}
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          Edit your profile to update what others see on your card.
        </div>
      </div>
    </div>
  )
}
