import React, { useState } from 'react'
import {
  LEVELS,
  LOOKING_FOR_OPTIONS,
  CAMPUS_INTERESTS,
  BUMBLE_PROMPTS,
  OPENING_MOVES,
  ZODIAC_SIGNS,
  EXPLORE_VIBES,
  ExploreVibe,
} from '../constants'
import { precheckProfileImage } from '../utils/imageCheck'
import { CampmatchLogo, CheckCircleIcon, CloseXIcon } from '../components/Icons'
import { CourseSelect } from '../components/CourseSelect'

interface OnboardingPageProps {
  token: string
  initialName?: string
  existingPhotos?: string[]
  rooms?: ExploreVibe[]
  school?: string
  onDone: () => void
}

export function OnboardingPage({
  token,
  initialName = '',
  existingPhotos = [],
  rooms,
  school,
  onDone,
}: OnboardingPageProps) {
  const roomCatalogue = rooms && rooms.length > 0 ? rooms : EXPLORE_VIBES
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')

  // Step 1
  const [name, setName] = useState(initialName)
  const [age, setAge] = useState(20)
  const [gender, setGender] = useState<'female' | 'male'>('female')
  const [interestedIn, setInterestedIn] = useState<'male' | 'female' | 'everyone'>('male')
  const [level, setLevel] = useState('200')
  const [course, setCourse] = useState('')
  const [hall, setHall] = useState('')

  // Step 2: Verified Server Photo URLs
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(existingPhotos)

  // Step 3
  const [lookingFor, setLookingFor] = useState('Long-term partner')
  const [interests, setInterests] = useState<string[]>([])
  const [exploreVibes, setExploreVibes] = useState<string[]>(['food_date'])

  // Step 4
  const [bio, setBio] = useState('')
  const [promptQ, setPromptQ] = useState(BUMBLE_PROMPTS[0])
  const [promptA, setPromptA] = useState('')
  const [openingMove, setOpeningMove] = useState(OPENING_MOVES[0])
  const [zodiac, setZodiac] = useState('')
  const [spotifyAnthem, setSpotifyAnthem] = useState('')

  async function handleSelectPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    setPhotoError('')
    setUploadingPhoto(true)

    try {
      const validFiles: File[] = []
      const localErrors: string[] = []

      for (const f of Array.from(files).slice(0, 6 - uploadedUrls.length)) {
        const check = await precheckProfileImage(f)
        if (!check.ok) {
          localErrors.push(`${f.name}: ${check.reason}`)
        } else {
          validFiles.push(f)
        }
      }

      if (validFiles.length === 0) {
        setPhotoError(localErrors[0] || 'Selected image did not pass verification.')
        return
      }

      const fd = new FormData()
      validFiles.forEach(f => fd.append('files', f))

      const r = await fetch('/api/profile/photos', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd,
      })
      const d = await r.json()

      if (!r.ok) {
        const msg =
          typeof d.detail === 'string'
            ? d.detail
            : d.detail?.message || 'Photo rejected: ensure it clearly shows your face and contains no explicit or blank content.'
        setPhotoError(msg)
        return
      }

      setUploadedUrls(d.photo_urls || [])

      const serverRejected = Array.isArray(d.rejected) ? d.rejected : []
      if (serverRejected.length > 0) {
        setPhotoError(`${serverRejected[0].filename}: ${serverRejected[0].reason}`)
      } else if (localErrors.length > 0) {
        setPhotoError(localErrors[0])
      }
    } catch {
      setPhotoError('Upload failed. Check your connection and try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function removePhoto(url: string) {
    setPhotoError('')
    const r = await fetch(`/api/profile/photos?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    })
    if (r.ok) {
      const d = await r.json()
      setUploadedUrls(d.photo_urls || [])
    }
  }

  function toggleInterest(tag: string) {
    setInterests(prev => {
      if (prev.includes(tag)) return prev.filter(x => x !== tag)
      if (prev.length >= 7) return prev
      return [...prev, tag]
    })
  }

  async function finishSetup() {
    setSaving(true)
    try {
      const r = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          level,
          age: Number(age),
          course,
          gender,
          interested_in: interestedIn,
          hall,
          bio,
          looking_for: lookingFor,
          interests,
          explore_vibes: exploreVibes,
          prompts: promptA.trim() ? [{ question: promptQ, answer: promptA.trim() }] : [],
          opening_move: openingMove,
          zodiac,
          spotify_anthem: spotifyAnthem,
          photo_urls: uploadedUrls,
        }),
      })
      if (r.ok) {
        onDone()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 520,
        margin: '0 auto',
        background: 'var(--bg-app)',
      }}
    >
      <div style={{ padding: 'calc(14px + env(safe-area-inset-top, 0px)) 20px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <CampmatchLogo iconSize={26} fontSize={20} gap={8} />
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--tinder-pink)' }}>Step {step} of 4</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              style={{
                height: 4,
                borderRadius: 99,
                background: s <= step ? 'var(--brand-grad)' : 'var(--bg-subtle)',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
        {step === 1 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 23, fontWeight: 900 }}>Basic Information</h2>
            <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: 13.5 }}>
              Tell other verified students on campus who you are.
            </p>

            <label className="field-label">First Name</label>
            <input
              className="modern-input"
              placeholder="Your first name"
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Age</label>
                <input
                  type="number"
                  min={18}
                  max={50}
                  className="modern-input"
                  value={age}
                  onChange={e => setAge(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="field-label">Academic Level</label>
                <select className="modern-select" value={level} onChange={e => setLevel(e.target.value)}>
                  {LEVELS.map(l => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="field-label">Programme / Course</label>
            <CourseSelect
              value={course}
              onChange={setCourse}
              school={school}
              placeholder="Search your programme"
            />

            <label className="field-label">Hall or Hostel (Optional)</label>
            <input
              className="modern-input"
              placeholder="e.g. KT Hall, Chamberlain, Off-Campus"
              value={hall}
              onChange={e => setHall(e.target.value)}
            />

            <label className="field-label">Gender</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['female', 'male'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  className={`selectable-chip ${gender === g ? 'selected' : ''}`}
                  style={{ padding: 12 }}
                  onClick={() => setGender(g)}
                >
                  {g === 'female' ? 'Woman' : 'Man'}
                </button>
              ))}
            </div>

            <label className="field-label">Interested In</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { id: 'male', label: 'Men' },
                { id: 'female', label: 'Women' },
                { id: 'everyone', label: 'Everyone' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`selectable-chip ${interestedIn === opt.id ? 'selected' : ''}`}
                  style={{ padding: 12 }}
                  onClick={() => setInterestedIn(opt.id as any)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 23, fontWeight: 900 }}>Verified Portrait Photos</h2>
            <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.5 }}>
              Upload at least 1 clear photo of yourself (up to 6). Blank, solid-color, non-human, or explicit images are automatically declined.
            </p>

            {photoError && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: 'rgba(255, 68, 88, 0.14)',
                  border: '1px solid rgba(255, 68, 88, 0.35)',
                  color: '#ff6b7a',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {photoError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {Array.from({ length: 6 }).map((_, idx) => {
                const src = uploadedUrls[idx]
                return src ? (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      aspectRatio: '3 / 4',
                      borderRadius: 15,
                      overflow: 'hidden',
                      border: idx === 0 ? '2px solid var(--tinder-pink)' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        background: idx === 0 ? 'var(--brand-grad)' : 'rgba(15,17,23,0.78)',
                        color: '#fff',
                        fontSize: 9.5,
                        fontWeight: 800,
                        padding: '3px 7px',
                        borderRadius: 99,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <CheckCircleIcon size={11} /> {idx === 0 ? 'MAIN' : 'VERIFIED'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePhoto(src)}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
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
                      <CloseXIcon size={13} />
                    </button>
                  </div>
                ) : (
                  <label
                    key={idx}
                    style={{
                      aspectRatio: '3 / 4',
                      borderRadius: 15,
                      border: '2px dashed var(--border-strong)',
                      background: 'var(--bg-elevated)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: uploadingPhoto ? 'wait' : 'pointer',
                      color: 'var(--tinder-pink)',
                      fontWeight: 800,
                      fontSize: 22,
                    }}
                  >
                    {uploadingPhoto && idx === uploadedUrls.length ? (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Checking...</span>
                    ) : (
                      '+'
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      hidden
                      disabled={uploadingPhoto}
                      onChange={e => {
                        handleSelectPhotos(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                )
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 23, fontWeight: 900 }}>Goals & Interests</h2>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: 13.5 }}>
              Select what you are looking for and up to 7 interests.
            </p>

            <label className="field-label" style={{ marginTop: 0 }}>Looking For</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {LOOKING_FOR_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setLookingFor(opt.label)}
                  style={{
                    textAlign: 'left',
                    padding: 13,
                    borderRadius: 15,
                    border:
                      lookingFor === opt.label
                        ? '2px solid var(--tinder-pink)'
                        : '1px solid var(--border-subtle)',
                    background:
                      lookingFor === opt.label ? 'rgba(253, 38, 122, 0.12)' : 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{opt.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{opt.desc}</div>
                </button>
              ))}
            </div>

            <label className="field-label">Opt Into Explore Rooms (Optional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {roomCatalogue.map(room => {
                const active = exploreVibes.includes(room.id)
                return (
                  <button
                    key={room.id}
                    type="button"
                    className={`selectable-chip ${active ? 'selected' : ''}`}
                    onClick={() =>
                      setExploreVibes(prev =>
                        prev.includes(room.id) ? prev.filter(v => v !== room.id) : [...prev, room.id]
                      )
                    }
                  >
                    {room.title}
                  </button>
                )
              })}
            </div>

            <label className="field-label">Interests ({interests.length}/7)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
          </>
        )}

        {step === 4 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 23, fontWeight: 900 }}>Prompts & Opening Move</h2>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: 13.5 }}>
              Give matches an easy way to start a real conversation with you.
            </p>

            <label className="field-label" style={{ marginTop: 0 }}>Bio</label>
            <textarea
              className="modern-textarea"
              rows={3}
              placeholder="Write a brief bio..."
              value={bio}
              onChange={e => setBio(e.target.value)}
            />

            <label className="field-label">Profile Prompt</label>
            <select className="modern-select" value={promptQ} onChange={e => setPromptQ(e.target.value)}>
              {BUMBLE_PROMPTS.map(q => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            <input
              className="modern-input"
              style={{ marginTop: 8 }}
              placeholder="Your answer..."
              value={promptA}
              onChange={e => setPromptA(e.target.value)}
            />

            <label className="field-label">Opening Move Question</label>
            <select className="modern-select" value={openingMove} onChange={e => setOpeningMove(e.target.value)}>
              {OPENING_MOVES.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="field-label">Zodiac (Optional)</label>
                <select className="modern-select" value={zodiac} onChange={e => setZodiac(e.target.value)}>
                  <option value="">None</option>
                  {ZODIAC_SIGNS.map(z => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Anthem (Optional)</label>
                <input
                  className="modern-input"
                  placeholder="Artist — Track"
                  value={spotifyAnthem}
                  onChange={e => setSpotifyAnthem(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div
        style={{
          padding: '14px 20px calc(14px + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: 10,
        }}
      >
        {step > 1 && (
          <button className="btn-ghost" onClick={() => setStep(s => (s - 1) as any)}>
            Back
          </button>
        )}

        {step < 4 ? (
          <button
            className="btn-brand"
            disabled={
              uploadingPhoto ||
              (step === 1 && (!name.trim() || !course.trim())) ||
              (step === 2 && uploadedUrls.length === 0)
            }
            onClick={() => setStep(s => (s + 1) as any)}
          >
            Continue
          </button>
        ) : (
          <button className="btn-brand" disabled={saving} onClick={finishSetup}>
            {saving ? 'Saving Profile...' : 'Complete Setup'}
          </button>
        )}
      </div>
    </div>
  )
}
