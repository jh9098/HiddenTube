from typing import Any

from .schemas import ValidationIssue


def _issue(code: str, level: str, message: str, scene_id: str | None = None) -> ValidationIssue:
    return ValidationIssue(code=code, level=level, message=message, scene_id=scene_id)


def validate_render_payload(render_json: dict[str, Any], asset_map: dict[str, Any]) -> tuple[list[ValidationIssue], list[dict[str, str]]]:
    issues: list[ValidationIssue] = []
    missing_assets: list[dict[str, str]] = []

    if not render_json:
        issues.append(_issue("render_json_missing", "error", "render_json이 비어 있습니다."))
        return issues, missing_assets

    scenes = render_json.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        issues.append(_issue("invalid_scenes", "error", "render_json.scenes 배열이 유효하지 않습니다."))
        return issues, missing_assets

    scene_ids: list[str] = []
    scene_windows: list[tuple[float, float, str]] = []
    total_duration = 0.0

    for index, scene in enumerate(scenes, start=1):
        if not isinstance(scene, dict):
            issues.append(_issue("invalid_scene_item", "error", f"{index}번째 scene 항목이 객체가 아닙니다."))
            continue

        scene_id = str(scene.get("scene_id", "")).strip()
        if not scene_id:
            issues.append(_issue("missing_scene_id", "error", f"{index}번째 scene의 scene_id가 없습니다."))
            continue

        scene_ids.append(scene_id)

        subtitle_lines = scene.get("subtitle_lines")
        if subtitle_lines is not None:
            if not isinstance(subtitle_lines, list):
                issues.append(_issue("invalid_subtitle_lines", "error", "subtitle_lines는 배열이어야 합니다.", scene_id))
            else:
                for line_index, line in enumerate(subtitle_lines, start=1):
                    if isinstance(line, str):
                        continue
                    if isinstance(line, dict) and isinstance(line.get("text"), str):
                        continue
                    issues.append(
                        _issue(
                            "invalid_subtitle_line_item",
                            "error",
                            f"subtitle_lines[{line_index}] 형식이 잘못되었습니다.",
                            scene_id,
                        )
                    )

        duration = scene.get("duration_sec")
        start_sec = scene.get("start_sec", scene.get("start_time"))
        end_sec = scene.get("end_sec", scene.get("end_time"))
        if isinstance(duration, (int, float)):
            total_duration += float(duration)

        if isinstance(start_sec, (int, float)) and isinstance(end_sec, (int, float)):
            if end_sec <= start_sec:
                issues.append(_issue("invalid_time_range", "error", "end_sec는 start_sec보다 커야 합니다.", scene_id))
            else:
                scene_windows.append((float(start_sec), float(end_sec), scene_id))

    if len(scene_ids) != len(set(scene_ids)):
        issues.append(_issue("duplicate_scene_id", "error", "scene_id 중복이 있습니다."))

    scene_windows.sort(key=lambda item: item[0])
    for current, next_window in zip(scene_windows, scene_windows[1:]):
        _, current_end, current_scene = current
        next_start, _, next_scene = next_window
        if next_start < current_end:
            issues.append(
                _issue(
                    "timeline_overlap",
                    "error",
                    f"{current_scene}와 {next_scene}의 시간 구간이 겹칩니다.",
                )
            )

    declared_total = render_json.get("duration_sec")
    if isinstance(declared_total, (int, float)) and abs(float(declared_total) - total_duration) > 0.25:
        issues.append(
            _issue(
                "duration_mismatch",
                "warning",
                f"duration_sec({declared_total})와 scene duration 합계({round(total_duration, 3)})가 다릅니다.",
            )
        )

    image_map = asset_map.get("images", {})
    audio_map = asset_map.get("audio", {})
    subtitle_map = asset_map.get("subtitles", {})
    for scene_id in scene_ids:
        if scene_id not in image_map:
            missing_assets.append({"scene_id": scene_id, "asset_type": "image"})
            issues.append(_issue("missing_image", "error", "장면 이미지가 없습니다.", scene_id))
        if scene_id not in audio_map:
            missing_assets.append({"scene_id": scene_id, "asset_type": "audio"})
            issues.append(_issue("missing_audio", "error", "장면 오디오가 없습니다.", scene_id))
        if scene_id not in subtitle_map:
            issues.append(_issue("missing_subtitle", "warning", "장면 자막 파일 매핑이 없습니다.", scene_id))

    return issues, missing_assets
