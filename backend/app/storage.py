import json
import re
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from .schemas import ProjectCreateRequest, ProjectMeta

DATA_ROOT = Path(__file__).resolve().parents[1] / "projects"
ASSET_TYPES = ("images", "audio", "subtitles", "bgm", "sfx", "renders", "meta")


def ensure_project_dirs(project_id: str) -> Path:
    base_dir = DATA_ROOT / project_id
    for folder in ASSET_TYPES:
        (base_dir / folder).mkdir(parents=True, exist_ok=True)
    return base_dir


def _meta_path(project_id: str) -> Path:
    return ensure_project_dirs(project_id) / "meta" / "project.json"


def _asset_map_path(project_id: str) -> Path:
    return ensure_project_dirs(project_id) / "meta" / "asset_map.json"


def create_project(payload: ProjectCreateRequest) -> ProjectMeta:
    project_id = f"proj_{uuid4().hex[:10]}"
    now = datetime.now(UTC)
    project = ProjectMeta(
        project_id=project_id,
        title=payload.title,
        workflow_json=payload.workflow_json,
        node_outputs=payload.node_outputs,
        render_json=payload.render_json,
        created_at=now,
        updated_at=now,
    )
    write_project(project)
    write_asset_map(project_id, default_asset_map())
    return project


def write_project(project: ProjectMeta) -> None:
    path = _meta_path(project.project_id)
    serialized = sanitize_json_data(project.model_dump(mode="json"))
    path.write_text(json.dumps(serialized, indent=2, ensure_ascii=False), encoding="utf-8")


def sanitize_json_data(value: Any) -> Any:
    if isinstance(value, str):
        return value.encode("utf-8", errors="replace").decode("utf-8")
    if isinstance(value, dict):
        return {key: sanitize_json_data(inner) for key, inner in value.items()}
    if isinstance(value, list):
        return [sanitize_json_data(item) for item in value]
    return value


def read_project(project_id: str) -> ProjectMeta:
    path = _meta_path(project_id)
    if not path.exists():
        raise FileNotFoundError("project not found")
    data = json.loads(path.read_text(encoding="utf-8"))
    return ProjectMeta.model_validate(data)


def update_project(project_id: str, updates: dict[str, Any]) -> ProjectMeta:
    project = read_project(project_id)
    update_fields = {key: value for key, value in updates.items() if value is not None}
    merged = project.model_dump()
    merged.update(update_fields)
    merged["updated_at"] = datetime.now(UTC)
    updated = ProjectMeta.model_validate(merged)
    write_project(updated)
    return updated


def default_asset_map() -> dict[str, Any]:
    return {"images": {}, "audio": {}, "subtitles": {}, "bgm": [], "sfx": []}


def read_asset_map(project_id: str) -> dict[str, Any]:
    path = _asset_map_path(project_id)
    if not path.exists():
        return default_asset_map()
    return json.loads(path.read_text(encoding="utf-8"))


def write_asset_map(project_id: str, mapping: dict[str, Any]) -> None:
    path = _asset_map_path(project_id)
    path.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding="utf-8")


def save_upload_stream(
    project_id: str,
    category: str,
    filename: str,
    file_obj: Any,
) -> str:
    safe_name = sanitize_filename(filename)
    target = ensure_project_dirs(project_id) / category / safe_name

    try:
        with target.open("wb") as target_fp:
            shutil.copyfileobj(file_obj, target_fp, length=1024 * 1024)
    except Exception:
        if target.exists():
            target.unlink()
        raise

    return safe_name


def save_upload(project_id: str, category: str, filename: str, content: bytes) -> str:
    """레거시 호환용 래퍼: bytes 입력을 파일 스트림 방식으로 저장."""
    from io import BytesIO

    return save_upload_stream(project_id, category, filename, BytesIO(content))


def sanitize_filename(filename: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)
    return normalized or f"asset_{uuid4().hex[:8]}"


def list_assets(project_id: str) -> dict[str, list[str]]:
    base = ensure_project_dirs(project_id)
    return {
        folder: sorted([path.name for path in (base / folder).glob("*") if path.is_file()])
        for folder in ["images", "audio", "subtitles", "bgm", "sfx", "renders"]
    }
