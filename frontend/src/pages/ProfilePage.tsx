import React, { useState } from 'react'
import { CurrentUser, PlusConfig } from '../types'
import {
  LEVELS,
  LOOKING_FOR_OPTIONS,
  CAMPUS_INTERESTS,
  BUMBLE_PROMPTS,
  OPENING_MOVES,
  ZODIAC_SIGNS,
  TERMS_SUMMARY,
  PRIVACY_SUMMARY,
  makeAvatarPlaceholder,
} from '../constants'
import { precheckProfileImage } from '../utils/imageCheck'
import { VerifiedBadge, CloseXIcon, CheckCircleIcon } from '../components/Icons'

interface ProfilePageProps {
  me: CurrentUser
  token: string
  theme: string
  plusConfig: PlusConfig
  onToggleTheme: () => void
  onSaveProfile: (updated: Partial<CurrentUser>) => Promise<void>
  onUploadPhotos: (files: File[]) => Promise<{ ok: boolean; error?: string }>
  onRemovePhoto: (url: string) => Promise<void>
  onPreviewMyCard: () => void
  onOpenPlus: () => void
  onOpenFilters: () => void
  onOpenDeleteAccount: () => void
  onTokenUpdated: (newToken: string) => void
  onLogout: () => void
}

export function ProfilePage({
  me,
  token,
  theme,
  plusConfig,
  onToggleTheme,
  onSaveProfile,
  onUploadPhotos,
  onRemovePhoto,
  onPreviewMyCard,
  onOpenPlus,
  onOpenFilters,
  onOpenDeleteAccount,
  onTokenUpdated,
  onLogout,
}: ProfilePageProps) {
  const [subTab, setSubTab] = useState<'overview' | 'edit' | 'security'>('overview')
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMsg, setPhotoMsg] = useState('')
  const [legal, setLegal] = useState<'terms' | 'privacy' | null>(null)

  // Editable profile fields
  const [name, setName] = useState(me.name || '')
  const [age, setAge] = useState(me.age || 20)
  const [level, setLevel] = useState(me.level || '200')
  const [course, setCourse] = useState(me.course || '')
  const [hall, setHall] = useState(me.hall || '')
  const [bio, setBio] = useState(me.bio || '')
  const [lookingFor, setLookingFor] = useState(me.looking_for || 'Long-term partner')
  const [interests, setInterests] = useState<string[]>(me.interests || [])
  const [promptQ, setPromptQ] = useState(me.prompts?.[0]?.question || BUMBLE_PROMPTS[0])
  const [promptA, setPromptA] = useState(me.prompts?.[0]?.answer || '')
  const [openingMove, setOpeningMove] = useState(me.opening_move || OPENING_MOVES[0])
  const [zodiac, setZodiac] = useState(me.zodiac || '')
  const [height, setHeight] = useState(me.height || '')
  const [spotifyAnthem, setSpotifyAnthem] = useState(me.spotify_anthem || '')

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwStatus, setPwStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  function toggleInterest(tag: string) {
    setInterests(prev => {
      if (prev.includes(tag)) return prev.filter(t => t !== tag)
      if (prev.length >= 8) return prev
      return [...prev, tag]
    })
  }

  async function handleFileInput(files: FileList | null) {
    if (!files || files.length === 0) return
    setPhotoMsg('')
    setPhotoBusy(true)
    try {
      const valid: File[] = []
      for (const f of Array.from(files)) {
        const check = await precheckProfileImage(f)
        if (!check.ok) {
          setPhotoMsg(check.reason || 'Image rejected.')
          if (files.length === 1) return
        } else {
          valid.push(f)
        }
      }
      if (valid.length === 0) return
      const res = await onUploadPhotos(valid)
      if (!res.ok && res.error) {
        setPhotoMsg(res.error)
      }
    } finally {
      setPhotoBusy(false)
    }
  }

  async function saveChanges() {
    setSaving(true)
    try {
      await onSaveProfile({
        name,
        age: Number(age),
        level,
        course,
        hall,
        bio,
        looking_for: lookingFor,
        interests,
        prompts: promptA.trim() ? [{ question: promptQ, answer: promptA.trim() }] : [],
        opening_move: openingMove,
        zodiac,
        height,
        spotify_anthem: spotifyAnthem,
      })
      setSubTab('overview')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwStatus(null)
    const r = await fetch('/api/account/password', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    })
    const d = await r.json()
    if (!r.ok) {
      setPwStatus({ ok: false, msg: d.detail || 'Password update failed.' })
    } else {
      if (d.token) onTokenUpdated(d.token)
      setCurrentPassword('')
      setNewPassword('')
      setPwStatus({ ok: true, msg: 'Password updated.' })
    }
  }

  const pct = me.completion_pct || 80

  return (
    <div className="scroll-pane" style={{ padding: '20px 18px 34px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 18 }}>
        <div
          style={{
            width: 112,
            height: 112,
            borderRadius: '50%',
            padding: 4,
            background: `conic-gradient(#FD267A ${pct}%, var(--bg-subtle) 0)`,
            position: 'relative',
            marginBottom: 14,
          }}
        >
          <img
            src={me.photo_urls?.[0] || makeAvatarPlaceholder(me.name)}
            alt={me.name}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--bg-app)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--brand-grad)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 900,
              padding: '3px 10px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
            }}
          >
            {pct}% COMPLETE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 22, fontWeight: 900 }}>
          <span>
            {me.name}, {me.age}
          </span>
          <VerifiedBadge size={19} />
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 2 }}>
          {me.school || 'UMaT'} · Level {me.level} · {me.course}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 20 }}>
        <button
          className={`selectable-chip ${subTab === 'overview' ? 'selected' : ''}`}
          style={{ padding: '8px 6px', fontSize: 12 }}
          onClick={() => setSubTab('overview')}
        >
          Overview
        </button>
        <button
          className={`selectable-chip ${subTab === 'edit' ? 'selected' : ''}`}
          style={{ padding: '8px 6px', fontSize: 12 }}
          onClick={() => setSubTab('edit')}
        >
          Edit Profile
        </button>
        <button
          className="selectable-chip"
          style={{ padding: '8px 6px', fontSize: 12 }}
          onClick={onPreviewMyCard}
        >
          Preview
        </button>
        <button
          className={`selectable-chip ${subTab === 'security' ? 'selected' : ''}`}
          style={{ padding: '8px 6px', fontSize: 12 }}
          onClick={() => setSubTab('security')}
        >
          Account
        </button>
      </div>

      {subTab === 'overview' && (
        <>
          <div
            onClick={onOpenPlus}
            style={{
              background: 'linear-gradient(135deg, #241c06 0%, #4a3508 55%, #d97706 135%)',
              borderRadius: 20,
              padding: 20,
              color: '#fff',
              marginBottom: 16,
              cursor: 'pointer',
              border: '1px solid rgba(255, 216, 77, 0.32)',
              boxShadow: '0 14px 32px rgba(0,0,0,0.24)',
            }}
          >
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                background: 'var(--gold-grad)',
                color: '#111',
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 0.6,
              }}
            >
              {me.is_premium ? 'PLUS ACTIVE' : 'CAMPMATCH PLUS'}
            </span>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 10 }}>
              {me.is_premium ? 'Unlimited Swipes & Full Beeline Access' : 'Unlimited Swipes, Rewind & Beeline'}
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              {plusConfig.enabled && !me.is_premium
                ? `${plusConfig.duration_days} days for GHS ${plusConfig.price_ghs.toFixed(2)} · Free tier includes ${plusConfig.free_daily_swipe_limit} daily swipes`
                : 'View membership details'}
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 18,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div className="field-label" style={{ marginTop: 0 }}>Settings</div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Snooze Mode</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {me.snoozed ? 'Your card is hidden from new decks' : 'Visible to matching students'}
                </div>
              </div>
              <button
                className="btn-ghost"
                style={{ padding: '7px 14px', fontSize: 12 }}
                onClick={() => onSaveProfile({ snoozed: !me.snoozed })}
              >
                {me.snoozed ? 'Resume' : 'Pause Card'}
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Appearance</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {theme === 'dark' ? 'Dark theme' : 'Light theme'}
                </div>
              </div>
              <button className="btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={onToggleTheme}>
                {theme === 'dark' ? 'Switch Light' : 'Switch Dark'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Discovery Filters</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Ages {me.min_age}–{me.max_age} · Max {me.max_distance_km || 50} km
                </div>
              </div>
              <button className="btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={onOpenFilters}>
                Adjust
              </button>
            </div>
          </div>

          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: 13,
              borderRadius: 14,
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            Sign Out
          </button>

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            <button
              onClick={() => setLegal('terms')}
              style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', marginRight: 14 }}
            >
              Terms of Service
            </button>
            <button
              onClick={() => setLegal('privacy')}
              style={{ border: 'none', background: 'none', color: 'var(--text-secondary)' }}
            >
              Privacy Policy
            </button>
          </div>
        </>
      )}

      {subTab === 'edit' && (
        <div>
          <label className="field-label" style={{ marginTop: 0 }}>Verified Photos (1–6)</label>
          {photoMsg && (
            <div
              style={{
                marginBottom: 10,
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(255, 68, 88, 0.14)',
                border: '1px solid rgba(255, 68, 88, 0.35)',
                color: '#ff6b7a',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {photoMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {Array.from({ length: 6 }).map((_, idx) => {
              const url = me.photo_urls?.[idx]
              return url ? (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    aspectRatio: '3 / 4',
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: idx === 0 ? '2px solid var(--tinder-pink)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 5,
                      left: 5,
                      background: 'rgba(15,17,23,0.75)',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 99,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <CheckCircleIcon size={10} /> {idx === 0 ? 'MAIN' : 'OK'}
                  </span>
                  {(me.photo_urls?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemovePhoto(url)}
                      style={{
                        position: 'absolute',
                        top: 5,
                        right: 5,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(0,0,0,0.72)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CloseXIcon size={12} />
                    </button>
                  )}
                </div>
              ) : (
                <label
                  key={idx}
                  style={{
                    aspectRatio: '3 / 4',
                    borderRadius: 14,
                    border: '2px dashed var(--border-strong)',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    color: 'var(--tinder-pink)',
                    cursor: photoBusy ? 'wait' : 'pointer',
                  }}
                >
                  {photoBusy && idx === (me.photo_urls?.length || 0) ? (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Checking...</span>
                  ) : (
                    '+'
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    disabled={photoBusy}
                    onChange={e => {
                      handleFileInput(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label className="field-label">Name</label>
              <input className="modern-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Age</label>
              <input type="number" className="modern-input" value={age} onChange={e => setAge(Number(e.target.value))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <div>
              <label className="field-label">Level</label>
              <select className="modern-select" value={level} onChange={e => setLevel(e.target.value)}>
                {LEVELS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Programme</label>
              <input className="modern-input" value={course} onChange={e => setCourse(e.target.value)} />
            </div>
          </div>

          <label className="field-label">Hall / Hostel</label>
          <input className="modern-input" value={hall} onChange={e => setHall(e.target.value)} placeholder="e.g. KT Hall" />

          <label className="field-label">About</label>
          <textarea className="modern-textarea" rows={3} value={bio} onChange={e => setBio(e.target.value)} />

          <label className="field-label">Looking For</label>
          <select className="modern-select" value={lookingFor} onChange={e => setLookingFor(e.target.value)}>
            {LOOKING_FOR_OPTIONS.map(o => (
              <option key={o.label} value={o.label}>{o.label}</option>
            ))}
          </select>

          <label className="field-label">Profile Prompt</label>
          <select className="modern-select" value={promptQ} onChange={e => setPromptQ(e.target.value)}>
            {BUMBLE_PROMPTS.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
          <input
            className="modern-input"
            style={{ marginTop: 8 }}
            placeholder="Your answer..."
            value={promptA}
            onChange={e => setPromptA(e.target.value)}
          />

          <label className="field-label">Opening Move</label>
          <select className="modern-select" value={openingMove} onChange={e => setOpeningMove(e.target.value)}>
            {OPENING_MOVES.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="field-label">Height</label>
              <input className="modern-input" placeholder="e.g. 175 cm" value={height} onChange={e => setHeight(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Zodiac</label>
              <select className="modern-select" value={zodiac} onChange={e => setZodiac(e.target.value)}>
                <option value="">None</option>
                {ZODIAC_SIGNS.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="field-label">Anthem</label>
          <input className="modern-input" placeholder="Artist — Track" value={spotifyAnthem} onChange={e => setSpotifyAnthem(e.target.value)} />

          <label className="field-label">Interests ({interests.length}/8)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
            {CAMPUS_INTERESTS.map(tag => (
              <button
                key={tag}
                type="button"
                className={`selectable-chip ${interests.includes(tag) ? 'selected' : ''}`}
                onClick={() => toggleInterest(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <button className="btn-brand" disabled={saving} onClick={saveChanges}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {subTab === 'security' && (
        <div>
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 18,
              padding: 18,
              marginBottom: 18,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Account Details</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Verified Student Email: <strong>{me.email}</strong>
            </div>
          </div>

          <form
            onSubmit={handlePasswordChange}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 18,
              padding: 18,
              marginBottom: 18,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Change Password</div>
            <label className="field-label" style={{ marginTop: 0 }}>Current Password</label>
            <input
              type="password"
              className="modern-input"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
            <label className="field-label">New Password (8+ characters)</label>
            <input
              type="password"
              className="modern-input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            {pwStatus && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  color: pwStatus.ok ? '#22c55e' : '#ff5a67',
                }}
              >
                {pwStatus.msg}
              </div>
            )}
            <button className="btn-brand" type="submit" style={{ marginTop: 14 }}>
              Update Password
            </button>
          </form>

          <div
            style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 18,
              padding: 18,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, color: '#ff5a67', marginBottom: 6 }}>
              Delete Account
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
              Permanently remove your profile, photos, and matches from Campmatch discovery and active conversations.
            </div>
            <button
              type="button"
              onClick={onOpenDeleteAccount}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(239, 68, 68, 0.45)',
                background: 'rgba(239, 68, 68, 0.14)',
                color: '#ff6b7a',
                fontWeight: 800,
                fontSize: 13.5,
              }}
            >
              Delete My Account
            </button>
          </div>
        </div>
      )}

      {legal && (
        <div className="sheet-backdrop" onClick={() => setLegal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 10 }}>
              {legal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            </div>
            <div style={{ whiteSpace: 'pre-line', fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {legal === 'terms' ? TERMS_SUMMARY : PRIVACY_SUMMARY}
            </div>
            <button className="btn-brand" style={{ marginTop: 18 }} onClick={() => setLegal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
