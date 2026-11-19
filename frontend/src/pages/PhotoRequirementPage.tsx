import React, { useEffect, useState } from 'react'
import { CloseXIcon, CheckIcon, CheckCircleIcon, UploadIcon } from '../components/Icons'
import { makeAvatarPlaceholder } from '../constants'

interface PhotoRequirementPageProps {
  token: string
  photoRequired: boolean
  onPhotoUploaded: () => void
  onClose: () => void
}

export function PhotoRequirementPage({
  token,
  photoRequired,
  onPhotoUploaded,
  onClose,
}: PhotoRequirementPageProps) {
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  useEffect(() => {
    setFiles([])
    setPreviewUrls([])
    setMsg('')
  }, [token])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(
      (f) => f.type.startsWith('image/')
    )
    if (selected.length) {
      setFiles(selected)
      setPreviewUrls(
        selected.map((f) => URL.createObjectURL(f))
      )
      setMsg('')
    }
    e.target.value = ''
  }

  const handleRemove = (idx: number) => {
    const next = files.filter((_, i) => i !== idx)
    setFiles(next)
    // Revoke old object URL
    try { URL.revokeObjectURL(previewUrls[idx]) } catch {}
    setPreviewUrls(previewUrls.filter((_, i) => i !== idx))
  }

  async function upload() {
    if (!files.length) {
      setMsg('Please select at least one photo.')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const fd = new FormData()
      files.forEach((f) => fd.append('files', f))
      const r = await fetch('/api/profile/photos', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd,
      })
      const d = await r.json()
      if (!r.ok) {
        setMsg(typeof d.detail === 'string' ? d.detail : d.detail?.message || 'Upload failed.')
        return
      }
      if (d.accepted_count > 0) {
        onPhotoUploaded()
      } else {
        setMsg('No photos were accepted. Make sure your photo shows a face, is well-lit, and contains no nudity.')
      }
    } catch {
      setMsg('Unable to reach the server. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  if (!photoRequired) {
    onPhotoUploaded()
    return null
  }

  return (
    <div
      style={{
        height: '100dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 18% 18%, rgba(255, 76, 94, 0.2), transparent 44%), radial-gradient(circle at 82% 82%, rgba(255, 170, 0, 0.14), transparent 44%), #08090d',
        padding: 'calc(18px + env(safe-area-inset-top, 0px)) 18px',
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: 520, width: '100%', background: '#12151f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 26, padding: '32px 26px', boxShadow: '0 28px 70px rgba(0,0,0,0.65)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ color: '#22c55e' }}><CheckCircleIcon size={28} /></span>
          <div style={{ fontSize: 20, fontWeight: 900 }}>Profile Photo Required</div>
        </div>
        <p style={{ fontSize: 14, color: '#9ba6bc', lineHeight: 1.6, marginBottom: 22 }}>
          To keep Campmatch safe and real, every student must upload at least one verified profile photo before continuing.
          Your photo will be reviewed for nudity, darkness, and whether a real person is visible.
        </p>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: '#e8ecf4', marginBottom: 8, display: 'block' }}>Select your photo (up to 6)</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 10,
            }}
          >
            {Array.from({ length: 6 }).map((_, idx) => {
              if (idx < previewUrls.length) {
                return (
                  <div key={idx} style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: 14, overflow: 'hidden', border: '2px solid var(--tinder-pink)' }}>
                    <img src={previewUrls[idx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => handleRemove(idx)} style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.72)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <CloseXIcon size={12} />
                    </button>
                  </div>
                )
              }
              return (
                <label
                  key={idx}
                  onClick={() => document.getElementById('photo-input')?.click()}
                  style={{
                    aspectRatio: '3 / 4',
                    borderRadius: 14,
                    border: '2px dashed var(--border-strong)',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    color: 'var(--tinder-pink)',
                    cursor: 'pointer',
                  }}
                >
                  <UploadIcon size={24} />
                  <input
                    id="photo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={handleFileSelect}
                  />
                </label>
              )
            })}
          </div>
        </div>

        {msg && (
          <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: 'rgba(255, 68, 88, 0.14)', border: '1px solid rgba(255, 68, 88, 0.35)', color: '#ff6b7a', fontSize: 12.5, fontWeight: 600 }}>
            {msg}
          </div>
        )}

        <button
          onClick={upload}
          disabled={busy || files.length === 0}
          style={{
            width: '100%',
            padding: '13px 16px',
            border: 'none',
            borderRadius: 12,
            background: busy || files.length === 0 ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg, #f8c14a, #f2ac2b)',
            color: busy || files.length === 0 ? 'rgba(255,255,255,0.5)' : '#1b1408',
            fontSize: 14,
            fontWeight: 900,
            fontFamily: 'inherit',
            cursor: busy || files.length === 0 ? 'not-allowed' : 'pointer',
            marginBottom: 14,
          }}
        >
          {busy ? 'Reviewing photo…' : 'Upload & Continue'}
        </button>

        <p style={{ fontSize: 11.5, color: '#8e98ad', textAlign: 'center' }}>
          Photos are AI-moderated for safety. Rejected photos can be reviewed by campus administrators.
        </p>
      </div>
    </div>
  )
}
