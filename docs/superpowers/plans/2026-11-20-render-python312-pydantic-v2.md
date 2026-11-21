# Render Deployment Fix — Python 3.12 + Pydantic v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Render deployment crash caused by Python 3.14 + pydantic v1 incompatibility by pinning Python to 3.12 and upgrading to pydantic v2 + fastapi v2.

**Architecture:** Pin Python runtime to 3.12.x (has prebuilt wheels for pydantic v2), upgrade pydantic to v2.9+, upgrade fastapi to v2-compatible, upgrade sqlalchemy to 2.x for pydantic v2 compatibility, remove the EmailStr stub workaround in main.py.

**Tech Stack:** FastAPI 0.115.0, Pydantic 2.9+, SQLAlchemy 2.x, Python 3.12.x

**Spec:** User-provided requirements (pin Python 3.11/3.12, upgrade pydantic v2, verify startup locally)

## Global Constraints

- Python 3.12.x must be pinned in render.yaml (Render supports .python-version or runtime.txt)
- pydantic must be >=2.9.0 (v2, has Python 3.12 wheels)
- fastapi must be >=0.115.0 (already satisfied)
- sqlalchemy must be upgraded to 2.x (pydantic v2 incompatibility with SQLAlchemy 1.x)
- No pydantic v1 packages may remain
- All dependencies must be pure-Python wheels available on Python 3.12

## Review Focus

1. `backend/app/main.py` — `pydantic.types.EmailStr` stub must be removed (pydantic v2 handles EmailStr natively)
2. `backend/app/security.py` — Uses `pydantic` internally; verify v2 compatibility
3. `backend/app/database.py` — SQLAlchemy 1.x → 2.x migration (engine, Session, metadata.create_all, run_migrations ALTER TABLE)
4. `backend/app/models.py` — SQLAlchemy model definitions must be v2 compatible
5. `backend/app/routers/` — All routers use SQLAlchemy 1.x query API; must verify v2 compatibility
6. `render.yaml` — Must add Python version pin

---

### Task 1: Pin Python version to 3.12 in render.yaml

**Files:**
- Modify: `render.yaml` — add `pythonVersion: "3.12.x"` under the web service

**Interfaces:**
- Consumes: None
- Produces: Render will use Python 3.12.x for build and runtime

- [ ] **Step 1: Add pythonVersion to render.yaml**

Add `pythonVersion: "3.12.x"` to the `services[0]` block in render.yaml.

- [ ] **Step 2: Verify YAML is valid**

Run: `python -c "import yaml; yaml.safe_load(open('render.yaml'))"`
Expected: No error, YAML parses cleanly

- [ ] **Step 3: Commit**

```bash
git add render.yaml
git commit -m "fix: pin Python version to 3.12.x for Render"
```

---

### Task 2: Upgrade pydantic to v2 and upgrade fastapi/sqlalchemy in requirements.txt

**Files:**
- Modify: `backend/requirements.txt` — change pydantic to v2.9+, upgrade sqlalchemy to 2.x

**Interfaces:**
- Consumes: None
- Produces: All dependencies are pydantic v2 compatible, pure-Python wheels for Python 3.12

- [ ] **Step 1: Edit requirements.txt**

Change:
- `pydantic==1.10.17` → `pydantic==2.9.2`
- `sqlalchemy==1.4.52` → `sqlalchemy==2.0.29`
- Keep `fastapi==0.115.0` (already v2-compatible)
- Keep other pinned versions

- [ ] **Step 2: Verify requirements parse**

Run: `pip check` (in local venv) or `python -c "import pydantic; print(pydantic.VERSION)"`
Expected: pydantic reports 2.9.x

- [ ] **Step 3: Commit**

```bash
git add backend/requirements.txt
git commit -m "fix: upgrade pydantic to v2.9.2 and sqlalchemy to 2.0.29 for Python 3.12"
```

---

### Task 3: Remove EmailStr stub from main.py

**Files:**
- Modify: `backend/app/main.py` — remove lines 9-16 (the EmailStr stub workaround)

**Interfaces:**
- Consumes: None
- Produces: main.py imports cleanly with pydantic v2

- [ ] **Step 1: Remove stub lines**

Delete lines 9-16 (the comment block and `import pydantic.types` / `pydantic.types.EmailStr = str`).

- [ ] **Step 2: Verify import works locally**

Run: `cd backend && python -c "from app.main import app; print('app OK')"`

Expected: No ConfigError, app imports successfully

- [ ] **Step 3: Commit**

```bash
git add backend/app/main.py
git commit -m "fix: remove EmailStr stub (no longer needed with pydantic v2)"
```

---

### Task 4: Verify full app startup locally

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: None
- Produces: Confirmation that `/api/health` returns 200

- [ ] **Step 1: Run the health endpoint test**

Run: `cd backend && python -c "from fastapi.testclient import TestClient; from app.main import app; c = TestClient(app); r = c.get('/api/health'); print(r.status_code, r.json())"`

Expected: Status 200, body `{"status": "ok", ...}`

- [ ] **Step 2: Commit if any test artifacts were added**

None expected.

---

### Task 5: Push to GitHub

**Files:**
- None

**Interfaces:**
- Consumes: None
- Produces: Code on GitHub `main`; Render auto-deploys

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Clear Render build cache**

Dashboard → campmatch → Settings → Build cache → Clear cache

- [ ] **Step 3: Verify deploy**

Visit `https://campmatch-7f53.onrender.com/api/health` — expect: `{"status": "ok", ...}`
