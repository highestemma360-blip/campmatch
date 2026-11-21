import React, { useState, useEffect, useRef } from 'react'
import {
  AppMode,
  AppNotification,
  NavTab,
  ProfileCard,
  CurrentUser,
  MatchSummary,
  ChatMessage,
  PlusConfig,
  SwipeQuota,
} from './types'
import { EXPLORE_VIBES, ExploreVibe, makeAvatarPlaceholder, registerExploreRooms } from './constants'
import { RealtimeClient } from './utils/realtime'
import {
  CampmatchLogo,
  FlameIcon,
  CompassIcon,
  HeartIcon,
  ChatBubbleIcon,
  UserIcon,
  SlidersIcon,
  SunIcon,
  MoonIcon,
  SettingsGearIcon,
  BellIcon,
} from './components/Icons'
import { SwipeDeck } from './components/SwipeDeck'
import { ProfileSheet } from './components/ProfileSheet'
import { MatchCelebration } from './components/MatchCelebration'
import { NotificationsSheet } from './components/NotificationsSheet'
import { NotificationPopup } from './components/NotificationPopup'
import { PlusSuccessModal } from './components/PlusSuccessModal'
import { DiscoveryModal, PlusModal, ReportModal, DeleteAccountModal } from './components/Modals'
import { FloatingWhatsAppBtn } from './components/FloatingWhatsAppBtn'
import { AiHelpDesk } from './components/AiHelpDesk'
import { InstallPrompt } from './components/InstallPrompt'
import { useInstallPrompt } from './utils/useInstallPrompt'
import {
  pushSupported,
  PushState,
  getPushState,
  enablePush,
  disablePush,
} from './utils/push'
import { isStandalone, wasJustInstalled } from './utils/pwa'
import { AuthPage } from './pages/AuthPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ExplorePage } from './pages/ExplorePage'
import { LikesYouPage } from './pages/LikesYouPage'
import { MatchesListView, ChatConversationView } from './pages/MatchesChatPage'
import { ProfilePage } from './pages/ProfilePage'
import { AdminPortal } from './pages/AdminPortal'
import { PhotoRequirementPage } from './pages/PhotoRequirementPage'

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* Storage unavailable (private mode / quota) — degrade gracefully. */
  }
}

function StudentApp({
  initialToken,
  onTokenUpdated,
}: {
  initialToken?: string
  onTokenUpdated?: (token: string) => void
} = {}) {
  const [token, setToken] = useState(() => (initialToken || safeGetItem('token') || ''))
  const [authLoading, setAuthLoading] = useState(Boolean(!initialToken && (safeGetItem('token') || '')))
  const [authError, setAuthError] = useState<string | null>(null)
  const [theme, setTheme] = useState(() => safeGetItem('theme') || 'dark')
  const [tab, setTab] = useState<NavTab>('swipe')
  const [needsSetup, setNeedsSetup] = useState(false)

  const [whatsappLink, setWhatsappLink] = useState('')

  const [me, setMe] = useState<CurrentUser | null>(null)
  const [photoRequired, setPhotoRequired] = useState(false)
  const [pushState, setPushState] = useState<PushState>({
    supported: pushSupported(),
    permission: 'default',
    enabled: false,
  })
  const [quota, setQuota] = useState<SwipeQuota | undefined>(undefined)
  const [plusConfig, setPlusConfig] = useState<PlusConfig>({
    enabled: false,
    price_ghs: 25,
    duration_days: 30,
    free_daily_swipe_limit: 10,
    announcement_banner: '',
  })

  const [mode, setMode] = useState<AppMode>('date')
  const [activeVibe, setActiveVibe] = useState<ExploreVibe | null>(null)
  const [deck, setDeck] = useState<ProfileCard[]>([])
  const [rewindAvailable, setRewindAvailable] = useState(false)
  const [justRewound, setJustRewound] = useState(false)
  const [exploreCounts, setExploreCounts] = useState<Record<string, number>>({})
  const [exploreOptedIn, setExploreOptedIn] = useState<string[]>([])
  const [exploreRooms, setExploreRooms] = useState<ExploreVibe[]>(EXPLORE_VIBES)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [popupNotification, setPopupNotification] = useState<AppNotification | null>(null)
  const [showPlusSuccess, setShowPlusSuccess] = useState(false)
  const [plusUntil, setPlusUntil] = useState<string | null>(null)

  const [likesItems, setLikesItems] = useState<ProfileCard[]>([])
  const [likesLocked, setLikesLocked] = useState(false)
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [activeChat, setActiveChat] = useState<MatchSummary | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [partnerTyping, setPartnerTyping] = useState(false)

  const [inspectedProfile, setInspectedProfile] = useState<ProfileCard | null>(null)
  const [previewingSelf, setPreviewingSelf] = useState(false)
  const [matchedUser, setMatchedUser] = useState<ProfileCard | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showPlusModal, setShowPlusModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [aiDeskOpen, setAiDeskOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<ProfileCard | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const rtRef = useRef<RealtimeClient | null>(null)
  const activeChatRef = useRef<MatchSummary | null>(null)
  activeChatRef.current = activeChat
  const notificationsRef = useRef<AppNotification[]>([])
  notificationsRef.current = notifications

  const install = useInstallPrompt({
    enabled: Boolean(me) && !needsSetup,
    blocked:
      aiDeskOpen ||
      showPlusModal ||
      showPlusSuccess ||
      showNotifications ||
      showFilters ||
      showDeleteModal ||
      Boolean(popupNotification) ||
      Boolean(activeChat) ||
      Boolean(matchedUser) ||
      Boolean(inspectedProfile) ||
      Boolean(reportTarget),
  })

  // Fetch WhatsApp support phone from server config (admin-controlled).
  useEffect(() => {
    let active = true
    fetch('/api/auth-config')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (active && d) setWhatsappLink(d.whatsapp_link || '')
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  // Auto-enable phone alerts once the app is installed to the home screen.
  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      if (!active) return
      if (!me || !token) return
      if (!pushSupported() || !isStandalone()) return
      if (!wasJustInstalled()) return
      if (localStorage.getItem('campmatch_push_manually_disabled') === '1') return
      if (localStorage.getItem('campmatch_push_auto_on_done') === '1') return
      const state = await getPushState()
      setPushState(state)
      if (state.enabled || state.permission === 'denied') return
      const res = await enablePush(token)
      setPushState(await getPushState())
      if (res.ok) {
        localStorage.setItem('campmatch_push_auto_on_done', '1')
        showToast('Phone alerts are on — you’ll get match and campus notifications.')
      } else if (res.denied) {
        localStorage.setItem('campmatch_push_manually_disabled', '1')
      }
    }, 2000)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [me, token])

  // Daily nudge: once per day, if there is unread activity, surface a system
  // notification so installed users keep returning to the app.
  const DAILY_KEY = 'campmatch_daily_reminder_date'
  useEffect(() => {
    const today = new Date().toDateString()
    const last = safeGetItem(DAILY_KEY)
    if (last === today) return
    const hasUnread = notifications.some(n => !n.read) || Boolean(matchedUser)
    const mayNotify =
      pushState.permission === 'granted' || pushState.enabled
    if (
      hasUnread &&
      mayNotify &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      new Notification('New on Campmatch', {
        body:
          'You have new matches or updates waiting — open Campmatch to check them out.',
        icon: '/icon-192.png',
        tag: 'daily-reminder',
      })
    }
    localStorage.setItem(DAILY_KEY, today)
  }, [notifications, matchedUser, pushState.permission, pushState.enabled])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => {
      setToast(prev => (prev === msg ? null : prev))
    }, 3200)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    safeSetItem('theme', theme)
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#08090D' : '#FFFFFF')
    }
  }, [theme])

  // Verify token on mount / when token changes, before deciding landing vs app.
  // onTokenUpdated is wrapped in a ref so it doesn't cause effect re-runs.
  const onTokenUpdatedRef = useRef(onTokenUpdated)
  onTokenUpdatedRef.current = onTokenUpdated

  // Track whether we just authenticated (initialToken provided) vs loading stored token
  const justAuthedRef = useRef(Boolean(initialToken))

  useEffect(() => {
    let active = true

    async function verifyAuth() {
      if (!token) {
        setAuthLoading(false)
        setAuthError(null)
        return
      }
      // Only show loading spinner on initial page load (stored token), not after fresh login
      if (!justAuthedRef.current) {
        setAuthLoading(true)
      }
      setAuthError(null)
      try {
        const r = await fetch('/api/me', {
          headers: { Authorization: 'Bearer ' + token },
          credentials: 'include',
        })
        if (!r.ok) {
          if (active) {
            // If we just authenticated via onAuth, the token IS valid - don't clear it
            if (!justAuthedRef.current) {
              setAuthError('Session expired. Please sign in again.')
              setToken('')
              localStorage.removeItem('token')
              localStorage.removeItem('refresh_token')
              onTokenUpdatedRef.current?.('')
            } else {
              // Just logged in - /api/me may be temporarily slow, don't fall back
              setAuthError(null)
            }
          }
        }
      } catch {
        if (active) {
          if (!justAuthedRef.current) {
            setAuthError('Unable to verify session. Please sign in again.')
            setToken('')
            localStorage.removeItem('token')
            localStorage.removeItem('refresh_token')
            onTokenUpdatedRef.current?.('')
          } else {
            setAuthError(null)
          }
        }
      } finally {
        if (active) setAuthLoading(false)
      }
    }

    verifyAuth()
    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    fetch('/api/plus-status')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) setPlusConfig(d)
      })
      .catch(() => {})
  }, [])

  // Verify Paystack redirect reference if present in URL
  useEffect(() => {
    if (!token) return
    const params = new URLSearchParams(window.location.search)
    const paymentRef = params.get('payment_ref')
    if (paymentRef) {
      fetch(`/api/payments/verify/${encodeURIComponent(paymentRef)}`, {
        headers: { Authorization: 'Bearer ' + token },
      })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (d?.is_premium) {
            setPlusUntil(d.premium_until || null)
            setShowPlusSuccess(true)
            loadMe()
            loadQuota()
            loadLikesYou()
          }
        })
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname)
        })
    }
  }, [token])

  // Real-time WebSocket connection & event handling
  useEffect(() => {
    if (!token) {
      rtRef.current?.disconnect()
      return
    }

    const client = new RealtimeClient(event => {
      switch (event.type) {
        case 'new_message': {
          const msg: ChatMessage = event.message
          const current = activeChatRef.current
          if (current && current.match_id === event.match_id) {
            setMessages(prev => (prev.some(x => x.id === msg.id) ? prev : [...prev, msg]))
            setPartnerTyping(false)
            loadMatches()
            if (msg.sender_id !== current.user.id) return
            fetch(`/api/matches/${current.match_id}/messages`, {
              headers: { Authorization: 'Bearer ' + token },
            }).catch(() => {})
          } else {
            loadMatches()
          }
          break
        }
        case 'typing': {
          const current = activeChatRef.current
          if (current && current.match_id === event.match_id) {
            setPartnerTyping(Boolean(event.is_typing))
          }
          break
        }
        case 'messages_read': {
          const current = activeChatRef.current
          if (current && current.match_id === event.match_id) {
            setMessages(prev => prev.map(m => ({ ...m, read: true })))
          }
          break
        }
        case 'message_reaction': {
          const current = activeChatRef.current
          if (current && current.match_id === event.match_id) {
            setMessages(prev =>
              prev.map(m => (m.id === event.message_id ? { ...m, reaction: event.reaction } : m))
            )
          }
          break
        }
        case 'new_match': {
          if (event.partner) setMatchedUser(event.partner)
          loadMatches()
          loadLikesYou()
          break
        }
        case 'new_like': {
          loadLikesYou()
          showToast('Someone liked your profile')
          break
        }
        case 'match_extended': {
          loadMatches()
          break
        }
        case 'match_removed': {
          setMatches(prev => prev.filter(m => m.match_id !== event.match_id))
          if (activeChatRef.current?.match_id === event.match_id) {
            setActiveChat(null)
          }
          break
        }
        case 'explore_updated': {
          loadExploreCounts()
          break
        }
        case 'notification_created': {
          loadNotifications(true)
          break
        }
        case 'platform_config': {
          setPlusConfig({
            enabled: Boolean(event.plus_enabled),
            price_ghs: Number(event.plus_price_ghs ?? 25),
            duration_days: Number(event.plus_duration_days ?? 30),
            free_daily_swipe_limit: Number(event.free_daily_swipe_limit ?? 10),
            announcement_banner: event.announcement_banner || '',
          })
          loadQuota()
          loadLikesYou()
          break
        }
        case 'plus_activated': {
          setMe(prev =>
            prev
              ? {
                  ...prev,
                  is_premium: Boolean(event.is_premium),
                  premium_until: event.premium_until ?? prev.premium_until,
                }
              : prev
          )
          if (event.is_premium) {
            setPlusUntil(event.premium_until || null)
            setShowPlusSuccess(true)
            setShowPlusModal(false)
          }
          loadMe()
          loadLikesYou()
          loadQuota()
          loadMatches()
          break
        }
        case 'account_terminated': {
          handleLogout()
          break
        }
      }
    })

    rtRef.current = client
    client.connect(token)

    loadMe()
    loadExploreRooms()
    loadNotifications()
    if (navigator.geolocation) {
      // Real-time location tracking using watchPosition
      const watchId = navigator.geolocation.watchPosition(
        pos => {
          fetch('/api/profile/location', {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp,
            }),
          }).catch(() => {})
        },
        (error) => {
          console.warn('Location access denied or unavailable:', error.message)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      )
      // Store watchId for cleanup
      ;(rtRef.current as any)?.setLocationWatchId?.(watchId)
    }

    return () => {
      client.disconnect()
    }
  }, [token])

  function seenNotificationIds(): Set<number> {
    try {
      const raw = localStorage.getItem('campmatch_notif_seen')
      const parsed = raw ? JSON.parse(raw) : []
      return new Set(Array.isArray(parsed) ? parsed.map(Number) : [])
    } catch {
      return new Set()
    }
  }

  function rememberNotificationSeen(id: number) {
    try {
      const ids = Array.from(seenNotificationIds())
      if (!ids.includes(id)) ids.push(id)
      localStorage.setItem('campmatch_notif_seen', JSON.stringify(ids.slice(-300)))
    } catch {
      // Local storage is best-effort only.
    }
  }

  function maybeShowNotificationPopup(items: AppNotification[]) {
    const seen = seenNotificationIds()
    const next = [...items]
      .filter(i => !i.read && !seen.has(i.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    if (next) setPopupNotification(prev => prev ?? next)
  }

  function dismissNotificationPopup() {
    const current = popupNotification
    if (current) {
      rememberNotificationSeen(current.id)
      markNotificationRead(current.id)
    }
    setPopupNotification(null)
    window.setTimeout(() => {
      const seen = seenNotificationIds()
      const next = notificationsRef.current
        .filter(i => !i.read && !seen.has(i.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      if (next) setPopupNotification(next)
    }, 260)
  }

  async function loadNotifications(announce = false) {
    if (!token) return
    try {
      const r = await fetch('/api/notifications', { headers: { Authorization: 'Bearer ' + token } })
      if (!r.ok) return
      const d = await r.json()
      const items: AppNotification[] = d.items || []
      setNotifications(items)
      maybeShowNotificationPopup(items)
    } catch {
      // Notifications are non-critical; keep the app usable if the request fails.
    }
  }

  async function markNotificationRead(id: number) {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    }).catch(() => {})
  }

  async function markAllNotificationsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    }).catch(() => {})
  }

  async function loadExploreRooms() {
    if (!token) return
    const r = await fetch('/api/explore/rooms', {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (!r.ok) return
    const d = await r.json()
    const rooms: ExploreVibe[] = (d.rooms || []).map((room: any) => ({
      id: room.slug,
      title: room.title,
      subtitle: room.subtitle,
      tag: room.tag,
      icon: room.icon,
      gradient: room.gradient,
      accent: room.accent,
      member_count: room.member_count,
      opted_in: room.opted_in,
    }))
    if (rooms.length) {
      registerExploreRooms(rooms)
      setExploreRooms(rooms)
      setExploreCounts(d.counts || {})
      setExploreOptedIn(d.opted_in || [])
    }
  }

  async function loadQuota() {
    if (!token) return
    const r = await fetch('/api/swipe-quota', { headers: { Authorization: 'Bearer ' + token } })
    if (r.ok) setQuota(await r.json())
  }

  async function loadMe() {
    try {
      const r = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } })
      if (!r.ok) {
        // If we just authenticated via Google/email, trust the new token.
        // Let verifyAuth handle token invalidation, not loadMe.
        if (!justAuthedRef.current) {
          handleLogout()
        }
        return
      }
      const u: CurrentUser = await r.json()
      setMe(u)
      setExploreOptedIn(u.explore_vibes || [])
      if (u.swipe_quota) setQuota(u.swipe_quota)
      setMode((u.mode as AppMode) || 'date')
      if (!u.is_admin && tab === 'admin') {
        setTab('swipe')
      }

      // Enforce mandatory photo requirement for new students.
      if (u.photo_required && (!u.photo_urls || u.photo_urls.length === 0)) {
        setPhotoRequired(true)
      }

      if (!u.profile_complete) {
        setNeedsSetup(true)
      } else {
        setNeedsSetup(false)
        loadDeck(activeVibe?.id, (u.mode as AppMode) || 'date')
        loadMatches()
        loadLikesYou()
        loadExploreCounts()
      }
    } catch {
      showToast('Connection error while loading profile.')
    }
  }

  async function loadDeck(vibeId?: string | null, modeVal?: AppMode) {
    const qs = new URLSearchParams()
    if (vibeId) qs.set('vibe', vibeId)
    if (modeVal || mode) qs.set('mode', modeVal || mode)
    const r = await fetch(`/api/deck?${qs.toString()}`, {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (r.ok) {
      setDeck(await r.json())
    }
  }

  async function loadLikesYou() {
    const r = await fetch('/api/likes-you', {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (r.ok) {
      const d = await r.json()
      setLikesItems(d.items || [])
      setLikesLocked(Boolean(d.locked))
    }
  }

  async function loadExploreCounts() {
    const r = await fetch('/api/explore-counts', {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (r.ok) {
      const d = await r.json()
      if (d && d.counts) {
        setExploreCounts(d.counts)
        if (Array.isArray(d.opted_in)) setExploreOptedIn(d.opted_in)
      } else {
        setExploreCounts(d || {})
      }
    }
  }

  async function handleToggleExploreOptIn(vibeId: string) {
    const r = await fetch(`/api/explore/opt-in?vibe=${encodeURIComponent(vibeId)}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    })
    if (r.ok) {
      const d = await r.json()
      const nextOpted = d.opted_in || []
      setExploreOptedIn(nextOpted)
      if (d.counts) setExploreCounts(d.counts)
      if (me) setMe({ ...me, explore_vibes: nextOpted })
      const room = exploreRooms.find(r => r.id === vibeId)
      showToast(d.joined ? `Opted into ${room?.title || 'Explore room'}` : `Left ${room?.title || 'Explore room'}`)
    }
  }

  async function loadMatches() {
    const r = await fetch('/api/matches', {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (r.ok) {
      setMatches(await r.json())
    }
  }

  async function handleModeSwitch(nextMode: AppMode) {
    setMode(nextMode)
    if (me) setMe({ ...me, mode: nextMode })
    loadDeck(activeVibe?.id, nextMode)
    if (me) {
      fetch('/api/profile', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...me, mode: nextMode }),
      }).catch(() => {})
    }
  }

  async function handleSwipe(liked: boolean) {
    if (!deck.length) return
    const current = deck[0]
    setDeck(prev => prev.slice(1))
    setJustRewound(false)

    try {
      const r = await fetch(
        `/api/swipe?swiped_id=${current.id}&liked=${liked}`,
        { method: 'POST', headers: { Authorization: 'Bearer ' + token } }
      )
      const d = await r.json()
      if (!r.ok) {
        // Restore card if server rejected due to daily cap
        setDeck(prev => [current, ...prev])
        const code = d.detail?.code
        if (d.detail?.quota) setQuota(d.detail.quota)
        if (code === 'DAILY_SWIPE_LIMIT') {
          setShowPlusModal(true)
        } else {
          showToast(typeof d.detail === 'string' ? d.detail : d.detail?.message || 'Swipe failed.')
        }
        return
      }

      setRewindAvailable(true)
      if (d.quota) setQuota(d.quota)
      if (d.matched) {
        setMatchedUser(current)
        loadMatches()
        loadLikesYou()
      }
      if (deck.length <= 3) loadDeck(activeVibe?.id, mode)
    } catch {
      setDeck(prev => [current, ...prev])
      showToast('Network error — please retry.')
    }
  }

  async function handleRewind() {
    const r = await fetch('/api/rewind', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      if (d.detail?.code === 'PLUS_REQUIRED') {
        setShowPlusModal(true)
      } else {
        showToast(typeof d.detail === 'string' ? d.detail : d.detail?.message || 'Nothing to rewind.')
        setRewindAvailable(false)
      }
      return
    }
    if (d.quota) setQuota(d.quota)
    setJustRewound(true)
    setRewindAvailable(false)
    setDeck(prev => [d.card, ...prev.filter(c => c.id !== d.card.id)])
    showToast(`Rewound ${d.card.name}`)
  }

  async function handleBoost() {
    const r = await fetch('/api/boost', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    })
    if (r.ok) {
      const d = await r.json()
      if (me) setMe({ ...me, is_boosted: true, boosted_until: d.boosted_until })
      showToast('Spotlight active for the next 30 minutes.')
    }
  }

  async function handleSwipeAdmirer(admirer: ProfileCard, liked: boolean) {
    setLikesItems(prev => prev.filter(i => i.id !== admirer.id))
    const r = await fetch(`/api/swipe?swiped_id=${admirer.id}&liked=${liked}&super_like=false`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      if (d.detail?.code === 'DAILY_SWIPE_LIMIT') {
        if (d.detail?.quota) setQuota(d.detail.quota)
        setShowPlusModal(true)
        loadLikesYou()
      }
      return
    }
    if (d.quota) setQuota(d.quota)
    if (d.matched) {
      setMatchedUser(admirer)
      loadMatches()
    }
  }

  async function openChat(m: MatchSummary) {
    setActiveChat(m)
    setPartnerTyping(false)
    setTab('matches')
    setMatches(prev => prev.map(x => (x.match_id === m.match_id ? { ...x, unread_count: 0 } : x)))
    const r = await fetch(`/api/matches/${m.match_id}/messages`, {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (r.ok) {
      setMessages(await r.json())
    }
  }

  async function sendChatMessage(content: string) {
    if (!activeChat) return
    const r = await fetch(`/api/matches/${activeChat.match_id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })
    if (r.ok) {
      const d = await r.json()
      setMessages(prev => (prev.some(x => x.id === d.message.id) ? prev : [...prev, d.message]))
      loadMatches()
    }
  }

  function sendTypingSignal(isTyping: boolean) {
    if (!activeChat) return
    rtRef.current?.send({
      type: 'typing',
      match_id: activeChat.match_id,
      is_typing: isTyping,
    })
  }

  async function handleSendMatchQuickMessage(text: string) {
    const target = matchedUser
    setMatchedUser(null)
    if (!target) return

    const r = await fetch('/api/matches', { headers: { Authorization: 'Bearer ' + token } })
    if (r.ok) {
      const list: MatchSummary[] = await r.json()
      setMatches(list)
      const found = list.find(m => m.user.id === target.id)
      if (found) {
        await fetch(`/api/matches/${found.match_id}/messages`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        })
        openChat(found)
      }
    }
  }

  async function handleReactMessage(msgId: number, reaction: string) {
    const r = await fetch(`/api/messages/${msgId}/react`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction }),
    })
    if (r.ok) {
      const d = await r.json()
      setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, reaction: d.reaction } : m)))
    }
  }

  async function handleExtendMatch(matchId: number) {
    const r = await fetch(`/api/matches/${matchId}/extend`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    })
    if (r.ok) {
      showToast('Match extended by 24 hours.')
      loadMatches()
    }
  }

  async function handleUnmatch(matchId: number) {
    await fetch(`/api/matches/${matchId}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    })
    setMatches(prev => prev.filter(m => m.match_id !== matchId))
    setActiveChat(null)
    showToast('Unmatched.')
  }

  async function handleBlockUser(target: ProfileCard) {
    await fetch('/api/block', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked_id: target.id }),
    }).catch(() => {})
    setInspectedProfile(null)
    setDeck(prev => prev.filter(c => c.id !== target.id))
    setMatches(prev => prev.filter(m => m.user.id !== target.id))
    if (activeChat?.user.id === target.id) setActiveChat(null)
    showToast(`Blocked ${target.name}.`)
  }

  async function handleSaveProfile(patch: Partial<CurrentUser>) {
    if (!me) return
    const merged: CurrentUser = { ...me, ...patch }
    const r = await fetch('/api/profile', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    })
    if (r.ok) {
      const d = await r.json()
      if (d.user) {
        setMe(d.user)
        setExploreOptedIn(d.user.explore_vibes || [])
      }
      showToast('Profile saved.')
      loadDeck(activeVibe?.id, merged.mode)
      loadExploreCounts()
    }
  }

  async function handleUploadPhotos(files: File[]): Promise<{ ok: boolean; error?: string }> {
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
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
          : d.detail?.message || 'Photo did not pass verification.'
      return { ok: false, error: msg }
    }
    if (me) setMe({ ...me, photo_urls: d.photo_urls })
    showToast('Photo verified and saved.')
    if (Array.isArray(d.rejected) && d.rejected.length > 0) {
      return { ok: false, error: `${d.rejected[0].filename}: ${d.rejected[0].reason}` }
    }
    return { ok: true }
  }

  async function handleRemovePhoto(url: string) {
    const r = await fetch(`/api/profile/photos?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    })
    const d = await r.json()
    if (r.ok && me) {
      setMe({ ...me, photo_urls: d.photo_urls })
    } else if (d.detail) {
      showToast(d.detail)
    }
  }

  async function handlePlusCheckout() {
    const r = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: `Campmatch Plus (${plusConfig.duration_days} Days)` }),
    })
    const d = await r.json()
    if (!r.ok) {
      showToast(d.detail || 'Payment service is unavailable.')
      return
    }
    if (d.authorization_url) {
      window.location.href = d.authorization_url
    }
  }

  async function handleReportSubmit(reason: string, details: string) {
    if (!reportTarget) return
    const target = reportTarget
    setReportTarget(null)
    setInspectedProfile(null)
    setDeck(prev => prev.filter(c => c.id !== target.id))
    setMatches(prev => prev.filter(m => m.user.id !== target.id))
    if (activeChat?.user.id === target.id) setActiveChat(null)

    await fetch('/api/report', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reported_id: target.id, reason, details, block_user: true }),
    }).catch(() => {})
    showToast(`Report submitted and ${target.name} blocked.`)
  }

  async function handleConfirmDeleteAccount(reason: string, password: string, confirmText: string) {
    const r = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, password, confirm_text: confirmText }),
    })
    const d = await r.json()
    if (!r.ok) {
      throw new Error(d.detail || 'Account deletion failed.')
    }
    setShowDeleteModal(false)
    handleLogout()
  }

  function handleLogout() {
    rtRef.current?.disconnect()
    setToken('')
    setMe(null)
    setActiveChat(null)
    localStorage.removeItem('token')
    onTokenUpdated?.('')
  }

  // Auth loading: never show landing or app until we know the session state.
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: '#0a0a0d',
        color: '#fff',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            border: '2px solid rgba(255, 79, 94, 0.3)',
            borderTopColor: '#ff4f5e',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#c4c5d1' }}>
            {authError ? 'Signing in…' : 'Verifying session…'}
          </span>
        </div>
        {authError && (
          <button
            type="button"
            onClick={() => {
              setToken('')
              localStorage.removeItem('token')
              localStorage.removeItem('refresh_token')
              setAuthError(null)
              onTokenUpdated?.('')
            }}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              border: 'none',
              borderRadius: 10,
              background: 'transparent',
              color: '#ff4f5e',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Sign in again
          </button>
        )}
        <style>
          {`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}
        </style>
      </div>
    )
  }

  if (!token) {
    return (
      <AuthPage
        onAuth={t => {
          const accessToken = typeof t === 'string' ? t : t.access_token
          const refreshToken = typeof t === 'string' ? undefined : t.refresh_token
          setToken(accessToken)
          localStorage.setItem('token', accessToken)
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken)
          }
          setAuthLoading(true)
        }}
      />
    )
  }

  if (needsSetup) {
    return (
      <OnboardingPage
        token={token}
        initialName={me?.name || ''}
        existingPhotos={me?.photo_urls || []}
        rooms={exploreRooms}
        school={me?.school || ''}
        onDone={loadMe}
      />
    )
  }

  const totalUnread = matches.reduce((sum, m) => sum + (m.unread_count || 0), 0)
  const newMatchesCount = matches.filter(m => !m.last_message).length
  const bannerText = plusConfig.announcement_banner || me?.announcement_banner || ''

  // Mandatory photo requirement: block app until a photo is approved.
  if (photoRequired && me && (!me.photo_urls || me.photo_urls.length === 0)) {
    return (
      <PhotoRequirementPage
        token={token}
        photoRequired={true}
        onPhotoUploaded={() => {
          setPhotoRequired(false)
          loadMe()
        }}
        onClose={() => {}}
      />
    )
  }

  return (
    <div className="workspace-shell page-enter">
      {toast && <div className="toast-pill toast-enter">{toast}</div>}

      {/* Desktop Left Sidebar */}
      <aside className="desktop-sidebar">
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--brand-grad)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            onClick={() => {
              setActiveChat(null)
              setTab('profile')
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <img
              src={me?.photo_urls?.[0] || makeAvatarPlaceholder(me?.name)}
              alt=""
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff' }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{me?.name || 'My Profile'}</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>
                {me?.is_premium ? 'Plus Member' : `${me?.school || ''}`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => {
                setActiveChat(null)
                setTab('explore')
              }}
              title="Explore"
              style={{
                width: 35,
                height: 35,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.22)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CompassIcon size={17} />
            </button>
            <button
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              title="Switch Theme"
              style={{
                width: 35,
                height: 35,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.22)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '10px 12px 6px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {[
            { id: 'swipe', label: 'Discover' },
            { id: 'explore', label: 'Explore' },
            { id: 'likes', label: `Likes (${likesItems.length})` },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveChat(null)
                setTab(item.id as NavTab)
              }}
              style={{
                flex: 1,
                padding: '7px 6px',
                borderRadius: 10,
                border: 'none',
                fontSize: 12,
                fontWeight: 800,
                background: tab === item.id && !activeChat ? 'rgba(253, 38, 122, 0.14)' : 'transparent',
                color: tab === item.id && !activeChat ? 'var(--tinder-pink)' : 'var(--text-secondary)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <MatchesListView
          matches={matches}
          likesCount={likesItems.length}
          compactSidebar
          onOpenChat={openChat}
          onOpenLikes={() => {
            setActiveChat(null)
            setTab('likes')
          }}
        />
      </aside>

      {/* Main Stage */}
      <main className="main-stage">
        <div className="stage-inner">
          {bannerText && <div className="announcement-strip">{bannerText}</div>}

          {tab === 'matches' && activeChat && me ? (
            <ChatConversationView
              me={me}
              chat={activeChat}
              messages={messages}
              partnerTyping={partnerTyping}
              showReadReceipts={Boolean(me.is_premium || !plusConfig.enabled)}
              onBack={() => setActiveChat(null)}
              onSend={sendChatMessage}
              onTyping={sendTypingSignal}
              onReact={handleReactMessage}
              onExtendMatch={handleExtendMatch}
              onUnmatch={handleUnmatch}
              onBlock={handleBlockUser}
              onInspectProfile={u => setInspectedProfile(u)}
              onOpenReport={u => setReportTarget(u)}
            />
          ) : (
            <>
              <header className="top-bar">
                <div
                  className="brand-lockup"
                  onClick={() => {
                    setActiveChat(null)
                    setTab('swipe')
                  }}
                >
                  <CampmatchLogo iconSize={24} fontSize={17} gap={6} />
                </div>

                <div className="mode-pills desktop-only-modes">
                  {(['date', 'bff', 'study'] as const).map(m => (
                    <button
                      key={m}
                      className={`mode-pill ${mode === m ? `active ${m}` : ''}`}
                      onClick={() => handleModeSwitch(m)}
                    >
                      {m === 'date' ? 'Date' : m === 'bff' ? 'BFF' : 'Study'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    className="icon-circle-btn"
                    onClick={() => {
                      setShowNotifications(true)
                      loadNotifications()
                    }}
                    title="Campus notifications"
                    style={{ position: 'relative' }}
                  >
                    <BellIcon size={18} />
                    {notifications.some(n => !n.read) && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 5,
                          right: 5,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--tinder-pink)',
                          boxShadow: '0 0 0 2px var(--bg-app)',
                        }}
                      />
                    )}
                  </button>
                  <button
                    className="icon-circle-btn mobile-only-btn"
                    onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
                    title="Switch Theme"
                  >
                    {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
                  </button>
                  <button
                    className="icon-circle-btn"
                    onClick={() => setShowFilters(true)}
                    title="Discovery Preferences"
                  >
                    <SlidersIcon size={18} />
                  </button>
                </div>
              </header>

              {tab === 'swipe' && (
                <div className="mobile-mode-strip">
                  <div className="mode-pills" style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {(['date', 'bff', 'study'] as const).map(m => (
                      <button
                        key={m}
                        className={`mode-pill ${mode === m ? `active ${m}` : ''}`}
                        onClick={() => handleModeSwitch(m)}
                      >
                        {m === 'date' ? 'Date' : m === 'bff' ? 'BFF' : 'Study'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'swipe' && (
                <SwipeDeck
                  deck={deck}
                  me={me}
                  quota={quota}
                  justRewound={justRewound}
                  activeVibeLabel={activeVibe ? activeVibe.title : null}
                  onClearVibe={() => {
                    setActiveVibe(null)
                    loadDeck(null, mode)
                  }}
                  canRewind={rewindAvailable}
                  isBoosted={Boolean(me?.is_boosted)}
                  onSwipe={handleSwipe}
                  onRewind={handleRewind}
                  onBoost={handleBoost}
                  onInspect={card => setInspectedProfile(card)}
                  onReload={() => loadDeck(activeVibe?.id, mode)}
                  onOpenFilters={() => setShowFilters(true)}
                  onOpenPlus={() => setShowPlusModal(true)}
                />
              )}

              {tab === 'explore' && (
                <ExplorePage
                  token={token}
                  rooms={exploreRooms}
                  counts={exploreCounts}
                  optedIn={exploreOptedIn}
                  onToggleOptIn={handleToggleExploreOptIn}
                  onLaunchSwipeRoom={vibe => {
                    setActiveVibe(vibe)
                    setTab('swipe')
                    loadDeck(vibe.id, mode)
                  }}
                  onSwipeMember={handleSwipeAdmirer}
                  onInspect={card => setInspectedProfile(card)}
                  onBoostClick={handleBoost}
                  me={me}
                />
              )}

              {tab === 'likes' && (
                <LikesYouPage
                  items={likesItems}
                  locked={likesLocked}
                  onSwipeAdmirer={handleSwipeAdmirer}
                  onInspect={card => setInspectedProfile(card)}
                  onUpgradeClick={() => setShowPlusModal(true)}
                />
              )}

              {tab === 'matches' && !activeChat && (
                <MatchesListView
                  matches={matches}
                  likesCount={likesItems.length}
                  onOpenChat={openChat}
                  onOpenLikes={() => setTab('likes')}
                />
              )}

              {tab === 'profile' && me && (
                <ProfilePage
                  me={me}
                  token={token}
                  rooms={exploreRooms}
                  theme={theme}
                  plusConfig={plusConfig}
                  onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
                  onSaveProfile={handleSaveProfile}
                  onToggleOptIn={handleToggleExploreOptIn}
                  onUploadPhotos={handleUploadPhotos}
                  onRemovePhoto={handleRemovePhoto}
                  onPreviewMyCard={() => {
                    setPreviewingSelf(true)
                    setInspectedProfile(me)
                  }}
                  onOpenPlus={() => setShowPlusModal(true)}
                  onBoost={handleBoost}
                  onOpenFilters={() => setShowFilters(true)}
                  onOpenDeleteAccount={() => setShowDeleteModal(true)}
                  onInstallApp={install.open}
                  onTokenUpdated={newTok => {
                    setToken(newTok)
                    localStorage.setItem('token', newTok)
                  }}
                  onLogout={handleLogout}
                />
              )}

              <nav className="bottom-nav" aria-label="Main navigation">
                <button
                  type="button"
                  className={`nav-tab-btn ${tab === 'swipe' ? 'active' : ''}`}
                  onClick={() => setTab('swipe')}
                  aria-label="Discover"
                  aria-current={tab === 'swipe' ? 'true' : undefined}
                >
                  <FlameIcon size={20} />
                  <span>Discover</span>
                </button>

                <button
                  type="button"
                  className={`nav-tab-btn ${tab === 'explore' ? 'active' : ''}`}
                  onClick={() => {
                    setTab('explore')
                    loadExploreCounts()
                  }}
                  aria-label="Explore"
                  aria-current={tab === 'explore' ? 'true' : undefined}
                >
                  <CompassIcon size={20} />
                  <span>Explore</span>
                </button>

                <button
                  type="button"
                  className={`nav-tab-btn ${tab === 'likes' ? 'active' : ''}`}
                  onClick={() => {
                    setTab('likes')
                    loadLikesYou()
                  }}
                  aria-label="Likes"
                  aria-current={tab === 'likes' ? 'true' : undefined}
                >
                  {likesItems.length > 0 && (
                    <span className="nav-badge">{likesItems.length}</span>
                  )}
                  <HeartIcon size={20} />
                  <span>Likes</span>
                </button>

                <button
                  type="button"
                  className={`nav-tab-btn ${tab === 'matches' ? 'active' : ''}`}
                  onClick={() => {
                    setTab('matches')
                    loadMatches()
                  }}
                  aria-label="Chats"
                  aria-current={tab === 'matches' ? 'true' : undefined}
                >
                  {(totalUnread + newMatchesCount) > 0 && (
                    <span className="nav-badge">{totalUnread || newMatchesCount}</span>
                  )}
                  <ChatBubbleIcon size={20} />
                  <span>Chats</span>
                </button>

                <button
                  type="button"
                  className={`nav-tab-btn ${tab === 'profile' ? 'active' : ''}`}
                  onClick={() => setTab('profile')}
                  aria-label="Profile"
                  aria-current={tab === 'profile' ? 'true' : undefined}
                >
                  <UserIcon size={20} />
                  <span>Profile</span>
                </button>
              </nav>
            </>
          )}
        </div>
      </main>

      {inspectedProfile && (
        <ProfileSheet
          profile={inspectedProfile}
          previewOnly={previewingSelf || activeChat?.user.id === inspectedProfile.id}
          onClose={() => {
            setInspectedProfile(null)
            setPreviewingSelf(false)
          }}
          onAction={action => {
            if (action === 'nope') handleSwipe(false)
            else handleSwipe(true)
          }}
          onBlock={handleBlockUser}
          onReport={target => setReportTarget(target)}
        />
      )}

      {matchedUser && (
        <MatchCelebration
          me={me}
          matched={matchedUser}
          onSendQuickMessage={handleSendMatchQuickMessage}
          onGoToMatches={() => {
            setMatchedUser(null)
            setTab('matches')
            loadMatches()
          }}
          onClose={() => setMatchedUser(null)}
        />
      )}

      {showFilters && me && (
        <DiscoveryModal
          me={me}
          onSave={handleSaveProfile}
          onClose={() => setShowFilters(false)}
        />
      )}

      {showPlusModal && me && (
        <PlusModal
          isPremium={Boolean(me.is_premium)}
          plusConfig={plusConfig}
          quota={quota}
          token={token}
          userName={me?.name}
          onCheckout={handlePlusCheckout}
          onSuccess={() => {
            setShowPlusModal(false)
            loadMe()
            loadQuota()
            loadLikesYou()
            loadMatches()
          }}
          onClose={() => setShowPlusModal(false)}
        />
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleConfirmDeleteAccount}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {reportTarget && (
        <ReportModal
          target={reportTarget}
          onSubmit={handleReportSubmit}
          onClose={() => setReportTarget(null)}
        />
      )}

      {showNotifications && (
        <NotificationsSheet
          items={notifications}
          onRead={markNotificationRead}
          onReadAll={markAllNotificationsRead}
          onClose={() => setShowNotifications(false)}
        />
      )}
      {popupNotification && !showPlusSuccess && (
        <NotificationPopup
          notification={popupNotification}
          onDismiss={dismissNotificationPopup}
        />
      )}
      {showPlusSuccess && (
        <PlusSuccessModal
          userName={me?.name}
          premiumUntil={plusUntil || me?.premium_until || null}
          onClose={() => setShowPlusSuccess(false)}
        />
      )}
      {install.visible && (
        <InstallPrompt
          platform={install.platform}
          canPrompt={install.canPrompt}
          onInstall={install.install}
          onClose={install.close}
          nextReminderSeconds={install.nextReminderSeconds}
        />
      )}
      <FloatingWhatsAppBtn
        link={whatsappLink || ''}
        message="Hello, I'd like to know more about Campmatch"
        showAiAssistant
        onAiOpen={() => setAiDeskOpen(true)}
        onClose={() => setAiDeskOpen(false)}
      />
      <AiHelpDesk
        link={whatsappLink || ''}
        token={token}
        userName={me?.name}
        show={aiDeskOpen}
        onToggle={() => setAiDeskOpen(false)}
        onWhatsAppClick={() => {
          if (!whatsappLink) {
            showToast('WhatsApp support link not configured by administrator.')
            return
          }
          const url = whatsappLink.startsWith("http") ? whatsappLink : `https://wa.me/${whatsappLink}`
          window.open(url, "_blank", "noopener,noreferrer")
        }}
      />
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(() => safeGetItem('token') || '')
  const [adminToken, setAdminToken] = useState(() => safeGetItem('campmatch_admin_token') || '')
  // Single entry point: admin and student share one login surface.
  // Admin credentials (from Render env) open the admin panel directly;
  // there is no separate /admin URL anymore.
  if (adminToken) {
    return <AdminPortal />
  }
  if (token) {
    return (
      <StudentApp
        initialToken={token}
        onTokenUpdated={t => {
          setToken(t)
          if (t) {
            safeSetItem('token', t)
          } else {
            localStorage.removeItem('token')
          }
        }}
      />
    )
  }
  return (
    <AuthPage
      onAuth={(t, isAdmin) => {
        const accessToken = typeof t === 'string' ? t : t.access_token
        const refreshToken = typeof t === 'string' ? undefined : t.refresh_token
        if (isAdmin) {
          setAdminToken(accessToken)
          localStorage.setItem('campmatch_admin_token', accessToken)
          localStorage.removeItem('token')
          setToken('')
        } else {
          setToken(accessToken)
          safeSetItem('token', accessToken)
          if (refreshToken) {
            safeSetItem('refresh_token', refreshToken)
          }
          localStorage.removeItem('campmatch_admin_token')
          setAdminToken('')
        }
      }}
    />
  )
}
