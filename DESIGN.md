# Campmatch DESIGN.md

A plain-text design system document. AI agents read this to generate UI that stays visually consistent with Campmatch. Drop into the project root alongside `AGENTS.md`.

| File | Who reads it | What it defines |
|------|-------------|-----------------|
| `AGENTS.md` | Coding agents | How to build the project |
| `DESIGN.md` | Design agents | How the project should look and feel |

---

## 1 · Visual Theme & Atmosphere

**Mood:** Warm, energetic, campus-first. A student matching app for Ghana university students — friendly but precise, never corporate.

**Density:** Comfortable. Cards breathe; one primary action per screen; secondary actions tucked behind gestures or overflow.

**Design philosophy:** Platform-native navigation patterns carry structure; identity lives in color, type, imagery, voice, motion, and one signature — the coral flame (#ff4f5e). Specificity over templates. Every screen has a signature object; no generic gradients, no shadow soup, no Lorem ipsum.

**Craft floor (non-negotiable):**
- **Access:** Controls reachable with one thumb; touch targets ≥44×44 dp; reach zones respected.
- **Platform integrity:** Native tabs, back, modality, and entry points. iOS and Android conventions intact.
- **State safety:** Empty, loading, error, success on every screen — real copy, clear next step.
- **Honesty:** No deceptive patterns, no false urgency, no hidden costs.

---

## 2 · Color Palette & Roles

| Semantic name | Hex | Role |
|---------------|-----|------|
| `--coral-500` | `#ff4f5e` | Primary brand — flame/heart, primary CTAs, active states |
| `--coral-600` | `#ff3b4d` | Primary pressed / hover |
| `--coral-dark` | `#d41c2d` | Destructive actions, delete |
| `--nope-red` | `#ff4458` | Pass / left swipe |
| `--like-green` | `#22c55e` | Like / right swipe |
| `--super-blue` | `#00b8ff` | Super Like |
| `--boost-purple` | `#9333ea` | Spotlight / Boost |
| `--gold` | `#ffaa00` | Plus / premium accents |
| `--amber` | `#f59e0b` | Warnings, countdown ring |
| `--bg-canvas-dark` | `#0a0a0d` | Dark mode page background |
| `--bg-canvas-light` | `#f4f6fa` | Light mode page background |
| `--bg-card-dark` | `#121217` | Dark mode card surface |
| `--bg-card-light` | `#ffffff` | Light mode card surface |
| `--bg-elevated-dark` | `#1e1e26` | Dark mode elevated surface (sheets, modals) |
| `--bg-elevated-light` | `#f1f3f8` | Light mode elevated surface |
| `--text-primary-dark` | `#ffffff` | Dark mode primary text |
| `--text-primary-light` | `#11141d` | Light mode primary text |
| `--text-secondary-dark` | `#c4c5d1` | Dark mode secondary text |
| `--text-secondary-light` | `#64748b` | Light mode secondary text |
| `--text-muted-dark` | `#7a7b86` | Dark mode muted text |
| `--text-muted-light` | `#94a3b8` | Light mode muted text |
| `--border-subtle-dark` | `rgba(255,255,255,0.08)` | Dark mode subtle borders |
| `--border-subtle-light` | `rgba(17,20,29,0.08)` | Light mode subtle borders |
| `--border-strong-dark` | `rgba(255,255,255,0.16)` | Dark mode strong borders |
| `--border-strong-light` | `rgba(17,20,29,0.15)` | Light mode strong borders |
| `--shadow-card-dark` | `0 22px 52px rgba(0,0,0,0.58)` | Dark card elevation |
| `--shadow-card-light` | `0 20px 46px rgba(17,20,29,0.10)` | Light card elevation |

**Gradients:**
- `--brand-grad`: `linear-gradient(135deg, #ff4c5e 0%, #ff7334 52%, #ffaa00 100%)`
- `--gold-grad`: `linear-gradient(135deg, #ffd84d 0%, #f59e0b 100%)`
- `--super-grad`: `linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)`
- `--boost-grad`: `linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)`

---

## 3 · Typography Rules

**Font stack:** System UI font (San Francisco on iOS, Roboto on Android, Segoe on Windows). No custom web fonts — fast, native feel.

| Scale | Size | Weight | Use |
|-------|------|--------|-----|
| `--text-display` | 32px | 700 | Marketing headlines, empty-state titles |
| `--text-h1` | 24px | 700 | Page titles |
| `--text-h2` | 20px | 600 | Section headers |
| `--text-h3` | 18px | 600 | Card titles, profile names |
| `--text-body` | 16px | 400 | Body copy, bios |
| `--text-small` | 14px | 400 | Captions, metadata |
| `--text-tiny` | 12px | 500 | Badges, labels, timestamps |

**Line height:** 1.5 for body, 1.25 for headings.
**Letter tracking:** -0.02em for display, normal for body.

**Voice:** Warm, direct, student-first. Short sentences. Campus slang where natural ("lectures", "hostel", "night market"). Never robotic.

---

## 4 · Component Stylings

### Buttons
- **Primary:** Coral fill (`--coral-500`), white text, 16px/600, 12px vertical padding, 20px horizontal, 12px radius, `--shadow-btn` on press. Pressed state: `--coral-600`.
- **Secondary:** Transparent fill, `--border-strong` 1px border, primary text, same padding/radius. Pressed: `--bg-subtle`.
- **Ghost:** No fill, no border, primary text. Pressed: `--bg-subtle`.
- **Destructive:** `--coral-dark` fill, white text. Pressed: darker.
- **Icon-only:** 44×44 dp touch target, centered icon 20px.

### Cards
- Surface: `--bg-card`, border `--border-subtle` 1px, radius 16px, shadow `--shadow-card`.
- Hover/press: slight scale (0.98), border `--border-strong`.
- Image: radius 16px (top corners), object-fit cover, min-height 320px.

### Inputs
- Surface: `--input-bg`, border `--border-subtle` 1px, radius 12px, 14px text, 12px vertical padding, 16px horizontal.
- Focus: border `--coral-500`, ring `--coral-500` at 20% opacity.
- Error: border `--coral-dark`, helper text `--coral-dark` 14px.

### Navigation
- **Bottom sheet (mobile < 960px):** 5 tabs — Swipe, Explore, Likes, Matches, Profile. Active tab: coral fill/icon, inactive: `--text-muted`.
- **Split-pane (desktop ≥ 960px):** Left nav rail (240px), right content. Same 5 destinations.
- **Back:** Native back gesture / chevron-left, never a custom drawer hamburger for primary navigation.

### Modal / Sheet
- Surface: `--bg-elevated`, radius 20px (top corners on mobile), `--shadow-card`.
- Close: X icon top-right, plus swipe-down-to-dismiss on mobile.
- Touch target for close: 44×44 dp.

### Badges / Pills
- Radius 20px (fully pill), 12px text, 6px vertical padding, 12px horizontal. Surface `--bg-subtle`, text `--text-primary`.

### Empty states
- Illustration or icon (64px), `--text-h2` title, `--text-body` description, one primary button.

### Loading
- Skeleton cards (shimmer `--bg-subtle` → `--bg-elevated`) for lists; spinner (24px, coral) for single actions.

### Error
- `--coral-dark` icon (48px), `--text-h3` title ("Something went wrong"), `--text-body` description, "Try again" primary button.

### Success / Match celebration
- Coral flame icon, confetti-lite animation, `--text-h2` "It's a match!", primary button "Send message".

---

## 5 · Layout Principles

**Breakpoints:**
- Mobile: `< 960px` — single column, bottom sheet navigation, bottom action dock.
- Desktop: `≥ 960px` — split-pane, 240px left rail, right content scrolls.

**Spacing scale (8px grid):** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

**Grid:**
- Mobile: 1 column, 16px gutters.
- Desktop: 12-column max-width 1024px, 24px gutters.

**Whitespace philosophy:** Cards never touch screen edges (16px min). One generous whitespace block per screen.

**Responsive behavior:** Bottom sheet → side rail at 960px. Swipe deck card width: full mobile, 420px max desktop. Modal: full-height mobile, 520px max-width desktop.

**Touch targets:** Minimum 44×44 dp everywhere (buttons, icons, tabs, close).
**Reach zones:** Primary actions in bottom third on mobile. Destructive actions require confirmation or are placed away from thumb zone.

---

## 6 · Depth & Elevation

| Level | Shadow | Use |
|-------|--------|-----|
| `--shadow-none` | none | Inline, flat |
| `--shadow-card` | `0 22px 52px rgba(0,0,0,0.58)` dark / `0 20px 46px rgba(17,20,29,0.10)` light | Cards, sheets, modals |
| `--shadow-btn` | `0 10px 24px rgba(0,0,0,0.42)` dark / `0 8px 20px rgba(17,20,29,0.08)` light | Pressed primary buttons |

**Surface hierarchy:** Canvas (bottom) → Card → Elevated (sheets/modals) → Overlay (toasts). Never use drop shadows on dark mode for subtle separation — use `--border-subtle` and `--bg-elevated` instead.

**Depth in motion:** Cards lift slightly on drag (SwipeDeck), sheets rise from bottom, modals fade + scale 0.95→1.

---

## 7 · Do's and Don'ts

| Do | Don't |
|----|-------|
| Use coral `#ff4f5e` as the one signature color | Generic blue/purple gradients as primary brand |
| Touch targets ≥44×44 dp | 24px icon-only taps |
| Native tabs + back for navigation | Custom hamburger drawer for primary nav |
| Real copy: names, campus interests, Ghana food spots | Lorem ipsum, placeholder text |
| Empty/loading/error/success on every screen | Blank screens, silent failures |
| WebP photos ≤1280px, EXIF-normalized | Raw unscreened uploads to disk |
| One calm PWA install prompt per session | Repeated install nagging |
| Web push only after explicit opt-in | Auto-subscribing without permission |
| Skeleton loaders for lists | Spinners on full pages |
| Spring motion (damping/response) for cards | Arbitrary easing curves, looping decoration |

---

## 8 · Responsive Behavior

- **Breakpoint:** 960px (mobile ↔ desktop).
- **Mobile:** Bottom navigation sheet, full-bleed swipe deck, bottom action dock (Like/Nope/SuperLike/Boost), full-height modals, swipe-down to dismiss.
- **Desktop:** Left rail navigation, swipe deck centered max 420px, side-by-side chat + match list, modals max 520px wide.
- **Touch targets:** 44×44 dp minimum on all platforms.
- **Keyboard shortcuts (desktop):** ArrowLeft/Right = swipe, Space = like, ArrowUp = Super Like, Enter = send message, Backspace = back.
- **PWA:** Install prompt ~18s after sign-in on phones, skip while modal/chat/sheet open, dismissal pauses 7 days, install pauses 180 days.

---

## 9 · Agent Prompt Guide

**Quick color reference:**
- Primary: `#ff4f5e` (coral) — buttons, active tabs, accents
- Danger: `#ff4458` / `#d41c2d` — nope, delete
- Success: `#22c55e` — like, match
- Premium: `#ffaa00` — Plus, Spotlight

**Ready-to-use prompts:**
- "Build a swipe card with coral primary button, 16px radius, `--shadow-card` elevation, and a 64px avatar placeholder."
- "Build a bottom sheet with 5 tabs (Swipe, Explore, Likes, Matches, Profile), active tab coral, inactive `#7a7b86`."
- "Build an empty state: 48px icon, 24px title, 16px body, one coral primary button."
- "Build a chat message bubble: `--bg-card`, 12px radius, 12px padding, sent messages right-aligned coral tint, received messages left-aligned `--bg-subtle`."

**Rules:** Always respect `--bg-card` for surfaces, `--text-primary` for headings, touch targets ≥44dp, and the craft floor (access, platform integrity, state safety, honesty).
