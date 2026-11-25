"""
Seed test users with complete profiles and photos.
Runs on backend startup if the database has few users.
"""
import io
import json
import os
import uuid
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageFont

from sqlalchemy.orm import Session

from .models import User
from .security import hash_password


def _generate_profile_photo(initial: str, color_hex: str, upload_dir: str) -> str:
    """Generate a circular avatar PNG/WebP with the user's initial on a colored background."""
    size = 600
    img = Image.new("RGB", (size, size), color_hex)
    draw = ImageDraw.Draw(img)

    # Draw a circle mask
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse((0, 0, size, size), fill=255)
    img.putalpha(mask)

    # Draw the initial in the center
    try:
        font = ImageFont.truetype("arial.ttf", 240)
    except Exception:
        font = ImageFont.load_default()

    text_bbox = draw.textbbox((0, 0), initial.upper(), font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]
    x = (size - text_w) // 2
    y = (size - text_h) // 2 - 20
    draw.text((x, y), initial.upper(), font=font, fill="#FFFFFF")

    # Save as WebP
    out_name = f"seed_{uuid.uuid4().hex[:10]}.webp"
    out_path = os.path.join(upload_dir, out_name)
    img.save(out_path, "WEBP", quality=85, method=4)
    return f"/uploads/{out_name}"


TEST_USERS = [
    {
        "email": "ama.mensah@st.ug.edu.gh",
        "password": "Test1234!",
        "name": "Ama Mensah",
        "level": "300",
        "age": 21,
        "course": "Computer Science",
        "gender": "female",
        "interested_in": "male",
        "bio": "Final year CS student at Legon. Love coding, Afrobeats, and weekend trips to the night market.",
        "school": "UG Legon",
        "hall": "Legon Hall",
        "looking_for": "Long-term partner",
        "interests": ["Software & Coding", "Afrobeats", "Food Spots", "Reading"],
        "explore_vibes": ["study_buddy", "food_date"],
        "prompts": [
            {"question": "A non-negotiable for me is...", "answer": "Honesty and good jollof"},
            {"question": "The fastest way to win me over on campus is...", "answer": "Waakye with everything"}
        ],
        "opening_move": "What's your go-to late-night food spot around campus?",
        "zodiac": "Leo",
        "height": "168 cm",
        "spotify_anthem": "Burna Boy - Last Last",
        "is_premium": True,
        "photo_color": "#FF4F5E",
        "photo_initial": "A",
    },
    {
        "email": "kwame.osei@st.knust.edu.gh",
        "password": "Test1234!",
        "name": "Kwame Osei",
        "level": "200",
        "age": 20,
        "course": "Mechanical Engineering",
        "gender": "male",
        "interested_in": "female",
        "bio": "ME student at KNUST. Into football, gym, and campus politics. Always down for a night market run.",
        "school": "KNUST",
        "hall": "Unity Hall",
        "looking_for": "Something casual",
        "interests": ["Football", "Gym & Fitness", "Night Market Runs", "Student Leadership"],
        "explore_vibes": ["night_stand", "walk_around"],
        "prompts": [
            {"question": "Two truths and a lie about me...", "answer": "I can bench 100kg, I've met Sarkodie, I hate wake and bake"},
            {"question": "My ideal weekend off lectures looks like...", "answer": "Gym in the morning, waakye for lunch, football with the boys"}
        ],
        "opening_move": "Jollof with plantain or waakye with everything — pick one.",
        "zodiac": "Aries",
        "height": "175 cm",
        "spotify_anthem": "Sarkodie - Otan",
        "is_premium": False,
        "photo_color": "#00b8ff",
        "photo_initial": "K",
    },
    {
        "email": "esi.armah@st.ucc.edu.gh",
        "password": "Test1234!",
        "name": "Esi Armah",
        "level": "100",
        "age": 19,
        "course": "Nursing",
        "gender": "female",
        "interested_in": "male",
        "bio": "First year nursing student at UCC. Love choir, photography, and quiet library sessions.",
        "school": "UCC",
        "hall": "Sciences Hall",
        "looking_for": "Long-term partner",
        "interests": ["Choir & Music", "Photography", "Reading", "Coffee & Tea"],
        "explore_vibes": ["study_buddy", "walk_around"],
        "prompts": [
            {"question": "A non-negotiable for me is...", "answer": "Respect and good morning prayers"},
            {"question": "We will get along effortlessly if...", "answer": "You love gospel music and early mornings"}
        ],
        "opening_move": "Quiet library floor or group hostel study during exam week?",
        "zodiac": "Pisces",
        "height": "160 cm",
        "spotify_anthem": "Diana Hamilton - Adom",
        "is_premium": False,
        "photo_color": "#E11D48",
        "photo_initial": "E",
    },
    {
        "email": "kwesi.mensah@st.umat.edu.gh",
        "password": "Test1234!",
        "name": "Kwasi Mensah",
        "level": "400",
        "age": 23,
        "course": "Mining Engineering",
        "gender": "male",
        "interested_in": "female",
        "bio": "Final year mining engineering at UMaT Tarkwa. Love the outdoors, hiking, and engineering labs.",
        "school": "UMaT",
        "hall": "Chancellor Hall",
        "looking_for": "Study & project partner",
        "interests": ["Engineering Labs", "Travel", "Hiking", "Data & AI"],
        "explore_vibes": ["study_buddy", "walk_around"],
        "prompts": [
            {"question": "The fastest way to win me over on campus is...", "answer": "A good engineering debate and roasted plantain"},
            {"question": "Something I can talk about for hours is...", "answer": "Mineral processing and sustainable mining"}
        ],
        "opening_move": "What track has been on repeat in your headphones all week?",
        "zodiac": "Capricorn",
        "height": "180 cm",
        "spotify_anthem": "Stonebwoy - Nominate",
        "is_premium": True,
        "photo_color": "#0D9488",
        "photo_initial": "K",
    },
    {
        "email": "adjoa.boateng@st.uew.edu.gh",
        "password": "Test1234!",
        "name": "Adjoa Boateng",
        "level": "200",
        "age": 20,
        "course": "Education (French)",
        "gender": "female",
        "interested_in": "male",
        "bio": "French education student at UEW Winneba. Love fashion, dance, and exploring new food spots.",
        "school": "UEW",
        "hall": "North Campus Hall",
        "looking_for": "New campus friends",
        "interests": ["Fashion & Style", "Dance", "Food Spots", "Choir & Music"],
        "explore_vibes": ["food_date", "night_stand"],
        "prompts": [
            {"question": "My most unpopular food opinion is...", "answer": "Banku goes better with light soup than okra"},
            {"question": "The fastest way to win me over on campus is...", "answer": "Take me to a new chop bar I haven't tried"}
        ],
        "opening_move": "Coffee, sobolo, or boba — what keeps you awake through lectures?",
        "zodiac": "Gemini",
        "height": "165 cm",
        "spotify_anthem": "Efya - Best in Me",
        "is_premium": False,
        "photo_color": "#7C3AED",
        "photo_initial": "A",
    },
]


def seed_test_users(db: Session, upload_dir: str) -> int:
    """Seed test users with complete profiles and photos if the database is nearly empty."""
    existing_count = db.query(User).count()
    if existing_count > 3:
        return 0

    created = 0
    for user_data in TEST_USERS:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if existing:
            continue

        photo_url = _generate_profile_photo(
            user_data["photo_initial"],
            user_data["photo_color"],
            upload_dir,
        )

        user = User(
            email=user_data["email"],
            original_email=user_data["email"],
            password_hash=hash_password(user_data["password"]),
            name=user_data["name"],
            level=user_data["level"],
            age=user_data["age"],
            course=user_data["course"],
            gender=user_data["gender"],
            interested_in=user_data["interested_in"],
            bio=user_data["bio"],
            school=user_data["school"],
            hall=user_data.get("hall", ""),
            looking_for=user_data["looking_for"],
            interests=",".join(user_data["interests"]),
            explore_vibes=",".join(user_data["explore_vibes"]),
            prompts=json.dumps(user_data["prompts"]),
            opening_move=user_data["opening_move"],
            zodiac=user_data.get("zodiac", ""),
            height=user_data.get("height", ""),
            spotify_anthem=user_data.get("spotify_anthem", ""),
            photo_urls=photo_url,
            profile_complete=True,
            photo_approved_at=datetime.now(timezone.utc),
            photo_required=False,
            is_premium=user_data.get("is_premium", False),
            is_verified=True,
            token_version=1,
        )
        db.add(user)
        created += 1

    if created > 0:
        db.commit()
        print(f"[campmatch] Seeded {created} test users with profiles and photos")

    return created
