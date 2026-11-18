"""Explore room catalogue.

Rooms are stored in the database so administrators can add, edit, hide, or
reorder them from the admin console without a redeploy. The constants below are
only used to seed a brand-new database.
"""

from sqlalchemy.orm import Session

from .models import ExploreRoom

DEFAULT_EXPLORE_ROOMS = [
    {
        "slug": "study_buddy",
        "title": "Study Buddy",
        "subtitle": "Library sessions, lab partners, and exam accountability",
        "tag": "ACADEMIC",
        "icon": "study",
        "gradient": "linear-gradient(150deg, #0284C7 0%, #0F2942 100%)",
        "accent": "#38BDF8",
        "sort_order": 10,
        "is_active": True,
    },
    {
        "slug": "food_date",
        "title": "Food Date",
        "subtitle": "Grab dinner, night-market bites, or try a new spot together",
        "tag": "CRAVINGS",
        "icon": "food",
        "gradient": "linear-gradient(150deg, #EA580C 0%, #431407 100%)",
        "accent": "#FB923C",
        "sort_order": 20,
        "is_active": True,
    },
    {
        "slug": "long_term",
        "title": "Long Term",
        "subtitle": "Intentional dating with students ready for something real",
        "tag": "COMMITTED",
        "icon": "heart",
        "gradient": "linear-gradient(150deg, #E11D48 0%, #4C0519 100%)",
        "accent": "#FB7185",
        "sort_order": 30,
        "is_active": True,
    },
    {
        "slug": "night_stand",
        "title": "Night Stand",
        "subtitle": "Mutual late-night chemistry, upfront and no pressure",
        "tag": "AFTER HOURS",
        "icon": "moon",
        "gradient": "linear-gradient(150deg, #7C3AED 0%, #1E1035 100%)",
        "accent": "#C084FC",
        "sort_order": 40,
        "is_active": True,
    },
    {
        "slug": "walk_around",
        "title": "Walk Around",
        "subtitle": "Unwind with an evening campus stroll and easy conversation",
        "tag": "CHILL WALK",
        "icon": "walk",
        "gradient": "linear-gradient(150deg, #0D9488 0%, #082F2C 100%)",
        "accent": "#2DD4BF",
        "sort_order": 50,
        "is_active": True,
    },
    {
        "slug": "escort_tonight",
        "title": "Escort Tonight",
        "subtitle": "Find a sharp plus-one for tonight's event, party, or outing",
        "tag": "PLUS ONE",
        "icon": "ticket",
        "gradient": "linear-gradient(150deg, #D97706 0%, #3B1D06 100%)",
        "accent": "#FBBF24",
        "sort_order": 60,
        "is_active": True,
    },
]

ICON_CHOICES = [
    "star",
    "study",
    "food",
    "heart",
    "moon",
    "walk",
    "ticket",
    "music",
    "coffee",
    "sport",
    "chat",
    "sparkle",
]


def seed_default_rooms(db: Session) -> None:
    """Create the six launch rooms when the catalogue is empty."""
    if db.query(ExploreRoom).count() > 0:
        return
    for item in DEFAULT_EXPLORE_ROOMS:
        db.add(ExploreRoom(**item))
    db.commit()


def active_rooms(db: Session) -> list[ExploreRoom]:
    return (
        db.query(ExploreRoom)
        .filter(ExploreRoom.is_active == True)  # noqa: E712
        .order_by(ExploreRoom.sort_order.asc(), ExploreRoom.id.asc())
        .all()
    )


def all_rooms(db: Session) -> list[ExploreRoom]:
    return db.query(ExploreRoom).order_by(ExploreRoom.sort_order.asc(), ExploreRoom.id.asc()).all()


def active_slugs(db: Session) -> set[str]:
    return {r.slug for r in active_rooms(db)}


def serialize_room(room: ExploreRoom, counts: dict | None = None, opted_in: set[str] | None = None) -> dict:
    return {
        "id": room.id,
        "slug": room.slug,
        "title": room.title,
        "subtitle": room.subtitle or "",
        "tag": room.tag or "",
        "icon": room.icon or "star",
        "gradient": room.gradient or "linear-gradient(150deg, #334155 0%, #0F172A 100%)",
        "accent": room.accent or "#FB7185",
        "sort_order": room.sort_order or 0,
        "is_active": bool(room.is_active),
        "member_count": (counts or {}).get(room.slug, 0),
        "opted_in": room.slug in (opted_in or set()),
    }
