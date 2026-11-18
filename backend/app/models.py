from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    Float,
)
from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    original_email = Column(String(255), default="")
    password_hash = Column(String(255), nullable=False)

    name = Column(String(100))
    level = Column(String(20))
    age = Column(Integer)
    course = Column(String(100))
    gender = Column(String(20))
    interested_in = Column(String(20))
    bio = Column(Text)
    photo_urls = Column(Text)
    profile_complete = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    snoozed = Column(Boolean, default=False)
    token_version = Column(Integer, default=1)

    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    deletion_reason = Column(String(255), default="")

    ban_type = Column(String(20), default="")  # "" | temporary | permanent
    banned_until = Column(DateTime, nullable=True)
    ban_reason = Column(String(255), default="")
    banned_at = Column(DateTime, nullable=True)
    banned_by = Column(Integer, nullable=True)

    is_premium = Column(Boolean, default=False)
    premium_until = Column(DateTime, nullable=True)
    boosted_until = Column(DateTime, nullable=True)

    min_age = Column(Integer, default=18)
    max_age = Column(Integer, default=30)
    preferred_levels = Column(String(100), default="")
    show_me = Column(String(20), default="everyone")
    max_distance_km = Column(Integer, default=50)
    verified_only = Column(Boolean, default=False)

    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    school = Column(String(100))
    hall = Column(String(100), default="")

    mode = Column(String(20), default="date")
    looking_for = Column(String(60), default="Long-term partner")
    interests = Column(Text, default="")
    prompts = Column(Text, default="[]")
    opening_move = Column(String(255), default="")
    zodiac = Column(String(30), default="")
    height = Column(String(20), default="")
    spotify_anthem = Column(String(160), default="")
    explore_vibes = Column(Text, default="")


class Swipe(Base):
    __tablename__ = "swipes"
    id = Column(Integer, primary_key=True)
    swiper_id = Column(Integer, ForeignKey("users.id"), index=True)
    swiped_id = Column(Integer, ForeignKey("users.id"), index=True)
    liked = Column(Boolean, nullable=False)
    super_liked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    __table_args__ = (UniqueConstraint("swiper_id", "swiped_id"),)


class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True)
    user1_id = Column(Integer, ForeignKey("users.id"), index=True)
    user2_id = Column(Integer, ForeignKey("users.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    extended = Column(Boolean, default=False)
    is_super = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    unmatched_by = Column(Integer, nullable=True)
    unmatched_at = Column(DateTime, nullable=True)
    __table_args__ = (UniqueConstraint("user1_id", "user2_id"),)


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    match_id = Column(Integer, ForeignKey("matches.id"), index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read = Column(Boolean, default=False)
    reaction = Column(String(16), default="")
    is_deleted = Column(Boolean, default=False)


class Block(Base):
    __tablename__ = "blocks"
    id = Column(Integer, primary_key=True)
    blocker_id = Column(Integer, ForeignKey("users.id"), index=True)
    blocked_id = Column(Integer, ForeignKey("users.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("blocker_id", "blocked_id"),)


class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True)
    key = Column(String(50), unique=True, index=True)
    value = Column(Text)


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="GHS")
    provider = Column(String(50))
    reference = Column(String(100), unique=True, index=True)
    status = Column(String(20), default="pending")
    description = Column(String(200))
    duration_days = Column(Integer, default=30)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), index=True)
    reported_id = Column(Integer, ForeignKey("users.id"), index=True)
    reason = Column(String(255), nullable=False)
    details = Column(Text, default="")
    status = Column(String(20), default="open")
    admin_note = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)


class ImageModerationLog(Base):
    __tablename__ = "image_moderation_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    filename = Column(String(255))
    accepted = Column(Boolean, default=False)
    reject_code = Column(String(50), default="")
    reason = Column(String(255), default="")
    metrics_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

    stored_path = Column(String(255), default="")
    review_status = Column(String(20), default="auto")  # auto | pending | approved | declined
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, nullable=True)
    review_note = Column(String(255), default="")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    endpoint = Column(String(500), unique=True, index=True)
    p256dh = Column(String(255))
    auth = Column(String(255))
    user_agent = Column(String(255), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"
    id = Column(Integer, primary_key=True)
    admin_id = Column(Integer, ForeignKey("users.id"), index=True)
    action = Column(String(100), nullable=False)
    target_user_id = Column(Integer, nullable=True)
    details = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    id = Column(Integer, primary_key=True)
    event_id = Column(String(120), unique=True, index=True, nullable=False)
    event_type = Column(String(60), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class ExploreRoom(Base):
    __tablename__ = "explore_rooms"
    id = Column(Integer, primary_key=True)
    slug = Column(String(60), unique=True, index=True, nullable=False)
    title = Column(String(80), nullable=False)
    subtitle = Column(String(220), default="")
    tag = Column(String(40), default="")
    icon = Column(String(40), default="star")
    gradient = Column(String(220), default="")
    accent = Column(String(20), default="#FB7185")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    title = Column(String(140), nullable=False)
    body = Column(Text, default="")
    flyer_url = Column(String(255), default="")
    audience = Column(String(20), default="all")  # all | free | plus | new
    target_school = Column(String(100), default="")
    target_user_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)


class NotificationRead(Base):
    __tablename__ = "notification_reads"
    id = Column(Integer, primary_key=True)
    notification_id = Column(Integer, ForeignKey("notifications.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    read_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("notification_id", "user_id"),)
