# Architecture & Engineering Reference

## 1. Real-Time Synchronization (`/ws`)

Campmatch maintains a per-user WebSocket registry (`backend/app/realtime.py`) authenticated via the user's versioned JWT (`/ws?token=<jwt>`). Multiple browser tabs per user are supported simultaneously.

| Event Type | Direction | Purpose |
| :--- | :--- | :--- |
| `ping` / `pong` | Bidirectional | Keep-alive heartbeat every 25s |
| `typing` | Client → Server → Partner | Live typing indicator inside active match conversation |
| `new_message` | Server → Both Partners | Appends message immediately without polling |
| `messages_read` | Server → Sender | Updates delivery state from `Delivered` to `Seen` |
| `message_reaction` | Server → Both Partners | Syncs message heart reactions |
| `new_match` | Server → Partner | Triggers live match celebration and updates Match Queue |
| `new_like` | Server → Target User | Refreshes Likes You (Beeline) count in real time |
| `match_extended` | Server → Partner | Updates 24-hour match timer when extended |
| `match_removed` | Server → Partner | Removes conversation upon unmatch, block, or account deletion |
| `platform_config` | Server → All Clients | Pushes live Admin changes (Plus toggle, swipe cap, announcement) |
| `plus_activated` | Server → User | Unlocks Plus state immediately after payment or admin grant |
| `account_terminated` | Server → User | Forces immediate client sign-out upon suspension or deletion |

## 2. Three-Stage Profile Photo Verification (`backend/app/image_guard.py`)

Every uploaded photo passes through two layers:
1. **Browser Pre-Check (`frontend/src/utils/imageCheck.ts`)**: Rejects files `> 8 MB`, dimensions `< 240x240`, extreme aspect ratios (`> 3.2:1`), blank white (`mean >= 241` or `>= 86%` near-white pixels), pitch black (`mean <= 13` or `>= 88%` near-black pixels), and solid-color images (`std < 12.0`) before network upload.
2. **Authoritative Server Pipeline (`validate_and_optimize_profile_photo`)**:
   - **Integrity & Luminance/Entropy Gate**: Normalizes EXIF rotation, blocks animated frames, checks luminance mean, standard deviation, 5th–95th percentile dynamic range, Shannon histogram entropy (`>= 3.3`), and Laplacian focus variance (`>= 14.0`).
   - **Human Presence Gate**: Runs multi-scale OpenCV `FaceDetectorYN` (`face_detection_yunet_2023mar.onnx`) requiring at least one clear human face (`confidence >= 0.58` and `area >= 0.25%` of frame). Non-human images (landscapes, flyers, objects, cartoons, blank walls) are rejected with `no_human`.
   - **Explicit Content Gate**: Segments skin chrominance across light, medium, and deep-melanin tones in YCrCb + HSV space filtered by organic local texture deviation, masks out the detected face and neck bounding region, and rejects frames exceeding non-facial body/torso skin exposure thresholds (`explicit_nsfw`).
   - **Optimization & Audit**: Accepted images are resized to `<= 1280px` and stored as WebP (`quality=86`). Every check (accepted or rejected) is recorded in `image_moderation_logs`.

## 3. Daily Swipe Quota Enforcement

- Stored in `settings` (`plus_enabled` and `free_daily_swipe_limit`, defaulting to `10`).
- Evaluated on a rolling 24-hour window in `compute_swipe_quota(user, db)`.
- When `plus_enabled == true` and `user.is_premium == false`:
  - `POST /api/swipe` blocks the 11th swipe within 24 hours with HTTP `429` (`code: "DAILY_SWIPE_LIMIT"`) and returns the exact `resets_at` timestamp.
  - The client displays the live remaining swipe pill and opens the Plus upgrade modal when remaining swipes reach `0`.
- When `plus_enabled == false` or `user.is_premium == true`, swipes are unlimited.

## 4. Soft Deletion & Full Record Retention

When a user deletes their account (`POST /api/account/delete`) or an admin moves an account to the Vault:
- `is_deleted = True`, `is_active = False`, `deleted_at = utcnow()`, `deletion_reason = ...`
- `original_email` preserves the student's `.edu.gh` address while `email` is namespaced (`deleted_<id>_<ts>__<email>`) so database foreign keys remain intact without blocking future re-registration if needed.
- `token_version` is incremented and `account_terminated` is sent over WebSocket.
- Active matches are marked `is_active = False` so the user disappears from other students' decks and chat lists immediately, while `User`, `Swipe`, `Match`, `Message`, `Payment`, `Report`, and `ImageModerationLog` rows remain preserved in SQLite/PostgreSQL and inspectable in the Admin **Deleted Vault**.
