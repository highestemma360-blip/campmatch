export type AppMode = 'date' | 'bff' | 'study'

export type NavTab = 'swipe' | 'explore' | 'likes' | 'matches' | 'profile' | 'admin'

export interface PromptItem {
  question: string
  answer: string
}

export interface SwipeQuota {
  limited: boolean
  daily_limit: number | null
  used_today: number
  remaining: number | null
  resets_at: string | null
  super_limit: number
  super_used: number
  super_remaining: number
}

export interface ProfileCard {
  id: number
  name: string
  age: number
  level: string
  course: string
  gender: string
  interested_in?: string
  school?: string
  hall?: string
  photo_urls: string[]
  photo_url?: string | null
  photo_required?: boolean
  photo_approved?: boolean
  bio?: string
  mode?: AppMode
  looking_for?: string
  interests?: string[]
  explore_vibes?: string[]
  prompts?: PromptItem[]
  opening_move?: string
  zodiac?: string
  height?: string
  spotify_anthem?: string
  distance_km?: number | null
  compatibility?: number
  verified?: boolean
  is_premium?: boolean
  is_boosted?: boolean
  boosted_until?: string | null
  online?: boolean
  active_recently?: boolean
  super_liked_me?: boolean
  liked_me_hint?: boolean
  blurred?: boolean
  super_liked?: boolean
  already_swiped?: boolean
  already_liked?: boolean
}

export interface CurrentUser extends ProfileCard {
  email: string
  profile_complete: boolean
  completion_pct: number
  is_admin: boolean
  snoozed: boolean
  premium_until?: string | null
  min_age: number
  max_age: number
  preferred_levels: string
  show_me: string
  max_distance_km: number
  verified_only: boolean
  swipe_quota?: SwipeQuota
  announcement_banner?: string
}

export interface MatchSummary {
  match_id: number
  created_at: string
  expires_at?: string | null
  hours_left?: number | null
  extended?: boolean
  is_super?: boolean
  unread_count?: number
  user: ProfileCard
  last_message?: string | null
  last_sender_id?: number | null
  last_at?: string | null
}

export interface ChatMessage {
  id: number
  match_id?: number
  sender_id: number
  content: string
  created_at: string
  read?: boolean
  reaction?: string
}

export interface PlusConfig {
  enabled: boolean
  price_ghs: number
  duration_days: number
  free_daily_swipe_limit: number
  announcement_banner?: string
  discount_enabled?: boolean
  discount_percent?: number
}

export interface AppNotification {
  id: number
  title: string
  body: string
  flyer_url: string
  audience: string
  created_at: string
  expires_at?: string | null
  read: boolean
}
