"""Industry-grade AI features for Campmatch students.

Includes:
- AI profile writing assistant (bio, prompts, opening move)
- AI icebreaker suggestions based on match profile
- AI match compatibility scoring
- AI safety score for profiles
- AI caption/tag suggestions for photos
"""

import json
import logging
import os
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..security import get_setting, get_bool_setting
from .profiles import get_current_user

router = APIRouter()

log = logging.getLogger("campmatch.ai_features")


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
    return {"enabled": enabled, "api_key": key, "model": model, "base_url": base_url}


# ---------------------------------------------------------------------------
# Request/Response models
# ---------------------------------------------------------------------------

class ProfileAssistIn(BaseModel):
    field: str  # "bio" | "prompt" | "opening_move" | "headline"
    context: str = ""  # user's current info
    vibe: str = "friendly"  # friendly | bold | funny | academic
    target: str = "date"  # date | bff | study


class ProfileAssistOut(BaseModel):
    suggestions: List[str]
    field: str


class IcebreakerIn(BaseModel):
    match_profile: dict  # the match's serialized profile
    my_profile: dict  # my serialized profile
    mode: str = "date"


class IcebreakerOut(BaseModel):
    icebreakers: List[str]


class MatchCompatibilityIn(BaseModel):
    my_profile: dict
    their_profile: dict


class MatchCompatibilityOut(BaseModel):
    score: int  # 0-100
    reasons: List[str]
    red_flags: List[str]
    conversation_starters: List[str]


class SafetyScoreIn(BaseModel):
    profile: dict


class SafetyScoreOut(BaseModel):
    score: int  # 0-100 (higher = safer)
    flags: List[str]
    advice: List[str]


class PhotoCaptionIn(BaseModel):
    photo_description: str = ""
    vibe: str = "friendly"


class PhotoCaptionOut(BaseModel):
    captions: List[str]


# ---------------------------------------------------------------------------
# AI call helper
# ---------------------------------------------------------------------------

async def _ai_complete(cfg: dict, system_prompt: str, user_prompt: str, max_tokens: int = 400) -> str:
    if not cfg["enabled"] or not cfg["api_key"]:
        return ""
    try:
        payload = {
            "model": cfg["model"],
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.7,
            "max_tokens": max_tokens,
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(25.0, connect=8.0)) as client:
            resp = await client.post(
                f"{cfg['base_url']}/chat/completions",
                headers={"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"},
                json=payload,
            )
            if resp.status_code >= 400:
                return ""
            data = resp.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception:
        log.exception("AI features completion failed")
        return ""


def _parse_list_response(text: str) -> List[str]:
    if not text:
        return []
    # Try JSON array first
    try:
        start = text.find("[")
        end = text.rfind("]") + 1
        if start != -1 and end > 0:
            parsed = json.loads(text[start:end])
            if isinstance(parsed, list):
                return [str(x).strip() for x in parsed if str(x).strip()]
    except Exception:
        pass
    # Fallback: split by newlines / bullets
    lines = [l.strip(" -•*1234567890. ") for l in text.split("\n") if l.strip()]
    return [l for l in lines if len(l) > 2][:6]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/ai/profile-assist", response_model=ProfileAssistOut)
async def profile_assist(
    data: ProfileAssistIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI-powered profile writing assistant."""
    cfg = _resolve_ai_config(db)
    system = (
        "You are a helpful dating profile coach for Ghana university students. "
        "Write short, authentic, engaging suggestions (under 40 words each). "
        "No emojis as icons, no slang that feels fake. Be warm and student-appropriate."
    )
    user_prompt = (
        f"Field: {data.field}\n"
        f"Vibe: {data.vibe}\n"
        f"Purpose: {data.target}\n"
        f"Current info: {data.context}\n"
        f"Give me 4 suggestions for this profile field. Return ONLY a JSON array of strings."
    )
    text = await _ai_complete(cfg, system, user_prompt)
    suggestions = _parse_list_response(text)
    if not suggestions:
        suggestions = [
            "Focus on what makes you unique on campus.",
            "Mention your favorite study spot or hall event.",
            "Share what you're looking for in one sentence.",
            "Keep it light, honest, and conversation-friendly.",
        ]
    return {"suggestions": suggestions, "field": data.field}


@router.post("/ai/icebreaker", response_model=IcebreakerOut)
async def icebreaker(
    data: IcebreakerIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI icebreaker suggestions based on match profile."""
    cfg = _resolve_ai_config(db)
    system = (
        "You are a dating conversation coach. Write 4 short icebreakers "
        "(under 20 words each) that reference specific details from their profile. "
        "Be genuine, not cheesy. Appropriate for university students."
    )
    user_prompt = (
        f"Their profile: {json.dumps(data.match_profile)}\n"
        f"My profile: {json.dumps(data.my_profile)}\n"
        f"Mode: {data.mode}\n"
        f"Return ONLY a JSON array of strings."
    )
    text = await _ai_complete(cfg, system, user_prompt)
    icebreakers = _parse_list_response(text)
    if not icebreakers:
        icebreakers = [
            "What's your favorite spot on campus?",
            "How's your semester going so far?",
            "What brought you to this mode?",
            "Any hall events you're excited about?",
        ]
    return {"icebreakers": icebreakers}


@router.post("/ai/match-compatibility", response_model=MatchCompatibilityOut)
async def match_compatibility(
    data: MatchCompatibilityIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI match compatibility scoring."""
    cfg = _resolve_ai_config(db)
    system = (
        "You are a matchmaking compatibility analyst for university students. "
        "Score 0-100 based on shared interests, vibe, study mode, and goals. "
        "Be honest but kind. Flag genuine concerns only."
    )
    user_prompt = (
        f"My profile: {json.dumps(data.my_profile)}\n"
        f"Their profile: {json.dumps(data.their_profile)}\n"
        f"Return ONLY a JSON object with: score (0-100), reasons (array), red_flags (array), conversation_starters (array)."
    )
    text = await _ai_complete(cfg, system, user_prompt)
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > 0:
            parsed = json.loads(text[start:end])
            return {
                "score": int(parsed.get("score", 50)),
                "reasons": parsed.get("reasons", []),
                "red_flags": parsed.get("red_flags", []),
                "conversation_starters": parsed.get("conversation_starters", []),
            }
    except Exception:
        pass
    return {
        "score": 50,
        "reasons": ["Some shared interests detected"],
        "red_flags": [],
        "conversation_starters": ["What's your favorite thing about campus?"],
    }


@router.post("/ai/safety-score", response_model=SafetyScoreOut)
async def safety_score(
    data: SafetyScoreIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI safety score for a profile."""
    cfg = _resolve_ai_config(db)
    system = (
        "You are a campus safety analyst. Score a profile 0-100 for safety "
        "(higher = safer). Look for red flags: vague info, requests for money, "
        "too-good-to-be-true claims, inconsistent details. Return JSON only."
    )
    user_prompt = (
        f"Profile: {json.dumps(data.profile)}\n"
        f"Return ONLY a JSON object with: score (0-100), flags (array of concerns), advice (array of safety tips)."
    )
    text = await _ai_complete(cfg, system, user_prompt)
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > 0:
            parsed = json.loads(text[start:end])
            return {
                "score": int(parsed.get("score", 70)),
                "flags": parsed.get("flags", []),
                "advice": parsed.get("advice", ["Meet in public places", "Tell a friend where you're going"]),
            }
    except Exception:
        pass
    return {
        "score": 70,
        "flags": [],
        "advice": ["Meet in public places", "Tell a friend where you're going", "Trust your instincts"],
    }


@router.post("/ai/photo-caption", response_model=PhotoCaptionOut)
async def photo_caption(
    data: PhotoCaptionIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI photo caption suggestions."""
    cfg = _resolve_ai_config(db)
    system = (
        "You write short, authentic photo captions for student dating profiles. "
        "Under 15 words each, no emojis, natural tone."
    )
    user_prompt = (
        f"Photo description: {data.photo_description}\n"
        f"Vibe: {data.vibe}\n"
        f"Return ONLY a JSON array of 4 caption strings."
    )
    text = await _ai_complete(cfg, system, user_prompt)
    captions = _parse_list_response(text)
    if not captions:
        captions = [
            "Campus life in one frame.",
            "Just being me at [University].",
            "My favorite study break spot.",
            "Real moments, real people.",
        ]
    return {"captions": captions}
