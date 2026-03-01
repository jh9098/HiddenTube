import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from .schemas import RenderJobResponse
from .storage import DATA_ROOT, ensure_project_dirs

JOB_INDEX_PATH = DATA_ROOT / "render_job_index.json"


def _job_file(project_id: str, job_id: str) -> Path:
    return ensure_project_dirs(project_id) / "meta" / f"render_job_{job_id}.json"


def _serialize_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value)


def _read_index() -> dict[str, str]:
    if not JOB_INDEX_PATH.exists():
        return {}
    return json.loads(JOB_INDEX_PATH.read_text(encoding="utf-8"))


def _write_index(index: dict[str, str]) -> None:
    JOB_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    JOB_INDEX_PATH.write_text(json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8")


def create_render_job(project_id: str, preset: str = "9:16") -> RenderJobResponse:
    job_id = f"job_{uuid4().hex[:10]}"
    now = datetime.now(UTC)
    job = RenderJobResponse(
        job_id=job_id,
        project_id=project_id,
        started_at=now,
        finished_at=None,
        progress=0,
        status="queued",
        output_path=None,
        thumbnail_path=None,
        error_message=None,
        log_path=None,
        preset=preset,
    )
    write_render_job(job)
    index = _read_index()
    index[job.job_id] = job.project_id
    _write_index(index)
    return job


def resolve_project_id(job_id: str) -> str | None:
    return _read_index().get(job_id)


def write_render_job(job: RenderJobResponse) -> None:
    payload: dict[str, Any] = job.model_dump()
    payload["started_at"] = _serialize_datetime(job.started_at)
    payload["finished_at"] = _serialize_datetime(job.finished_at)
    _job_file(job.project_id, job.job_id).write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def read_render_job(project_id: str, job_id: str) -> RenderJobResponse:
    path = _job_file(project_id, job_id)
    if not path.exists():
        raise FileNotFoundError("render job not found")
    data = json.loads(path.read_text(encoding="utf-8"))
    data["started_at"] = _parse_datetime(data.get("started_at"))
    data["finished_at"] = _parse_datetime(data.get("finished_at"))
    return RenderJobResponse.model_validate(data)


def read_render_job_by_id(job_id: str) -> RenderJobResponse:
    project_id = resolve_project_id(job_id)
    if not project_id:
        raise FileNotFoundError("render job not found")
    return read_render_job(project_id, job_id)


def update_render_job(project_id: str, job_id: str, **updates: Any) -> RenderJobResponse:
    job = read_render_job(project_id, job_id)
    merged = job.model_dump()
    for key, value in updates.items():
        merged[key] = value
    updated = RenderJobResponse.model_validate(merged)
    write_render_job(updated)
    return updated
