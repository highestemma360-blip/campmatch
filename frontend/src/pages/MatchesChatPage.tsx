import React, { useState, useRef, useEffect } from 'react'
import { MatchSummary, ChatMessage, CurrentUser, ProfileCard } from '../types'
import { ICEBREAKER_QUESTIONS, makeAvatarPlaceholder } from '../constants'
import {
  VerifiedBadge,
  ShieldIcon,
  SendIcon,
  ArrowLeftIcon,
  StarIcon,
  HeartIcon,
  ClockIcon,
  ShuffleIcon,
} from '../components/Icons'
import { StoryViewer } from '../components/StoryComponents'

interface MatchesListViewProps {
  matches: MatchSummary[]
  likesCount: number
  onOpenChat: (m: MatchSummary) => void
  onOpenLikes: () => void
  compactSidebar?: boolean
  stories?: { user_id: number; viewed_by_me: boolean }[]
  onViewed?: (storyId: number) => void
}

export function MatchesListView({
  matches,
  likesCount,
  onOpenChat,
  onOpenLikes,
  compactSidebar = false,
  stories = [],
  onViewed,
}: MatchesListViewProps) {
  const [search, setSearch] = useState('')
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [currentStory, setCurrentStory] = useState<any>(null)

  // Build a lookup: user_id -> { viewed_by_me }
  const storyMap = new Map(
    stories.map(s => [s.user_id, { viewed_by_me: s.viewed_by_me }])
  )

  function hasStory(userId: number): boolean {
    return storyMap.has(userId)
  }

  function storyViewed(userId: number): boolean {
    return storyMap.get(userId)?.viewed_by_me ?? false
  }

  function getStoryForUser(userId: number): any | null {
    return stories.find(s => s.user_id === userId) || null
  }

  const filtered = matches.filter(m =>
    (m.user.name || '').toLowerCase().includes(search.toLowerCase())
  )
  const newQueue = filtered.filter(m => !m.last_message)
  const activeConvos = filtered.filter(m => Boolean(m.last_message))

  function formatRelTime(iso?: string | null) {
    if (!iso) return ''
    const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
    if (mins < 60) return `${mins}m`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.round(hrs / 24)}d`
  }

  return (
    <div className="scroll-pane" style={{ padding: compactSidebar ? '12px 14px 20px' : '16px 16px 28px' }}>
      <input
        className="modern-input"
        style={{ padding: '10px 14px', borderRadius: 999, fontSize: 13.5, marginBottom: 16 }}
        placeholder="Search matches and messages..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Match Queue ({newQueue.length})
        </span>
        <span style={{ fontSize: 11, color: '#ffc629', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ClockIcon size={12} /> 24h Window
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 12,
          marginBottom: 14,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="match-ring-item" onClick={onOpenLikes} role="button" tabIndex={0} aria-label="Likes You">
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ffd84d, #f59e0b)',
              padding: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#1c1808',
                color: '#ffd84d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              <HeartIcon size={14} /> {likesCount}
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b' }}>Likes</span>
        </div>

        {newQueue.map(m => {
          const hrs = m.hours_left ?? 20
          const pct = Math.min(100, Math.max(12, Math.round((hrs / 24) * 100)))
          return (
            <div key={m.match_id} className="match-ring-item" onClick={() => onOpenChat(m)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onOpenChat(m) }} aria-label={`${m.user.name.split(' ')[0]}, ${Math.max(1, Math.round(hrs))} hours left`}>
              <div
                className={`match-ring-wrap ${m.is_super ? 'super' : ''}`}
                style={{ ['--pct' as any]: `${pct}%` }}
              >
                <img
                  src={m.user.photo_url || m.user.photo_urls?.[0] || makeAvatarPlaceholder(m.user.name)}
                  alt={m.user.name}
                />
                {m.is_super && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'var(--super-grad)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--bg-app)',
                    }}
                  >
                    <StarIcon size={11} />
                  </span>
                )}
                {hasStory(m.user.id) && !storyViewed(m.user.id) && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'var(--brand-grad)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--bg-app)',
                      fontSize: 10,
                      fontWeight: 900,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const story = getStoryForUser(m.user.id)
                      if (story) {
                        setCurrentStory(story)
                        setShowStoryViewer(true)
                      }
                    }}
                  >
                    ●
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  maxWidth: 74,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.user.name.split(' ')[0]}
              </span>
              <span style={{ fontSize: 10.5, color: hrs < 6 ? '#ff5a67' : 'var(--text-muted)', fontWeight: 700, marginTop: -4 }}>
                {Math.max(1, Math.round(hrs))}h left
              </span>
            </div>
          )
        })}

        {newQueue.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 12.5, color: 'var(--text-muted)', paddingLeft: 4 }}>
            New mutual likes appear here.
          </div>
        )}
      </div>

      <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
        Messages ({activeConvos.length})
      </div>

      {activeConvos.length === 0 ? (
        <div
          style={{
            padding: '34px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13.5,
          }}
        >
          Select a match above to start a conversation.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {activeConvos.map(m => (
            <div
              key={m.match_id}
              onClick={() => onOpenChat(m)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 10px',
                borderRadius: 16,
                cursor: 'pointer',
                background: m.unread_count ? 'rgba(253, 38, 122, 0.07)' : 'transparent',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={m.user.photo_url || m.user.photo_urls?.[0] || makeAvatarPlaceholder(m.user.name)}
                  alt={m.user.name}
                  style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }}
                />
                {m.user.online && (
                  <span
                    className="active-dot"
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      right: 2,
                      border: '2px solid var(--bg-app)',
                      width: 12,
                      height: 12,
                    }}
                  />
                )}
                {hasStory(m.user.id) && !storyViewed(m.user.id) && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'var(--brand-grad)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--bg-app)',
                      fontSize: 9,
                      fontWeight: 900,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const story = getStoryForUser(m.user.id)
                      if (story) {
                        setCurrentStory(story)
                        setShowStoryViewer(true)
                      }
                    }}
                  >
                    ●
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 15 }}>
                    <span>{m.user.name}</span>
                    <VerifiedBadge size={15} />
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                    {formatRelTime(m.last_at)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: m.unread_count ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: m.unread_count ? 700 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 3,
                  }}
                >
                  {m.last_message}
                </div>
              </div>

              {Boolean(m.unread_count) && (
                <span
                  style={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: 99,
                    background: 'var(--brand-grad)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 6px',
                  }}
                >
                  {m.unread_count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {showStoryViewer && currentStory && (
        <StoryViewer
          story={currentStory}
          viewerId="me"
          onClose={() => setShowStoryViewer(false)}
          onDelete={() => setShowStoryViewer(false)}
          onViewed={(storyId: string) => {
            if (onViewed) onViewed(parseInt(storyId, 10))
          }}
        />
      )}
    </div>
  )
}

interface ChatConversationViewProps {
  me: CurrentUser
  chat: MatchSummary
  messages: ChatMessage[]
  partnerTyping: boolean
  showReadReceipts?: boolean
  onBack: () => void
  onSend: (text: string) => void
  onTyping: (isTyping: boolean) => void
  onReact: (msgId: number, reaction: string) => void
  onExtendMatch: (matchId: number) => void
  onUnmatch: (matchId: number) => void
  onBlock: (user: ProfileCard) => void
  onInspectProfile: (user: ProfileCard) => void
  onOpenReport: (user: ProfileCard) => void
}

export function ChatConversationView({
  me,
  chat,
  messages,
  partnerTyping,
  showReadReceipts = false,
  onBack,
  onSend,
  onTyping,
  onReact,
  onExtendMatch,
  onUnmatch,
  onBlock,
  onInspectProfile,
  onOpenReport,
}: ChatConversationViewProps) {
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, partnerTyping, chat.match_id])

  function handleInput(val: string) {
    setText(val)
    onTyping(val.trim().length > 0)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = window.setTimeout(() => {
      onTyping(false)
    }, 2200)
  }

  function submit() {
    if (!text.trim()) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    onTyping(false)
    onSend(text.trim())
    setText('')
  }

  function rollIcebreaker() {
    const random = ICEBREAKER_QUESTIONS[Math.floor(Math.random() * ICEBREAKER_QUESTIONS.length)]
    setText(random)
  }

  function formatMsgTime(iso: string) {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="top-bar" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            className="icon-circle-btn icon-btn"
            style={{ width: 44, height: 44 }}
            aria-label="Back"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <div
            onClick={() => onInspectProfile(chat.user)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={chat.user.photo_url || chat.user.photo_urls?.[0] || makeAvatarPlaceholder(chat.user.name)}
                alt={chat.user.name}
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
              />
              {chat.user.online && (
                <span
                  className="active-dot"
                  style={{ position: 'absolute', right: 0, bottom: 0, border: '2px solid var(--bg-app)' }}
                />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 15 }}>
                <span>{chat.user.name}</span>
                <VerifiedBadge size={15} />
              </div>
              <div style={{ fontSize: 11.5, color: partnerTyping ? 'var(--tinder-pink)' : 'var(--text-secondary)', fontWeight: partnerTyping ? 700 : 500 }}>
                {partnerTyping ? 'typing...' : chat.user.online ? 'Online now' : `${chat.user.course}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            className="icon-circle-btn"
            onClick={() => setMenuOpen(v => !v)}
            title="Match & Safety Options"
          >
            <ShieldIcon size={18} />
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 44,
                width: 210,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-strong)',
                borderRadius: 15,
                padding: 6,
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                zIndex: 40,
              }}
            >
              {!chat.extended && messages.length === 0 && (
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onExtendMatch(chat.match_id)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'transparent',
                    color: '#ffc629',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  Extend Match (+24h)
                </button>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onInspectProfile(chat.user)
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                View Full Profile
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onUnmatch(chat.match_id)
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Unmatch
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onBlock(chat.user)
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Block User
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onOpenReport(chat.user)
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: '#ff5a67',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Report & Block
              </button>
            </div>
          )}
        </div>
      </div>

      {messages.length === 0 && (
        <div
          style={{
            margin: '10px 14px 0',
            padding: '10px 14px',
            borderRadius: 14,
            background: 'rgba(255, 198, 41, 0.11)',
            border: '1px solid rgba(255, 198, 41, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            fontSize: 12.5,
          }}
        >
          <span>
            <strong>{chat.hours_left ? `${Math.round(chat.hours_left)}h` : '24h'} remaining</strong> to send the first message.
          </span>
          {!chat.extended && (
            <button
              onClick={() => onExtendMatch(chat.match_id)}
              style={{
                padding: '5px 11px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--gold-grad)',
                color: '#111',
                fontWeight: 800,
                fontSize: 11.5,
              }}
            >
              +24h Extend
            </button>
          )}
        </div>
      )}

      <div className="scroll-pane" style={{ padding: '16px 14px' }}>
        {chat.user.opening_move && (
          <div
            style={{
              background: 'var(--prompt-bg)',
              border: '1px solid var(--prompt-border)',
              borderRadius: 18,
              padding: '14px 16px',
              marginBottom: 18,
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--bumble-amber)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {chat.user.name.split(' ')[0]}’s Opening Move
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 4 }}>
              {chat.user.opening_move}
            </div>
            {messages.length === 0 && (
              <button
                onClick={() => setText(`Re "${chat.user.opening_move}": `)}
                style={{
                  marginTop: 8,
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--prompt-border)',
                  background: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Answer Prompt
              </button>
            )}
          </div>
        )}

        {messages.map((m, idx) => {
          const isMine = m.sender_id === me.id
          const isLastMine = isMine && idx === messages.length - 1
          const hasHeart = Boolean(m.reaction)
          return (
            <div key={m.id} className="chat-bubble-row">
              <div
                className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}
                onDoubleClick={() => onReact(m.id, 'heart')}
                title="Double-click to like message"
              >
                {m.content}
                {hasHeart && (
                  <span
                    onClick={() => onReact(m.id, 'heart')}
                    style={{
                      position: 'absolute',
                      bottom: -10,
                      right: isMine ? 'auto' : 10,
                      left: isMine ? 10 : 'auto',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 99,
                      width: 22,
                      height: 22,
                      color: '#fd267a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <HeartIcon size={12} />
                  </span>
                )}
              </div>

              <div
                style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  marginTop: hasHeart ? 11 : 4,
                  fontSize: 10.5,
                  color: 'var(--text-muted)',
                }}
              >
                <span>{formatMsgTime(m.created_at)}</span>
                {!isMine && (
                  <button
                    onClick={() => onReact(m.id, 'heart')}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: hasHeart ? '#fd267a' : 'var(--text-muted)',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <HeartIcon size={11} />
                  </button>
                )}
                {isLastMine && showReadReceipts && (
                  <span style={{ fontWeight: 700 }}>{m.read ? 'Seen' : 'Delivered'}</span>
                )}
              </div>
            </div>
          )
        })}

        {partnerTyping && (
          <div className="typing-dots" style={{ marginTop: 4 }}>
            <span />
            <span />
            <span />
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div
        style={{
          padding: '8px 12px calc(10px + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-glass)',
        }}
      >
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto' }}>
          <button
            type="button"
            onClick={rollIcebreaker}
            style={{
              padding: '5px 11px',
              borderRadius: 999,
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: 11.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <ShuffleIcon size={12} /> Icebreaker
          </button>
          {['Hey, how is your day?', 'Grab food after lectures?', 'What music are you into?'].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => setText(chip)}
              style={{
                padding: '5px 11px',
                borderRadius: 999,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                fontSize: 11.5,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="modern-input"
            style={{ borderRadius: 999, padding: '11px 16px', flex: 1 }}
            placeholder={`Message ${chat.user.name.split(' ')[0]}...`}
            value={text}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: 'var(--brand-grad)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <SendIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
