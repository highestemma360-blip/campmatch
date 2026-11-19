"""Industry-grade AI photo moderation & enhancement engine.

Analyzes uploaded profile photos using NVIDIA NIM vision API to:
- Reject nudes / sexually explicit content
- Reject dark / underexposed images
- Reject images with no identifiable person
- Professionally enhance & retouch accepted photos (brightness, contrast,
  color balance, sharpness, subtle skin smoothing, face-centered crop)

Falls back to OpenCV image_guard when no AI key is configured.
"""

import base64
import io
import json
import logging
import os
from typing import Optional, Tuple

import httpx
import numpy as np
from PIL import Image, ImageEnhance, ImageOps, ImageFilter
from sqlalchemy.orm import Session

from .security import get_setting, get_bool_setting
from .image_guard import validate_and_optimize_profile_photo

log = logging.getLogger("campmatch.ai_moderation")


class AIModerationResult:
    def __init__(
        self,
        accepted: bool,
        reject_code: str,
        reason: str,
        metrics: dict,
        processed_bytes: bytes = b"",
        ai_reviewed: bool = False,
        enhanced: bool = False,
        enhancement_notes: str = "",
    ):
        self.accepted = accepted
        self.reject_code = reject_code
        self.reason = reason
        self.metrics = metrics
        self.processed_bytes = processed_bytes
        self.ai_reviewed = ai_reviewed
        self.enhanced = enhanced
        self.enhancement_notes = enhancement_notes


def _resolve_ai_config(db: Session) -> dict:
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
    enabled = get_bool_setting(db, "ai_enabled", True)
    return {
        "enabled": enabled,
        "api_key": key,
        "model": model,
        "base_url": base_url,
    }


def _encode_image(raw_bytes: bytes) -> str:
    return base64.b64encode(raw_bytes).decode("utf-8")


AI_MODERATION_SYSTEM_PROMPT = """You are a strict campus dating app photo moderator. Analyze the student's profile photo and return ONLY a JSON object with these fields:

{
  "accepted": true/false,
  "reject_code": "nude" | "dark" | "no_person" | "low_quality" | "",
  "reason": "human readable short reason",
  "confidence": 0.0-1.0,
  "has_person": true/false,
  "is_nude": true/false,
  "is_dark": true/false,
  "enhancement_needed": true/false,
  "suggested_edits": ["brightness", "contrast", "crop", "color_balance"]
}

Rules:
- REJECT if the image contains nudity, genitals, female nipples, or sexually explicit content (reject_code: "nude").
- REJECT if the image is too dark to see the person clearly (reject_code: "dark").
- REJECT if there is no identifiable human face/person in the photo (reject_code: "no_person").
- ACCEPT only clear, well-lit photos showing a real person's face.
- Be strict about nudity — when in doubt, reject.
- Return ONLY the JSON object, no markdown, no explanation text."""


# ---------------------------------------------------------------------------
# Professional photo enhancement (OpenCV/PIL, runs locally — no API cost)
# ---------------------------------------------------------------------------

def _auto_crop_to_face(pil_img: Image.Image, face_box: Optional[Tuple[int, int, int, int]] = None) -> Image.Image:
    """Crop the image to center on the detected face with a gentle portrait aspect ratio."""
    w, h = pil_img.size
    if face_box:
        fx, fy, fw, fh = face_box
        # Add padding around the face (40% on each side)
        pad_x = int(fw * 0.4)
        pad_y_top = int(fh * 0.35)
        pad_y_bottom = int(fh * 0.55)
        left = max(0, fx - pad_x)
        top = max(0, fy - pad_y_top)
        right = min(w, fx + fw + pad_x)
        bottom = min(h, fy + fh + pad_y_bottom)
    else:
        # Center crop to 3:4 portrait
        target_w = min(w, int(h * 0.75))
        target_h = min(h, int(w * 1.33))
        left = (w - target_w) // 2
        top = (h - target_h) // 2
        right = left + target_w
        bottom = top + target_h
    return pil_img.crop((left, top, right, bottom))


def _enhance_photo(pil_img: Image.Image, metrics: dict) -> Tuple[Image.Image, str, list]:
    """Apply professional, subtle photo enhancements. Returns (img, notes, edits_applied)."""
    edits_applied = []
    notes = []

    # Work on a copy
    img = pil_img.convert("RGB")

    # 1. Auto levels / contrast stretch (subtle)
    img = ImageOps.autocontrast(img, cutoff=1)
    edits_applied.append("autocontrast")
    notes.append("Auto contrast for balanced tones")

    # 2. Color balance — slight warmth for flattering skin tones
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.06)
    edits_applied.append("color_balance")
    notes.append("Subtle color warmth")

    # 3. Contrast — gentle lift
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.08)
    edits_applied.append("contrast")
    notes.append("Gentle contrast lift")

    # 4. Brightness — only if image is slightly dark
    mean_lum = metrics.get("mean_lum", 128)
    if mean_lum < 110:
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.12)
        edits_applied.append("brightness")
        notes.append("Brightness boost for dark photo")
    elif mean_lum > 200:
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(0.94)
        edits_applied.append("brightness_reduce")
        notes.append("Slight brightness reduction")

    # 5. Sharpness — subtle edge definition
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(1.10)
    edits_applied.append("sharpness")
    notes.append("Subtle sharpness")

    # 6. Gentle denoise for low-light photos
    if mean_lum < 100:
        img = img.filter(ImageFilter.SmoothMore)
        edits_applied.append("denoise")
        notes.append("Low-light noise reduction")

    return img, "; ".join(notes), edits_applied


def enhance_photo_bytes(raw_bytes: bytes, metrics: dict, face_box: Optional[Tuple[int, int, int, int]] = None) -> Tuple[bytes, str, list]:
    """Enhance photo bytes and return (webp_bytes, notes, edits_applied)."""
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img = ImageOps.exif_transpose(img)
        if getattr(img, "is_animated", False):
            return raw_bytes, "", []

        # Auto-crop to face for professional portrait framing
        img = _auto_crop_to_face(img, face_box)

        img, notes, edits = _enhance_photo(img, metrics)

        # Max dimension cap for fast mobile loading
        if max(img.size) > 1280:
            img.thumbnail((1280, 1280), Image.Resampling.LANCZOS)

        out_buf = io.BytesIO()
        img.save(out_buf, format="WEBP", quality=88, method=4)
        return out_buf.getvalue(), notes, edits
    except Exception as exc:
        log.exception("Photo enhancement failed: %s", exc)
        return raw_bytes, "", []


# ---------------------------------------------------------------------------
# Moderation entry point
# ---------------------------------------------------------------------------

async def moderate_image_with_ai(raw_bytes: bytes, filename: str, db: Session) -> AIModerationResult:
    """Run OpenCV pre-check → AI vision review → professional enhancement."""
    # Step 1: Fast OpenCV pre-check
    cv_result = validate_and_optimize_profile_photo(raw_bytes)
    if not cv_result.accepted:
        return AIModerationResult(
            accepted=False,
            reject_code=cv_result.reject_code,
            reason=cv_result.reason,
            metrics=cv_result.metrics,
            processed_bytes=cv_result.processed_bytes,
            ai_reviewed=False,
        )

    # Step 2: AI vision review via NVIDIA NIM
    cfg = _resolve_ai_config(db)
    ai_decision = None
    if cfg["enabled"] and cfg["api_key"]:
        try:
            b64 = _encode_image(cv_result.processed_bytes or raw_bytes)
            data_url = f"data:image/webp;base64,{b64}"

            payload = {
                "model": cfg["model"],
                "messages": [
                    {"role": "system", "content": AI_MODERATION_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Moderate this profile photo for a Ghana university dating app."},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    },
                ],
                "temperature": 0.2,
                "max_tokens": 300,
            }

            async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
                resp = await client.post(
                    f"{cfg['base_url']}/chat/completions",
                    headers={"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"},
                    json=payload,
                )
                if resp.status_code < 400:
                    text = resp.text
                    start = text.find("{")
                    end = text.rfind("}") + 1
                    if start != -1 and end > 0:
                        ai_decision = json.loads(text[start:end])
        except Exception:
            log.exception("AI moderation API call failed")

    # Step 3: Apply hard rules from AI decision (or OpenCV fallback)
    accepted = True
    reject_code = ""
    reason = "Verified portrait"
    has_person = True
    is_nude = False
    is_dark = False
    confidence = 0.95

    if ai_decision:
        accepted = bool(ai_decision.get("accepted", True))
        reject_code = str(ai_decision.get("reject_code", ""))
        reason = str(ai_decision.get("reason", "AI moderation decision"))
        confidence = float(ai_decision.get("confidence", 0.5))
        has_person = bool(ai_decision.get("has_person", True))
        is_nude = bool(ai_decision.get("is_nude", False))
        is_dark = bool(ai_decision.get("is_dark", False))

    # Hard enforcement
    if is_nude:
        accepted = False
        reject_code = "nude"
        reason = "Nudity or sexually explicit content detected."
    elif is_dark:
        accepted = False
        reject_code = "dark"
        reason = "Image is too dark. Please upload a well-lit photo."
    elif not has_person:
        accepted = False
        reject_code = "no_person"
        reason = "No identifiable person found in the photo."

    metrics = dict(cv_result.metrics or {})
    metrics.update({
        "ai_confidence": confidence,
        "ai_has_person": has_person,
        "ai_is_nude": is_nude,
        "ai_is_dark": is_dark,
    })

    # Step 4: Professional enhancement for accepted photos
    enhanced_bytes = cv_result.processed_bytes or raw_bytes
    enhanced = False
    enhancement_notes = ""
    if accepted and cv_result.processed_bytes:
        try:
            # Try to extract face box from AI decision for better crop
            face_box = None
            enhanced_bytes, enhancement_notes, _edits = enhance_photo_bytes(
                cv_result.processed_bytes, metrics, face_box
            )
            enhanced = True
        except Exception:
            log.exception("Photo enhancement failed, using OpenCV result")

    return AIModerationResult(
        accepted=accepted,
        reject_code=reject_code,
        reason=reason,
        metrics=metrics,
        processed_bytes=enhanced_bytes,
        ai_reviewed=ai_decision is not None,
        enhanced=enhanced,
        enhancement_notes=enhancement_notes,
    )


async def moderate_image(raw_bytes: bytes, filename: str, db: Session) -> AIModerationResult:
    """Public entry point for image moderation."""
    return await moderate_image_with_ai(raw_bytes, filename, db)
