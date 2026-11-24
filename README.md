# Campmatch

<p align="left">
  <img src="frontend/public/logo.svg" alt="Campmatch" width="280" />
</p>

Campmatch is a full-stack university student matching platform for verified `.edu.gh` students across Ghana public universities. It combines FastAPI, SQLAlchemy, WebSockets, and OpenCV on the backend with a React + TypeScript single-page client styled after modern mobile and web dating applications.

## Core Capabilities

- **University Domain Authentication**
  - Google sign-in is the primary home-page path. Only approved school Google accounts are accepted — `@gmail.com` and any unapproved domain are rejected with a clear message.
  - Supports email/password as a secondary path, also restricted to approved `.edu.gh` student domains.
  - Administrators can switch between UMaT-only access (`@st.umat.edu.gh`) and all approved Ghana university domains, or customize the allowed domain list live from the Admin Console.
  - Session invalidation via per-user JWT version counters (`token_version`) on password change, suspension, force-logout, or account deletion.

- **Automated Profile Photo Screening**
  - Dual-stage validation (client canvas pre-check + server-side OpenCV & Pillow pipeline in `backend/app/image_guard.py`).
  - Rejects blank white images, pitch-black images, solid-color/low-entropy placeholders, blurry frames, and extreme aspect ratios.
  - Verifies human presence using OpenCV's YuNet neural face detector (`face_detection_yunet_2023mar.onnx`).
  - Screens out explicit or overly revealing imagery using face-masked multi-tone YCrCb/HSV body-skin segmentation before any file is written to disk.
  - Automatically normalizes EXIF orientation and encodes accepted portraits to WebP (`<= 1280px`) on persistent storage.

- **Discovery, Modes & Swipe Mechanics**
  - Three discovery modes: `Date`, `BFF`, and `Study`, plus curated Explore rooms.
  - Pointer-driven card physics with grab-point pivot rotation, directional tint wash, action burst animations, Rewind, Super Like, and 30-minute Campus Spotlight boosts.
  - Desktop split-pane layout (`>= 960px`) with keyboard shortcuts (`ArrowLeft`, `ArrowRight`, `Space`, `ArrowUp`, `Enter`, `Backspace`) and mobile bottom-sheet layout (`< 960px`).
  - **Subscription Quota Enforcement**: When Campmatch Plus is enabled in the Admin Console, free accounts are capped at **10 swipes per rolling 24-hour window** (configurable by admin), while Plus subscribers receive unlimited swipes, Rewind, full Beeline visibility, and Seen/Delivered read receipts in chat.

- **Real-Time Messaging & Match Queue**
  - Persistent WebSocket channel (`/ws?token=...`) delivering instant messages, live typing indicators, read receipts (`Seen`), message heart reactions, online presence dots, real-time mutual match alerts, and live platform configuration updates.
  - 24-hour first-message countdown ring on new matches with `+24h Extend` support, Opening Move prompts, and an icebreaker generator.

- **In-App Assistant & Support**
  - Real-time streaming AI assistant with conversation memory and deep Campmatch knowledge (swipes, Plus, payments, safety, profile, Explore, notifications). Connect any OpenAI-compatible provider in **Admin → AI Assistant**; without a key it streams answers from the built-in knowledge base.
  - Official WhatsApp floating button for human support, plus closable assistant panel on mobile and desktop.
  - Admin notifications appear as clean, centred pop-up cards with full-size flyers, and remain available in the notification sheet.
  - Successful Plus payments trigger an animated activation card and update the account automatically within seconds.

- **Installable Phone App (PWA)**
  - Android/Chrome uses the browser's native install prompt; iPhone users get live Safari **Share → Add to Home Screen** tips, with a clear warning when they are in a non-Safari iOS browser.
  - One calm invitation is shown per session about 18 seconds after sign-in on phones. It is skipped while a chat, sheet, celebration or the assistant is open, dismissals pause prompts for 7 days, and installing pauses them for 180 days.
  - Students can always install manually from **Profile → Settings → Home Screen App**.
  - The service worker precaches the app shell so the installed app opens offline, while live data, uploads and WebSockets always use the network.

- **Phone notifications (web push)**
  - Students opt in from **Profile → Settings → Phone Alerts** to receive match, message and campus alerts on their phone via the browser Push API + `sw.js`.
  - Once Campmatch is installed to the home screen, Phone Alerts are switched on automatically (students can turn them off again at any time).
  - Once a day, if there is unread activity, an installed app sends a system notification reminding the student to open Campmatch and check new matches or messages.
  - Matches, new messages, and admin campus notifications trigger real-time phone push so students are alerted even when the app is closed.

- **Account Lifecycle & Record Preservation**
  - **Snooze Mode**: Temporarily hides a user's card from discovery decks without affecting existing matches.
  - **Soft Account Deletion**: Users can delete their account from Settings. Their profile, photos, and active matches are immediately removed from all public views and active sessions are terminated, while 100% of historical database records (`users`, `swipes`, `matches`, `messages`, `payments`, `reports`, and `image_moderation_logs`) remain intact and inspectable in the Admin Deleted Vault.

- **Administration Console (separate `/admin` portal)**
  - The admin portal is only reachable by visiting `/admin`; it is never linked from the student app. Credentials are verified against `ADMIN_USERNAME` (or `ADMIN_EMAIL`) and `ADMIN_PASSWORD` set in Render.
  - Live KPIs (including active WebSocket connections), 7-day activity series, and campus breakdown.
  - Live controls for Plus subscriptions, free daily swipe cap, subscription pricing, Super Like allowances, allowed university domains, registration gate, maintenance mode, and global campus announcement banners.
  - **Explore Rooms manager**: add, rename, recolor, hide/show, reorder, and delete rooms without a redeploy. Rooms are stored in the database and broadcast live.
  - **Notifications composer**: send a text update, an uploaded flyer image, or both, targeted to everyone, free/Plus/new students, a school, or a single student.
  - **Payment Gateway**: save or rotate Moolre credentials, toggle live/sandbox, copy webhook and redirect URLs, and test connectivity.
  - **AI Assistant**: connect an OpenAI-compatible provider, rotate keys, choose the model, and test the assistant live; the built-in knowledge base keeps it working without a key.
  - **Storage & Backups**: inspect the durable data directory, create/download rolling SQLite backups, and export a JSON archive of core records.
  - User Dossier inspector (photo moderation, Plus/Spotlight grants, admin role management, session revocation, suspension, soft-deletion, and deleted-account restoration).
  - Safety Reports queue with preserved match chat transcript inspection, Image Guard logs, Moolre revenue ledger, and Admin Audit Trail.

## Project Structure

```text
campmatch/
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # FastAPI app, middleware, static SPA mount, /ws endpoint
│       ├── database.py          # SQLAlchemy engine, persistent /var/data paths, auto-migrations
│       ├── models.py            # Relational schema (Users, Swipes, Matches, Messages, Logs)
│       ├── security.py          # Bcrypt hashing, versioned JWTs, settings helpers, bootstrap
│       ├── realtime.py          # WebSocket ConnectionManager & live event dispatch
│       ├── image_guard.py       # Blank/black/white, YuNet human face & explicit skin detector
│       ├── explore_rooms.py     # DB-backed Explore room catalogue, seeding & serialization
│       ├── models_cv/           # Bundled YuNet ONNX weights (232 KB)
│       └── routers/
│           ├── auth.py          # Signup, login, Google OAuth2, /api/auth-config
│           ├── profiles.py      # Profile CRUD, verified photo upload, password, soft-delete
│           ├── swipes.py        # Deck scoring, 10/day quota enforcement, Rewind, Boost, Likes
│           ├── chat.py          # Matches, messages, reactions, extend, block, safety report
│           ├── payments.py      # Moolre MoMo collection, hosted link, signed webhook, verification
│           ├── notifications.py # Student notification feed, read receipts
│           └── admin.py         # Admin portal auth, moderation, rooms, notifications, storage, audit
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx              # Application state & real-time WebSocket orchestration
│       ├── styles.css           # Dark/light design tokens, split-pane layout & animations
│       ├── types.ts             # Shared TypeScript interfaces
│       ├── constants.ts         # Prompts, interests, explore rooms & legal summaries
│       ├── utils/
│       │   ├── imageCheck.ts    # Client-side pre-upload blank/resolution validator
│       │   └── realtime.ts      # Reconnecting WebSocket client
│       ├── components/
│       │   ├── Icons.tsx        # Custom SVG icon set
│       │   ├── SwipeDeck.tsx    # Interactive card stack, physics & action dock
│       │   ├── ProfileSheet.tsx # Scrollable full profile drawer
│       │   ├── MatchCelebration.tsx
│       │   ├── NotificationsSheet.tsx # Campus announcement / flyer drawer
│       │   └── Modals.tsx       # Discovery, Plus + Moolre checkout, Report & Delete modals
│       └── pages/
│           ├── AuthPage.tsx     # Google-first sign-in with domain policy messaging
│           ├── OnboardingPage.tsx
│           ├── ExplorePage.tsx
│           ├── LikesYouPage.tsx
│           ├── MatchesChatPage.tsx
│           ├── ProfilePage.tsx
│           ├── AdminPortal.tsx  # /admin gate + console shell
│           ├── AdminPage.tsx    # Console sections and moderation tools
│           └── AdminAdvanced.tsx # Rooms, notifications, gateway, storage panels
├── ARCHITECTURE.md
├── ADMIN_GUIDE.md
├── DEPLOYMENT.md
├── PRIVACY_POLICY.md
├── TERMS_OF_SERVICE.md
└── render.yaml
```

## Local Setup

### 1. Backend
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Optional environment variables:
- `SECRET_KEY` — JWT signing secret (required in production)
- `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` — Credentials for the separate `/admin` portal
- `DATA_DIR` — Durable data root (defaults to `/var/data` on Render when present, otherwise `backend/`)
- `DATABASE_URL` — Defaults to `sqlite:///<DATA_DIR>/campmatch.db`
- `UPLOAD_DIR` — Verified photos and notification flyers (defaults to `<DATA_DIR>/uploads`)
- `GOOGLE_CLIENT_ID` — Google OAuth client ID used to verify school Google accounts
- `PUBLIC_BASE_URL` — Public origin used to build Moolre callback and redirect URLs
- `MOOLRE_USER`, `MOOLRE_PUBKEY`, `MOOLRE_ACCOUNT_NUMBER`, `MOOLRE_WALLET_SECRET`, `MOOLRE_ENV`, `MOOLRE_MERCHANT_EMAIL`, `MOOLRE_CALLBACK_URL` — Moolre payment credentials (can also be saved live in the admin console)
- `AI_API_KEY` / `AI_MODEL` / `AI_BASE_URL` — Optional provider for the in-app assistant; defaults point at
  NVIDIA NIM (`AI_MODEL=nvidia/llama-3.1-nemotron-70b-instruct`,
  `AI_BASE_URL=https://integrate.api.nvidia.com/v1`). Set `AI_API_KEY` to your NVIDIA API key, or use any
  OpenAI-compatible provider. Can also be saved in **Admin → AI Assistant**. Without a key the assistant
  still replies in real time from the built-in Campmatch knowledge base.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
The Vite dev server runs on `http://localhost:5173` and proxies `/api`, `/uploads`, and `/ws` to `http://localhost:8000`.

## Design System (DESIGN.md)

The repo includes a Google Stitch `DESIGN.md` at the project root defining the color palette (coral #ff4f5e signature), typography, component stylings, layout, depth, do's/don'ts, responsive breakpoints, and an agent prompt guide. Visual catalogs live at `frontend/public/preview.html` (light) and `preview-dark.html` (dark). AI agents generating UI should read `DESIGN.md` so output stays visually consistent with Campmatch.

## End-to-End Tests (Playwright)

Playwright E2E specs live in `tests/e2e/` and cover auth (domain rejection, signup), swipes (deck, like/nope), chat (matches, messaging), photos (upload/rejection), PWA/push, payments, and admin.

```bash
# Install Playwright (once)
npx playwright install chromium

# Start dev servers, then run tests
cd backend && SECRET_KEY=dev-secret uvicorn app.main:app --port 8000   # terminal 1
cd frontend && npm run dev                                            # terminal 2

# From repo root
npx playwright test
```

## Production Deployment (Render)

Deploy using `render.yaml`. Render builds `frontend/dist`, installs Python requirements, mounts a persistent disk at `/var/data` (storing the SQLite database, uploads, and rolling backups across deploys), and serves the API, WebSockets, SPA, and the `/admin` portal from a single web service.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full Render checklist: persistent disk, admin credentials, Google OAuth, Moolre webhook setup, and backup/restore.
