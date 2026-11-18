export const LEVELS = ['100', '200', '300', '400', '500', 'Postgrad']

export const LOOKING_FOR_OPTIONS = [
  { label: 'Long-term partner', desc: 'Committed campus relationship' },
  { label: 'Long-term, open to short', desc: 'Serious mindset, flexible pace' },
  { label: 'Something casual', desc: 'Relaxed dates and hangouts' },
  { label: 'New campus friends', desc: 'Expand your social circle' },
  { label: 'Study & project partner', desc: 'Library, lab, and coursework prep' },
  { label: 'Still figuring it out', desc: 'Open to seeing where things go' },
]

export const CAMPUS_INTERESTS = [
  'Afrobeats', 'Amapiano', 'Software & Coding', 'Gym & Fitness', 'Food Spots',
  'Night Market Runs', 'Photography', 'Anime & Manga', 'Football', 'Basketball',
  'Choir & Music', 'Entrepreneurship', 'Console Gaming', 'Film & Cinema',
  'Student Leadership', 'Reading', 'Fashion & Style', 'Coffee & Tea',
  'Podcasts', 'Dance', 'Writing', 'Travel', 'Data & AI', 'Engineering Labs',
]

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export const BUMBLE_PROMPTS = [
  'A non-negotiable for me is...',
  'After a tough exam, you will find me...',
  'Two truths and a lie about me...',
  'The fastest way to win me over on campus is...',
  'My most unpopular food opinion is...',
  'We will get along effortlessly if...',
  'My ideal weekend off lectures looks like...',
  'Something I can talk about for hours is...',
]

export const OPENING_MOVES = [
  'What is your go-to late-night food spot around campus?',
  'Jollof with plantain or waakye with everything — pick one.',
  'What track has been on repeat in your headphones all week?',
  'Quiet library floor or group hostel study during exam week?',
  'What is your ideal weekend plan on a student budget?',
  'What is the most spontaneous thing you have done this semester?',
]

export const ICEBREAKER_QUESTIONS = [
  'Morning 7:00 AM lectures or Friday afternoon labs — which one is worse?',
  'If we skipped one lecture this week to grab food, where would you pick?',
  'What is one thing on your semester bucket list you have not done yet?',
  'Coffee, sobolo, or boba — what keeps you awake through lectures?',
  'Two truths and a lie — go first and I will guess the lie.',
  'Your profile stood out right away. How is your week going so far?',
]

export type ExploreRoomId =
  | 'study_buddy'
  | 'food_date'
  | 'long_term'
  | 'night_stand'
  | 'walk_around'
  | 'escort_tonight'

export interface ExploreVibe {
  id: ExploreRoomId
  title: string
  subtitle: string
  tag: string
  gradient: string
  accent: string
}

export const EXPLORE_VIBES: ExploreVibe[] = [
  {
    id: 'study_buddy',
    title: 'Study Buddy',
    subtitle: 'Library sessions, lab partners, and exam accountability',
    tag: 'ACADEMIC',
    gradient: 'linear-gradient(150deg, #0284C7 0%, #0F2942 100%)',
    accent: '#38BDF8',
  },
  {
    id: 'food_date',
    title: 'Food Date',
    subtitle: 'Grab dinner, night-market bites, or try a new spot together',
    tag: 'CRAVINGS',
    gradient: 'linear-gradient(150deg, #EA580C 0%, #431407 100%)',
    accent: '#FB923C',
  },
  {
    id: 'long_term',
    title: 'Long Term',
    subtitle: 'Intentional dating with students ready for something real',
    tag: 'COMMITTED',
    gradient: 'linear-gradient(150deg, #E11D48 0%, #4C0519 100%)',
    accent: '#FB7185',
  },
  {
    id: 'night_stand',
    title: 'Night Stand',
    subtitle: 'Mutual late-night chemistry, upfront and no pressure',
    tag: 'AFTER HOURS',
    gradient: 'linear-gradient(150deg, #7C3AED 0%, #1E1035 100%)',
    accent: '#C084FC',
  },
  {
    id: 'walk_around',
    title: 'Walk Around',
    subtitle: 'Unwind with an evening campus stroll and easy conversation',
    tag: 'CHILL WALK',
    gradient: 'linear-gradient(150deg, #0D9488 0%, #082F2C 100%)',
    accent: '#2DD4BF',
  },
  {
    id: 'escort_tonight',
    title: 'Escort Tonight',
    subtitle: 'Find a sharp plus-one for tonight’s event, party, or outing',
    tag: 'PLUS ONE',
    gradient: 'linear-gradient(150deg, #D97706 0%, #3B1D06 100%)',
    accent: '#FBBF24',
  },
]

export const EXPLORE_MAP: Record<string, ExploreVibe> = Object.fromEntries(
  EXPLORE_VIBES.map(v => [v.id, v])
)

export const TERMS_SUMMARY = `Campmatch is an independent student matching platform exclusively for verified Ghana university students aged 18 and older with official .edu.gh email addresses.

1. Eligibility & Verification
Accounts require an approved university student email. Profile photos are screened automatically to ensure every photo is genuine, clear, and appropriate for campus use.

2. Mutual Consent & Conduct
Private messaging opens only when two students mutually like each other. Harassment, impersonation, explicit imagery, or commercial spam results in immediate suspension.

3. Subscriptions & Limits
When Campmatch Plus is active, free accounts receive a set daily swipe allowance while Plus members receive unlimited swipes, Beeline visibility, Rewind, and extended Super Likes.

4. Account Deletion & Records
You may delete your account at any time from Account Settings. Deleting your account removes your profile and conversations from public visibility immediately while retaining encrypted historical records for safety compliance.`

export const PRIVACY_SUMMARY = `Campmatch is built with strict campus privacy controls.

1. Data Collected
We store your student email, profile attributes, verified profile photos, approximate distance (never exact GPS coordinates), Explore room opt-ins, swipe preferences, and match messages.

2. Automated Photo Screening
Uploaded profile photos are analyzed on our server to reject blank placeholders, non-human images, and explicit content before storage.

3. Visibility & Control
You can opt in or out of Explore rooms anytime, pause your profile using Snooze Mode, block or report any student, change your password, or delete your account directly from Settings.`

export function makeAvatarPlaceholder(name?: string): string {
  const initial = ((name || 'U').trim()[0] || 'U').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1E2433"/><stop offset="100%" stop-color="#0F1219"/></linearGradient></defs><rect width="400" height="500" fill="url(#g)"/><circle cx="200" cy="185" r="68" fill="#2B3347"/><path d="M90 420c18-68 62-104 110-104s92 36 110 104" fill="#2B3347"/><text x="200" y="206" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="56" font-weight="700">${initial}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
