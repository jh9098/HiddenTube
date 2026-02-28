import os
from pathlib import Path

VIDEO_WIDTH = 1080
VIDEO_HEIGHT = 1920
VIDEO_FPS = 30

DEFAULT_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def get_subtitle_font_path() -> str:
    env_font = os.getenv("HIDDENTUBE_SUBTITLE_FONT")
    if env_font:
        return env_font

    for candidate in DEFAULT_FONT_CANDIDATES:
        if Path(candidate).exists():
            return candidate

    return ""


def get_default_bgm_volume() -> float:
    raw = os.getenv("HIDDENTUBE_BGM_VOLUME", "0.22")
    try:
        value = float(raw)
    except ValueError:
        return 0.22
    return max(0.0, min(1.0, value))
