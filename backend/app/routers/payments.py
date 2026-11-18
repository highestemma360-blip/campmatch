import os
import uuid
import hmac
import time
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from ..database import get_db
from ..models import User, Payment, WebhookEvent
from ..security import get_bool_setting, get_float_setting, get_int_setting, get_setting, resolve_plus_plan
from ..realtime import hub
from .profiles import get_current_user

router = APIRouter()

VALID_MOMO_CHANNELS = {"MTN", "TELECEL", "AT"}
PENDING_CODES = {"TP11", "TP18", "PY01", "PY02", "TR01", "TR02", "APY10", "APY16", "ASL06", "SYS500"}


def _setting_or_env(db: Session, key: str, env_name: str, default: str = "") -> str:
    value = (get_setting(db, key, "") or "").strip()
    if value:
        return value
    return os.environ.get(env_name, default).strip()


def moolre_config(db: Session) -> dict:
    """Resolve Moolre credentials from the admin console, falling back to env vars."""
    env = _setting_or_env(db, "moolre_env", "MOOLRE_ENV", "live").lower()
    base_url = _setting_or_env(db, "moolre_base_url", "MOOLRE_BASE_URL", "")
    if not base_url:
        base_url = "https://sandbox.moolre.com" if env == "sandbox" else "https://api.moolre.com"
    base_url = base_url.rstrip("/")
    if not base_url.startswith("http"):
        base_url = "https://" + base_url

    user = _setting_or_env(db, "moolre_user", "MOOLRE_USER", "")
    pubkey = _setting_or_env(db, "moolre_pubkey", "MOOLRE_PUBKEY", "")
    account = _setting_or_env(db, "moolre_account_number", "MOOLRE_ACCOUNT_NUMBER", "")
    secret = _setting_or_env(db, "moolre_wallet_secret", "MOOLRE_WALLET_SECRET", "")
    merchant_email = _setting_or_env(db, "moolre_merchant_email", "MOOLRE_MERCHANT_EMAIL", "")
    callback = _setting_or_env(db, "moolre_callback_url", "MOOLRE_CALLBACK_URL", "")

    configured = bool(user and pubkey and account)
    enabled = configured and get_bool_setting(db, "moolre_enabled", True)

    return {
        "env": env,
        "base_url": base_url,
        "user": user,
        "pubkey": pubkey,
        "account_number": account,
        "wallet_secret": secret,
        "merchant_email": merchant_email,
        "callback_url": callback,
        "configured": configured,
        "enabled": enabled,
    }


def _require_moolre_configured(db: Session) -> dict:
    cfg = moolre_config(db)
    if not cfg["configured"]:
        raise HTTPException(
            503,
            "Card and Mobile Money payments are not configured yet. An administrator can add Moolre API credentials in the admin console.",
        )
    return cfg


def _moolre_headers(cfg: dict, idempotency_key: Optional[str] = None) -> dict:
    headers = {
        "Content-Type": "application/json",
        "X-API-USER": cfg["user"],
        "X-API-PUBKEY": cfg["pubkey"],
    }
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key[:128]
    return headers


def _normalize_ghana_phone(raw: str) -> str:
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    if digits.startswith("233") and len(digits) == 12:
        digits = "0" + digits[3:]
    if len(digits) == 9 and not digits.startswith("0"):
        digits = "0" + digits
    if len(digits) != 10 or not digits.startswith("0"):
        raise HTTPException(400, "Enter a valid 10-digit Ghana Mobile Money number (e.g. 0241234567).")
    return digits


async def _grant_plus_for_payment(payment: Payment, db: Session):
    if payment.status == "success":
        return
    days = payment.duration_days or get_int_setting(db, "plus_duration_days", 30)
    payment.status = "success"
    payment.completed_at = datetime.utcnow()

    user = db.query(User).filter(User.id == payment.user_id).first()
    if user:
        base_until = max(datetime.utcnow(), user.premium_until or datetime.utcnow())
        user.is_premium = True
        user.premium_until = base_until + timedelta(days=days)
    db.commit()

    if user:
        await hub.send_to_user(
            user.id,
            {
                "type": "plus_activated",
                "is_premium": True,
                "premium_until": user.premium_until.isoformat() if user.premium_until else None,
            },
        )


async def _check_moolre_payment_status(cfg: dict, externalref: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{cfg['base_url']}/open/transact/status",
            headers=_moolre_headers(cfg),
            json={
                "type": 1,
                "idtype": 1,
                "id": externalref,
                "accountnumber": cfg["account_number"],
            },
        )
    if r.status_code >= 500:
        return {"txstatus": 0, "reason": "Gateway check pending"}
    body = r.json() if r.content else {}
    data = body.get("data") if isinstance(body.get("data"), dict) else body
    txstatus = data.get("txstatus")
    raw_amount = str(data.get("amount") or "")
    amount_val = 0.0
    try:
        amount_val = float(raw_amount) if raw_amount else 0.0
    except ValueError:
        amount_val = 0.0
    return {
        "txstatus": int(txstatus) if txstatus in (0, 1, 2, "0", "1", "2") else 0,
        "code": str(body.get("code") or ""),
        "amount": amount_val,
        "reason": str(data.get("reason") or body.get("message") or ""),
    }


@router.get("/config")
def payment_config(db: Session = Depends(get_db)):
    cfg = moolre_config(db)
    plus_enabled = get_bool_setting(db, "plus_enabled", False)
    discount_enabled = get_bool_setting(db, "plus_discount_enabled", False)
    discount_percent = get_float_setting(db, "plus_discount_percent", 0.0)
    plans = get_plus_plans(db)
    return {
        "provider": "moolre",
        "plus_enabled": plus_enabled,
        "enabled": cfg["enabled"],
        "configured": cfg["configured"],
        "environment": cfg["env"],
        "channels": sorted(VALID_MOMO_CHANNELS),
        "price_ghs": plans[0]["price"],
        "duration_days": plans[0]["duration_days"],
        "discount_enabled": discount_enabled,
        "discount_percent": discount_percent,
        "plans": [
            {"id": p["id"], "label": p["label"], "duration_days": p["duration_days"], "price": p["price"]}
            for p in plans
        ],
    }


class InitiateLinkIn(BaseModel):
    description: str = "Campmatch Plus"
    plan: str = "1m"


class MoolreMomoCollectIn(BaseModel):
    channel: str = "MTN"
    payer: str
    otpcode: Optional[str] = None
    reference: Optional[str] = None
    description: str = "Campmatch Plus"
    plan: str = "1m"


@router.post("/moolre/collect")
async def moolre_collect_momo(
    data: MoolreMomoCollectIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Moolre Mobile Money collection with the one-time SMS code handshake."""
    if not get_bool_setting(db, "plus_enabled", False):
        raise HTTPException(400, "Plus subscriptions are not currently enabled.")
    cfg = _require_moolre_configured(db)
    if not cfg["enabled"]:
        raise HTTPException(400, "Mobile Money payments are temporarily switched off.")

    channel = (data.channel or "MTN").strip().upper()
    if channel not in VALID_MOMO_CHANNELS:
        raise HTTPException(400, "Select MTN, Telecel, or AT.")
    payer = _normalize_ghana_phone(data.payer)
    plan = resolve_plus_plan(db, data.plan)
    price_ghs = plan["price"]
    duration_days = plan["duration_days"]

    if data.reference:
        payment = db.query(Payment).filter(
            Payment.reference == data.reference,
            Payment.user_id == user.id,
        ).first()
        if not payment:
            raise HTTPException(404, "Payment attempt not found.")
        ext_ref = payment.reference
        price_ghs = payment.amount
        duration_days = payment.duration_days or duration_days
    else:
        ext_ref = f"CM-{user.id}-{uuid.uuid4().hex[:10].upper()}"
        payment = Payment(
            user_id=user.id,
            amount=price_ghs,
            currency="GHS",
            provider=f"moolre_{channel.lower()}",
            reference=ext_ref,
            status="pending",
            description=data.description[:200],
            duration_days=duration_days,
        )
        db.add(payment)
        db.commit()

    amount_str = f"{price_ghs:.2f}"

    base_payload = {
        "type": 1,
        "channel": channel,
        "currency": "GHS",
        "payer": payer,
        "amount": amount_str,
        "externalref": ext_ref,
        "reference": "Campmatch Plus",
        "accountnumber": cfg["account_number"],
    }

    async with httpx.AsyncClient(timeout=25.0) as client:
        if data.otpcode and data.otpcode.strip():
            otp_payload = {**base_payload, "otpcode": data.otpcode.strip()}
            r_otp = await client.post(
                f"{cfg['base_url']}/open/transact/payment",
                headers=_moolre_headers(cfg),
                json=otp_payload,
            )
            body_otp = r_otp.json() if r_otp.content else {}
            code_otp = str(body_otp.get("code") or "")
            if code_otp != "TP17" and str(body_otp.get("status")) != "1":
                raise HTTPException(400, body_otp.get("message") or "Invalid or expired verification code.")

            r_prompt = await client.post(
                f"{cfg['base_url']}/open/transact/payment",
                headers=_moolre_headers(cfg, idempotency_key=ext_ref),
                json=base_payload,
            )
            body = r_prompt.json() if r_prompt.content else {}
        else:
            r_init = await client.post(
                f"{cfg['base_url']}/open/transact/payment",
                headers=_moolre_headers(cfg),
                json=base_payload,
            )
            body = r_init.json() if r_init.content else {}

    code = str(body.get("code") or "")
    status_val = str(body.get("status") or "")

    if code == "TP14":
        return {
            "step": "otp_required",
            "reference": ext_ref,
            "amount": price_ghs,
            "message": body.get("message") or "Enter the SMS verification code sent to your phone.",
        }

    if code in ("TR099", "TR08", "OM03") or status_val == "1" or code in PENDING_CODES:
        return {
            "step": "prompt_sent",
            "reference": ext_ref,
            "amount": price_ghs,
            "message": "Approve the Mobile Money prompt on your phone to unlock Campmatch Plus.",
        }

    payment.status = "failed"
    db.commit()
    raise HTTPException(400, body.get("message") or "Unable to initiate Mobile Money collection.")


@router.post("/initiate")
async def initiate_payment_link(
    data: InitiateLinkIn,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a Moolre hosted Web POS payment link."""
    if not get_bool_setting(db, "plus_enabled", False):
        raise HTTPException(400, "Plus subscriptions are not currently enabled.")
    cfg = _require_moolre_configured(db)
    if not cfg["enabled"]:
        raise HTTPException(400, "Online payments are temporarily switched off.")

    plan = resolve_plus_plan(db, data.plan)
    price_ghs = plan["price"]
    duration_days = plan["duration_days"]
    ext_ref = f"CML-{user.id}-{uuid.uuid4().hex[:10].upper()}"
    origin = os.environ.get("PUBLIC_BASE_URL", str(request.base_url).rstrip("/"))

    redirect_url = f"{origin}/api/payments/callback?reference={ext_ref}"
    callback_url = cfg["callback_url"] or f"{origin}/api/payments/webhook"
    merchant_email = cfg["merchant_email"] or os.environ.get("ADMIN_EMAIL") or (user.original_email or user.email)

    payload = {
        "type": 1,
        "amount": f"{price_ghs:.2f}",
        "email": merchant_email,
        "externalref": ext_ref,
        "currency": "GHS",
        "accountnumber": cfg["account_number"],
        "reusable": "0",
        "expiration_time": 60,
        "redirect": redirect_url,
        "callback": callback_url,
        "metadata": {"user_id": str(user.id), "plan": "Campmatch Plus"},
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(
            f"{cfg['base_url']}/embed/link",
            headers=_moolre_headers(cfg),
            json=payload,
        )

    body = r.json() if r.content else {}
    resp_data = body.get("data") if isinstance(body.get("data"), dict) else body
    auth_url = resp_data.get("authorization_url") or body.get("authorization_url")

    if not auth_url:
        raise HTTPException(502, body.get("message") or "Unable to generate Moolre payment link.")

    p = Payment(
        user_id=user.id,
        amount=price_ghs,
        currency="GHS",
        provider="moolre_pos",
        reference=ext_ref,
        status="pending",
        description=data.description[:200],
        duration_days=duration_days,
    )
    db.add(p)
    db.commit()

    return {
        "reference": ext_ref,
        "amount": price_ghs,
        "authorization_url": auth_url,
    }


@router.get("/callback")
async def moolre_redirect_callback(reference: str = "", ref: str = "", db: Session = Depends(get_db)):
    ext_ref = reference or ref
    cfg = moolre_config(db)
    if ext_ref and cfg["configured"]:
        p = db.query(Payment).filter(Payment.reference == ext_ref).first()
        if p and p.status == "pending":
            try:
                st = await _check_moolre_payment_status(cfg, ext_ref)
                if st["txstatus"] == 1 and (st["amount"] <= 0 or st["amount"] + 0.01 >= p.amount):
                    await _grant_plus_for_payment(p, db)
                elif st["txstatus"] == 2:
                    p.status = "failed"
                    db.commit()
            except Exception:
                pass
    return RedirectResponse(url=f"/?payment_ref={ext_ref}")


def _verify_moolre_signature(raw_body: bytes, sig_header: str, secret: str) -> bool:
    if not sig_header or not secret:
        return False
    parts = dict(p.strip().split("=", 1) for p in sig_header.split(",") if "=" in p)
    t = parts.get("t", "")
    v1 = parts.get("v1", "")
    if not t.isdigit() or not v1:
        return False
    if abs(time.time() - int(t)) > 300:
        return False
    signed_payload = t.encode("utf-8") + b"." + raw_body
    expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)


@router.post("/webhook")
@router.post("/moolre/webhook")
async def moolre_webhook(request: Request, db: Session = Depends(get_db)):
    """Moolre webhook with signature verification and event de-duplication."""
    raw_body = await request.body()
    sig_header = request.headers.get("X-Moolre-Signature", "")
    cfg = moolre_config(db)

    if cfg["wallet_secret"]:
        if not _verify_moolre_signature(raw_body, sig_header, cfg["wallet_secret"]):
            raise HTTPException(400, "Invalid Moolre webhook signature.")

    try:
        event_payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(400, "Malformed JSON body.")

    event_name = str(event_payload.get("event") or request.headers.get("X-Moolre-Event") or "")
    event_id = str(event_payload.get("event_id") or request.headers.get("X-Moolre-Event-Id") or "")

    if event_name == "webhook.test":
        return {"ok": True}

    if event_id:
        try:
            db.add(WebhookEvent(event_id=event_id[:120], event_type=event_name[:60]))
            db.commit()
        except IntegrityError:
            db.rollback()
            return {"ok": True}

    data = event_payload.get("data") if isinstance(event_payload.get("data"), dict) else {}
    ext_ref = str(data.get("externalref") or "")
    if not ext_ref:
        return {"ok": True}

    payment = db.query(Payment).filter(Payment.reference == ext_ref).first()
    if not payment or payment.status == "success":
        return {"ok": True}

    txstatus = data.get("txstatus")
    code = str(event_payload.get("code") or "")

    if event_name == "payment.succeeded" or code == "P01" or txstatus in (1, "1"):
        try:
            paid_amt = float(data.get("amount") or payment.amount)
        except (TypeError, ValueError):
            paid_amt = payment.amount
        if paid_amt + 0.01 >= payment.amount:
            await _grant_plus_for_payment(payment, db)
    elif event_name in ("payment.failed", "payment_link.expired") or code == "P02" or txstatus in (2, "2"):
        if payment.status == "pending":
            payment.status = "failed"
            db.commit()

    return {"ok": True}


@router.get("/verify/{reference}")
async def verify_payment(reference: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.reference == reference, Payment.user_id == user.id).first()
    if not p:
        raise HTTPException(404, "Payment record not found.")

    failure_reason = ""
    cfg = moolre_config(db)
    if p.status == "pending" and cfg["configured"]:
        try:
            st = await _check_moolre_payment_status(cfg, reference)
            if st["txstatus"] == 1 and (st["amount"] <= 0 or st["amount"] + 0.01 >= p.amount):
                await _grant_plus_for_payment(p, db)
                db.refresh(user)
            elif st["txstatus"] == 2:
                p.status = "failed"
                failure_reason = st.get("reason") or "Transaction was declined or cancelled."
                db.commit()
        except Exception:
            pass

    return {
        "ok": True,
        "status": p.status,
        "reason": failure_reason,
        "is_premium": bool(user.is_premium),
    }
