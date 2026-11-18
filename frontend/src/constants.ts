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

export interface ExploreVibe {
  id: string
  title: string
  subtitle: string
  tag: string
  gradient: string
}

export const EXPLORE_VIBES: ExploreVibe[] = [
  {
    id: 'serious',
    title: 'Long-Term',
    subtitle: 'Students looking for a committed relationship',
    tag: 'INTENTIONAL',
    gradient: 'linear-gradient(145deg, #E11D48 0%, #881337 100%)',
  },
  {
    id: 'tonight',
    title: 'Free This Evening',
    subtitle: 'Spontaneous dinner, walks, or campus hangouts',
    tag: 'TONIGHT',
    gradient: 'linear-gradient(145deg, #4F46E5 0%, #1E1B4B 100%)',
  },
  {
    id: 'study',
    title: 'Study Partners',
    subtitle: 'Focused sessions for coursework, labs, and exams',
    tag: 'ACADEMIC',
    gradient: 'linear-gradient(145deg, #0284C7 0%, #0C4A6E 100%)',
  },
  {
    id: 'bff',
    title: 'BFF & Social',
    subtitle: 'Meet new people and build your campus circle',
    tag: 'FRIENDS',
    gradient: 'linear-gradient(145deg, #D97706 0%, #78350F 100%)',
  },
  {
    id: 'fitness',
    title: 'Athletics & Gym',
    subtitle: 'Training partners, football, track, and court games',
    tag: 'ACTIVE',
    gradient: 'linear-gradient(145deg, #059669 0%, #064E3B 100%)',
  },
  {
    id: 'creative',
    title: 'Music & Arts',
    subtitle: 'Producers, photographers, designers, and creatives',
    tag: 'CULTURE',
    gradient: 'linear-gradient(145deg, #9333EA 0%, #4C1D95 100%)',
  },
  {
    id: 'same_level',
    title: 'Same Year Group',
    subtitle: 'Connect with peers in your academic level',
    tag: 'YEAR GROUP',
    gradient: 'linear-gradient(145deg, #EA580C 0%, #7C2D12 100%)',
  },
  {
    id: 'same_hall',
    title: 'Hall Neighbours',
    subtitle: 'Students in your residence hall or nearby hostel',
    tag: 'NEARBY',
    gradient: 'linear-gradient(145deg, #0D9488 0%, #134E4A 100%)',
  },
]

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
We store your student email, profile attributes, verified profile photos, approximate distance (never exact GPS coordinates), swipe preferences, and match messages.

2. Automated Photo Screening
Uploaded profile photos are analyzed on our server to reject blank placeholders, non-human images, and explicit content before storage.

3. Visibility & Control
You can pause your profile at any time using Snooze Mode, block or report any student, change your password, or delete your account directly from Settings.`

export function makeAvatarPlaceholder(name?: string): string {
  const initial = ((name || 'U').trim()[0] || 'U').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1E2433"/><stop offset="100%" stop-color="#0F1219"/></linearGradient></defs><rect width="400" height="500" fill="url(#g)"/><circle cx="200" cy="185" r="68" fill="#2B3347"/><path d="M90 420c18-68 62-104 110-104s92 36 110 104" fill="#2B3347"/><text x="200" y="206" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="56" font-weight="700">${initial}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
