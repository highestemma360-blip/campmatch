import React from 'react'
import { ProfileCard } from '../types'
import { makeAvatarPlaceholder, EXPLORE_MAP } from '../constants'
import {
  VerifiedBadge,
  ChevronDownIcon,
  CloseXIcon,
  StarIcon,
  HeartIcon,
  ShieldIcon,
  MapPinIcon,
  MusicIcon,
} from './Icons'

interface ProfileSheetProps {
  profile: ProfileCard
  onClose: () => void
  onAction?: (action: 'nope' | 'super' | 'like') => void
  onReport?: (profile: ProfileCard) => void
  onBlock?: (profile: ProfileCard) => void
  previewOnly?: boolean
}

export function ProfileSheet({
  profile,
  onClose,
  onAction,
  onReport,
  onBlock,
  previewOnly = false,
}: ProfileSheetProps) {
  const photos = profile.photo_urls?.length
    ? profile.photo_urls
    : [makeAvatarPlaceholder(profile.name)]

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="profile-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ position: 'relative', height: 420 }}>
          <img
            src={photos[0]}
            onError={e => {
              ;(e.currentTarget as HTMLImageElement).src = makeAvatarPlaceholder(profile.name)
            }}
            alt={profile.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 35%, rgba(10,12,18,0.94) 100%)',
            }}
          />

          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 'calc(16px + env(safe-area-inset-top, 0px))',
              right: 16,
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: 'var(--brand-grad)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
            }}
            aria-label="Close profile"
          >
            <ChevronDownIcon size={22} />
          </button>

          <div style={{ position: 'absolute', bottom: 18, left: 20, right: 20, color: '#fff' }}>
            {profile.compatibility && (
              <span className="pill-badge match-score" style={{ marginBottom: 8 }}>
                {profile.compatibility}% Compatibility
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 30, fontWeight: 800 }}>
                {profile.name}, {profile.age}
              </span>
              {profile.verified !== false && <VerifiedBadge size={21} />}
            </div>
            <div style={{ fontSize: 14.5, opacity: 0.9, marginTop: 3, fontWeight: 600 }}>
              {profile.school || ''} · Level {profile.level} · {profile.course}
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 20px calc(105px + env(safe-area-inset-bottom, 0px))' }}>
          {profile.explore_vibes && profile.explore_vibes.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div className="field-label" style={{ marginTop: 0 }}>Opted Into Explore Rooms</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {profile.explore_vibes.map(vid => {
                  const room = EXPLORE_MAP[vid]
                  if (!room) return null
                  return (
                    <span
                      key={vid}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        background: room.gradient,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {room.title}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {profile.looking_for && (
            <div
              style={{
                padding: '13px 16px',
                borderRadius: 16,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Looking For
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 2 }}>{profile.looking_for}</div>
            </div>
          )}

          {profile.bio && (
            <div style={{ marginBottom: 20 }}>
              <div className="field-label" style={{ marginTop: 0 }}>About</div>
              <div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-primary)' }}>
                {profile.bio}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div className="field-label">Campus & Details</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span className="selectable-chip selected">{profile.school || ''}</span>
              <span className="selectable-chip">Level {profile.level}</span>
              {profile.hall && <span className="selectable-chip">{profile.hall}</span>}
              {profile.distance_km != null && (
                <span className="selectable-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MapPinIcon size={13} /> {profile.distance_km} km away
                </span>
              )}
              {profile.height && <span className="selectable-chip">{profile.height}</span>}
              {profile.zodiac && <span className="selectable-chip">{profile.zodiac}</span>}
            </div>
          </div>

          {profile.prompts?.[0] && (
            <div className="bumble-prompt-card">
              <div className="bumble-prompt-q">{profile.prompts[0].question}</div>
              <div className="bumble-prompt-a">{profile.prompts[0].answer}</div>
            </div>
          )}

          {photos[1] && (
            <img
              src={photos[1]}
              alt=""
              style={{
                width: '100%',
                height: 360,
                objectFit: 'cover',
                borderRadius: 20,
                margin: '14px 0',
                display: 'block',
              }}
            />
          )}

          {profile.interests && profile.interests.length > 0 && (
            <div style={{ margin: '18px 0' }}>
              <div className="field-label">Interests</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {profile.interests.map(interest => (
                  <span key={interest} className="selectable-chip selected">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.prompts?.[1] && (
            <div className="bumble-prompt-card">
              <div className="bumble-prompt-q">{profile.prompts[1].question}</div>
              <div className="bumble-prompt-a">{profile.prompts[1].answer}</div>
            </div>
          )}

          {photos.slice(2).map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt=""
              style={{
                width: '100%',
                height: 340,
                objectFit: 'cover',
                borderRadius: 20,
                margin: '14px 0',
                display: 'block',
              }}
            />
          ))}

          {profile.opening_move && (
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 18,
                padding: 16,
                margin: '16px 0',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#ffc629', textTransform: 'uppercase', marginBottom: 4 }}>
                Opening Move
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{profile.opening_move}</div>
            </div>
          )}

          {profile.spotify_anthem && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 16,
                background: 'rgba(29, 185, 84, 0.1)',
                border: '1px solid rgba(29, 185, 84, 0.3)',
                marginTop: 14,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#1DB954',
                  color: '#08090d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MusicIcon size={18} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#1DB954', textTransform: 'uppercase' }}>
                  Anthem
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{profile.spotify_anthem}</div>
              </div>
            </div>
          )}

          {!previewOnly && (onBlock || onReport) && (
            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              {onBlock && (
                <button
                  onClick={() => onBlock(profile)}
                  style={{
                    flex: 1,
                    padding: 13,
                    borderRadius: 14,
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  Block {profile.name.split(' ')[0]}
                </button>
              )}
              {onReport && (
                <button
                  onClick={() => onReport(profile)}
                  style={{
                    flex: 1,
                    padding: 13,
                    borderRadius: 14,
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: '#ff5a67',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <ShieldIcon size={15} /> Report Profile
                </button>
              )}
            </div>
          )}
        </div>

        {!previewOnly && onAction && (
          <div
            className="safe-bottom"
            style={{
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '14px 20px calc(18px + env(safe-area-inset-bottom, 0px))',
              background: 'linear-gradient(transparent, var(--bg-app) 40%)',
              display: 'flex',
              justifyContent: 'center',
              gap: 18,
            }}
          >
            <button
              className="dock-btn lg nope icon-btn"
              onClick={() => {
                onClose()
                onAction('nope')
              }}
              aria-label={`Pass on ${profile.name}`}
            >
              <CloseXIcon size={28} />
            </button>
            <button
              className="dock-btn sm super icon-btn"
              style={{ alignSelf: 'center', width: 56, height: 56 }}
              onClick={() => {
                onClose()
                onAction('super')
              }}
              aria-label={`Super Like ${profile.name}`}
            >
              <StarIcon size={24} />
            </button>
            <button
              className="dock-btn lg like icon-btn"
              onClick={() => {
                onClose()
                onAction('like')
              }}
              aria-label={`Like ${profile.name}`}
            >
              <HeartIcon size={30} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
