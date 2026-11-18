import os
import uuid
import hmac
import hashlib
from datetime import datetime, timedelta
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import User, Payment
from ..security import get_bool_setting, get_float_setting, get_int_setting
from ..realtime import hub
from .profiles import get_current_user

router = APIRouter()
PAYSTACK_SECRET = os.environ.get("PAYSTACK_SECRET_KEY", "").strip()


class InitiateIn(BaseModel):
    description: str = "Campmatch Plus"
    provider: str = "paystack"


async def _grant_plus_for_payment(payment: Payment, db: Session):
    if payment.status == "success":
        return
    days = get_int_setting(db, "plus_duration_days", 30)
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


@router.post("/initiate")
async def initiate(data: InitiateIn, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not get_bool_setting(db, "plus_enabled", False):
        raise HTTPException(400, "Plus subscriptions are not currently enabled.")
    if not PAYSTACK_SECRET:
        raise HTTPException(500, "Payment gateway is not configured yet.")

    price_ghs = get_float_setting(db, "plus_price_ghs", 25.0)
    amount_pesewas = int(round(price_ghs * 100))
    ref = f"cm_{uuid.uuid4().hex[:14]}"

    origin = str(request.base_url).rstrip("/")
    callback_url = os.environ.get("PAYSTACK_CALLBACK_URL", f"{origin}/api/payments/callback")

    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(
            "https://api.paystack.co/transaction/initialize",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET}", "Content-Type": "application/json"},
            json={
                "email": user.original_email or user.email,
                "amount": amount_pesewas,
                "reference": ref,
                "currency": "GHS",
                "callback_url": callback_url,
            },
        )
    if r.status_code != 200:
        raise HTTPException(502, "Unable to initialize payment with provider.")

    data_r = r.json().get("data") or {}
    p = Payment(
        user_id=user.id,
        amount=price_ghs,
        currency="GHS",
        provider="paystack",
        reference=ref,
        status="pending",
        description=data.description[:200],
    )
    db.add(p)
    db.commit()
    return {
        "reference": ref,
        "amount": price_ghs,
        "authorization_url": data_r.get("authorization_url"),
        "access_code": data_r.get("access_code"),
    }


@router.get("/callback")
async def paystack_callback(reference: str = "", trxref: str = "", db: Session = Depends(get_db)):
    ref = reference or trxref
    if ref and PAYSTACK_SECRET:
        p = db.query(Payment).filter(Payment.reference == ref).first()
        if p and p.status != "success":
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    r = await client.get(
                        f"https://api.paystack.co/transaction/verify/{ref}",
                        headers={"Authorization": f"Bearer {PAYSTACK_SECRET}"},
                    )
                if r.status_code == 200:
                    vdata = (r.json() or {}).get("data") or {}
                    if vdata.get("status") == "success" and vdata.get("amount", 0) >= int(round(p.amount * 100)):
                        await _grant_plus_for_payment(p, db)
            except Exception:
                pass
    return RedirectResponse(url=f"/?payment_ref={ref}")


@router.post("/webhook")
async def webhook(request: Request, db: Session = Depends(get_db)):
    raw_body = await request.body()
    if PAYSTACK_SECRET:
        sig = request.headers.get("x-paystack-signature", "")
        expected = hmac.new(PAYSTACK_SECRET.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()
        if not sig or not hmac.compare_digest(sig, expected):
            raise HTTPException(401, "Invalid webhook signature.")

    body = await request.json()
    if body.get("event") != "charge.success":
        return {"ok": True}

    data = body.get("data") or {}
    ref = data.get("reference")
    if not ref:
        return {"ok": True}

    p = db.query(Payment).filter(Payment.reference == ref).first()
    if not p or p.status == "success":
        return {"ok": True}

    if data.get("status") == "success" and data.get("amount", 0) >= int(round(p.amount * 100)):
        await _grant_plus_for_payment(p, db)
    return {"ok": True}


@router.get("/verify/{reference}")
async def verify(reference: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.reference == reference, Payment.user_id == user.id).first()
    if not p:
        raise HTTPException(404, "Payment record not found.")

    if p.status == "pending" and PAYSTACK_SECRET:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.get(
                    f"https://api.paystack.co/transaction/verify/{reference}",
                    headers={"Authorization": f"Bearer {PAYSTACK_SECRET}"},
                )
            if r.status_code == 200:
                vdata = (r.json() or {}).get("data") or {}
                if vdata.get("status") == "success" and vdata.get("amount", 0) >= int(round(p.amount * 100)):
                    await _grant_plus_for_payment(p, db)
                    db.refresh(user)
        except Exception:
            pass

    return {"ok": True, "status": p.status, "is_premium": bool(user.is_premium)}
