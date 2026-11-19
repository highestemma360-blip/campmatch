import React, { useState } from 'react'
import { ProfileCard } from '../types'
import { makeAvatarPlaceholder } from '../constants'
import { HeartIcon, CloseXIcon, VerifiedBadge } from '../components/Icons'

interface LikesYouPageProps {
  items: ProfileCard[]
  locked: boolean
  onSwipeAdmirer: (card: ProfileCard, liked: boolean) => void
  onInspect: (card: ProfileCard) => void
  onUpgradeClick: () => void
}

export function LikesYouPage({
  items,
  locked,
  onSwipeAdmirer,
  onInspect,
  onUpgradeClick,
}: LikesYouPageProps) {
  const visible = items
  return (
    <div className="scroll-pane" style={{ padding: '16px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 23, fontWeight: 900 }}>Likes You</h2>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            background: 'var(--gold-grad)',
            color: '#111',
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          {items.length}
        </span>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--text-secondary)' }}>
        {locked
          ? 'These students have already liked your profile. Upgrade to Campmatch Plus to reveal them.'
          : 'Like back anyone in your Beeline for an immediate match.'}
      </p>

      {visible.length === 0 ? (
        <div
          style={{
            padding: '54px 20px',
            textAlign: 'center',
            background: 'var(--bg-elevated)',
            borderRadius: 22,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16.5 }}>No Pending Likes Yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 6 }}>
            Keep swiping or activate Campus Spotlight to appear first in nearby decks.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {visible.map(card => (
            <div
              key={card.id}
              onClick={() => {
                if (card.blurred || locked) onUpgradeClick()
                else onInspect(card)
              }}
              style={{
                position: 'relative',
                aspectRatio: '3 / 4.2',
                borderRadius: 20,
                overflow: 'hidden',
                background: '#1a1e2a',
                border: '1.5px solid rgba(255, 198, 41, 0.32)',
                cursor: 'pointer',
                boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
              }}
            >
              <img
                src={card.photo_urls?.[0] || makeAvatarPlaceholder(card.name)}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: card.blurred || locked ? 'blur(18px) scale(1.1)' : 'none',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(transparent 48%, rgba(8,9,13,0.92) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: 12,
                  color: '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 15 }}>
                  <span>
                    {card.name}, {card.age}
                  </span>
                  {!card.blurred && !locked && <VerifiedBadge size={15} />}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.78)', marginTop: 2 }}>
                  Level {card.level} · {card.school || ''}
                </div>

                {!card.blurred && !locked && (
                  <div
                    style={{ display: 'flex', gap: 8, marginTop: 10 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onSwipeAdmirer(card, false)}
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(0,0,0,0.45)',
                        color: '#ff5a67',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CloseXIcon size={16} />
                    </button>
                    <button
                      onClick={() => onSwipeAdmirer(card, true)}
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 999,
                        border: 'none',
                        background: 'var(--brand-grad)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <HeartIcon size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {locked && (
        <div style={{ position: 'sticky', bottom: 12, marginTop: 20 }}>
          <button className="btn-gold" onClick={onUpgradeClick}>
            Reveal Who Likes You — Get Plus
          </button>
        </div>
      )}
    </div>
  )
}
