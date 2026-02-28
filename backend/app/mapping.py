import re
from pathlib import Path


def extract_scene_number(filename: str) -> int | None:
    stem = Path(filename).stem.lower()
    scene_match = re.search(r"scene[_-]?(\d+)", stem)
    if scene_match:
        return int(scene_match.group(1))
    numeric_match = re.fullmatch(r"(\d+)", stem)
    if numeric_match:
        return int(numeric_match.group(1))
    trailing_match = re.search(r"(?:_|-)(\d+)$", stem)
    if trailing_match:
        return int(trailing_match.group(1))
    return None


def normalize_scene_id(raw_scene_id: str | None) -> str | None:
    if not raw_scene_id:
        return None
    cleaned = raw_scene_id.strip()
    if not cleaned:
        return None
    lowered = cleaned.lower()
    if lowered.startswith("scene_"):
        return lowered
    if lowered.isdigit():
        return f"scene_{int(lowered):02d}"
    return lowered


def choose_scene_id(
    filename: str,
    scene_ids: list[str],
    explicit_scene_id: str | None = None,
) -> tuple[str | None, str]:
    if explicit_scene_id:
        return normalize_scene_id(explicit_scene_id), "manual"

    lowered_name = filename.lower()
    for scene_id in scene_ids:
        if scene_id.lower() in lowered_name:
            return scene_id, "auto_scene_id"

    number = extract_scene_number(filename)
    if number is not None:
        candidate = f"scene_{number:02d}"
        if candidate in scene_ids:
            return candidate, "auto_number"
        index = number - 1
        if 0 <= index < len(scene_ids):
            return scene_ids[index], "auto_order"
        if not scene_ids:
            return candidate, "auto_number"

    return None, "unmapped"
