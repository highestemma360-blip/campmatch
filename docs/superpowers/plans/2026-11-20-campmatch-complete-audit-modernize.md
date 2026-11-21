# Campmatch Complete Audit & Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete audit, modernization, and end-to-end verification of the campmatch codebase for deployment on Render (Python 3.12.8 + Node.js 24), ensuring zero deployment failures and production-grade code quality.

**Architecture:** Full-stack React (Vite/TypeScript) frontend + FastAPI (SQLAlchemy 2.x, Python 3.12) backend on Render.

**Tech Stack:** FastAPI 0.115.0, Pydantic 2.9.2, SQLAlchemy 2.0.29, Python 3.12.x, React 18, Vite 5, TypeScript

**Spec:** User-provided Phase 1-3 requirements (full audit, modernization, end-to-end verification)

## Global Constraints

- Python 3.12.8 pinned via `.python-version` and `PYTHON_VERSION` env var
- Pydantic v2.9.2 (pure Python wheel, no pydantic-core Rust compilation)
- SQLAlchemy 2.0.29 (2.x API, no 1.x legacy patterns)
- FastAPI 0.115.0 (v2 lifespan pattern, not @app.on_event)
- All dependencies must have prebuilt wheels for Python 3.12 Linux x86_64
- Frontend: React 18, Vite 5, TypeScript (no deprecated patterns)

## Review Focus

1. `backend/app/main.py` - FastAPI app entry point, lifespan management
2. `backend/app/database.py` - SQLAlchemy engine/session setup
3. `backend/app/models.py` - SQLAlchemy declarative models
4. `backend/app/routers/auth.py` - Auth with JWT, Google OAuth
5. `backend/app/routers/profiles.py` - Profile CRUD, photo upload
6. `backend/app/routers/swipes.py` - Swipe mechanics
7. `backend/app/routers/chat.py` - Chat/messaging
8. `backend/app/routers/admin.py` - Admin console
9. `backend/app/routers/payments.py` - Payment processing
10. `backend/app/routers/stories.py` - Stories
11. `backend/app/image_guard.py` - Image validation
12. `backend/app/ai_moderation.py` - AI moderation
13. `backend/app/ai_admin.py` - AI admin worker
14. `backend/app/security.py` - JWT, security helpers
15. `backend/app/realtime.py` - WebSocket connection manager
16. `backend/app/push.py` - Web push notifications
17. `frontend/src/pages/AuthPage.tsx` - Auth page
18. `frontend/src/pages/MatchesChatPage.tsx` - Chat page
19. `frontend/src/pages/ProfilePage.tsx` - Profile page
20. `frontend/src/pages/OnboardingPage.tsx` - Onboarding
21. `frontend/src/pages/SwipeDeck.tsx` - Swipe deck
22. `frontend/src/pages/MatchesListView.tsx` - Matches list
23. `frontend/src/pages/ExplorePage.tsx` - Explore page
24. `frontend/src/components/Icons.tsx` - Icon components
25. `frontend/src/components/Modals.tsx` - Modal components
26. `frontend/vite.config.ts` - Vite config
27. `frontend/tsconfig.json` - TypeScript config
28. `frontend/package.json` - Frontend dependencies

---

### Task 1: Backend Audit - Scan All .py Files for Issues

**Files:**
- Read: All 32 backend/app/*.py files
- Test: Create backend/test_import_audit.py

**Interfaces:**
- Consumes: None
- Produces: List of all import errors, missing typing imports, circular imports, unawaited coroutines

- [ ] **Step 1: Scan backend/app/main.py** for missing typing imports, circular imports
- [ ] **Step 2: Scan backend/app/database.py** for SQLAlchemy 1.x patterns, session issues
- [ ] **Step 3: Scan backend/app/models.py** for declarative_base() usage, Column types
- [ ] **Step 4: Scan backend/app/security.py** for deprecated patterns
- [ ] **Step 5: Scan backend/app/realtime.py** for unawaited coroutines
- [ ] **Step 6: Scan backend/app/push.py** for import issues
- [ ] **Step 7: Scan backend/app/routers/*.py** (8 router files) for all issues
- [ ] **Step 8: Scan backend/app/image_guard.py**, `ai_moderation.py`, `ai_admin.py`
- [ ] **Step 9: Scan backend/app/feature_flags.py**, `circuit_breaker.py`, `cache.py`, `idempotency.py`, `dlq.py`, `distributed_lock.py`, `backpressure.py`, `backoff.py`, `cron.py`, `webhooks.py`, `saga.py`, `pubsub.py`
- [ ] **Step 10: Write failing test for import audit** - Write test that imports every module
- [ ] **Step 11: Run import audit test** - Verify all modules import without errors
- [ ] **Step 12: Commit import audit fixes**

---

### Task 2: Audit requirements.txt Against All Imports

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `render.yaml` (if needed)

**Interfaces:**
- Consumes: List of all imports from Task 1
- Produces: Updated requirements.txt with all missing packages

- [ ] **Step 1: Catalog all third-party imports** from all backend/app/*.py files
- [ ] **Step 2: Compare against requirements.txt** - find missing packages
- [ ] **Step 3: Add missing packages** (numpy, email-validator already added; verify opencv-python-headless, etc.)
- [ ] **Step 4: Verify all versions have Python 3.12 Linux wheels**
- [ ] **Step 5: Commit requirements.txt changes**

---

### Task 3: Modernize FastAPI & Pydantic v2 Patterns

**Files:**
- Modify: `backend/app/main.py` - Replace @app.on_event with lifespan
- Modify: `backend/app/models.py` - Replace declarative_base with DeclarativeBase
- Modify: `backend/app/routers/*.py` - Replace .dict() with .model_dump(), @validator with @field_validator

**Interfaces:**
- Consumes: None
- Produces: Modernized FastAPI/Pydantic code

- [ ] **Step 1: Replace @app.on_event("startup") with lifespan context manager** in main.py
- [ ] **Step 2: Replace @app.on_event("shutdown") with lifespan cleanup**
- [ ] **Step 3: Replace declarative_base() with DeclarativeBase()** in models.py
- [ ] **Step 4: Replace .dict() with .model_dump()** in all routers
- [ ] **Step 5: Replace @validator with @field_validator** in all routers
- [ ] **Step 6: Replace class Config with model_config** in all Pydantic models
- [ ] **Step 7: Commit FastAPI/Pydantic v2 modernization**

---

### Task 4: Modernize SQLAlchemy 2.0 Patterns

**Files:**
- Modify: `backend/app/database.py` - Use create_engine with SQLAlchemy 2.0 style
- Modify: `backend/app/routers/*.py` - Replace session.query() with select()

**Interfaces:**
- Consumes: None
- Produces: SQLAlchemy 2.0 compatible code

- [ ] **Step 1: Replace declarative_base() import with DeclarativeBase** in database.py
- [ ] **Step 2: Replace session.query(Model).filter(...) with select(Model).filter(...)** in all routers
- [ ] **Step 3: Commit SQLAlchemy 2.0 modernization**

---

### Task 5: Modernize Python 3.12 Standard Library Patterns

**Files:**
- Modify: `backend/app/*.py` - Replace deprecated calls

**Interfaces:**
- Consumes: None
- Produces: Python 3.12 compatible code

- [ ] **Step 1: Replace datetime.utcnow() with datetime.now(timezone.utc)** in all files
- [ ] **Step 2: Replace typing.List/Dict/etc. with list/dict/etc. where appropriate**
- [ ] **Step 3: Replace asyncio.get_event_loop() if present**
- [ ] **Step 4: Commit standard library modernization**

---

### Task 6: Modernize Frontend (React/Vite/TypeScript)

**Files:**
- Modify: `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/package.json`
- Modify: `frontend/src/pages/*.tsx`, `frontend/src/components/*.tsx`

**Interfaces:**
- Consumes: None
- Produces: Modernized frontend code

- [ ] **Step 1: Check package.json for deprecated packages**
- [ ] **Step 2: Check tsconfig.json for deprecated options**
- [ ] **Step 3: Check vite.config.ts for deprecated options**
- [ ] **Step 4: Check all .tsx files for deprecated React patterns**
- [ ] **Step 5: Verify import.meta.env.VITE_* usage with fallbacks**
- [ ] **Step 6: Commit frontend modernization**

---

### Task 7: Run Full Verification Suite

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: All changes from Tasks 1-6
- Produces: Confirmation that backend and frontend build/run cleanly

- [ ] **Step 1: Install backend dependencies** from requirements.txt
- [ ] **Step 2: Run python -m compileall app** on backend
- [ ] **Step 3: Run ruff check backend/** if available
- [ ] **Step 4: Run python -c "import app.main"** to verify import
- [ ] **Step 5: Install frontend dependencies** from package.json
- [ ] **Step 6: Run npx tsc --noEmit** on frontend
- [ ] **Step 7: Run npm run build** on frontend
- [ ] **Step 8: Boot uvicorn app.main:app and test /api/health**
- [ ] **Step 9: Commit all fixes**

---

### Task 8: Push to GitHub

**Files:**
- None

**Interfaces:**
- Consumes: All committed changes
- Produces: Code on GitHub `main`

- [ ] **Step 1: git add -A**
- [ ] **Step 2: git commit -m "comprehensive audit and modernization"**
- [ ] **Step 3: git push origin main**
- [ ] **Step 4: Verify deploy on Render**

---

## Execution Plan

I will implement this plan task-by-task, starting with Task 1. Each task produces a self-contained, testable deliverable. I will use TDD (write failing test first, then fix) for all code changes.
