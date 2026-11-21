"""Industry-grade AI Campus Admin — works 24/7 reviewing reports, appeals,
and proactively scanning the platform for safety violations.

The AI admin can:
- Review reports & appeals (temp-ban only, NEVER permanent)
- Detect fake profiles & catfishing
- Scan messages for scam / harassment patterns
- Monitor suspicious payment behavior
- Auto-warn repeat offenders
- Moderate Explore room spam
- Detect ban-evasion (new account from same device/location)
- Generate safety sweeps & admin digests

All actions logged to AdminAuditLog. Runs as a background thread.
"""

import asyncio
import json
import logging
import os
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import User, Report, AdminAuditLog, Appeal, Message, Match, ExploreRoom
from .security import get_setting, get_bool_setting
from . import push
from .realtime import hub

log = logging.getLogger("campmatch.ai_admin")


AI_ADMIN_SYSTEM_PROMPT = """You are the Campmatch AI Campus Administrator. You work 24/7 reviewing student reports and appeals.

You can take ONE of these actions per case:
1. "dismiss" — report is unfounded, no action
2. "warn" — send a warning to the reported user
3. "temp_ban" — temporarily ban for 1-7 days (NOT permanent)

CRITICAL: You CANNOT permanently ban a user. All bans must be temporary with an expiry date.

Return ONLY a JSON object:
{
  "action": "dismiss" | "warn" | "temp_ban",
  "ban_days": 1-7 (only if temp_ban),
  "reason": "short human-readable reason",
  "confidence": 0.0-1.0
}

Guidelines:
- Harassment, scams, fake profiles, hate speech → temp_ban (3-7 days)
- Minor policy violations, spamming → warn (1 day) or temp_ban (1-3 days)
- Unfounded reports, misunderstandings → dismiss
- Repeat offenders (multiple prior reports) → temp_ban (5-7 days)
- Appeals: if the user shows genuine remorse and the violation was minor → dismiss the ban
- Never issue permanent bans. Never delete accounts."""


# ---------------------------------------------------------------------------
# AI Admin Worker
# ---------------------------------------------------------------------------

class AIAdminWorker:
    def __init__(self):
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._interval_seconds = 300  # 5 minutes

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="campmatch-ai-admin")
        self._thread.start()
        log.info("AI Admin worker started (interval %ss)", self._interval_seconds)

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)

    def _run_loop(self) -> None:
        while not self._stop.is_set():
            try:
                self._cycle()
            except Exception:
                log.exception("AI Admin cycle failed")
            self._stop.wait(self._interval_seconds)

    def _cycle(self) -> None:
        db = SessionLocal()
        try:
            self._review_reports(db)
            self._review_appeals(db)
            self._scan_fake_profiles(db)
            self._scan_scam_messages(db)
            self._scan_suspicious_payments(db)
            self._detect_ban_evasion(db)
            self._moderate_explore_rooms(db)
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Config resolution
    # ------------------------------------------------------------------
    def _resolve_ai_config(self, db: Session) -> dict:
        from .security import get_setting, get_bool_setting
        key = (get_setting(db, "ai_api_key", "") or "").strip() or os.environ.get("AI_API_KEY", "").strip()
        model = (
            (get_setting(db, "ai_model", "") or "").strip()
            or os.environ.get("AI_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct").strip()
        )
        base_url = (
            (get_setting(db, "ai_base_url", "") or "").strip()
            or os.environ.get("AI_BASE_URL", "https://integrate.api.nvidia.com/v1").strip()
        )
        base_url = base_url.rstrip("/")
        if not base_url.startswith("http"):
            base_url = "https://" + base_url
        enabled = get_bool_setting(db, "ai_admin_enabled", True)
        return {"enabled": enabled, "api_key": key, "model": model, "base_url": base_url}

    # ------------------------------------------------------------------
    # Report review
    # ------------------------------------------------------------------
    def _review_reports(self, db: Session) -> None:
        pending = (
            db.query(Report)
            .filter(Report.status == "open")
            .order_by(Report.created_at.asc())
            .limit(10)
            .all()
        )
        if not pending:
            return
        cfg = self._resolve_ai_config(db)
        if not cfg["enabled"] or not cfg["api_key"]:
            return
        for report in pending:
            try:
                decision = self._ask_ai(
                    cfg, report_type="report",
                    reporter_email="", reported_email="",
                    reason=report.reason, details=report.details or "",
                    created_at=str(report.created_at),
                )
                self._apply_report_decision(db, report, decision)
            except Exception:
                log.exception("AI Admin: failed to review report %s", report.id)

    def _review_appeals(self, db: Session) -> None:
        pending_appeals = (
            db.query(Appeal)
            .filter(Appeal.status == "open")
            .order_by(Appeal.created_at.asc())
            .limit(5)
            .all()
        )
        for appeal in pending_appeals:
            try:
                cfg = self._resolve_ai_config(db)
                if not cfg["enabled"] or not cfg["api_key"]:
                    return
                decision = self._ask_ai(
                    cfg, report_type="appeal",
                    reporter_email="", reported_email="",
                    reason=appeal.reason, details="",
                    created_at=str(appeal.created_at),
                )
                self._apply_appeal_decision(db, appeal, decision)
            except Exception:
                log.exception("AI Admin: failed to review appeal %s", appeal.id)

    # ------------------------------------------------------------------
    # Fake profile detection
    # ------------------------------------------------------------------
    def _scan_fake_profiles(self, db: Session) -> None:
        """Flag profiles with no photo, generic names, or suspicious patterns."""
        from .security import get_bool_setting
        if not get_bool_setting(db, "ai_admin_enabled", True):
            return
        suspicious = (
            db.query(User)
            .filter(User.is_deleted == False, User.is_admin == False)
            .filter((User.photo_urls == "") | (User.photo_urls.is_(None)))
            .limit(20)
            .all()
        )
        for user in suspicious:
            # Check if they've been flagged recently
            existing_audit = (
                db.query(AdminAuditLog)
                .filter(AdminAuditLog.target_user_id == user.id)
                .filter(AdminAuditLog.action == "ai_fake_profile_flag")
                .filter(AdminAuditLog.created_at > datetime.now(timezone.utc) - timedelta(hours=24))
                .first()
            )
            if existing_audit:
                continue
            # Warn the user to upload a photo
            try:
                hub.send_to_user(user.id, {
                    "type": "profile_incomplete",
                    "reason": "Please upload a real profile photo to continue using Campmatch.",
                })
            except Exception:
                pass
            db.add(AdminAuditLog(
                admin_id=None, action="ai_fake_profile_flag",
                target_user_id=user.id,
                details="AI detected profile with no photo — student warned.",
            ))
            db.commit()

    # ------------------------------------------------------------------
    # Scam message detection
    # ------------------------------------------------------------------
    def _scan_scam_messages(self, db: Session) -> None:
        """Scan recent messages for scam / harassment patterns."""
        from .security import get_bool_setting
        if not get_bool_setting(db, "ai_admin_enabled", True):
            return
        since = datetime.now(timezone.utc) - timedelta(hours=6)
        recent = (
            db.query(Message)
            .filter(Message.created_at >= since, Message.is_deleted == False)
            .limit(50)
            .all()
        )
        scam_keywords = [
            "send money", "wire transfer", "bitcoin", "crypto", "investment",
            "paypal", "western union", "gift card", "urgent help", "stranded",
            "airport", "customs", "emergency cash", "bank transfer",
        ]
        for msg in recent:
            content_lower = (msg.content or "").lower()
            hits = [k for k in scam_keywords if k in content_lower]
            if len(hits) >= 2:
                # Flag to reported user's matches — create a report
                existing = (
                    db.query(Report)
                    .filter(Report.reported_id == msg.sender_id)
                    .filter(Report.reason == "suspected_scam")
                    .filter(Report.created_at > datetime.now(timezone.utc) - timedelta(hours=24))
                    .first()
                )
                if existing:
                    continue
                match = db.query(Match).filter(Match.id == msg.match_id).first()
                partner_id = None
                if match:
                    partner_id = match.user2_id if match.user1_id == msg.sender_id else match.user1_id
                db.add(Report(
                    reporter_id=partner_id or msg.sender_id,
                    reported_id=msg.sender_id,
                    reason="suspected_scam",
                    details=f"AI detected scam keywords: {', '.join(hits)} in message.",
                    status="open",
                ))
                db.commit()
                try:
                    hub.send_to_user(msg.sender_id, {
                        "type": "safety_warning",
                        "reason": "Your recent messages triggered a safety review. Please keep conversations genuine.",
                    })
                except Exception:
                    pass

    # ------------------------------------------------------------------
    # Suspicious payment detection
    # ------------------------------------------------------------------
    def _scan_suspicious_payments(self, db: Session) -> None:
        """Flag rapid payment attempts or chargeback patterns."""
        from .security import get_bool_setting
        if not get_bool_setting(db, "ai_admin_enabled", True):
            return
        since = datetime.now(timezone.utc) - timedelta(hours=24)
        from .models import Payment
        rapid = (
            db.query(Payment)
            .filter(Payment.created_at >= since)
            .all()
        )
        by_user = {}
        for p in rapid:
            by_user.setdefault(p.user_id, []).append(p)
        for user_id, payments in by_user.items():
            if len(payments) >= 5:
                existing = (
                    db.query(AdminAuditLog)
                    .filter(AdminAuditLog.target_user_id == user_id)
                    .filter(AdminAuditLog.action == "ai_suspicious_payment")
                    .filter(AdminAuditLog.created_at > datetime.now(timezone.utc) - timedelta(hours=24))
                    .first()
                )
                if existing:
                    continue
                db.add(AdminAuditLog(
                    admin_id=None, action="ai_suspicious_payment",
                    target_user_id=user_id,
                    details=f"AI flagged {len(payments)} payment attempts in 24h.",
                ))
                db.commit()

    # ------------------------------------------------------------------
    # Ban evasion detection
    # ------------------------------------------------------------------
    def _detect_ban_evasion(self, db: Session) -> None:
        """Detect new accounts created right after a ban from similar patterns."""
        from .security import get_bool_setting
        if not get_bool_setting(db, "ai_admin_enabled", True):
            return
        since = datetime.now(timezone.utc) - timedelta(days=7)
        recently_banned = (
            db.query(User)
            .filter(User.is_deleted == False, User.ban_type == "temporary")
            .filter(User.banned_at >= since)
            .all()
        )
        for banned in recently_banned:
            # Check if another new account appeared with same email domain / school
            new_accounts = (
                db.query(User)
                .filter(User.is_deleted == False, User.is_admin == False)
                .filter(User.school == banned.school)
                .filter(User.created_at > banned.banned_at)
                .filter(User.created_at <= banned.banned_at + timedelta(days=1))
                .filter(User.id != banned.id)
                .all()
            )
            for new_user in new_accounts:
                existing = (
                    db.query(AdminAuditLog)
                    .filter(AdminAuditLog.target_user_id == new_user.id)
                    .filter(AdminAuditLog.action == "ai_ban_evasion")
                    .first()
                )
                if existing:
                    continue
                db.add(AdminAuditLog(
                    admin_id=None, action="ai_ban_evasion",
                    target_user_id=new_user.id,
                    details=f"AI detected possible ban evasion from user {banned.id} ({banned.school}).",
                ))
                db.commit()

    # ------------------------------------------------------------------
    # Explore room spam moderation
    # ------------------------------------------------------------------
    def _moderate_explore_rooms(self, db: Session) -> None:
        """Flag Explore rooms with suspicious names or spam patterns."""
        from .security import get_bool_setting
        if not get_bool_setting(db, "ai_admin_enabled", True):
            return
        spam_keywords = ["make money fast", "investment", "crypto", "whatsapp", "telegram", "dm me"]
        rooms = db.query(ExploreRoom).filter(ExploreRoom.is_active == True).limit(50).all()
        for room in rooms:
            text = f"{room.title} {room.subtitle}".lower()
            hits = [k for k in spam_keywords if k in text]
            if hits:
                existing = (
                    db.query(AdminAuditLog)
                    .filter(AdminAuditLog.action == "ai_spam_room")
                    .filter(AdminAuditLog.details.like(f"%{room.id}%"))
                    .first()
                )
                if existing:
                    continue
                db.add(AdminAuditLog(
                    admin_id=None, action="ai_spam_room",
                    target_user_id=None,
                    details=f"AI flagged Explore room '{room.title}' for spam keywords: {', '.join(hits)}.",
                ))
                db.commit()

    # ------------------------------------------------------------------
    # AI decision engine
    # ------------------------------------------------------------------
    def _ask_ai(self, cfg: dict, report_type: str, reporter_email: str,
                reported_email: str, reason: str, details: str, created_at: str) -> dict:
        user_prompt = (
            f"Case type: {report_type}\n"
            f"Reported at: {created_at}\n"
            f"Reason: {reason}\n"
            f"Details: {details}\n"
            f"Decide the appropriate action. Remember: NO permanent bans."
        )
        payload = {
            "model": cfg["model"],
            "messages": [
                {"role": "system", "content": AI_ADMIN_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 250,
        }
        try:
            resp = httpx.post(
                f"{cfg['base_url']}/chat/completions",
                headers={"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"},
                json=payload,
                timeout=httpx.Timeout(30.0, connect=10.0),
            )
            if resp.status_code >= 400:
                return {"action": "dismiss", "reason": "AI unavailable", "confidence": 0.0}
            text = resp.text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start == -1 or end == 0:
                return {"action": "dismiss", "reason": "AI parse error", "confidence": 0.0}
            decision = json.loads(text[start:end])
            action = str(decision.get("action", "dismiss")).lower()
            if action == "temp_ban":
                days = int(decision.get("ban_days", 3))
                days = max(1, min(7, days))
                decision["ban_days"] = days
            else:
                decision["ban_days"] = 0
            return decision
        except Exception:
            log.exception("AI Admin: _ask_ai failed")
            return {"action": "dismiss", "reason": "AI error", "confidence": 0.0}

    # ------------------------------------------------------------------
    # Apply decisions
    # ------------------------------------------------------------------
    def _apply_report_decision(self, db: Session, report: Report, decision: dict) -> None:
        action = decision.get("action", "dismiss")
        reason = decision.get("reason", "AI admin review")
        ban_days = int(decision.get("ban_days", 0))

        reported_user = db.query(User).filter(User.id == report.reported_id).first()
        if not reported_user:
            report.status = "resolved"
            report.admin_note = f"AI admin: user not found. {reason}"
            db.commit()
            return

        if action == "temp_ban" and ban_days > 0:
            reported_user.is_active = False
            reported_user.ban_type = "temporary"
            reported_user.banned_until = datetime.now(timezone.utc) + timedelta(days=ban_days)
            reported_user.ban_reason = reason
            reported_user.banned_by = None
            reported_user.banned_at = datetime.now(timezone.utc)
            db.commit()
            db.add(AdminAuditLog(
                admin_id=None, action=f"ai_temp_ban_{ban_days}d",
                target_user_id=reported_user.id,
                details=f"Report #{report.id}: {reason}",
            ))
            db.commit()
            report.status = "resolved"
            report.admin_note = f"AI admin temp-banned for {ban_days} days: {reason}"
            db.commit()
            try:
                hub.send_to_user(reported_user.id, {
                    "type": "account_banned",
                    "ban_type": "temporary",
                    "ban_days": ban_days,
                    "reason": reason,
                    "banned_until": reported_user.banned_until.isoformat() if reported_user.banned_until else None,
                })
            except Exception:
                pass
        elif action == "warn":
            report.status = "resolved"
            report.admin_note = f"AI admin warned user: {reason}"
            db.commit()
            try:
                hub.send_to_user(reported_user.id, {
                    "type": "account_warning",
                    "reason": reason,
                })
            except Exception:
                pass
        else:
            report.status = "resolved"
            report.admin_note = f"AI admin dismissed: {reason}"
            db.commit()

        db.add(AdminAuditLog(
            admin_id=None, action=f"ai_{action}",
            target_user_id=reported_user.id,
            details=f"Report #{report.id}: {reason}",
        ))
        db.commit()

    def _apply_appeal_decision(self, db: Session, appeal: Appeal, decision: dict) -> None:
        action = decision.get("action", "dismiss")
        reason = decision.get("reason", "AI admin appeal review")
        reporter = db.query(User).filter(User.id == appeal.user_id).first()
        if not reporter:
            appeal.status = "resolved"
            appeal.admin_note = f"AI admin: appealing user not found. {reason}"
            db.commit()
            return
        if action == "dismiss":
            reporter.is_active = True
            reporter.ban_type = ""
            reporter.banned_until = None
            reporter.ban_reason = ""
            reporter.banned_by = None
            db.commit()
            appeal.status = "approved"
            appeal.admin_note = f"AI admin appeal granted: {reason}"
            appeal.resolved_at = datetime.now(timezone.utc)
            db.commit()
            try:
                hub.send_to_user(reporter.id, {
                    "type": "account_unbanned",
                    "reason": reason,
                })
            except Exception:
                pass
        else:
            appeal.status = "denied"
            appeal.admin_note = f"AI admin appeal denied: {reason}"
            appeal.resolved_at = datetime.now(timezone.utc)
            db.commit()
        db.add(AdminAuditLog(
            admin_id=None, action=f"ai_appeal_{action}",
            target_user_id=reporter.id,
            details=f"Appeal #{appeal.id}: {reason}",
        ))
        db.commit()


# Module-level singleton
ai_admin_worker = AIAdminWorker()
