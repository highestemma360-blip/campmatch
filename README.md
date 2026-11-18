# Campmatch

<p align="left">
  <img src="frontend/public/logo.svg" alt="Campmatch" width="280" />
</p>

Campmatch is a full-stack university student matching platform for verified `.edu.gh` students across Ghana public universities. It combines FastAPI, SQLAlchemy, WebSockets, and OpenCV on the backend with a React + TypeScript single-page client styled after modern mobile and web dating applications.

## Core Capabilities

- **University Domain Authentication**
  - Supports email/password and Google OAuth2 sign-in restricted to approved `.edu.gh` student domains.
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
  - **Subscription Quota Enforcement**: When Campmatch Plus is enabled in the Admin Console, free accounts are capped at **10 swipes per rolling 24-hour window** (configurable by admin), while Plus subscribers receive unlimited swipes, Rewind, and full Beeline visibility.

- **Real-Time Messaging & Match Queue**
  - Persistent WebSocket channel (`/ws?token=...`) delivering instant messages, live typing indicators, read receipts (`Seen`), message heart reactions, online presence dots, real-time mutual match alerts, and live platform configuration updates.
  - 24-hour first-message countdown ring on new matches with `+24h Extend` support, Opening Move prompts, and an icebreaker generator.

- **Account Lifecycle & Record Preservation**
  - **Snooze Mode**: Temporarily hides a user's card from discovery decks without affecting existing matches.
  - **Soft Account Deletion**: Users can delete their account from Settings. Their profile, photos, and active matches are immediately removed from all public views and active sessions are terminated, while 100% of historical database records (`users`, `swipes`, `matches`, `messages`, `payments`, `reports`, and `image_moderation_logs`) remain intact and inspectable in the Admin Deleted Vault.

- **Administration Console**
  - Live KPIs (including active WebSocket connections), 7-day activity series, and campus breakdown.
  - Live controls for Plus subscriptions, free daily swipe cap, subscription pricing, Super Like allowances, allowed university domains, registration gate, maintenance mode, and global campus announcement banners.
  - User Dossier inspector (photo moderation, Plus/Spotlight grants, admin role management, session revocation, suspension, soft-deletion, and deleted-account restoration).
  - Safety Reports queue with preserved match chat transcript inspection, Image Guard logs, Paystack revenue ledger, and Admin Audit Trail.

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
│       ├── models_cv/           # Bundled YuNet ONNX weights (232 KB)
│       └── routers/
│           ├── auth.py          # Signup, login, Google OAuth2, /api/auth-config
│           ├── profiles.py      # Profile CRUD, verified photo upload, password, soft-delete
│           ├── swipes.py        # Deck scoring, 10/day quota enforcement, Rewind, Boost, Likes
│           ├── chat.py          # Matches, messages, reactions, extend, block, safety report
│           ├── payments.py      # Paystack initialization, HMAC-SHA512 webhook, verification
│           └── admin.py         # Full administration, moderation, vault & audit endpoints
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
│       │   └── Modals.tsx       # Discovery, Plus, Report & Delete Account modals
│       └── pages/
│           ├── AuthPage.tsx
│           ├── OnboardingPage.tsx
│           ├── ExplorePage.tsx
│           ├── LikesYouPage.tsx
│           ├── MatchesChatPage.tsx
│           ├── ProfilePage.tsx
│           └── AdminPage.tsx
├── ARCHITECTURE.md
├── ADMIN_GUIDE.md
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
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — Automatically provisions or promotes the initial administrator account on startup
- `DATABASE_URL` — Defaults to `/var/data/campmatch.db` when `/var/data` exists, or `./backend/campmatch.db` locally
- `GOOGLE_CLIENT_ID` — Enables Google OAuth2 verification
- `PAYSTACK_SECRET_KEY` — Enables live Paystack checkout and HMAC webhook verification

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
The Vite dev server runs on `http://localhost:5173` and proxies `/api`, `/uploads`, and `/ws` to `http://localhost:8000`.

## Production Deployment (Render)

Deploy using `render.yaml`. Render builds `frontend/dist`, installs Python requirements, mounts a persistent disk at `/var/data` (storing both `campmatch.db` and `/var/data/uploads` across deploys), and serves the API, WebSockets, and SPA from a single web service.
