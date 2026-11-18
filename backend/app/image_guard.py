import io
import os
import json
import threading
from dataclasses import dataclass
from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import cv2
from PIL import Image, ImageOps

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models_cv")
YUNET_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")

MAX_FILE_BYTES = 8 * 1024 * 1024
MIN_DIMENSION = 240
TARGET_MAX_SIDE = 1280

_YUNET_LOCK = threading.Lock()
_YUNET_INSTANCE: Optional[Any] = None


def _get_yunet_detector():
    global _YUNET_INSTANCE
    if _YUNET_INSTANCE is None and os.path.isfile(YUNET_PATH):
        _YUNET_INSTANCE = cv2.FaceDetectorYN.create(
            YUNET_PATH,
            "",
            (320, 320),
            score_threshold=0.56,
            nms_threshold=0.3,
            top_k=20,
        )
    return _YUNET_INSTANCE


@dataclass
class ImageCheckResult:
    accepted: bool
    reject_code: str
    reason: str
    metrics: Dict[str, Any]
    processed_bytes: bytes = b""


def _shannon_entropy(gray: np.ndarray) -> float:
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).ravel()
    total = hist.sum()
    if total <= 0:
        return 0.0
    probs = hist[hist > 0] / total
    return float(-np.sum(probs * np.log2(probs)))


def _detect_faces_yunet(bgr: np.ndarray) -> List[Tuple[int, int, int, int, float]]:
    detector = _get_yunet_detector()
    if detector is None:
        return []
    h, w = bgr.shape[:2]
    for max_side in (640.0, 1024.0):
        scale = min(1.0, max_side / float(max(h, w)))
        rw, rh = max(64, int(round(w * scale))), max(64, int(round(h * scale)))
        resized = cv2.resize(bgr, (rw, rh), interpolation=cv2.INTER_AREA)

        with _YUNET_LOCK:
            detector.setInputSize((rw, rh))
            _, raw = detector.detect(resized)
        results = []
        if raw is not None:
            inv = 1.0 / scale
            for row in raw:
                x, y, fw, fh = row[:4] * inv
                score = float(row[-1])
                if fw <= 0 or fh <= 0:
                    continue
                results.append((int(max(0, x)), int(max(0, y)), int(fw), int(fh), score))
        if results or max_side >= max(h, w):
            return results
    return []


def _compute_skin_exposure(
    bgr: np.ndarray,
    faces: List[Tuple[int, int, int, int, float]],
) -> Dict[str, float]:
    """
    Estimate non-facial exposed skin coverage across diverse skin tones.
    Excludes detected head and neck regions so close-up portraits are never penalized.
    """
    h, w = bgr.shape[:2]
    scale = min(1.0, 480.0 / float(max(h, w)))
    nw, nh = max(64, int(round(w * scale))), max(64, int(round(h * scale)))
    small = cv2.resize(bgr, (nw, nh), interpolation=cv2.INTER_AREA)

    ycrcb = cv2.cvtColor(small, cv2.COLOR_BGR2YCrCb)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

    # Multi-tone human skin chrominance masks (covers deep melanin through light tones)
    mask_mid_light = cv2.inRange(ycrcb, np.array([45, 134, 77]), np.array([250, 178, 128]))
    mask_hsv = cv2.inRange(hsv, np.array([0, 32, 35]), np.array([23, 185, 252]))

    y_ch, cr_ch, cb_ch = cv2.split(ycrcb)
    melanin_chroma = (
        (y_ch >= 22)
        & (y_ch <= 155)
        & (cr_ch >= 129)
        & (cr_ch <= 170)
        & (cb_ch >= 82)
        & (cb_ch <= 130)
        & ((cr_ch.astype(np.int16) - cb_ch.astype(np.int16)) >= 12)
    ).astype(np.uint8) * 255

    raw_skin = cv2.bitwise_and(cv2.bitwise_or(mask_mid_light, melanin_chroma), mask_hsv)

    # Reject flat painted walls / solid backgrounds that happen to be beige or brown:
    # real skin has subtle shading gradients, whereas flat graphics/walls have near-zero local deviation.
    local_mean = cv2.blur(gray.astype(np.float32), (9, 9))
    local_sq_mean = cv2.blur((gray.astype(np.float32) ** 2), (9, 9))
    local_std = np.sqrt(np.maximum(0.0, local_sq_mean - local_mean ** 2))
    organic_mask = ((local_std >= 1.8) & (local_std <= 42.0)).astype(np.uint8) * 255
    skin_mask = cv2.bitwise_and(raw_skin, organic_mask)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, kernel)

    # Subtract head, hair, neck, and upper collar area around every detected face
    body_skin = skin_mask.copy()
    face_area_sum = 0.0
    for fx, fy, fw, fh, _ in faces:
        sx = int(fx * scale)
        sy = int(fy * scale)
        sw = int(fw * scale)
        sh = int(fh * scale)
        face_area_sum += float(sw * sh)
        pad_x = int(sw * 0.35)
        pad_top = int(sh * 0.25)
        pad_neck = int(sh * 0.85)  # excludes face + neck + normal neckline/arms near head
        x1 = max(0, sx - pad_x)
        y1 = max(0, sy - pad_top)
        x2 = min(nw, sx + sw + pad_x)
        y2 = min(nh, sy + sh + pad_neck)
        body_skin[y1:y2, x1:x2] = 0

    total_px = float(nw * nh)
    body_skin_ratio = float(np.count_nonzero(body_skin)) / total_px

    # Central torso / pelvic ROI (middle 60% width, lower 72% height)
    cx1, cx2 = int(nw * 0.20), int(nw * 0.80)
    cy1, cy2 = int(nh * 0.25), int(nh * 0.96)
    center_roi = body_skin[cy1:cy2, cx1:cx2]
    center_px = float(max(1, center_roi.size))
    center_skin_ratio = float(np.count_nonzero(center_roi)) / center_px

    # Largest single connected bare-skin blob on body
    num_labels, _, stats, _ = cv2.connectedComponentsWithStats(body_skin, connectivity=8)
    largest_blob_ratio = 0.0
    if num_labels > 1:
        largest_area = int(np.max(stats[1:, cv2.CC_STAT_AREA]))
        largest_blob_ratio = float(largest_area) / total_px

    return {
        "body_skin_ratio": round(body_skin_ratio, 4),
        "center_skin_ratio": round(center_skin_ratio, 4),
        "largest_blob_ratio": round(largest_blob_ratio, 4),
        "face_area_ratio": round(face_area_sum / total_px, 4),
    }


def validate_and_optimize_profile_photo(raw_bytes: bytes) -> ImageCheckResult:
    if not raw_bytes or len(raw_bytes) < 512:
        return ImageCheckResult(
            accepted=False,
            reject_code="empty_file",
            reason="The uploaded file is empty or unreadable.",
            metrics={},
        )
    if len(raw_bytes) > MAX_FILE_BYTES:
        return ImageCheckResult(
            accepted=False,
            reject_code="file_too_large",
            reason="Image exceeds the 8 MB limit. Please select a smaller photo.",
            metrics={"size_bytes": len(raw_bytes)},
        )

    try:
        pil_img = Image.open(io.BytesIO(raw_bytes))
        pil_img = ImageOps.exif_transpose(pil_img)
        if getattr(pil_img, "is_animated", False):
            return ImageCheckResult(
                accepted=False,
                reject_code="animated_not_allowed",
                reason="Animated images are not supported. Upload a clear still photo of yourself.",
                metrics={},
            )
        rgb = pil_img.convert("RGB")
    except Exception:
        return ImageCheckResult(
            accepted=False,
            reject_code="corrupt_image",
            reason="Invalid or corrupted image file.",
            metrics={},
        )

    width, height = rgb.size
    if width < MIN_DIMENSION or height < MIN_DIMENSION:
        return ImageCheckResult(
            accepted=False,
            reject_code="low_resolution",
            reason=f"Photo resolution ({width}x{height}) is too small. Minimum is {MIN_DIMENSION}x{MIN_DIMENSION}px.",
            metrics={"width": width, "height": height},
        )

    aspect = max(width, height) / float(max(1, min(width, height)))
    if aspect > 3.2:
        return ImageCheckResult(
            accepted=False,
            reject_code="bad_aspect",
            reason="Extreme panoramic or banner crops are not allowed for profile photos.",
            metrics={"width": width, "height": height, "aspect": round(aspect, 2)},
        )

    arr_rgb = np.array(rgb, dtype=np.uint8)
    bgr = cv2.cvtColor(arr_rgb, cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    # 1. Blank / White / Black / Solid-Color / Blur Detection
    mean_lum = float(np.mean(gray))
    std_lum = float(np.std(gray))
    p5, p95 = np.percentile(gray, [5, 95])
    dyn_range = float(p95 - p5)
    white_ratio = float(np.mean(gray >= 246))
    black_ratio = float(np.mean(gray <= 10))
    entropy = _shannon_entropy(gray)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    base_metrics: Dict[str, Any] = {
        "width": width,
        "height": height,
        "mean_lum": round(mean_lum, 2),
        "std_lum": round(std_lum, 2),
        "dyn_range": round(dyn_range, 2),
        "white_ratio": round(white_ratio, 3),
        "black_ratio": round(black_ratio, 3),
        "entropy": round(entropy, 2),
        "sharpness": round(laplacian_var, 2),
    }

    if mean_lum >= 241.0 or white_ratio >= 0.86:
        return ImageCheckResult(
            accepted=False,
            reject_code="blank_white",
            reason="Blank or mostly white image detected. Please upload a real photo of yourself.",
            metrics=base_metrics,
        )

    if mean_lum <= 13.0 or black_ratio >= 0.88:
        return ImageCheckResult(
            accepted=False,
            reject_code="blank_black",
            reason="Pitch-dark or black image detected. Please upload a well-lit photo of yourself.",
            metrics=base_metrics,
        )

    if std_lum < 12.5 or dyn_range < 30.0 or entropy < 3.3:
        return ImageCheckResult(
            accepted=False,
            reject_code="blank_solid",
            reason="Solid-color, blank, or low-detail placeholder image detected. Upload a real photo of yourself.",
            metrics=base_metrics,
        )

    if laplacian_var < 14.0:
        return ImageCheckResult(
            accepted=False,
            reject_code="too_blurry",
            reason="This photo is too blurry to verify. Please choose a clearer photo of yourself.",
            metrics=base_metrics,
        )

    # 2. Human / Person Presence Detection (Multi-scale YuNet Face Landmark CNN)
    faces = _detect_faces_yunet(bgr)
    valid_faces = [
        f for f in faces
        if f[4] >= 0.58 and (f[2] * f[3]) / float(width * height) >= 0.0025
    ]

    base_metrics["faces_detected"] = len(valid_faces)
    base_metrics["max_face_conf"] = round(max((f[4] for f in faces), default=0.0), 3)

    if len(valid_faces) < 1:
        return ImageCheckResult(
            accepted=False,
            reject_code="no_human",
            reason="No person detected in this image. Only clear photos showing a human face are accepted.",
            metrics=base_metrics,
        )

    # 3. Explicit / NSFW Nudity Detection (Face-masked body skin exposure analysis)
    skin_stats = _compute_skin_exposure(bgr, valid_faces or faces)
    base_metrics.update(skin_stats)

    is_explicit = (
        (skin_stats["center_skin_ratio"] >= 0.50 and skin_stats["largest_blob_ratio"] >= 0.26)
        or skin_stats["body_skin_ratio"] >= 0.44
        or (skin_stats["largest_blob_ratio"] >= 0.34 and skin_stats["face_area_ratio"] < 0.08)
    )
    if is_explicit:
        return ImageCheckResult(
            accepted=False,
            reject_code="explicit_nsfw",
            reason="Explicit or overly revealing content detected. Please upload an appropriate campus profile photo.",
            metrics=base_metrics,
        )

    # Optimize dimensions and encode cleanly as WebP for fast campus mobile loading
    if max(width, height) > TARGET_MAX_SIDE:
        rgb.thumbnail((TARGET_MAX_SIDE, TARGET_MAX_SIDE), Image.Resampling.LANCZOS)

    out_buf = io.BytesIO()
    rgb.save(out_buf, format="WEBP", quality=86, method=4)
    return ImageCheckResult(
        accepted=True,
        reject_code="",
        reason="Verified portrait",
        metrics=base_metrics,
        processed_bytes=out_buf.getvalue(),
    )
