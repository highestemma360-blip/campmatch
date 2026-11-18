# Administrator Guide

## Provisioning an Administrator Account

Set the following environment variables before starting the backend (locally or in Render Environment Settings):

```env
ADMIN_EMAIL=admin@st.umat.edu.gh
ADMIN_PASSWORD=your-strong-password-here
SECRET_KEY=replace-with-random-secret
```

On startup, `bootstrap_defaults()` automatically creates this administrator account if it does not exist, or promotes an existing account with `ADMIN_EMAIL` to administrator status. Once signed in, an **Admin** tab appears in both the desktop sidebar and mobile navigation bar.

## Admin Console Sections

1. **Overview**
   - Monitor total active students, real-time online WebSocket connections, completed profiles, Plus subscribers, 24-hour and all-time swipes/matches/messages, total GHS revenue, open reports, blocked uploads, and 7-day trends.

2. **Controls & Limits**
   - **Enable Campmatch Plus**: Turning this ON immediately enforces the daily swipe cap (default **10 swipes/day**) and Beeline blur on free accounts across all connected clients via WebSocket broadcast.
   - **Free Daily Swipe Cap**: Adjust how many swipes free users receive per 24 hours when Plus is active.
   - **Plus Price & Duration**: Set the GHS price and membership duration in days used by Paystack checkout.
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

6. **Revenue**
   - Track Paystack payment references and statuses, or manually approve a verified transaction.

7. **Deleted Vault & Audit Trail**
   - Inspect preserved records of users who deleted their accounts (including deletion timestamp and reason) and restore accounts when needed.
   - Review chronological logs of all administrative actions.
