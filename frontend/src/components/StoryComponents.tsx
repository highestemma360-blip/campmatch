import React, { useState, useEffect, useRef } from 'react'
import { VerifiedBadge, ChevronDownIcon, UserIcon, StarIcon, TrashIcon, CheckIcon, HeartIcon, CloseXIcon, DownloadIcon, ArrowLeftIcon } from '../components/Icons'

interface StoryCardProps {
  story: any
  onView: (storyId: string) => void
  onDelete: (storyId: string) => void
  viewerId: string
}

export function StoryCard({ story, onView, onDelete, viewerId }: StoryCardProps) {
  const isOwnStory = story.user_id === viewerId
  const isExpired = new Date(story.expires_at) < new Date()
  const viewedByMe = story.viewed_by_me || false

  return (
    <div
      style={{
        position: 'relative',
        width: 75,
        height: 110,
        flexShrink: 0,
        cursor: 'pointer',
      }}
      onClick={() => !isExpired && onView(story.id)}
    >
      <img
        src={story.media_url}
        alt=""
        style={{
          width: 75,
          height: 110,
          borderRadius: 16,
          objectFit: 'cover',
          objectPosition: 'center',
          border: isOwnStory ? '3px solid var(--tinder-pink)' : '2px solid rgba(255,255,255,0.2)',
        }}
        loading="lazy"
      />
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          right: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 4,
        }}
      >
        {story.user_photo && (
          <img
            src={story.user_photo}
            alt=""
            style={{
              width: 24,
              height: 24,
              borderRadius: 50,
              border: isOwnStory ? '2px solid var(--tinder-pink)' : '2px solid rgba(255,255,255,0.8)',
              objectFit: 'cover',
            }}
          />
        )}
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            overflowWrap: 'break-word',
          }}
        >
          {story.user_name || 'You'}
        </span>
      </div>
      {isOwnStory && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 26,
            height: 26,
            borderRadius: 50,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(story.id)
          }}
        >
          <div style={{ color: '#fff', fontSize: 14 }}>
            <TrashIcon size={14} />
          </div>
        </div>
      )}
      {viewedByMe && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 26,
            height: 26,
            borderRadius: 50,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div style={{ color: '#22c55e', fontSize: 14 }}>
            <CheckIcon size={14} />
          </div>
        </div>
      )}
      {!isExpired && viewedByMe === false && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 26,
            height: 26,
            borderRadius: 50,
            background: 'rgba(255,255,255,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div style={{ color: '#ff4458', fontSize: 14 }}>
            <HeartIcon size={14} />
          </div>
        </div>
      )}
    </div>
  )
}

interface StoryRowProps {
  stories: any[]
  onView: (storyId: string) => void
  onDelete: (storyId: string) => void
  viewerId: string
}

export function StoryRow({ stories, onView, onDelete, viewerId }: StoryRowProps) {
  const activeStories = stories.filter((s: any) => new Date(s.expires_at) > new Date())

  if (activeStories.length === 0) return null

  return (
    <div
      style={{
        padding: '8px 16px 4px',
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'flex',
        gap: 12,
      }}
    >
      {activeStories.map((story: any) => (
        <StoryCard
          key={story.id}
          story={story}
          onView={onView}
          onDelete={onDelete}
          viewerId={viewerId}
        />
      ))}
    </div>
  )
}

interface StoryViewerProps {
  story: any
  onClose: () => void
  onDelete: (storyId: string) => void
  viewerId: string
  onViewed: (storyId: string) => void
}

export function StoryViewer({ story, onClose, onDelete, viewerId, onViewed }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const [viewTime, setViewTime] = useState(0)
  const timerRef = useRef<number | null>(null)

  const storyItems: any[] = story.media_urls ? story.media_urls.map((url: string, idx: number) => ({
    ...story,
    media_url: url,
    media_type: story.media_types?.[idx] || 'image',
  })) : [story]

  useEffect(() => {
    onViewed(story.id)

    const duration = story.duration_hours * 3600 * 1000
    const perSlide = Math.max(5000, duration / Math.max(storyItems.length, 1))

    timerRef.current = window.setInterval(() => {
      setViewTime((t) => {
        if (t >= perSlide) {
          setCurrentIndex((ci) => {
            if (ci >= storyItems.length - 1) {
              onClose()
              return ci
            }
            return ci + 1
          })
          return 0
        }
        return t + 100
      })
    }, 100)

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [story.id, storyItems.length, onClose, onViewed])

  const currentStory = storyItems[currentIndex]
  const isVideo = currentStory.media_type === 'video'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      onClick={(e) => {
        const x = e.clientX / window.innerWidth
        if (x < 0.33) {
          setCurrentIndex((ci) => Math.max(0, ci - 1))
        } else if (x > 0.67) {
          setCurrentIndex((ci) => Math.min(storyItems.length - 1, ci + 1))
        } else {
          setIsMuted((v) => !v)
        }
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 12,
          left: 16,
          width: 40,
          height: 40,
          borderRadius: 50,
          background: 'rgba(0,0,0,0.6)',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 20,
        }}
      >
        <CloseXIcon size={20} />
      </button>

      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}
      >
        {isVideo ? (
          <video
            src={currentStory.media_url}
            autoPlay
            muted={isMuted}
            loop
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <img
            src={currentStory.media_url}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 20,
          display: 'flex',
        }}
      >
        {storyItems.map((_, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              height: 2,
              background: 'rgba(255,255,255,0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: idx < currentIndex ? '#fff' : currentIndex === idx ? '#FF4F5E' : 'rgba(255,255,255,0.3)',
                width: idx < currentIndex ? '100%' : idx === currentIndex ? Math.min(100, (viewTime / 5000) * 100) : 0,
                transition: idx === currentIndex ? 'none' : 'width 0.1s linear',
              }}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={story.user_photo}
            alt=""
            style={{
              width: 32,
              height: 32,
              borderRadius: 50,
              objectFit: 'cover',
              border: '2px solid var(--tinder-pink)',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{story.user_name || 'You'}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
              {story.location || 'Campus'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isMuted ? (
            <button
              onClick={() => setIsMuted(false)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 50,
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ color: '#fff', fontSize: 18 }}>
                <DownloadIcon size={18} />
              </div>
            </button>
          ) : (
            <button
              onClick={() => setIsMuted(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 50,
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ color: '#fff', fontSize: 18, filter: 'grayscale(1)' }}>
                <DownloadIcon size={18} />
              </div>
            </button>
          )}
        </div>
      </div>

      {story.user_id === viewerId && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(story.id)
            onClose()
          }}
          style={{
            position: 'absolute',
            top: 60,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 50,
            background: 'rgba(255, 68, 88, 0.9)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
          }}
        >
          <TrashIcon size={18} />
        </button>
      )}

      {story.caption && (
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 0,
            right: 0,
            padding: '0 20px',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            textAlign: 'center',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            overflowWrap: 'break-word',
            zIndex: 20,
          }}
        >
          {story.caption}
        </div>
      )}

      {storyItems.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            zIndex: 20,
          }}
        >
          {storyItems.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentIndex ? 24 : 8,
                height: 4,
                borderRadius: 2,
                background: idx <= currentIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'width 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface StoryCaptureProps {
  onClose: () => void
  onStoryCreated: (story: any) => void
  token: string
  user: any
}

export function StoryCapture({ onClose, onStoryCreated, token, user }: StoryCaptureProps) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [caption, setCaption] = useState('')
  const [durationHours, setDurationHours] = useState(24)
  const [isUploading, setIsUploading] = useState(false)
  const [isVideoMode, setIsVideoMode] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [cameraStream])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoMode ? { width: 1080, height: 1920 } : { width: 1080, height: 1920 },
        audio: isVideoMode,
      })
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Camera access denied:', err)
    }
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0)
    setMediaUrl(canvas.toDataURL('image/jpeg', 0.8))
    setMediaType('image')
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    setMediaType(isVideo ? 'video' : 'image')

    const url = URL.createObjectURL(file)
    setMediaUrl(url)
  }

  async function publishStory() {
    if (!mediaUrl) return

    setIsUploading(true)
    try {
      const r = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_url: mediaUrl,
          media_type: mediaType,
          caption: caption,
          duration_hours: durationHours,
        }),
      })

      if (!r.ok) throw new Error('Failed to create story')

      const story = await r.json()
      onStoryCreated(story)
      onClose()
    } catch (err) {
      console.error('Story creation failed:', err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 16,
          width: 40,
          height: 40,
          borderRadius: 50,
          background: 'rgba(0,0,0,0.6)',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 20,
        }}
        onClick={onClose}
      >
        <ArrowLeftIcon size={20} />
      </div>

      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}
      >
        {cameraStream && videoRef.current ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: 16,
            }}
          >
            Camera not available
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={capturePhoto}
          style={{
            width: 72,
            height: 72,
            borderRadius: 50,
            background: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={() => setIsVideoMode((v) => !v)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 50,
            background: isVideoMode ? 'var(--tinder-pink)' : 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          {isVideoMode ? '&#x1F4F7;' : '&#x1F4F5;'}
        </button>
      </div>
    </div>
  )
}
