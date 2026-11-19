# Deployment Guide (Render)

This is the production checklist for Campmatch. The whole product runs as **one Render web service**: FastAPI serves the API, WebSockets, uploaded files, the student SPA, and the separate `/admin` portal.

---

## 1. Persistent storage (do this first)

Render disks survive redeploys; the container filesystem does not. Without a disk, every deploy wipes users, photos, matches, and payments.

1. Create a **Disk** on the Render service:
   - **Name**: `data`
   - **Mount path**: `/var/data`
   - **Size**: 1 GB is enough to start.
2. Set these environment variables:

```env
DATA_DIR=/var/data
DATABASE_URL=sqlite:////var/data/campmatch.db
UPLOAD_DIR=/var/data/uploads
```

`render.yaml` already declares the disk and these values. Confirm them in the Render dashboard after the first deploy.

On every boot the app writes a timestamped copy into `/var/data/backups`. You can also create and download backups from **Admin → Storage & Backups**.

> `sqlite:////var/data/...` has **four** slashes: three for the URL plus the absolute Linux path.

---

## 2. Administrator portal (`/admin`)

The admin portal is deliberately not linked from the student app. It is reachable only by typing:

```text
https://your-domain/admin
```

Set credentials in **Render → Environment**:

```env
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@st.umat.edu.gh      # optional alternative login identifier
ADMIN_PASSWORD=a-long-unique-password
```

`ADMIN_USERNAME` or `ADMIN_EMAIL` can be used to sign in, together with `ADMIN_PASSWORD`. The account is created or promoted automatically on startup.

Security notes:
- Use a password manager; do not reuse the student password.
- Change `ADMIN_PASSWORD` and redeploy to rotate access.
- Admin tokens are stored under `campmatch_admin_token` in the browser and are separate from student sessions.

---

## 3. Google sign-in (primary student login)

Google sign-in is the normal home-page path. Email/password remains available as a fallback.

### Google Cloud setup

1. Open **Google Cloud Console → APIs & Services → Credentials**.
2. Create an **OAuth client ID** of type **Web application**.
3. Add **Authorized JavaScript origins**:
   - `https://your-domain`
   - `http://localhost:8000` (local testing)
   - `http://localhost:5173` (Vite dev server)
4. No redirect URI is required for the Google Identity Services button.
5. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`).

### Render environment

```env
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

`GOOGLE_CLIENT_ID` is the value the backend uses to verify tokens. `VITE_GOOGLE_CLIENT_ID` is a build-time fallback; the runtime value from `/api/auth-config` wins, so changing `GOOGLE_CLIENT_ID` alone is enough after a restart.

### Domain policy

- Only configured school domains are accepted (default: `@st.umat.edu.gh`).
- **`@gmail.com` is always rejected**, even though Google issues the token.
- A Google account on an unapproved domain is rejected with:
  > Personal Gmail and non-school accounts are not allowed. Use your official school Google account.
- To add universities, update **Admin → Controls & Limits → University Scope & Domains** (comma-separated `.edu.gh` domains). Students must sign in with a Google account that actually belongs to that domain; Google does not let users spoof a Workspace domain.

If Google is not configured, the login page shows a clear setup notice instead of a broken button.

---

## 4. Moolre payments

Moolre handles MTN MoMo, Telecel Cash, AT Money, and hosted card checkout.

### Get credentials from Moolre

From the Moolre dashboard collect:

- **API user** (`X-API-USER`)
- **Public key** (`X-API-PUBKEY`)
- **Account number**
- **Wallet secret** (used to verify webhook signatures)

### Option A — Render environment variables

```env
MOOLRE_ENV=live
MOOLRE_USER=your-api-user
MOOLRE_PUBKEY=your-public-key
MOOLRE_ACCOUNT_NUMBER=your-account-number
MOOLRE_WALLET_SECRET=your-wallet-secret
MOOLRE_MERCHANT_EMAIL=payments@your-domain
MOOLRE_CALLBACK_URL=https://your-domain/api/payments/webhook
PUBLIC_BASE_URL=https://your-domain
```

### Option B — Admin console (recommended for rotation)

Open **Admin → Payment Gateway**, paste the values, choose **Live** or **Sandbox**, and save. Values saved in the admin console override Render environment variables. Use **Test Connection** to confirm reachability.

### Moolre dashboard URLs

Set these in Moolre if it asks for them:

```text
Webhook / callback: https://your-domain/api/payments/webhook
Redirect:           https://your-domain/api/payments/callback
```

The webhook is signature-verified with the wallet secret and de-duplicated by event ID. The app also re-checks transaction status when a student returns, so a missed webhook does not lose a payment.

### Enable the product

1. **Admin → Controls & Limits → Enable Campmatch Plus**.
2. Set price and duration.
3. In **Payment Gateway**, tick **Accept payments**.
4. Run one small live payment end-to-end before launch.

---

## 4b. AI assistant (optional)

The floating Campmatch Assistant streams answers in real time. It works out of the box
using a curated Campmatch knowledge base (swipes, matches, Plus, payments, safety, profile).
For full conversational AI, connect any OpenAI-compatible provider — the default is NVIDIA NIM.

```env
# NVIDIA NIM (default) — get a key at build.nvidia.com
AI_API_KEY=nvapi-...
AI_MODEL=nvidia/llama-3.1-nemotron-70b-instruct
AI_BASE_URL=https://integrate.api.nvidia.com/v1
```

Supported providers include NVIDIA NIM, OpenAI, Groq, OpenRouter and DeepSeek — set
`AI_BASE_URL` to the provider's `/v1` endpoint and `AI_MODEL` to one of its chat models.

You can also save or rotate these in **Admin → AI Assistant** without redeploying. Use
**Test Assistant** to confirm the key and model respond. The key stays server-side and is
never sent to students. If the key is missing or the provider fails, the assistant falls
back to the built-in knowledge base automatically, so the help button never breaks.

> The service boots with NVIDIA NIM defaults (`AI_MODEL` and `AI_BASE_URL`), so once you
> set `AI_API_KEY` the assistant is live immediately. Override `AI_MODEL`/`AI_BASE_URL` if
> you prefer another OpenAI-compatible endpoint.

---

## 5. Build and start commands

`render.yaml` uses:

```bash
# Build
cd frontend && npm install && npm run build
cd ../backend && pip install -r requirements.txt

# Start
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

The frontend build output (`frontend/dist`) is served by FastAPI, including SPA fallback for `/admin`.

---

## 6. Verifying a deployment

1. `https://your-domain/` loads the student app.
2. Google button appears and a school account signs in.
3. A personal `@gmail.com` account is rejected with the domain message.
4. `https://your-domain/admin` loads the administrator portal.
5. Admin dashboard shows live metrics.
6. **Explore Rooms** lists seeded rooms; create one and confirm it appears in the student Explore tab.
7. **Notifications** sends a test update; the student bell shows an unread badge.
8. **Storage & Backups** shows `persistent_disk: true` and a startup backup.
9. **Payment Gateway** reports configured and a small MoMo payment activates Plus.

---

## 7. Restore from a backup

1. Download the desired `campmatch-*.db` from **Admin → Storage & Backups**.
2. Stop or suspend the Render service.
3. Upload the file to the disk (Render shell or any file transfer you use) as `/var/data/campmatch.db`.
4. Start the service. It creates a fresh startup backup of the restored file.

Keep an off-Render copy of important backups; a disk protects against redeploys, not against deleting the Render service.

---

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Data disappears after deploy | Disk not mounted at `/var/data`, or `DATA_DIR`/`DATABASE_URL` not pointing at it. |
| Google button says not configured | `GOOGLE_CLIENT_ID` missing, or the domain is not in Authorized JavaScript origins. |
| “The given client ID is not found” | Wrong client ID, or `http(s)://` origin mismatch in Google Cloud. |
| School user rejected | Their Google account is not on the school domain, or the domain is missing from the allowed list. |
| Mobile Money button missing | Moolre credentials incomplete or “Accept payments” unchecked. |
| Webhook rejected | Wallet secret does not match the Moolre dashboard, or the signature is older than 5 minutes. |
| Admin login fails | `ADMIN_USERNAME`/`ADMIN_EMAIL` and `ADMIN_PASSWORD` must be set on the service; restart after changes. |
| No phone notifications | Student must tap **Profile → Settings → Phone Alerts**, and the browser must allow notifications. |
| Push not delivered | `pywebpush` installed, `VAPID_SUBJECT` set to a `mailto:` or `https:` URL, and the service worker registered. |


## 9. Safety, moderation & web push

### Photo review
Automatically-rejected profile photos are kept in a **pending queue** (Image Guard → Pending Photo Review).
The administrator can **Accept & Add** (the photo is added to the student's profile) or **Decline**. False positives
from the AI detector are recovered without asking the student to re-upload.

### Reporting & bans
Students can report another user with a reason (and block them). From **Reports**, the administrator can:

- Mark resolved / dismiss
- **Ban 7 days** or **Ban 30 days** (temporary)
- **Ban permanently**

Temporary bans lift automatically when they expire. Permanent bans block sign-in with a clear message.
Bans can also be managed from any user's inspector (Inspect → Ban / Lift Ban).

### Automatic Plus activation
The moment Moolre confirms a successful payment (webhook `payment.succeeded`, or the in-app
`/api/payments/verify/{reference}` poll), the student's Campmatch Plus is granted automatically —
no manual approval step. The admin "Approve & Grant Plus" button remains as a fallback.

### Web push (phone notifications)
Students opt in from **Profile → Settings → Phone Alerts**. Matches and campus notifications are then
delivered to their phone via the browser Push API + `sw.js` service worker. VAPID keys are auto-generated
and persisted on the disk; optionally set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`
in Render to pin them.

### Installable app (PWA)
Campmatch is installable from the browser — no Play Store or App Store listing is required.

- **Android / Chrome / Edge**: students can use **Profile → Settings → Home Screen App → Install**, or
  accept the automatic invitation that appears once per session about 18 seconds after sign-in. Where the
  browser supports it, the native install dialog opens.
- **iPhone / iPad**: only Safari can add a web app to the Home Screen. The in-app sheet shows
  **Share → Add to Home Screen → Add**, and warns students who opened the site in Chrome, Firefox,
  Instagram or another in-app browser to switch to Safari first.
- **Prompt behaviour**: the automatic invitation is mobile-only, appears at most once per session, and is
  skipped while a chat, modal, notification, Plus celebration or the AI assistant is open. Dismissing
  pauses prompts for 7 days; a successful install pauses them for 180 days. The manual Settings entry is
  always available.

- **Phone notifications (web push)**: students opt in from **Profile → Settings → Phone Alerts**. Once
  Campmatch is installed to the home screen, Phone Alerts are enabled automatically so match, message
  and campus alerts arrive on the phone even when the app is closed. Students can turn them off again at
  any time. Once per day, if there is unread activity, the installed app sends a system reminder to open
  Campmatch and check new matches or messages. Push requires HTTPS (Render provides this automatically)
  and VAPID keys are auto-generated and persisted on the disk; optionally set `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` in Render to pin them.

- **WhatsApp support**: set the support number in **Admin → Platform Settings → WhatsApp Support Phone**
  (international format, e.g. `233241234567`). The floating WhatsApp button and the assistant's
  "chat with a person" option open `https://wa.me/<phone>`. If blank, the WhatsApp buttons are hidden
  so students are never routed to a placeholder number.

Requirements on Render: serve the site over HTTPS (Render provides this automatically) and keep the
persistent disk configured. `manifest.webmanifest` is served as `application/manifest+json`, and
`sw.js` / `index.html` are sent with `Cache-Control: no-cache` by `backend/app/main.py`, so deployments
revalidate the shell and install prompts see the current version. No extra environment variables are
needed.

To verify after a deploy, open Chrome DevTools → **Application → Manifest** (name, start URL and both
icons must load) and **Application → Service Workers** (worker activated). On a phone, confirm the app
opens without browser chrome and still launches when offline. If a device keeps an older worker, use
**Application → Storage → Clear site data** once and reopen the site.

