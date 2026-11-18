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

