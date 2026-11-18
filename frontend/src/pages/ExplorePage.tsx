import React from 'react'
import { EXPLORE_VIBES, ExploreVibe } from '../constants'
import { BoltIcon } from '../components/Icons'

interface ExplorePageProps {
  counts: Record<string, number>
  onSelectVibe: (vibe: ExploreVibe) => void
  onBoostClick: () => void
}

export function ExplorePage({ counts, onSelectVibe, onBoostClick }: ExplorePageProps) {
  return (
    <div className="scroll-pane" style={{ padding: '16px 16px 28px' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 23, fontWeight: 900, letterSpacing: '-0.5px' }}>
          Explore
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
          Browse students by shared goals, academic life, or campus plans.
        </p>
      </div>

      <div
        onClick={() => onSelectVibe(EXPLORE_VIBES[1])}
        style={{
          borderRadius: 22,
          padding: '22px 20px',
          background: 'linear-gradient(135deg, #FD267A 0%, #FF6036 60%, #F59E0B 100%)',
          color: '#fff',
          marginBottom: 18,
          cursor: 'pointer',
          boxShadow: '0 16px 34px rgba(253, 38, 122, 0.28)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(0,0,0,0.26)',
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 0.7,
          }}
        >
          FEATURED ROOM
        </span>
        <div style={{ fontSize: 23, fontWeight: 900, marginTop: 8, lineHeight: 1.15 }}>
          Free This Evening
        </div>
        <div style={{ fontSize: 13.5, opacity: 0.92, marginTop: 6, maxWidth: 290 }}>
          Connect with students who are open for food, walks, or evening plans around campus.
        </div>
        <div
          style={{
            marginTop: 14,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 16px',
            borderRadius: 999,
            background: '#fff',
            color: '#111',
            fontWeight: 800,
            fontSize: 12.5,
          }}
        >
          Open Deck
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {EXPLORE_VIBES.map(vibe => {
          const c = counts[vibe.id]
          return (
            <div
              key={vibe.id}
              onClick={() => onSelectVibe(vibe)}
              style={{
                background: vibe.gradient,
                borderRadius: 20,
                padding: 16,
                minHeight: 156,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 10px 24px rgba(0,0,0,0.2)',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.26)',
                    letterSpacing: 0.5,
                  }}
                >
                  {vibe.tag}
                </span>
              </div>

              <div>
                <div style={{ fontSize: 16.5, fontWeight: 800, lineHeight: 1.2 }}>{vibe.title}</div>
                <div style={{ fontSize: 12, opacity: 0.86, marginTop: 4, lineHeight: 1.35 }}>
                  {vibe.subtitle}
                </div>
                {typeof c === 'number' && c > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 800, marginTop: 8, color: '#FFD84D' }}>
                    {c} active
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 18,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 14.5 }}>Campus Spotlight</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
            Place your profile at the front of nearby student decks for 30 minutes.
          </div>
        </div>
        <button
          onClick={onBoostClick}
          style={{
            padding: '9px 15px',
            borderRadius: 999,
            border: 'none',
            background: 'var(--boost-grad)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 12.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
          }}
        >
          <BoltIcon size={14} /> Activate
        </button>
      </div>
    </div>
  )
}
