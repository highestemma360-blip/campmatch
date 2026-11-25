# Campmatch Professional Redesign — Design Doc

## Intent and the why

Eliminate AI slop (generic placeholder copy, template layouts, generated-UI tells) from the Campmatch frontend and replace it with specific, professional, campus-first design. Also add: (a) a dedicated "View My Card" page so users can see their profile card exactly as others see it, and (b) seed ~5 test users with complete profiles and photos so the deck/explore/chat features have real data to demonstrate.

## Goals

- Replace all generic/Lorem-style copy with specific Ghana campus voice
- Remove generated-UI tells: generic gradients, shadow soup, placeholder icons, generic hero sections
- Add a dedicated `/profile/card` route showing the user's card as others see it (standalone, swipeable preview)
- Seed 5 test users with profiles, photos, interests, prompts, and explore vibes
- Keep all existing business logic (auth, swipe quota, matching, chat, Plus, admin, PWA, push)

## Non-goals

- No stack rewrite
- No new payment providers
- No new discovery modes

## Anti-goals

- Landing page that looks like every other AI-generated startup page
- Generic "Meet students from your campus" copy
- Placeholder/Lorem ipsum text anywhere
- Broken or missing "View My Card" functionality
- Empty deck with no test data

## Constraints

- Same repo: `C:\Users\user\Downloads\Telegram Desktop\campmatch-complete`
- Same git origin: `https://github.com/highestemma360-blip/campmatch.git`
- Frontend must build with `npm run build`
- Backend must run with `uvicorn app.main:app --port 8000`
- Must work locally and on Render

## Approaches considered

| Approach | Trade-off | Verdict |
|----------|-----------|---------|
| A: Incremental copy + UI polish + test data seed (selected) | Targeted, low risk, addresses all complaints | **Selected** |
| B: Full frontend redesign with new UI library | High risk, breaks "same logic", slow | Rejected |
| C: Copy-only polish, no test data | Doesn't fix empty deck problem | Rejected |

## Parts of the how (decided)

### Frontend copy rewrite (AuthPage.tsx)
- Replace generic hero with specific Ghana campus voice
- Replace numbered feature list with specific benefit copy
- Replace generic campus list with specific, real Ghana university context
- Replace generic safety section with specific safety commitments
- All copy written in student voice, specific to Ghana campuses

### Profile card view page (new route `/profile/card`)
- New page showing the user's profile card exactly as others see it in the deck
- Photo cards, info overlay, badges, explore vibes, prompts
- "Edit Profile" and "Close" actions only
- Accessible from ProfilePage hub via a prominent "View My Card" button

### Test user seed (backend)
- Add a seed endpoint or migration that creates ~5 test users with:
  - Complete profiles (name, age, course, school, hall, bio, interests, prompts)
  - Verified photos (WebP files in uploads dir)
  - Explore vibe opt-ins
  - Premium status for some
- Run once on startup or via admin console

### Craft floor fixes (mobile-design skill)
- Remove shadow soup, generic gradients, template layouts
- Specific color roles, typography, touch targets ≥44dp
- State safety on every screen (empty/loading/error/success)
- Honesty: no deceptive patterns

## What's left to the builder

- Exact copy tone (formal vs casual student voice)
- Number of test users (target 5)
- Whether test users have photos or just avatar placeholders
- Whether seed runs on every startup or once

<HARD-GATE>
Nothing gets built until design doc is approved: the short one for a small change, the full one for a project.
</HARD-GATE>

## Red Flags

| Thought | Reality |
|---------|---------|
| "I'll use generic startup copy" | Specific Ghana campus voice beats generic templates |
| "I'll add a View My Card button but not wire it" | Feature must work end-to-end |
| "Test users aren't important" | Empty deck/explore/chat makes the site look broken |
| "Shadow soup looks premium" | Elevation via color and layer, not shadow soup |
