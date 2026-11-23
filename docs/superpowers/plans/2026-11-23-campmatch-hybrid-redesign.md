# Campmatch Hybrid Redesign & Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign and fix the entire Campmatch frontend and backend — update all dependencies to recent stable versions, redesign the UI with a DESIGN.md design system grounded in mobile-design/awesome-design-md, fix bugs across auth/swipes/chat/photos/PWA/push/payments/admin, add Playwright end-to-end tests, and push to GitHub — all while keeping the same business logic (`.edu.gh` auth, swipe quota, Date/BFF/Study modes, Explore rooms, mutual-match chat, 24h first-message countdown, Plus/Moolre payments, OpenCV YuNet photo verification, admin console, soft deletion, PWA, web push).

**Architecture:** Hybrid = Approach A (incremental fix & modernize). Keep FastAPI + React/Vite + TypeScript + SQLite architecture and all business logic. Add a DESIGN.md design system (Google Stitch format) for UI consistency. Update dependencies to recent stable versions. Fix bugs file-by-file with tests before and after. No stack rewrite, no new features.

**Tech Stack:** Frontend: React 18 + TypeScript + Vite + Playwright (E2E). Backend: Python 3.11/3.12 + FastAPI + SQLAlchemy 2.0 + SQLite + OpenCV + bcrypt + python-jose + pywebpush. Deploy: Render (render.yaml, persistent disk at /var/data) + Docker.

**Spec:** `docs/superpowers/specs/2026-11-23-campmatch-hybrid-redesign-design.md` (design doc). The plan argues from the spec; executors read both.

## Global Constraints

- Same repo: `C:\Users\user\Downloads\Telegram Desktop\campmatch-complete`
- Same git origin: `https://github.com/highestemma360-blip/campmatch.git` (branch `main`)
- Frontend must build with `npm run build` (tsc + vite build)
- Backend must run with `uvicorn app.main:app --port 8000`
- Must work locally (localhost:5173 ↔ localhost:8000) and on Render (render.yaml, persistent disk at /var/data)
- Same business logic preserved: `.edu.gh` domain auth, token_version session invalidation, swipe quota (10/day free), Date/BFF/Study modes, Explore rooms, mutual-match chat, 24h first-message countdown, Plus activation, Moolre payments, OpenCV YuNet photo verification, admin console, soft deletion, PWA install, web push notifications
- All mandatory skills apply: mobile-design, awesome-design-md, agent-reach, playwright, graphify, using-superpowers, writing-plans

## Review Focus

| Input / condition | Expected behavior | Owning task |
|---|---|---|
| `.edu.gh` domain only (gmail/yahoo/etc. rejected) | Signup/login rejected with clear message | Auth fix task |
| Free account hits 10 swipes in rolling 24h | HTTP 429 DAILY_SWIPE_LIMIT, Plus modal shown | Swipes fix task |
| WebSocket connection drops | Client reconnects and resumes chat state | Realtime fix task |
| Photo upload: blank/black/blurry/explicit/non-human | Rejected before write to disk, clear reason | Image guard fix task |
| Moolre payment webhook | Signature verified, Plus activated within seconds | Payments fix task |
| PWA install prompt | Shown once per session ~18s after sign-in, skip while modal open | PWA fix task |
| Web push opt-in | VAPID subscription saved, notifications delivered | Push fix task |
| Existing SQLite data | Schema compatible, no data loss on restart | Backend dep update task |

## File Map

### New files (design system)
- Create: `DESIGN.md` — Google Stitch format design system (color, type, components, layout, depth, do's/don'ts, responsive, agent prompt guide)
- Create: `frontend/public/preview.html` — Visual catalog (light): color swatches, type scale, buttons, cards
- Create: `frontend/public/preview-dark.html` — Visual catalog (dark): same catalog with dark surfaces

### Modified files (frontend UI redesign + fixes)
- Modify: `frontend/src/styles.css` — Design tokens: coral brand, dark/light surfaces, touch targets, motion
- Modify: `frontend/src/components/SwipeDeck.tsx` — Drag physics, card fly-out, Rewind, Super Like, Spotlight timer
- Modify: `frontend/src/components/ProfileSheet.tsx` — UI polish per DESIGN.md
- Modify: `frontend/src/components/MatchCelebration.tsx` — UI polish
- Modify: `frontend/src/components/NotificationsSheet.tsx` — UI polish
- Modify: `frontend/src/components/NotificationPopup.tsx` — UI polish
- Modify: `frontend/src/components/Modals.tsx` — Discovery, Plus/Moolre checkout, Report, Delete modals
- Modify: `frontend/src/components/Icons.tsx` — Any missing SVG icons
- Modify: `frontend/src/components/AiHelpDesk.tsx` — UI polish
- Modify: `frontend/src/components/InstallPrompt.tsx` — UI polish
- Modify: `frontend/src/components/FloatingWhatsAppBtn.tsx` — UI polish
- Modify: `frontend/src/components/PlusSuccessModal.tsx` — UI polish
- Modify: `frontend/src/pages/AuthPage.tsx` — Google-first sign-in, domain policy messaging
- Modify: `frontend/src/pages/OnboardingPage.tsx` — UI polish
- Modify: `frontend/src/pages/ExplorePage.tsx` — UI polish
- Modify: `frontend/src/pages/LikesYouPage.tsx` — UI polish
- Modify: `frontend/src/pages/MatchesChatPage.tsx` — Fix chat reconnect, typing, read receipts, heart reactions, countdown
- Modify: `frontend/src/pages/ProfilePage.tsx` — UI polish
- Modify: `frontend/src/pages/AdminPortal.tsx` — /admin gate
- Modify: `frontend/src/pages/AdminPage.tsx` — Console sections
- Modify: `frontend/src/pages/AdminAdvanced.tsx` — Rooms, notifications, gateway, storage panels
- Modify: `frontend/src/pages/PhotoRequirementPage.tsx` — UI polish
- Modify: `frontend/src/utils/realtime.ts` — WebSocket reconnect, backoff, typing queue
- Modify: `frontend/src/utils/push.ts` — VAPID subscription, permission handling
- Modify: `frontend/src/utils/pwa.ts` — Install prompt gating, standalone detection
- Modify: `frontend/src/utils/imageCheck.ts` — Client canvas pre-check (blank/black/resolution)
- Modify: `frontend/src/App.tsx` — Wire theme, push, install, notifications, deck, chat
- Modify: `frontend/package.json` — Update React/Vite/TypeScript to recent stable
- Modify: `frontend/tsconfig.json` — If needed for stricter checks

### Modified files (backend dependency updates + bug fixes)
- Modify: `backend/requirements.txt` — FastAPI, SQLAlchemy, pydantic, OpenCV, bcrypt, python-jose, google-auth, pillow, pywebpush, httpx, requests → recent stable
- Modify: `backend/app/main.py` — Rate limiting, WebSocket, CORS, security headers, startup/shutdown
- Modify: `backend/app/database.py` — Auto-migrations, DATA_DIR, rolling SQLite backups
- Modify: `backend/app/models.py` — Schema compat (no breaking changes), bcrypt helpers
- Modify: `backend/app/security.py` — JWT versioning, token_version invalidation, settings bootstrap
- Modify: `backend/app/realtime.py` — ConnectionManager, live event dispatch, online presence
- Modify: `backend/app/image_guard.py` — OpenCV YuNet, YCrCb/HSV skin, WebP ≤1280px, EXIF normalize
- Modify: `backend/app/explore_rooms.py` — DB-backed room catalogue, seeding
- Modify: `backend/app/routers/auth.py` — Google OAuth, domain validation, lockout, refresh tokens
- Modify: `backend/app/routers/profiles.py` — Profile CRUD, photo upload, password, soft-delete
- Modify: `backend/app/routers/swipes.py` — Deck scoring, quota, Rewind, Boost, vibe filter, compatibility
- Modify: `backend/app/routers/chat.py` — Matches, messages, reactions, extend, unmatch, block, safety report
- Modify: `backend/app/routers/payments.py` — Moolre webhook signature, hosted link, Plus activation
- Modify: `backend/app/routers/notifications.py` — Student notification feed, read receipts
- Modify: `backend/app/routers/admin.py` — Admin auth, moderation, rooms, notifications, storage, audit
- Modify: `backend/app/routers/ai.py` — AI assistant streaming, knowledge base fallback
- Modify: `backend/app/routers/ai_features.py` — AI features
- Modify: `backend/app/routers/push.py` — Web push VAPID, subscriptions
- Modify: `backend/app/routers/stories.py` — Stories
- Modify: `backend/Dockerfile` — Python 3.11-slim multi-stage (keep)
- Modify: `render.yaml` — Render deployment spec (keep, verify)
- Modify: `.env.example` — All required env vars documented

### New files (Playwright E2E tests)
- Create: `tests/e2e/playwright.config.ts` — Playwright config (localhost:5173 + 8000)
- Create: `tests/e2e/auth.spec.ts` — Signup/login, Google OAuth, domain rejection, session invalidation
- Create: `tests/e2e/swipes.spec.ts` — Deck load, swipe like/nope, match, Rewind, quota limit, Boost
- Create: `tests/e2e/chat.spec.ts` — Match list, open chat, send/receive, typing, read receipts, extend, unmatch
- Create: `tests/e2e/photos.spec.ts` — Photo upload, client pre-check, server rejection (blank/blurry/explicit)
- Create: `tests/e2e/pwa-push.spec.ts` — PWA install prompt, push opt-in, standalone detection
- Create: `tests/e2e/payments.spec.ts` — Plus checkout, Moolre webhook, Plus activation (mocked)
- Create: `tests/e2e/admin.spec.ts` — Admin login, KPIs, feature flags, rooms, notifications

---

### Task 1: DESIGN.md design system + preview catalogs

**Files:**
- Create: `DESIGN.md`
- Create: `frontend/public/preview.html`
- Create: `frontend/public/preview-dark.html`

**Interfaces:**
- Consumes: none (foundational)
- Produces: `DESIGN.md` with color palette (coral #ff4f5e primary), typography scale, component stylings (buttons, cards, inputs, navigation), layout principles (split-pane ≥960px, bottom-sheet <960px), depth/elevation, do's/don'ts, responsive breakpoints, agent prompt guide

- [ ] **Step 1: Write DESIGN.md** following Stitch format sections 1–9, grounded in mobile-design craft floor and awesome-design-md
- [ ] **Step 2: Write preview.html** — visual catalog: color swatches, type scale, buttons, cards (light theme)
- [ ] **Step 3: Write preview-dark.html** — same catalog with dark surfaces
- [ ] **Step 4: Verify** — open preview.html in browser, confirm tokens render; commit

### Task 2: Frontend dependency updates + styles.css redesign

**Files:**
- Modify: `frontend/package.json` — React 18.x recent, Vite 5 recent, TypeScript 5.x recent
- Modify: `frontend/src/styles.css` — Design tokens from DESIGN.md: brand coral, dark/light surfaces, touch targets ≥44px, motion springs, elevation

**Interfaces:**
- Consumes: `DESIGN.md` color palette, typography, component rules
- Produces: updated `package.json`, `styles.css` with CSS custom properties matching DESIGN.md tokens

- [ ] **Step 1: Update frontend/package.json** to recent stable versions (React 18.3.x, Vite 5.x/6.x, TypeScript 5.x)
- [ ] **Step 2: Run npm install** to verify dependency tree resolves
- [ ] **Step 3: Rewrite styles.css tokens** per DESIGN.md (brand, surfaces, text, borders, shadows, focus rings, touch targets)
- [ ] **Step 4: Run tsc + vite build** to confirm no CSS/build breakage; commit

### Task 3: Fix SwipeDeck physics + card interactions

**Files:**
- Modify: `frontend/src/components/SwipeDeck.tsx`

**Interfaces:**
- Consumes: `deck: ProfileCard[]`, `me: CurrentUser`, `onSwipe(liked)`, `onRewind()`, `onBoost()`, `onInspect(card)`, `canRewind`, `isBoosted`, `quota?: SwipeQuota`
- Produces: drag gesture with grab-point pivot, fly-out left/right, tint wash, action burst, Rewind restore, Super Like, Spotlight 30-min timer, keyboard shortcuts (ArrowLeft/Right/Space/ArrowUp/Enter/Backspace)

- [ ] **Step 1: Write failing test** — drag past threshold triggers fly-out and calls onSwipe with correct liked value
- [ ] **Step 2: Fix drag physics** — pivot rotation, directional tint, fly-out animation, restore-on-reject
- [ ] **Step 3: Fix Rewind** — restore previous card to top of deck, decrement quota, set justRewound
- [ ] **Step 4: Fix Spotlight timer** — countdown from boosted_until, dismissible popup, auto-close at 0
- [ ] **Step 5: Run test** — PASS; run tsc + vite build; commit

### Task 4: Fix chat WebSocket reconnect + messaging

**Files:**
- Modify: `frontend/src/utils/realtime.ts`
- Modify: `frontend/src/pages/MatchesChatPage.tsx`

**Interfaces:**
- `RealtimeClient` consumes: `token`, `onEvent(callback)`, `send({type, match_id, is_typing})`, `connect()`, `disconnect()`
- Produces: auto-reconnect with backoff, ping/pong heartbeat, typing queue debounce, read receipts sync, heart reactions, 24h countdown ring, extend/unmatch/block

- [ ] **Step 1: Write failing test** — WebSocket disconnect → reconnect within 5s, resumes typing/messages state
- [ ] **Step 2: Fix realtime.ts** — reconnect with exponential backoff, ping/pong every 30s, event queue on disconnect
- [ ] **Step 3: Fix MatchesChatPage.tsx** — message send/receive, typing indicator, read receipts, heart reactions, extend match, unmatch, block user
- [ ] **Step 4: Run test** — PASS; run tsc + vite build; commit

### Task 5: Fix photo upload flow (client + server)

**Files:**
- Modify: `frontend/src/utils/imageCheck.ts`
- Modify: `frontend/src/pages/ProfilePage.tsx`
- Modify: `frontend/src/pages/PhotoRequirementPage.tsx`
- Modify: `backend/app/image_guard.py`
- Modify: `backend/app/routers/profiles.py`

**Interfaces:**
- Client `imageCheck.ts` consumes: `File`, produces: `{ok, reason}` for blank/black/resolution pre-check
- Server `image_guard.py` consumes: image bytes, produces: `{accepted, reason, webp_path}` — luminance, entropy, YuNet face, YCrCb/HSV skin, EXIF normalize, WebP ≤1280px
- `profiles.py` `/api/profile/photos` consumes: FormData files, token; produces: `{photo_urls, rejected}`

- [ ] **Step 1: Write failing test** — server rejects blank image with reason "blank_or_white"; accepts valid portrait
- [ ] **Step 2: Fix imageCheck.ts** — canvas pre-check for blank/black/solid/low-res before upload
- [ ] **Step 3: Fix image_guard.py** — OpenCV YuNet face detection, skin segmentation, EXIF normalize, WebP encode
- [ ] **Step 4: Fix profiles.py** — photo upload endpoint, client pre-check integration, rejected list return
- [ ] **Step 5: Run test** — PASS; commit

### Task 6: Fix PWA install + web push

**Files:**
- Modify: `frontend/src/utils/pwa.ts`
- Modify: `frontend/src/utils/push.ts`
- Modify: `frontend/src/components/InstallPrompt.tsx`
- Modify: `frontend/src/App.tsx` (wire install + push gating)

**Interfaces:**
- `pwa.ts`: `isStandalone()`, `wasJustInstalled()`
- `push.ts`: `pushSupported()`, `getPushState()`, `enablePush(token)`, `disablePush()`, VAPID public key
- `InstallPrompt.tsx`: show once per session ~18s after sign-in, skip while modal/chat/sheet open, dismissal pauses 7 days, install pauses 180 days

- [ ] **Step 1: Write failing test** — install prompt shows after 18s on phone, suppressed while modal open
- [ ] **Step 2: Fix pwa.ts** — standalone detection, install tracking, manual install path from Profile → Settings
- [ ] **Step 3: Fix push.ts** — VAPID subscription, permission states (default/granted/denied), enable/disable
- [ ] **Step 4: Fix InstallPrompt.tsx** — gating (skip while aiDeskOpen/showPlusModal/activeChat/etc.), toast on success
- [ ] **Step 5: Run test** — PASS; run tsc + vite build; commit

### Task 7: Backend dependency updates + main.py hardening

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/main.py`

**Interfaces:**
- `main.py`: FastAPI app with CORS, rate limiting, security headers, WebSocket `/ws`, SPA mount, health endpoint `/api/health`

- [ ] **Step 1: Update backend/requirements.txt** — FastAPI 0.115.x→recent, SQLAlchemy 2.0.29→recent, pydantic 2.9.2→recent, OpenCV 4.10→recent, bcrypt 4.1.3→recent, python-jose, google-auth, pillow, pywebpush, httpx, requests → recent stable
- [ ] **Step 2: Run pip install** to verify dependency tree resolves
- [ ] **Step 3: Harden main.py** — rate limit pruning, CORS origins from env, security headers, WebSocket auth validation, startup backup, shutdown cleanup
- [ ] **Step 4: Run uvicorn + hit /api/health** — returns ok; commit

### Task 8: Fix auth (Google OAuth, domain validation, lockout, sessions)

**Files:**
- Modify: `backend/app/routers/auth.py`
- Modify: `backend/app/security.py`

**Interfaces:**
- `auth.py`: `/api/signup`, `/api/login`, `/api/google`, `/api/auth-config`; consumes email/password or Google ID token; produces JWT + refresh token
- `security.py`: `hash_password`, `verify_password`, `create_token`, `create_token_pair`, `decode_token`, `token_version` invalidation, `detect_school`, `get_allowed_domains`

- [ ] **Step 1: Write failing test** — signup with @gmail.com rejected; signup with @st.umat.edu.gh accepted; wrong password locked after N attempts
- [ ] **Step 2: Fix auth.py** — Google OAuth domain validation, BLOCKED_CONSUMER_DOMAINS, email/password restricted to .edu.gh, login lockout (failed_login_attempts, locked_until)
- [ ] **Step 3: Fix security.py** — bcrypt timing guard, token_version on password change/suspension/deletion, refresh token revocation
- [ ] **Step 4: Run test** — PASS; commit

### Task 9: Fix swipes (quota, rewind, boost, vibe, compatibility)

**Files:**
- Modify: `backend/app/routers/swipes.py`
- Modify: `backend/app/routers/profiles.py` (compute_swipe_quota shared)

**Interfaces:**
- `swipes.py`: `/api/swipe`, `/api/rewind`, `/api/boost`, `/api/swipe-quota`, `/api/deck`, `/api/likes-you`; consumes swipe action + token; produces match result, quota state, deck

- [ ] **Step 1: Write failing test** — free user hits 10 swipes → 429 DAILY_SWIPE_LIMIT; Plus user unlimited; Rewind restores card and decrements quota
- [ ] **Step 2: Fix swipes.py** — rolling 24h quota, DAILY_SWIPE_LIMIT code, Rewind, Boost 30-min, vibe filtering, compatibility score
- [ ] **Step 3: Run test** — PASS; commit

### Task 10: Fix chat (messages, read receipts, reactions, extend, unmatch, block)

**Files:**
- Modify: `backend/app/routers/chat.py`
- Modify: `backend/app/realtime.py`

**Interfaces:**
- `chat.py`: `/api/matches`, `/api/matches/{id}/messages`, `/api/messages/{id}/react`, `/api/matches/{id}/extend`, `/api/matches/{id}` (DELETE), `/api/block`
- `realtime.py`: `hub.connect(user_id, ws)`, `hub.send_to_user`, `hub.disconnect`, event dispatch (new_message, typing, messages_read, message_reaction, new_match, new_like, match_extended, match_removed)

- [ ] **Step 1: Write failing test** — send message → appears in match thread; read receipt marks messages read; extend adds 24h
- [ ] **Step 2: Fix chat.py** — message persistence, reactions, extend/unmatch/block, safety report
- [ ] **Step 3: Fix realtime.py** — ConnectionManager stability, online presence, live event broadcast
- [ ] **Step 4: Run test** — PASS; commit

### Task 11: Fix payments (Moolre webhook, Plus activation)

**Files:**
- Modify: `backend/app/routers/payments.py`

**Interfaces:**
- `payments.py`: `/api/payments/initiate` (Moolre hosted link), `/api/payments/webhook` (signed verification), `/api/payments/verify/{ref}` (frontend redirect), Plus activation sets is_premium + premium_until

- [ ] **Step 1: Write failing test** — valid webhook signature → user.is_premium = true, premium_until set; invalid signature → 400
- [ ] **Step 2: Fix payments.py** — Moolre webhook HMAC verification, hosted link creation, Plus activation, redirect verification
- [ ] **Step 3: Run test** — PASS; commit

### Task 12: Fix notifications, explore rooms, admin console

**Files:**
- Modify: `backend/app/routers/notifications.py`
- Modify: `backend/app/routers/admin.py`
- Modify: `backend/app/explore_rooms.py`

**Interfaces:**
- `notifications.py`: `/api/notifications`, `/api/notifications/{id}/read`, `/api/notifications/read-all`
- `admin.py`: `/api/admin/*` — KPIs, feature flags, rooms, notifications composer, payments gateway, AI assistant, storage/backups, user dossier, safety reports
- `explore_rooms.py`: DB-backed room catalogue, seed_default_rooms, active_rooms, active_slugs, serialize_room

- [ ] **Step 1: Write failing test** — admin creates explore room → appears in `/api/explore/rooms`; notification created → appears in user feed
- [ ] **Step 2: Fix notifications.py** — notification feed, read receipts, admin composer (target all/free/Plus/new/school/single)
- [ ] **Step 3: Fix admin.py** — admin auth, KPIs, feature flags, rooms CRUD, notifications, gateway test, AI config, storage/backups, audit trail
- [ ] **Step 4: Fix explore_rooms.py** — DB-backed catalogue, seeding, opt-in/out, live broadcast via hub
- [ ] **Step 5: Run test** — PASS; commit

### Task 13: Fix remaining backend (AI, push, stories, database, security, image_guard, explore_rooms)

**Files:**
- Modify: `backend/app/routers/ai.py`
- Modify: `backend/app/routers/push.py`
- Modify: `backend/app/routers/stories.py`
- Modify: `backend/app/database.py`
- Modify: `backend/app/image_guard.py` (if not done in Task 5)

**Interfaces:**
- `ai.py`: `/api/ai/*` — streaming assistant, OpenAI-compatible provider, knowledge base fallback
- `push.py`: `/api/push/*` — VAPID public key, subscription save/send
- `database.py`: SQLAlchemy engine, `run_migrations()`, `backup_sqlite()`, DATA_DIR resolution

- [ ] **Step 1: Write failing test** — AI assistant returns answer from knowledge base without key; with key streams from provider
- [ ] **Step 2: Fix ai.py** — streaming chat, provider config, knowledge base fallback
- [ ] **Step 3: Fix push.py** — VAPID key generation, subscription endpoints, push delivery
- [ ] **Step 4: Fix database.py** — auto-migrations idempotent, rolling backups, DATA_DIR /var/data on Render
- [ ] **Step 5: Run test** — PASS; commit

### Task 14: Playwright E2E test suite

**Files:**
- Create: `tests/e2e/playwright.config.ts`
- Create: `tests/e2e/auth.spec.ts`
- Create: `tests/e2e/swipes.spec.ts`
- Create: `tests/e2e/chat.spec.ts`
- Create: `tests/e2e/photos.spec.ts`
- Create: `tests/e2e/pwa-push.spec.ts`
- Create: `tests/e2e/payments.spec.ts`
- Create: `tests/e2e/admin.spec.ts`

**Interfaces:**
- Playwright config: base URL `http://localhost:5173`, backend `http://localhost:8000`, Chrome headless
- Each spec: `test.describe`, `test.beforeEach` (setup seed data), `test` (assertions), `test.afterEach` (cleanup)

- [ ] **Step 1: Write playwright.config.ts** — config for local dev servers
- [ ] **Step 2: Write auth.spec.ts** — signup/login, domain rejection, session invalidation on logout
- [ ] **Step 3: Write swipes.spec.ts** — deck load, swipe match, Rewind, quota limit
- [ ] **Step 4: Write chat.spec.ts** — open chat, send message, typing, read receipt, extend, unmatch
- [ ] **Step 5: Write photos.spec.ts** — upload valid photo, reject blank/blurry, server image_guard
- [ ] **Step 6: Write pwa-push.spec.ts** — install prompt, push opt-in, standalone
- [ ] **Step 7: Write payments.spec.ts** — Plus checkout, webhook activation (mocked Moolre)
- [ ] **Step 8: Write admin.spec.ts** — admin login, feature flags, explore rooms, notifications
- [ ] **Step 9: Run full E2E suite** — all pass against local backend + frontend; commit

### Task 15: Deployment config verification + push to GitHub

**Files:**
- Modify: `render.yaml` — verify
- Modify: `docker-compose.yml` — verify
- Modify: `k8s-deployment.yaml` — verify
- Modify: `.env.example` — document all env vars
- Modify: `README.md` — update with new build/test/deploy steps

**Interfaces:**
- `render.yaml`: single web service, persistent disk at /var/data, build command `cd frontend && npm install && npm run build`, start command `cd backend && pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

- [ ] **Step 1: Verify render.yaml** — build/start commands correct, disk mount at /var/data
- [ ] **Step 2: Update .env.example** — SECRET_KEY, ADMIN credentials, GOOGLE_CLIENT_ID, DATA_DIR, DATABASE_URL, UPLOAD_DIR, MOOLRE keys, AI_API_KEY/BASE_URL/MODEL, PUBLIC_BASE_URL, ALLOWED_ORIGINS
- [ ] **Step 3: Update README.md** — local setup, E2E test commands, deployment checklist
- [ ] **Step 4: Run full build + test** — `npm run build` (frontend), `uvicorn app.main:app` (backend), Playwright E2E suite — all green
- [ ] **Step 5: Commit all changes** — `git add -A`, `git commit -m "feat: hybrid redesign & fix campmatch frontend and backend"`
- [ ] **Step 6: Push to GitHub** — `git push origin main`

---

**Plan complete and saved to `docs/superpowers/plans/2026-11-23-campmatch-hybrid-redesign.md`.** Please review the plan. Does it capture what you want, and which execution approach should we use?

- **Subagent-driven** — A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** — I implement every task myself in this session, then one fresh reviewer checks the whole branch. Cheapest and fastest; no independent review until the end.

For this plan I recommend **Native**, because the tasks are tightly coupled through shared interfaces (CSS tokens, API endpoints, WebSocket events, database schema) and there are 15 tasks with strong dependencies — a single context carrying the full design doc will implement more consistently than fragmenting across fresh subagents. A shipped mistake here (broken auth or payments) would cost a lot, so the plan carries the exact signatures and tests to prevent that.

Does the plan capture what you want, and which approach should we use?
