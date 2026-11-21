# Render Deployment Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Render deployment crash caused by FastAPI's internal `EmailStr` dependency requiring `email_validator` on Python 3.14.

**Architecture:** Two-layer defense:
1. `requirements.txt`: `email-validator` unpinned so pip resolves a Python 3.14-compatible wheel
2. `main.py`: Early import guard that stubs `pydantic.types.EmailStr` if `email_validator` cannot be imported, preventing FastAPI's `openapi/models.py` from crashing at module load

**Tech Stack:** FastAPI 0.115.0, pydantic 1.10.17, Python 3.14 (Render)

**Spec:** None — this is a bug fix, not a feature.

## Global Constraints

- Python 3.14 on Render (read-only cargo filesystem, no Rust compilation)
- All dependencies must be pure-Python wheels (no `pydantic-core`, no `opencv-python-headless`)
- FastAPI 0.115.0 requires pydantic v1 (≥1.7.4) or v2 — using v1 for wheel compatibility
- Backend must boot and serve `/api/health` on Render

## Review Focus

1. `email_validator` importable at FastAPI module load time — or stubbed
2. FastAPI `openapi/models.py` `Contact.email: Optional[EmailStr]` resolves without ConfigError
3. `/api/health` endpoint returns 200 after deploy

---

### Task 1: Unpin `email-validator` in requirements.txt

**Files:**
- Modify: `backend/requirements.txt:8` — change `email-validator==1.3.1` to `email-validator`

**Interfaces:**
- Consumes: None
- Produces: `email-validator` package installed at build time (pip resolves latest Python 3.14-compatible wheel)

- [ ] **Step 1: Write failing test**

Create `backend/test_email_validator.py`:
```python
def test_email_validator_importable():
    import email_validator
    assert email_validator is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/test_email_validator.py -v` (expect: ImportError if not installed)
Expected: FAIL — `email_validator` not importable

- [ ] **Step 3: Edit `backend/requirements.txt`**

Change line 8 from `email-validator==1.3.1` to `email-validator`

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/test_email_validator.py -v`
Expected: PASS — `email_validator` importable

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/test_email_validator.py
git commit -m "fix: unpinned email-validator for Python 3.14 wheel resolution"
```

---

### Task 2: Add EmailStr stub fallback in main.py

**Files:**
- Modify: `backend/app/main.py` — add early import guard before `from fastapi import ...`

**Interfaces:**
- Consumes: None
- Produces: `pydantic.types.EmailStr` stubbed if `email_validator` unavailable

- [ ] **Step 1: Write failing test**

Create `backend/test_email_str_stub.py`:
```python
def test_email_str_resolvable():
    import pydantic.types
    assert hasattr(pydantic.types, 'EmailStr')
    # FastAPI's openapi/models.py should load without ConfigError
    from fastapi.openapi.models import Contact
    assert Contact is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/test_email_str_stub.py -v`
Expected: FAIL — `pydantic.errors.ConfigError: unable to infer type for attribute`

- [ ] **Step 3: Edit `backend/app/main.py`**

Add before `from fastapi import FastAPI` (line 8):
```python
# Prevent FastAPI's internal EmailStr dependency from crashing on Python 3.14
# when email_validator is not available (Read-only cargo filesystem on Render).
try:
    import email_validator  # noqa: F401
except ImportError:
    import pydantic.types
    pydantic.types.EmailStr = str  # stub so type annotation resolves
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/test_email_str_stub.py -v`
Expected: PASS — `fastapi.openapi.models.Contact` loads without ConfigError

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py backend/test_email_str_stub.py
git commit -m "fix: stub EmailStr fallback for FastAPI on Python 3.14"
```

---

### Task 3: Verify FastAPI boots and /api/health works

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: None
- Produces: Confirmation that `uvicorn app.main:app` boots and `/api/health` returns 200

- [ ] **Step 1: Write failing test**

Create `backend/test_health_endpoint.py`:
```python
from fastapi.testclient import TestClient
from app.main import app

def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/test_health_endpoint.py -v`
Expected: FAIL — app crashes on import

- [ ] **Step 3: No code change needed** (Tasks 1 & 2 already fixed it)

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/test_health_endpoint.py -v`
Expected: PASS — `/api/health` returns 200

- [ ] **Step 5: Commit**

```bash
git add backend/test_health_endpoint.py
git commit -m "test: add health endpoint regression test"
```

---

### Task 6: Push and clear Render build cache

**Files:**
- None

**Interfaces:**
- Consumes: None
- Produces: Code on GitHub `main` branch; Render redeploy triggered

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Clear Render build cache**

Dashboard → campmatch → Settings → Build cache → Clear cache → Redeploy

- [ ] **Step 3: Verify deploy**

Visit `https://campmatch.onrender.com/api/health` — expect: `{"status": "ok", ...}`