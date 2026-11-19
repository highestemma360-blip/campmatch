import React, { useState, useEffect } from 'react'
import { CurrentUser, PlusConfig, PromptItem } from '../types'
import {
  LEVELS,
  LOOKING_FOR_OPTIONS,
  CAMPUS_INTERESTS,
  BUMBLE_PROMPTS,
  OPENING_MOVES,
  ZODIAC_SIGNS,
  EXPLORE_VIBES,
  ExploreVibe,
  TERMS_SUMMARY,
  PRIVACY_SUMMARY,
  makeAvatarPlaceholder,
} from '../constants'
import { precheckProfileImage } from '../utils/imageCheck'
import { getPushState, enablePush, disablePush, pushSupported, PushState } from '../utils/push'
import { CourseSelect } from '../components/CourseSelect'
import {
  VerifiedBadge,
  CloseXIcon,
  CheckCircleIcon,
  SettingsGearIcon,
  EditPenIcon,
  EyeIcon,
  ArrowLeftIcon,
  BoltIcon,
  CheckIcon,
  PlusIcon,
  MusicIcon,
  MapPinIcon,
  BellIcon,
  DownloadIcon,
} from '../components/Icons'
import { isStandalone } from '../utils/pwa'

interface ProfilePageProps {
  me: CurrentUser
  token: string
  rooms?: ExploreVibe[]
  theme: string
  plusConfig: PlusConfig
  onToggleTheme: () => void
  onSaveProfile: (updated: Partial<CurrentUser>) => Promise<void>
  onToggleOptIn: (vibeId: string) => Promise<void>
  onUploadPhotos: (files: File[]) => Promise<{ ok: boolean; error?: string }>
  onRemovePhoto: (url: string) => Promise<void>
  onPreviewMyCard: () => void
  onOpenPlus: () => void
  onBoost: () => void
  onOpenFilters: () => void
  onOpenDeleteAccount: () => void
  onInstallApp: () => void
  onTokenUpdated: (newToken: string) => void
  onLogout: () => void
}

export function ProfilePage({
  me,
  token,
  rooms,
  theme,
  plusConfig,
  onToggleTheme,
  onSaveProfile,
  onToggleOptIn,
  onUploadPhotos,
  onRemovePhoto,
  onPreviewMyCard,
  onOpenPlus,
  onBoost,
  onOpenFilters,
  onOpenDeleteAccount,
  onInstallApp,
  onTokenUpdated,
  onLogout,
}: ProfilePageProps) {
  const roomCatalogue = rooms && rooms.length > 0 ? rooms : EXPLORE_VIBES
  const [screen, setScreen] = useState<'hub' | 'edit' | 'settings'>('hub')
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit')
  const [previewPhotoIdx, setPreviewPhotoIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMsg, setPhotoMsg] = useState('')
  const [legal, setLegal] = useState<'terms' | 'privacy' | null>(null)

  // Editable state synced when opening editor
  const [name, setName] = useState(me.name || '')
  const [age, setAge] = useState(me.age || 20)
  const [level, setLevel] = useState(me.level || '200')
  const [course, setCourse] = useState(me.course || '')
  const [hall, setHall] = useState(me.hall || '')
  const [bio, setBio] = useState(me.bio || '')
  const [lookingFor, setLookingFor] = useState(me.looking_for || 'Long-term partner')
  const [interests, setInterests] = useState<string[]>(me.interests || [])
  const [exploreVibes, setExploreVibes] = useState<string[]>(me.explore_vibes || [])
  const [prompt1Q, setPrompt1Q] = useState(me.prompts?.[0]?.question || BUMBLE_PROMPTS[0])
  const [prompt1A, setPrompt1A] = useState(me.prompts?.[0]?.answer || '')
  const [prompt2Q, setPrompt2Q] = useState(me.prompts?.[1]?.question || BUMBLE_PROMPTS[2])
  const [prompt2A, setPrompt2A] = useState(me.prompts?.[1]?.answer || '')
  const [openingMove, setOpeningMove] = useState(me.opening_move || OPENING_MOVES[0])
  const [zodiac, setZodiac] = useState(me.zodiac || '')
  const [height, setHeight] = useState(me.height || '')
  const [spotifyAnthem, setSpotifyAnthem] = useState(me.spotify_anthem || '')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwStatus, setPwStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  // Phone alerts (web push) state
  const [pushState, setPushState] = useState<PushState>({ supported: pushSupported(), permission: 'default', enabled: false })
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMsg, setPushMsg] = useState('')

  useEffect(() => {
    getPushState().then(s => setPushState(s))
  }, [])

  async function handleTogglePush() {
    setPushBusy(true)
    setPushMsg('')
    if (pushState.enabled) {
      await disablePush(token)
      setPushState(await getPushState())
      setPushMsg('Phone alerts turned off.')
    } else {
      const res = await enablePush(token)
      setPushState(await getPushState())
      if (res.denied) setPushMsg('Notifications are blocked in your browser settings.')
      else if (!res.ok) setPushMsg(res.error || 'Could not enable notifications.')
      else setPushMsg('Phone alerts are on. You will get match and campus notifications.')
    }
    setPushBusy(false)
  }

  function openEditor() {
    setName(me.name || '')
    setAge(me.age || 20)
    setLevel(me.level || '200')
    setCourse(me.course || '')
    setHall(me.hall || '')
    setBio(me.bio || '')
    setLookingFor(me.looking_for || 'Long-term partner')
    setInterests(me.interests || [])
    setExploreVibes(me.explore_vibes || [])
    setPrompt1Q(me.prompts?.[0]?.question || BUMBLE_PROMPTS[0])
    setPrompt1A(me.prompts?.[0]?.answer || '')
    setPrompt2Q(me.prompts?.[1]?.question || BUMBLE_PROMPTS[2])
    setPrompt2A(me.prompts?.[1]?.answer || '')
    setOpeningMove(me.opening_move || OPENING_MOVES[0])
    setZodiac(me.zodiac || '')
    setHeight(me.height || '')
    setSpotifyAnthem(me.spotify_anthem || '')
    setEditorTab('edit')
    setPreviewPhotoIdx(0)
    setScreen('edit')
  }

  function toggleInterest(tag: string) {
    setInterests(prev => {
      if (prev.includes(tag)) return prev.filter(t => t !== tag)
      if (prev.length >= 8) return prev
      return [...prev, tag]
    })
  }

  function toggleEditorExplore(vibeId: string) {
    setExploreVibes(prev =>
      prev.includes(vibeId) ? prev.filter(v => v !== vibeId) : [...prev, vibeId]
    )
  }

  async function promotePhotoToMain(url: string) {
    const rest = (me.photo_urls || []).filter(u => u !== url)
    await onSaveProfile({ photo_urls: [url, ...rest] })
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
      const builtPrompts: PromptItem[] = []
      if (prompt1A.trim()) builtPrompts.push({ question: prompt1Q, answer: prompt1A.trim() })
      if (prompt2A.trim()) builtPrompts.push({ question: prompt2Q, answer: prompt2A.trim() })

      await onSaveProfile({
        name,
        age: Number(age),
        level,
        course,
        hall,
        bio,
        looking_for: lookingFor,
        interests,
        explore_vibes: exploreVibes,
        prompts: builtPrompts,
        opening_move: openingMove,
        zodiac,
        height,
        spotify_anthem: spotifyAnthem,
      })
      setScreen('hub')
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
  const missingTips: string[] = []
  if ((me.photo_urls?.length || 0) < 3) missingTips.push('Add 3+ photos for 4x more likes')
  if (!me.bio || me.bio.trim().length < 15) missingTips.push('Write a fuller bio')
  if (!me.prompts?.length) missingTips.push('Answer a Bumble prompt')
  if (!me.explore_vibes?.length) missingTips.push('Opt into an Explore room')

  // ---------------------------------------------------------------------------
  // SCREEN 2: TINDER / BUMBLE "EDIT | PREVIEW" STUDIO
  // ---------------------------------------------------------------------------
  if (screen === 'edit') {
    const draftPhotos = me.photo_urls?.length ? me.photo_urls : [makeAvatarPlaceholder(name)]

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Sticky Studio Bar: Back | Edit / Preview | Save */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setScreen('hub')}
            className="icon-circle-btn"
            style={{ width: 35, height: 35 }}
          >
            <ArrowLeftIcon size={17} />
          </button>

          <div
            style={{
              display: 'inline-grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--bg-subtle)',
              padding: 3,
              borderRadius: 999,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setEditorTab('edit')}
              style={{
                padding: '6px 18px',
                borderRadius: 999,
                border: 'none',
                fontSize: 12.5,
                fontWeight: 800,
                background: editorTab === 'edit' ? 'var(--bg-app)' : 'transparent',
                color: editorTab === 'edit' ? 'var(--tinder-pink)' : 'var(--text-secondary)',
              }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('preview')}
              style={{
                padding: '6px 18px',
                borderRadius: 999,
                border: 'none',
                fontSize: 12.5,
                fontWeight: 800,
                background: editorTab === 'preview' ? 'var(--bg-app)' : 'transparent',
                color: editorTab === 'preview' ? 'var(--tinder-pink)' : 'var(--text-secondary)',
              }}
            >
              Preview
            </button>
          </div>

          <button
            disabled={saving}
            onClick={saveChanges}
            style={{
              padding: '8px 15px',
              borderRadius: 999,
              border: 'none',
              background: 'var(--brand-grad)',
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 800,
            }}
          >
            {saving ? '...' : 'Save'}
          </button>
        </div>

        {editorTab === 'preview' ? (
          /* LIVE INTERACTIVE TINDER CARD PREVIEW */
          <div className="scroll-pane" style={{ padding: 16 }}>
            <div
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const relX = e.clientX - rect.left
                if (relX < rect.width / 2) setPreviewPhotoIdx(i => Math.max(0, i - 1))
                else setPreviewPhotoIdx(i => (i + 1) % draftPhotos.length)
              }}
              style={{
                position: 'relative',
                aspectRatio: '3 / 4.2',
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              <img
                src={draftPhotos[previewPhotoIdx] || draftPhotos[0]}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {draftPhotos.length > 1 && (
                <div className="story-bars">
                  {draftPhotos.map((_, idx) => (
                    <div key={idx} className={`story-bar ${idx === previewPhotoIdx ? 'active' : ''}`} />
                  ))}
                </div>
              )}
              <div className="card-overlay">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 27, fontWeight: 800 }}>{name || 'Your Name'}</span>
                  <span style={{ fontSize: 23, opacity: 0.92 }}>{age}</span>
                  <VerifiedBadge size={20} />
                </div>
                <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 3, fontWeight: 600 }}>
                  {me.school || ''} · Level {level} · {course}
                </div>
                {hall && (
                  <div style={{ fontSize: 12.5, opacity: 0.78, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPinIcon size={12} /> {hall}
                  </div>
                )}
                {bio && (
                  <div style={{ fontSize: 13.5, opacity: 0.88, marginTop: 8, lineHeight: 1.4 }}>{bio}</div>
                )}
                <div className="card-chip-row">
                  <span className="card-chip">{lookingFor}</span>
                  {interests.slice(0, 3).map(t => (
                    <span key={t} className="card-chip">{t}</span>
                  ))}
                  {spotifyAnthem && (
                    <span className="card-chip">
                      <MusicIcon size={11} /> {spotifyAnthem}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {prompt1A.trim() && (
              <div className="bumble-prompt-card">
                <div className="bumble-prompt-q">{prompt1Q}</div>
                <div className="bumble-prompt-a">{prompt1A}</div>
              </div>
            )}
            {prompt2A.trim() && (
              <div className="bumble-prompt-card">
                <div className="bumble-prompt-q">{prompt2Q}</div>
                <div className="bumble-prompt-a">{prompt2A}</div>
              </div>
            )}
          </div>
        ) : (
          /* STRUCTURED TINDER + BUMBLE PROFILE STUDIO */
          <div className="scroll-pane" style={{ padding: '16px 16px 36px' }}>
            {/* Media Grid */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="field-label" style={{ margin: 0 }}>Media ({me.photo_urls?.length || 0}/6)</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Face-verified portraits only</span>
            </div>

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
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
                    {idx === 0 ? (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 5,
                          left: 5,
                          background: 'var(--brand-grad)',
                          color: '#fff',
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 99,
                        }}
                      >
                        MAIN
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => promotePhotoToMain(url)}
                        style={{
                          position: 'absolute',
                          bottom: 5,
                          left: 5,
                          border: 'none',
                          background: 'rgba(10,12,18,0.78)',
                          color: '#fff',
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: '3px 7px',
                          borderRadius: 99,
                        }}
                      >
                        Make Main
                      </button>
                    )}

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

            {/* About Me Section Card */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 15, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="field-label" style={{ margin: 0 }}>About Me</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bio.length}/500</span>
              </div>
              <textarea
                className="modern-textarea"
                rows={3}
                maxLength={500}
                placeholder="Share a quick snapshot of your personality, campus life, or weekend plans..."
                value={bio}
                onChange={e => setBio(e.target.value)}
              />
            </div>

            {/* Explore Rooms Opt-In Section Card */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 15, marginBottom: 14 }}>
              <div className="field-label" style={{ marginTop: 0 }}>Explore Rooms Opt-In</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Choose which rooms your profile appears in when students browse Explore.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {roomCatalogue.map(room => {
                  const active = exploreVibes.includes(room.id)
                  return (
                    <button
                      key={room.id}
                      type="button"
                      className={`selectable-chip ${active ? 'selected' : ''}`}
                      onClick={() => toggleEditorExplore(room.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      {active ? <CheckIcon size={12} /> : <PlusIcon size={12} />}
                      {room.title}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Bumble Profile Prompts + Opening Move */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 15, marginBottom: 14 }}>
              <div className="field-label" style={{ marginTop: 0 }}>Profile Prompts (Bumble Style)</div>
              <select className="modern-select" value={prompt1Q} onChange={e => setPrompt1Q(e.target.value)}>
                {BUMBLE_PROMPTS.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              <input
                className="modern-input"
                style={{ marginTop: 7, marginBottom: 12 }}
                placeholder="Your first prompt answer..."
                value={prompt1A}
                onChange={e => setPrompt1A(e.target.value)}
              />

              <select className="modern-select" value={prompt2Q} onChange={e => setPrompt2Q(e.target.value)}>
                {BUMBLE_PROMPTS.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              <input
                className="modern-input"
                style={{ marginTop: 7 }}
                placeholder="Optional second prompt answer..."
                value={prompt2A}
                onChange={e => setPrompt2A(e.target.value)}
              />

              <label className="field-label">Opening Move (First-Message Question)</label>
              <select className="modern-select" value={openingMove} onChange={e => setOpeningMove(e.target.value)}>
                {OPENING_MOVES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Campus & Vitals */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 15, marginBottom: 14 }}>
              <div className="field-label" style={{ marginTop: 0 }}>Campus & Vitals</div>
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
                  <CourseSelect value={course} onChange={setCourse} school={me.school} placeholder="Search your programme" />
                </div>
              </div>

              <label className="field-label">Residence Hall / Hostel</label>
              <input className="modern-input" value={hall} onChange={e => setHall(e.target.value)} placeholder="e.g. KT Hall, Chamberlain" />

              <label className="field-label">Relationship Goal</label>
              <select className="modern-select" value={lookingFor} onChange={e => setLookingFor(e.target.value)}>
                {LOOKING_FOR_OPTIONS.map(o => (
                  <option key={o.label} value={o.label}>{o.label}</option>
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

              <label className="field-label">Campus Anthem</label>
              <input className="modern-input" placeholder="Artist — Track" value={spotifyAnthem} onChange={e => setSpotifyAnthem(e.target.value)} />
            </div>

            {/* Interests */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 15, marginBottom: 20 }}>
              <div className="field-label" style={{ marginTop: 0 }}>Interests ({interests.length}/8)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
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
            </div>

            <button className="btn-brand" disabled={saving} onClick={saveChanges}>
              {saving ? 'Saving Profile...' : 'Save Profile'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // SCREEN 3: ACCOUNT, PRIVACY & SETTINGS
  // ---------------------------------------------------------------------------
  if (screen === 'settings') {
    return (
      <div className="scroll-pane" style={{ padding: '16px 18px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button
            onClick={() => setScreen('hub')}
            className="icon-circle-btn"
            style={{ width: 36, height: 36 }}
          >
            <ArrowLeftIcon size={18} />
          </button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Settings & Privacy</h2>
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
          <div className="field-label" style={{ marginTop: 0 }}>Account & Visibility</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Verified Student ID</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{me.email}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <CheckCircleIcon size={14} /> Active
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Snooze Mode (Bumble Pause)</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {me.snoozed ? 'Hidden from Discover & Explore' : 'Visible to matching students'}
              </div>
            </div>
            <button
              className="btn-ghost"
              style={{ padding: '7px 14px', fontSize: 12 }}
              onClick={() => onSaveProfile({ snoozed: !me.snoozed })}
            >
              {me.snoozed ? 'Resume' : 'Snooze'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BellIcon size={14} /> Phone Alerts
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {pushState.enabled
                  ? 'Matches & campus updates sent to your phone'
                  : 'Get matches and notifications on your phone'}
              </div>
            </div>
            <button
              className={pushState.enabled ? 'btn-ghost' : 'btn-brand'}
              style={{ padding: '7px 14px', fontSize: 12, width: 'auto', flexShrink: 0 }}
              disabled={!pushState.supported || pushBusy}
              onClick={handleTogglePush}
            >
              {pushBusy ? 'Working…' : pushState.enabled ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
          {pushMsg && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0 2px', lineHeight: 1.45 }}>{pushMsg}</div>
          )}

          {!isStandalone() && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DownloadIcon size={14} /> Home Screen App
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Full-screen access and one-tap launches
                </div>
              </div>
              <button
                className="btn-ghost"
                style={{ padding: '7px 14px', fontSize: 12 }}
                onClick={onInstallApp}
              >
                Install
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Theme</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {theme === 'dark' ? 'Dark obsidian' : 'Light ivory'}
              </div>
            </div>
            <button className="btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={onToggleTheme}>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Discovery Preferences</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Ages {me.min_age}–{me.max_age} · Max {me.max_distance_km || 50} km
              </div>
            </div>
            <button className="btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={onOpenFilters}>
              Edit
            </button>
          </div>
        </div>

        <form
          onSubmit={handlePasswordChange}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 18,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Change Password</div>
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
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: pwStatus.ok ? '#22c55e' : '#ff5a67' }}>
              {pwStatus.msg}
            </div>
          )}
          <button className="btn-brand" type="submit" style={{ marginTop: 14 }}>
            Update Password
          </button>
        </form>

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
            marginBottom: 14,
          }}
        >
          Sign Out
        </button>

        <div
          style={{
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.24)',
            borderRadius: 18,
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 14.5, color: '#ff5a67', marginBottom: 4 }}>
            Delete Account
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 12 }}>
            Immediately remove your profile, photos, and matches from public view.
          </div>
          <button
            type="button"
            onClick={onOpenDeleteAccount}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: 12,
              border: '1px solid rgba(239, 68, 68, 0.45)',
              background: 'rgba(239, 68, 68, 0.14)',
              color: '#ff6b7a',
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            Delete My Account
          </button>
        </div>

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

  // ---------------------------------------------------------------------------
  // SCREEN 1: TINDER + BUMBLE PROFILE HUB (DEFAULT)
  // ---------------------------------------------------------------------------
  return (
    <div className="scroll-pane" style={{ padding: '0 0 32px' }}>
      {/* Tinder Curved Hero Card with Circular Progress Ring & 3-Button Action Row */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          borderBottomLeftRadius: '36px 24px',
          borderBottomRightRadius: '36px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '22px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: 18,
        }}
      >
        <div
          onClick={openEditor}
          style={{
            width: 122,
            height: 122,
            borderRadius: '50%',
            padding: 4.5,
            background: `conic-gradient(#FF4C5E 0%, #FFAA00 ${pct}%, var(--bg-subtle) ${pct}%)`,
            position: 'relative',
            marginBottom: 16,
            cursor: 'pointer',
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
              border: '3.5px solid var(--bg-elevated)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: -7,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--brand-grad)',
              color: '#fff',
              fontSize: 10.5,
              fontWeight: 900,
              padding: '3.5px 11px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              boxShadow: '0 6px 14px rgba(255,76,94,0.35)',
            }}
          >
            {pct}% COMPLETE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 23, fontWeight: 900 }}>
          <span>
            {me.name}, {me.age}
          </span>
          <VerifiedBadge size={20} />
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 3 }}>
          {me.school || ''} · Level {me.level} · {me.course}
        </div>

        {/* Classic Tinder 3-Button Action Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 28,
            marginTop: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setScreen('settings')}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-app)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-btn)',
              }}
            >
              <SettingsGearIcon size={20} />
            </button>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)' }}>Settings</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <button
              onClick={openEditor}
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                border: 'none',
                background: 'var(--brand-grad)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 26px rgba(255,76,94,0.38)',
              }}
            >
              <EditPenIcon size={23} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Edit Profile</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button
              onClick={onPreviewMyCard}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-app)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-btn)',
              }}
            >
              <EyeIcon size={20} />
            </button>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)' }}>View Card</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Bumble Profile Strength Nudge (shown when < 100%) */}
        {missingTips.length > 0 && (
          <div
            onClick={openEditor}
            style={{
              background: 'var(--prompt-bg)',
              border: '1px solid var(--prompt-border)',
              borderRadius: 18,
              padding: '13px 15px',
              marginBottom: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--bumble-amber)', textTransform: 'uppercase' }}>
                Profile Strength · {pct}%
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>
                Next step: {missingTips[0]}
              </div>
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--tinder-pink)', flexShrink: 0 }}>
              Complete →
            </span>
          </div>
        )}

        {/* Quick Opt-In Strip for the 6 Explore Rooms */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 18,
            padding: 15,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="field-label" style={{ margin: 0 }}>My Active Explore Rooms</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Tap to opt in / out</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {roomCatalogue.map(room => {
              const active = (me.explore_vibes || []).includes(room.id)
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onToggleOptIn(room.id)}
                  className={`selectable-chip ${active ? 'selected' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, padding: '7px 12px' }}
                >
                  {active ? <CheckIcon size={12} /> : <PlusIcon size={12} />}
                  {room.title}
                </button>
              )
            })}
          </div>
        </div>

        {/* Spotlight Quick Card + Campmatch Plus Card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div
            onClick={onBoost}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 18,
              padding: 14,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(147,51,234,0.16)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <BoltIcon size={18} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {me.is_boosted ? 'Spotlight Active' : 'Spotlight'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              30m priority placement
            </div>
          </div>

          <div
            onClick={onOpenFilters}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 18,
              padding: 14,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(255,79,94,0.14)',
                color: 'var(--tinder-pink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              {me.min_age}–{me.max_age}
            </div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Discovery</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Up to {me.max_distance_km || 50} km away
            </div>
          </div>
        </div>

        {/* Campmatch Plus Merchandising Card (hidden until Plus launches) */}
        {(plusConfig.enabled || me.is_premium) && (
          <div
            onClick={onOpenPlus}
            style={{
              background: 'linear-gradient(135deg, #241c06 0%, #4a3508 55%, #d97706 135%)',
              borderRadius: 20,
              padding: '18px 18px',
              color: '#fff',
              cursor: 'pointer',
              border: '1px solid rgba(255, 216, 77, 0.32)',
              boxShadow: '0 14px 32px rgba(0,0,0,0.22)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <span style={{ fontSize: 12, fontWeight: 800, color: '#ffd84d' }}>
                {me.is_premium ? 'Manage' : `GHS ${plusConfig.price_ghs.toFixed(0)}`}
              </span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, marginTop: 9 }}>
              {me.is_premium ? 'Unlimited Swipes & Full Beeline Unlocked' : 'See Who Likes You & Swipe Without Limits'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              {plusConfig.enabled && !me.is_premium
                ? `Includes Rewind & removes the ${plusConfig.free_daily_swipe_limit}/day swipe cap`
                : 'View all Plus membership privileges'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
