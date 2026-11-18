# Administrator Guide

## Provisioning an Administrator Account

Set the following environment variables before starting the backend (locally or in Render Environment Settings):

```env
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@st.umat.edu.gh
ADMIN_PASSWORD=your-strong-password-here
SECRET_KEY=replace-with-random-secret
```

Open **`https://your-domain/admin`** to sign in. The admin portal is intentionally not linked anywhere in the student app, so it cannot be discovered by browsing. `ADMIN_USERNAME` or `ADMIN_EMAIL` can be used as the login identifier. On startup `bootstrap_defaults()` provisions or promotes this administrator account.

## Admin Console Sections

1. **Overview**
   - Monitor total active students, real-time online WebSocket connections, completed profiles, Plus subscribers, 24-hour and all-time swipes/matches/messages, total GHS revenue, open reports, blocked uploads, and 7-day trends.

2. **Controls & Limits**
   - **Enable Campmatch Plus**: Turning this ON immediately enforces the daily swipe cap (default **10 swipes/day**) and Beeline blur on free accounts across all connected clients via WebSocket broadcast.
   - **Free Daily Swipe Cap**: Adjust how many swipes free users receive per 24 hours when Plus is active.
   - **Plus Price & Duration**: Set the GHS price and membership duration in days used by Moolre Mobile Money and hosted checkout.
   - **Super Like Allowances**: Configure daily Super Likes for free vs. Plus tiers.
   - **University Scope & Domains**: Switch between UMaT-only (`@st.umat.edu.gh`) and multi-university mode, or add new `.edu.gh` domains directly in the comma-separated list.
   - **Registration & Maintenance Gates**: Pause new signups or enable Maintenance Mode (administrators can still sign in during maintenance).
   - **Announcement Banner**: Publish or clear a live campus-wide banner shown at the top of the app.

3. **Users & User Dossier**
   - Filter by `All Active`, `Plus Members`, `Suspended`, `Incomplete`, or `Admins`, and search by name, email, or programme.
   - Click **Inspect** on any student to view activity totals, remove inappropriate profile photos individually, grant 30-day Plus or 30-minute Spotlight boosts, promote/demote administrators, force-logout active sessions, suspend, or move the account to the Deleted Vault.

4. **Reports & Safety**
   - Review open user reports, click **View Chat Context** to inspect preserved match messages between the reporter and reported user, and Resolve, Dismiss, or Suspend the reported user in one click.

5. **Image Guard**
   - Audit every photo upload check, filter to rejected uploads (`blank_white`, `blank_black`, `blank_solid`, `too_blurry`, `no_human`, `explicit_nsfw`), and view the recorded computer-vision metrics.

6. **Revenue & Moolre Gateway**
   - Track Moolre payment references and statuses, or manually approve a verified transaction.
   - Open **Payment Gateway** to save or rotate `X-API-USER`, public key, account number, and wallet secret; switch live/sandbox; copy the webhook and redirect URLs; and run a connectivity test.

7. **Explore Rooms**
   - Add, rename, recolor, hide/show, reorder, and delete Explore rooms without a redeploy. Rooms with opted-in students are archived rather than erased on delete.

8. **Notifications**
   - Compose a text update and/or upload a flyer image, choose the audience (everyone, free, Plus, new students), optionally target a school or one student, and set an expiry. Delivery is live over WebSocket.

9. **Storage & Backups**
   - Confirm the persistent disk is active, create a fresh SQLite backup, download any rolling backup, and export a JSON archive of core records.

10. **Deleted Vault & Audit Trail**
    - Inspect preserved records of users who deleted their accounts (including deletion timestamp and reason) and restore accounts when needed.
    - Review chronological logs of all administrative actions.
