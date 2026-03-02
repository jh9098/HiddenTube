import json
import shlex
import shutil
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .render_config import VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH, get_default_bgm_volume, get_subtitle_font_path
from .render_job_store import update_render_job
from .storage import ensure_project_dirs, read_asset_map
from .validator import validate_render_payload


@dataclass
class SceneContext:
    scene_id: str
    duration: float
    image_path: Path
    audio_path: Path
    transition: str
    motion_type: str
    motion_strength: str
    subtitle_lines: list[dict[str, Any]]


class RenderError(RuntimeError):
    pass


def _quote(path: Path) -> str:
    return shlex.quote(str(path))


def _scene_duration(scene: dict[str, Any]) -> float:
    duration = scene.get("duration_sec")
    if isinstance(duration, (int, float)) and duration > 0:
        return float(duration)
    start_sec = scene.get("start_sec")
    end_sec = scene.get("end_sec")
    if isinstance(start_sec, (int, float)) and isinstance(end_sec, (int, float)) and end_sec > start_sec:
        return float(end_sec - start_sec)
    raise RenderError(f"scene {scene.get('scene_id')} duration 정보가 올바르지 않습니다.")


def _motion_filter(motion_type: str, strength: str) -> str:
    strength_map = {
        "weak": 0.03,
        "medium": 0.07,
        "strong": 0.12,
        "약": 0.03,
        "중": 0.07,
        "강": 0.12,
    }
    power = strength_map.get(str(strength).lower(), 0.07)
    total_frames = 90

    mt = str(motion_type).lower()
    if mt == "zoom-in":
        return (
            "zoompan="
            f"z='min(1+{power}*on/{total_frames},1+{power})':"
            "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            "d=1:s=1080x1920:fps=30"
        )
    if mt == "zoom-out":
        return (
            "zoompan="
            f"z='max(1+{power}-{power}*on/{total_frames},1)':"
            "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            "d=1:s=1080x1920:fps=30"
        )
    if mt == "pan-left":
        return (
            "zoompan="
            "z='1.08':"
            f"x='(iw-iw/zoom)-((iw-iw/zoom)*on/{total_frames})':"
            "y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30"
        )
    if mt == "pan-right":
        return (
            "zoompan="
            "z='1.08':"
            f"x='((iw-iw/zoom)*on/{total_frames})':"
            "y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30"
        )

    return "zoompan=z='1':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30"


def _subtitle_drawtext_filters(scene: SceneContext, font_path: str) -> str:
    if not scene.subtitle_lines:
        return ""

    safe_font = font_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    filters: list[str] = []
    for line in scene.subtitle_lines:
        if isinstance(line, str):
            text = line.strip()
            start = 0.0
            end = scene.duration
        else:
            text = str(line.get("text", "")).strip()
            start = float(line.get("start_sec", 0.0))
            end = float(line.get("end_sec", scene.duration))
        if not text:
            continue
        if end <= start:
            end = min(scene.duration, start + 1.5)
        safe_text = text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
        filters.append(
            "drawtext="
            f"fontfile='{safe_font}':"
            f"text='{safe_text}':"
            "fontcolor=white:fontsize=56:line_spacing=8:"
            "borderw=4:bordercolor=black:"
            "x=(w-text_w)/2:y=h-(text_h*2.4):"
            f"enable='between(t,{start:.3f},{end:.3f})'"
        )

    return ",".join(filters)


def _run(cmd: str, log_file: Path, timeout_sec: int = 20 * 60) -> None:
    with log_file.open("a", encoding="utf-8") as fh:
        fh.write(f"\n$ {cmd}\n")
        fh.flush()
        try:
            completed = subprocess.run(
                cmd,
                shell=True,
                stdout=fh,
                stderr=fh,
                text=True,
                timeout=timeout_sec,
                check=False,
            )
            return_code = completed.returncode
        except subprocess.TimeoutExpired as error:
            raise RenderError(f"ffmpeg 명령 실패(returncode=-1, cmd={cmd})") from error

    if return_code != 0:
        raise RenderError(f"ffmpeg 명령 실패(returncode={return_code}, cmd={cmd})")


def _scene_contexts(project_id: str, render_json: dict[str, Any]) -> list[SceneContext]:
    mapping = read_asset_map(project_id)
    scenes = render_json.get("scenes", [])
    contexts: list[SceneContext] = []

    base_dir = ensure_project_dirs(project_id)
    for scene in scenes:
        scene_id = str(scene.get("scene_id", "")).strip()
        if not scene_id:
            raise RenderError("scene_id가 비어 있습니다.")
        image_name = mapping.get("images", {}).get(scene_id)
        audio_name = mapping.get("audio", {}).get(scene_id)
        if not image_name or not audio_name:
            raise RenderError(f"scene({scene_id}) 자산 매핑 누락")

        image_path = base_dir / "images" / image_name
        audio_path = base_dir / "audio" / audio_name
        if not image_path.exists():
            raise RenderError(f"이미지 파일 없음: {image_path}")
        if not audio_path.exists():
            raise RenderError(f"오디오 파일 없음: {audio_path}")

        motion_raw = scene.get("camera_motion", {})
        motion = motion_raw if isinstance(motion_raw, dict) else {}
        transition = scene.get("transition")
        if isinstance(transition, dict):
            transition_type = str(transition.get("type", "cut"))
        else:
            transition_type = str(scene.get("transition_to_next") or scene.get("transition_type") or "cut")

        contexts.append(
            SceneContext(
                scene_id=scene_id,
                duration=_scene_duration(scene),
                image_path=image_path,
                audio_path=audio_path,
                transition=transition_type,
                motion_type=str(motion.get("type") or motion_raw or "hold"),
                motion_strength=str(motion.get("strength", "medium")),
                subtitle_lines=scene.get("subtitle_lines", []) if isinstance(scene.get("subtitle_lines"), list) else [],
            )
        )
    return contexts


def run_render_job(project_id: str, job_id: str, render_json: dict[str, Any]) -> None:
    base_dir = ensure_project_dirs(project_id)
    job_dir = base_dir / "renders" / job_id
    scene_dir = job_dir / "scenes"
    scene_dir.mkdir(parents=True, exist_ok=True)
    output_path = job_dir / "output.mp4"
    thumb_path = job_dir / "thumbnail.jpg"
    log_path = job_dir / "render.log"

    update_render_job(project_id, job_id, status="running", progress=5, log_path=str(log_path.relative_to(base_dir)))

    log_path.write_text(f"[start] {datetime.now(UTC).isoformat()}\n", encoding="utf-8")

    issues, _ = validate_render_payload(render_json, read_asset_map(project_id))
    blocking_issues = [issue for issue in issues if issue.level == "error"]
    if blocking_issues:
        message = "; ".join([f"{issue.code}:{issue.message}" for issue in blocking_issues])
        raise RenderError(f"사전 검증 실패 - {message}")

    font_path = get_subtitle_font_path()
    if not font_path:
        raise RenderError("자막용 폰트를 찾지 못했습니다. HIDDENTUBE_SUBTITLE_FONT을 설정하세요.")

    contexts = _scene_contexts(project_id, render_json)
    scene_outputs: list[Path] = []

    for idx, scene in enumerate(contexts):
        scene_out = scene_dir / f"scene_{idx:03d}.mp4"
        scene_outputs.append(scene_out)

        motion_filter = _motion_filter(scene.motion_type, scene.motion_strength)
        subtitle_filter = _subtitle_drawtext_filters(scene, font_path)
        vf = f"scale=1200:2133,{motion_filter}"
        if subtitle_filter:
            vf = f"{vf},{subtitle_filter}"

        cmd = (
            "ffmpeg -hide_banner -loglevel warning -y "
            f"-loop 1 -framerate {VIDEO_FPS} -t {scene.duration:.3f} -i {_quote(scene.image_path)} "
            f"-i {_quote(scene.audio_path)} "
            f"-vf \"{vf}\" "
            f"-c:v libx264 -preset veryfast -r {VIDEO_FPS} -pix_fmt yuv420p "
            "-c:a aac -ar 48000 -shortest "
            f"{_quote(scene_out)}"
        )
        _run(cmd, log_path)
        update_render_job(project_id, job_id, progress=min(70, 10 + int((idx + 1) / len(contexts) * 60)))

    if len(scene_outputs) == 1:
        merged = scene_outputs[0]
    else:
        merged = job_dir / "merged.mp4"
        transition_type = str(render_json.get("global_transition", "cross dissolve")).lower()
        offset = contexts[0].duration
        if transition_type in {"fade", "cross dissolve", "cross", "dissolve"}:
            base_t = "fade" if transition_type == "fade" else "dissolve"
            inputs = " ".join([f"-i {_quote(path)}" for path in scene_outputs])
            filter_parts = []
            current_v = "[0:v]"
            current_a = "[0:a]"
            for i in range(1, len(scene_outputs)):
                out_v = f"[v{i}]"
                out_a = f"[a{i}]"
                filter_parts.append(
                    f"{current_v}[{i}:v]xfade=transition={base_t}:duration=0.35:offset={offset - 0.35:.3f}{out_v}"
                )
                filter_parts.append(f"{current_a}[{i}:a]acrossfade=d=0.35{out_a}")
                offset += contexts[i].duration - 0.35
                current_v = out_v
                current_a = out_a

            filter_complex = ";".join(filter_parts)
            cmd = (
                f"ffmpeg -hide_banner -loglevel warning -y {inputs} -filter_complex \"{filter_complex}\" "
                f"-map '{current_v}' -map '{current_a}' "
                "-c:v libx264 -preset veryfast -pix_fmt yuv420p -c:a aac "
                f"{_quote(merged)}"
            )
            _run(cmd, log_path)
        else:
            concat_list = job_dir / "concat.txt"
            concat_list.write_text("\n".join([f"file '{path}'" for path in scene_outputs]), encoding="utf-8")
            cmd = (
                "ffmpeg -hide_banner -loglevel warning -y -f concat -safe 0 "
                f"-i {_quote(concat_list)} -c copy {_quote(merged)}"
            )
            _run(cmd, log_path)

    bgm_entries = read_asset_map(project_id).get("bgm", [])
    if bgm_entries:
        bgm_path = base_dir / "bgm" / bgm_entries[0]
        if not bgm_path.exists():
            raise RenderError(f"BGM 파일 없음: {bgm_path}")

        mixed = job_dir / "mixed.mp4"
        bgm_volume = get_default_bgm_volume()
        cmd = (
            "ffmpeg -hide_banner -loglevel warning -y "
            f"-i {_quote(merged)} -stream_loop -1 -i {_quote(bgm_path)} "
            f"-filter_complex \"[1:a]volume={bgm_volume}[bgm];[0:a][bgm]amix=inputs=2:duration=first:weights=1 0.35[aout]\" "
            "-map 0:v -map '[aout]' -c:v copy -c:a aac -shortest "
            f"{_quote(output_path)}"
        )
        _run(cmd, log_path)
    else:
        if merged.resolve() != output_path.resolve():
            output_path.unlink(missing_ok=True)
            try:
                merged.replace(output_path)
            except OSError:
                with merged.open("rb") as src, output_path.open("wb") as dst:
                    shutil.copyfileobj(src, dst, length=1024 * 1024)

    cmd_thumb = (
        "ffmpeg -hide_banner -loglevel warning -y "
        f"-i {_quote(output_path)} -ss 00:00:01.000 -vframes 1 {_quote(thumb_path)}"
    )
    _run(cmd_thumb, log_path)

    manifest = {
        "project_id": project_id,
        "job_id": job_id,
        "output": str(output_path),
        "thumbnail": str(thumb_path),
        "scenes": [scene.scene_id for scene in contexts],
    }
    (job_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    for scene_output in scene_outputs:
        scene_output.unlink(missing_ok=True)

    update_render_job(
        project_id,
        job_id,
        status="done",
        progress=100,
        output_path=str(output_path.relative_to(base_dir)),
        thumbnail_path=str(thumb_path.relative_to(base_dir)),
        finished_at=datetime.now(UTC),
    )


def fail_render_job(project_id: str, job_id: str, message: str) -> None:
    update_render_job(
        project_id,
        job_id,
        status="failed",
        progress=100,
        error_message=message,
        finished_at=datetime.now(UTC),
    )
