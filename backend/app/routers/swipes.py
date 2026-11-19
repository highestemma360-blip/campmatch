from datetime import datetime, timedelta
from math import radians, cos, sin, asin, sqrt
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..database import get_db
from ..models import User, Swipe, Match, Block
from ..security import get_bool_setting, get_int_setting
from ..realtime import hub
from .. import push
from .profiles import (
    get_current_user,
    serialize_user,
    parse_list,
    compute_swipe_quota,
    VALID_EXPLORE_VIBES,
)
from ..explore_rooms import active_rooms, active_slugs, serialize_room

router = APIRouter()


def haversine(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return 9999
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


def compatibility_score(me: User, other: User) -> int:
    score = 68
    my_interests = set(i.lower() for i in parse_list(me.interests))
    their_interests = set(i.lower() for i in parse_list(other.interests))
    overlap = len(my_interests & their_interests)
    score += min(18, overlap * 6)
    if me.school and other.school and me.school == other.school:
        score += 5
    if me.level and other.level and me.level == other.level:
        score += 4
    if me.looking_for and other.looking_for and me.looking_for == other.looking_for:
        score += 5
    return min(99, score)


def get_blocked_user_ids(user_id: int, db: Session) -> set[int]:
    rows = (
        db.query(Block)
        .filter((Block.blocker_id == user_id) | (Block.blocked_id == user_id))
        .all()
    )
    out = set()
    for r in rows:
        out.add(r.blocked_id if r.blocker_id == user_id else r.blocker_id)
    return out


def matches_vibe(candidate: User, me: User, vibe: Optional[str]) -> bool:
    if not vibe or vibe == "all":
        return True
    opted = set(parse_list(candidate.explore_vibes))
    return vibe in opted


def _compute_room_counts(user: User, db: Session) -> dict:
    blocked_ids = get_blocked_user_ids(user.id, db)
    blocked_ids.add(user.id)

    pool = (
        db.query(User)
        .filter(
            User.profile_complete == True,
            User.is_active == True,
            User.is_deleted == False,
            User.snoozed == False,
            ~User.id.in_(blocked_ids),
        )
        .limit(300)
        .all()
    )

    rooms = active_rooms(db)
    out = {}
    for room in rooms:
        slug = room.slug
        cnt = 0
        for c in pool:
            if slug not in parse_list(c.explore_vibes):
                continue
            academic = "study" in (slug + " " + (room.title or "")).lower()
            if not academic and user.interested_in in ("male", "female") and c.gender != user.interested_in:
                continue
            cnt += 1
        out[slug] = cnt
    return out


@router.get("/swipe-quota")
def swipe_quota(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return compute_swipe_quota(user, db)


@router.get("/deck")
def get_deck(
    vibe: Optional[str] = Query(None),
    mode: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.profile_complete:
        raise HTTPException(400, "Complete your profile first.")

    excluded_ids = {s.swiped_id for s in db.query(Swipe).filter(Swipe.swiper_id == user.id).all()}
    excluded_ids |= get_blocked_user_ids(user.id, db)
    excluded_ids.add(user.id)

    active_mode = mode or user.mode or "date"

    q = db.query(User).filter(
        User.profile_complete == True,
        User.is_active == True,
        User.is_deleted == False,
        User.snoozed == False,
        ~User.id.in_(excluded_ids),
        User.age >= (user.min_age or 18),
        User.age <= (user.max_age or 35),
    )

    if active_mode == "date" and vibe != "study_buddy":
        if user.interested_in in ("male", "female"):
            q = q.filter(User.gender == user.interested_in)
        q = q.filter(User.interested_in.in_([user.gender, "everyone"]))

    if user.preferred_levels:
        levels = [l.strip() for l in user.preferred_levels.split(",") if l.strip()]
        if levels:
            q = q.filter(User.level.in_(levels))

    candidates = q.limit(100).all()

    incoming = {
        s.swiper_id: s
        for s in db.query(Swipe).filter(Swipe.swiped_id == user.id, Swipe.liked == True).all()
    }

    now = datetime.utcnow()
    plus_enabled = get_bool_setting(db, "plus_enabled", False)
    scored = []
    scored_outside = []
    for u in candidates:
        if not matches_vibe(u, user, vibe):
            continue
        dist = haversine(user.lat, user.lng, u.lat, u.lng) if user.lat is not None else 9999
        is_boosted = 1 if (u.boosted_until and u.boosted_until > now) else 0
        inc = incoming.get(u.id)
        super_liked_me = 1 if (inc and inc.super_liked) else 0
        comp = compatibility_score(user, u)
        entry = ((-is_boosted, -super_liked_me, dist, -comp), dist, comp, inc, u)
        # Prefer users within the user's max distance, but fall back to showing
        # distant users when none are nearby so the discovery page is never idle.
        if user.max_distance_km and dist < 9000 and dist > user.max_distance_km:
            scored_outside.append(entry)
        else:
            scored.append(entry)

    scored.sort(key=lambda x: x[0])
    scored_outside.sort(key=lambda x: x[0])

    # Use in-range users first; fill any remaining slots with out-of-range users.
    final_scored = scored[:35]
    if len(final_scored) < 35:
        final_scored.extend(scored_outside[: 35 - len(final_scored)])

    # Last resort: if every user has already been swiped, show all active users
    # (excluding self) so the discovery page is never idle.
    if not final_scored:
        all_users = (
            db.query(User)
            .filter(
                User.id != user.id,
                User.profile_complete == True,
                User.is_active == True,
                User.is_deleted == False,
                User.snoozed == False,
                User.age >= (user.min_age or 18),
                User.age <= (user.max_age or 35),
            )
            .all()
        )
        if active_mode == "date":
            if user.interested_in in ("male", "female"):
                all_users = [u for u in all_users if u.gender == user.interested_in]
            all_users = [u for u in all_users if u.interested_in in (user.gender, "everyone")]
        for u in all_users[:35]:
            dist = haversine(user.lat, user.lng, u.lat, u.lng) if user.lat is not None else 9999
            comp = compatibility_score(user, u)
            entry = ((0, 0, dist, -comp), dist, comp, None, u)
            final_scored.append(entry)
        final_scored.sort(key=lambda x: x[0])

    result = []
    for _, d, comp, inc, u in final_scored:
        card = serialize_user(u, full=False)
        card["distance_km"] = max(1, round(d)) if d < 9000 else None
        card["compatibility"] = comp
        card["super_liked_me"] = bool(inc and inc.super_liked)
        card["liked_me_hint"] = bool(inc) if (user.is_premium or not plus_enabled) else False
        result.append(card)
    return result


@router.get("/explore/rooms")
def explore_rooms_public(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    counts = _compute_room_counts(user, db)
    opted_in = set(parse_list(user.explore_vibes))
    rooms = [serialize_room(r, counts, opted_in) for r in active_rooms(db)]
    return {"rooms": rooms, "counts": counts, "opted_in": sorted(opted_in)}


@router.get("/explore-counts")
def explore_counts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    counts = _compute_room_counts(user, db)
    allowed = active_slugs(db) or VALID_EXPLORE_VIBES
    opted_in = [v for v in parse_list(user.explore_vibes) if v in allowed]
    return {"counts": counts, "opted_in": opted_in}


@router.post("/explore/opt-in")
async def toggle_explore_opt_in(
    vibe: str = Query(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    clean = vibe.strip()
    allowed = active_slugs(db) or VALID_EXPLORE_VIBES
    if clean not in allowed:
        raise HTTPException(400, "This Explore room is not available right now.")

    current = [v for v in parse_list(user.explore_vibes)]
    if clean in current:
        current = [v for v in current if v != clean]
        joined = False
    else:
        current.append(clean)
        joined = True

    user.explore_vibes = ",".join(current)
    db.commit()

    counts = _compute_room_counts(user, db)
    await hub.broadcast({"type": "explore_updated", "vibe": clean})
    return {"ok": True, "joined": joined, "opted_in": current, "counts": counts}


@router.get("/explore/{vibe}/members")
def get_explore_room_members(
    vibe: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = next((r for r in active_rooms(db) if r.slug == vibe), None)
    if not room:
        raise HTTPException(404, "Explore room not found.")

    blocked_ids = get_blocked_user_ids(user.id, db)
    blocked_ids.add(user.id)
    swiped_map = {s.swiped_id: s for s in db.query(Swipe).filter(Swipe.swiper_id == user.id).all()}

    q = db.query(User).filter(
        User.profile_complete == True,
        User.is_active == True,
        User.is_deleted == False,
        User.snoozed == False,
        ~User.id.in_(blocked_ids),
    )
    academic = "study" in (vibe + " " + (room.title or "")).lower()
    if not academic and user.interested_in in ("male", "female"):
        q = q.filter(User.gender == user.interested_in)

    candidates = q.limit(150).all()
    members = []
    for u in candidates:
        if vibe not in parse_list(u.explore_vibes):
            continue
        dist = haversine(user.lat, user.lng, u.lat, u.lng) if user.lat is not None else 9999
        card = serialize_user(u, full=False)
        card["distance_km"] = max(1, round(dist)) if dist < 9000 else None
        card["compatibility"] = compatibility_score(user, u)
        card["already_swiped"] = u.id in swiped_map
        card["already_liked"] = bool(swiped_map[u.id].liked) if u.id in swiped_map else False
        members.append(card)

    # Show unswiped & online members first
    members.sort(key=lambda m: (m["already_swiped"], not m.get("online", False), -(m.get("compatibility") or 0)))
    return {
        "vibe": vibe,
        "room": serialize_room(room),
        "opted_in": vibe in parse_list(user.explore_vibes),
        "members": members,
    }


@router.post("/swipe")
async def swipe(
    swiped_id: int,
    liked: bool,
    super_like: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if swiped_id == user.id:
        raise HTTPException(400, "Cannot swipe on your own profile.")

    if swiped_id in get_blocked_user_ids(user.id, db):
        raise HTTPException(403, "Cannot interact with this profile.")

    target = db.query(User).filter(User.id == swiped_id, User.is_deleted == False, User.is_active == True).first()
    if not target:
        raise HTTPException(404, "Profile is no longer available.")

    existing = db.query(Swipe).filter(Swipe.swiper_id == user.id, Swipe.swiped_id == swiped_id).first()
    if existing:
        return {"ok": True, "matched": False, "super": super_like, "quota": compute_swipe_quota(user, db)}

    # Enforce daily swipe limit (default 10/day) for Free users whenever Plus is enabled in Admin
    quota = compute_swipe_quota(user, db)
    if quota["limited"] and quota["remaining"] is not None and quota["remaining"] <= 0:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "DAILY_SWIPE_LIMIT",
                "message": f"You have used all {quota['daily_limit']} free daily swipes. Upgrade to Campmatch Plus for unlimited swipes.",
                "quota": quota,
            },
        )

    if super_like and quota["super_remaining"] <= 0:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "SUPER_LIKE_LIMIT",
                "message": f"Daily Super Like limit ({quota['super_limit']}) reached.",
                "quota": quota,
            },
        )

    s = Swipe(swiper_id=user.id, swiped_id=swiped_id, liked=bool(liked or super_like), super_liked=bool(super_like))
    db.add(s)

    match = None
    is_new_match = False
    if liked or super_like:
        mutual = (
            db.query(Swipe)
            .filter(Swipe.swiper_id == swiped_id, Swipe.swiped_id == user.id, Swipe.liked == True)
            .first()
        )
        if mutual:
            u1, u2 = min(user.id, swiped_id), max(user.id, swiped_id)
            existing_match = db.query(Match).filter(Match.user1_id == u1, Match.user2_id == u2).first()
            if not existing_match:
                match = Match(
                    user1_id=u1,
                    user2_id=u2,
                    expires_at=datetime.utcnow() + timedelta(hours=24),
                    is_super=bool(super_like or mutual.super_liked),
                    is_active=True,
                )
                db.add(match)
                is_new_match = True
            else:
                existing_match.is_active = True
                existing_match.expires_at = datetime.utcnow() + timedelta(hours=24)
                match = existing_match
                is_new_match = True

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"ok": True, "matched": False, "super": super_like, "quota": compute_swipe_quota(user, db)}
    if match:
        db.refresh(match)

    updated_quota = compute_swipe_quota(user, db)

    # Push real-time WebSocket events
    if is_new_match and match:
        await hub.send_to_user(
            swiped_id,
            {
                "type": "new_match",
                "match_id": match.id,
                "partner": serialize_user(user, full=False),
                "is_super": bool(match.is_super),
            },
        )
        # Deliver a phone notification so matches surface even when the app is closed.
        other = db.query(User).filter(User.id == swiped_id).first()
        push.push_to_user(
            db,
            swiped_id,
            {
                "title": "New match!",
                "body": f"You and {user.name or 'someone new'} matched — say hi!",
                "url": "/",
                "icon": "/favicon.svg",
                "tag": f"match-{match.id}",
            },
        )
        push.push_to_user(
            db,
            user.id,
            {
                "title": "New match!",
                "body": f"You and {other.name if other else 'someone new'} matched — say hi!",
                "url": "/",
                "icon": "/favicon.svg",
                "tag": f"match-{match.id}",
            },
        )
    elif liked or super_like:
        await hub.send_to_user(
            swiped_id,
            {
                "type": "new_like",
                "super_liked": bool(super_like),
            },
        )

    return {
        "ok": True,
        "matched": match is not None,
        "match_id": match.id if match else None,
        "super": super_like,
        "quota": updated_quota,
    }


@router.post("/rewind")
def rewind_last_swipe(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plus_enabled = get_bool_setting(db, "plus_enabled", False)
    if plus_enabled and not user.is_premium:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PLUS_REQUIRED",
                "message": "Rewind is a Campmatch Plus feature. Upgrade to undo swipes anytime.",
            },
        )

    last = (
        db.query(Swipe)
        .filter(Swipe.swiper_id == user.id)
        .order_by(Swipe.created_at.desc())
        .first()
    )
    if not last:
        raise HTTPException(400, "No recent swipe to rewind.")

    u1, u2 = min(user.id, last.swiped_id), max(user.id, last.swiped_id)
    existing_match = db.query(Match).filter(Match.user1_id == u1, Match.user2_id == u2, Match.is_active == True).first()
    if existing_match:
        existing_match.is_active = False

    restored_user = db.query(User).filter(User.id == last.swiped_id, User.is_deleted == False, User.is_active == True).first()
    db.delete(last)
    db.commit()

    if not restored_user:
        raise HTTPException(404, "Profile is no longer available.")

    card = serialize_user(restored_user, full=False)
    card["compatibility"] = compatibility_score(user, restored_user)
    return {"ok": True, "card": card, "quota": compute_swipe_quota(user, db)}


@router.post("/boost")
def activate_boost(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    if user.boosted_until and user.boosted_until > now:
        return {"ok": True, "boosted_until": user.boosted_until.isoformat(), "already_active": True}
    user.boosted_until = now + timedelta(minutes=30)
    db.commit()
    return {"ok": True, "boosted_until": user.boosted_until.isoformat(), "already_active": False}


@router.get("/likes-you")
def get_likes_you(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plus_enabled = get_bool_setting(db, "plus_enabled", False)
    paywall_active = plus_enabled and not user.is_premium

    my_swiped_ids = {s.swiped_id for s in db.query(Swipe).filter(Swipe.swiper_id == user.id).all()}
    blocked_ids = get_blocked_user_ids(user.id, db)

    incoming_swipes = (
        db.query(Swipe)
        .filter(Swipe.swiped_id == user.id, Swipe.liked == True)
        .order_by(Swipe.super_liked.desc(), Swipe.created_at.desc())
        .all()
    )

    items = []
    for sw in incoming_swipes:
        if sw.swiper_id in my_swiped_ids or sw.swiper_id in blocked_ids:
            continue
        admirer = (
            db.query(User)
            .filter(User.id == sw.swiper_id, User.is_active == True, User.is_deleted == False)
            .first()
        )
        if not admirer:
            continue
        photos = parse_list(admirer.photo_urls)
        if paywall_active:
            items.append({
                "id": admirer.id,
                "blurred": True,
                "name": f"{(admirer.name or 'S')[0]}***",
                "age": admirer.age,
                "level": admirer.level,
                "school": admirer.school,
                "course": admirer.course,
                "photo_urls": photos[:1],
                "super_liked": bool(sw.super_liked),
                "compatibility": compatibility_score(user, admirer),
            })
        else:
            card = serialize_user(admirer, full=False)
            card["blurred"] = False
            card["super_liked"] = bool(sw.super_liked)
            card["compatibility"] = compatibility_score(user, admirer)
            items.append(card)

    return {"count": len(items), "locked": paywall_active, "items": items}
