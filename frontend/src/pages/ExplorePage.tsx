import React, { useState, useEffect } from 'react'
import { EXPLORE_VIBES, ExploreVibe, makeAvatarPlaceholder } from '../constants'
import { ProfileCard } from '../types'
import {
  BoltIcon,
  ExploreRoomIcon,
  PlusIcon,
  CheckIcon,
  ArrowLeftIcon,
  HeartIcon,
  CloseXIcon,
  VerifiedBadge,
} from '../components/Icons'

interface ExplorePageProps {
  token: string
  rooms?: ExploreVibe[]
  counts: Record<string, number>
  optedIn: string[]
  onToggleOptIn: (vibeId: string) => Promise<void>
  onLaunchSwipeRoom: (vibe: ExploreVibe) => void
  onSwipeMember: (member: ProfileCard, liked: boolean) => Promise<void>
  onInspect: (card: ProfileCard) => void
  onBoostClick: () => void
}

export function ExplorePage({
  token,
  rooms,
  counts,
  optedIn,
  onToggleOptIn,
  onLaunchSwipeRoom,
  onSwipeMember,
  onInspect,
  onBoostClick,
}: ExplorePageProps) {
  const catalogue = rooms && rooms.length > 0 ? rooms : EXPLORE_VIBES
  const [selectedRoom, setSelectedRoom] = useState<ExploreVibe | null>(null)
  const [members, setMembers] = useState<ProfileCard[]>([])
  const [loadingRoom, setLoadingRoom] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedRoom) return
    loadRoomMembers(selectedRoom.id)
  }, [selectedRoom?.id])

  async function loadRoomMembers(vibeId: string) {
    setLoadingRoom(true)
    try {
      const r = await fetch(`/api/explore/${vibeId}/members`, {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (r.ok) {
        const d = await r.json()
        setMembers(d.members || [])
      }
    } finally {
      setLoadingRoom(false)
    }
  }

  async function handleOptInClick(e: React.MouseEvent, vibeId: string) {
    e.stopPropagation()
    setTogglingId(vibeId)
    try {
      await onToggleOptIn(vibeId)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleMemberAction(member: ProfileCard, liked: boolean) {
    setMembers(prev =>
      prev.map(m => (m.id === member.id ? { ...m, already_swiped: true, already_liked: liked } : m))
    )
    await onSwipeMember(member, liked)
  }

  // INSIDE-ROOM VIEW: See everyone opted in + Opt-in toggle + Launch Swipe Stack
  if (selectedRoom) {
    const isJoined = optedIn.includes(selectedRoom.id)
    const unswipedCount = members.filter(m => !m.already_swiped).length

    return (
      <div className="scroll-pane" style={{ padding: '14px 16px 32px' }}>
        {/* Room Banner Header */}
        <div
          style={{
            background: selectedRoom.gradient,
            borderRadius: 22,
            padding: '18px 18px 20px',
            color: '#fff',
            marginBottom: 16,
            boxShadow: '0 14px 32px rgba(0,0,0,0.28)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <button
              onClick={() => setSelectedRoom(null)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(0,0,0,0.28)',
                color: '#fff',
                fontSize: 12.5,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ArrowLeftIcon size={15} /> All Rooms
            </button>

            <button
              disabled={togglingId === selectedRoom.id}
              onClick={e => handleOptInClick(e, selectedRoom.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                border: isJoined ? '1px solid rgba(255,255,255,0.4)' : 'none',
                background: isJoined ? 'rgba(0,0,0,0.38)' : '#ffffff',
                color: isJoined ? '#ffffff' : '#11141d',
                fontSize: 12.5,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {isJoined ? <CheckIcon size={13} /> : <PlusIcon size={13} />}
              {isJoined ? 'Opted In' : 'Opt In'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ExploreRoomIcon id={selectedRoom.id} icon={selectedRoom.icon} size={22} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15 }}>{selectedRoom.title}</div>
              <div style={{ fontSize: 13, opacity: 0.88, marginTop: 2 }}>{selectedRoom.subtitle}</div>
            </div>
          </div>

          {unswipedCount > 0 && (
            <button
              onClick={() => onLaunchSwipeRoom(selectedRoom)}
              style={{
                marginTop: 14,
                width: '100%',
                padding: '11px 16px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.28)',
                background: 'rgba(255,255,255,0.16)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Swipe {unswipedCount} {unswipedCount === 1 ? 'Profile' : 'Profiles'} in Card Stack
            </button>
          )}
        </div>

        {/* Opt-in visibility notice when user hasn't joined */}
        {!isJoined && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              You are browsing <strong>{selectedRoom.title}</strong>. Opt in so other students here can see your card too.
            </div>
            <button
              onClick={e => handleOptInClick(e, selectedRoom.id)}
              className="btn-brand"
              style={{ width: 'auto', padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
            >
              Join Room
            </button>
          </div>
        )}

        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
          Opted-In Students ({members.length})
        </div>

        {loadingRoom ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
            Loading students in {selectedRoom.title}...
          </div>
        ) : members.length === 0 ? (
          <div
            style={{
              padding: '46px 20px',
              textAlign: 'center',
              background: 'var(--bg-elevated)',
              borderRadius: 20,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16 }}>Be the First Here</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
              {isJoined
                ? 'You are opted in. Other students joining this room will appear right here.'
                : `Opt into ${selectedRoom.title} so students looking for this vibe can find you first.`}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {members.map(m => (
              <div
                key={m.id}
                onClick={() => onInspect(m)}
                style={{
                  position: 'relative',
                  aspectRatio: '3 / 4.2',
                  borderRadius: 20,
                  overflow: 'hidden',
                  background: '#161923',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
                }}
              >
                <img
                  src={m.photo_urls?.[0] || makeAvatarPlaceholder(m.name)}
                  alt={m.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {m.online && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: 'rgba(10,12,18,0.72)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span className="active-dot" style={{ width: 6, height: 6 }} /> Online
                  </span>
                )}

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(transparent 46%, rgba(8,9,13,0.94) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: 12,
                    color: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 15 }}>
                    <span>
                      {m.name}, {m.age}
                    </span>
                    <VerifiedBadge size={14} />
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.78)', marginTop: 2 }}>
                    {m.school || 'UMaT'} · L{m.level}
                  </div>

                  {m.already_swiped ? (
                    <div
                      style={{
                        marginTop: 9,
                        padding: '6px 0',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.12)',
                        textAlign: 'center',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: m.already_liked ? '#4ade80' : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {m.already_liked ? 'Liked' : 'Passed'}
                    </div>
                  ) : (
                    <div
                      style={{ display: 'flex', gap: 8, marginTop: 9 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleMemberAction(m, false)}
                        style={{
                          flex: 1,
                          height: 34,
                          borderRadius: 999,
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: 'rgba(0,0,0,0.45)',
                          color: '#ff5a67',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CloseXIcon size={15} />
                      </button>
                      <button
                        onClick={() => handleMemberAction(m, true)}
                        style={{
                          flex: 1,
                          height: 34,
                          borderRadius: 999,
                          border: 'none',
                          background: 'var(--brand-grad)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <HeartIcon size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // MAIN EXPLORE GRID: 6 Opt-In Rooms
  return (
    <div className="scroll-pane" style={{ padding: '16px 16px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 23, fontWeight: 900, letterSpacing: '-0.5px' }}>
            Explore Rooms
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Opt into what you want right now and browse others in the same room.
          </p>
        </div>
        {optedIn.length > 0 && (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              color: 'var(--tinder-pink)',
              whiteSpace: 'nowrap',
            }}
          >
            {optedIn.length} active
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {catalogue.map(vibe => {
          const count = counts[vibe.id] || 0
          const isJoined = optedIn.includes(vibe.id)
          return (
            <div
              key={vibe.id}
              onClick={() => setSelectedRoom(vibe)}
              style={{
                background: vibe.gradient,
                borderRadius: 20,
                padding: 15,
                minHeight: 186,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: '#fff',
                cursor: 'pointer',
                position: 'relative',
                border: isJoined ? `2px solid ${vibe.accent}` : '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 12px 26px rgba(0,0,0,0.24)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ExploreRoomIcon id={vibe.id} icon={vibe.icon} size={19} />
                </div>

                <button
                  type="button"
                  disabled={togglingId === vibe.id}
                  onClick={e => handleOptInClick(e, vibe.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    border: isJoined ? '1px solid rgba(255,255,255,0.45)' : 'none',
                    background: isJoined ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.95)',
                    color: isJoined ? '#fff' : '#11141d',
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {isJoined ? <CheckIcon size={11} /> : <PlusIcon size={11} />}
                  {isJoined ? 'Joined' : 'Opt In'}
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>{vibe.title}</div>
                <div style={{ fontSize: 11.8, opacity: 0.85, marginTop: 4, lineHeight: 1.35 }}>
                  {vibe.subtitle}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    fontWeight: 800,
                    color: vibe.accent,
                  }}
                >
                  <span>{count} {count === 1 ? 'student' : 'students'}</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>View →</span>
                </div>
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
            Appear first across Discover and every Explore room you joined for 30m.
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
          <BoltIcon size={14} /> Boost
        </button>
      </div>
    </div>
  )
}
