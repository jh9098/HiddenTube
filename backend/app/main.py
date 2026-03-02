# backend/app/main.py
# 수정: CORS preflight OPTIONS 400 오류 해결
# - allow_origins=["*"] 와 allow_credentials=True 동시 사용 불가 → credentials 제거
# - OPTIONS preflight 명시적 처리 추가

import os
from pathlib import Path
from threading import Semaphore, Thread
from typing import Any

from fastapi import Body, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from .mapping import choose_scene_id
from .render_engine import RenderError, fail_render_job, run_render_job
from .render_job_store import create_render_job, read_render_job_by_id
from .schemas import (
    ProjectCreateRequest,
    ProjectUpdateRequest,
    RenderJobCreateRequest,
    RenderJobResponse,
    UploadResponse,
    ValidateResponse,
)
from .storage import (
    DATA_ROOT,
    create_project,
    ensure_project_dirs,
    list_assets,
    read_asset_map,
    read_project,
    save_upload_stream,
    update_project,
    write_asset_map,
)
from .validator import validate_render_payload

app = FastAPI(title="HiddenTube API", version="0.1.0")

# ── CORS 설정 ──────────────────────────────────────────────────────────
# 핵심 규칙:
#   allow_origins=["*"] 이면 allow_credentials=True 를 동시에 쓰면 안 됩니다.
#   (브라우저 스펙 상 와일드카드 + credentials 조합 금지 → preflight 400)
#
# 배포 시: Render.com 환경변수에 CORS_ORIGINS 추가
#   예) CORS_ORIGINS=https://hiddentube.vercel.app
#   복수) CORS_ORIGINS=https://a.com,https://b.com

_raw_origins = os.getenv("CORS_ORIGINS", "")
if _raw_origins.strip():
    ALLOW_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    ALLOW_CREDENTIALS = True
else:
    ALLOW_ORIGINS = ["*"]
    ALLOW_CREDENTIALS = False   # ← 와일드카드일 때 반드시 False

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
    max_age=600,
)

DATA_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/static/projects", StaticFiles(directory=DATA_ROOT), name="projects")



MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_AUDIO_UPLOAD_BYTES = 30 * 1024 * 1024
RENDER_WORKER_SEMAPHORE = Semaphore(1)

# ── 헬스체크 ───────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok"}


# ── OPTIONS preflight 명시적 처리 (미들웨어 누락 대비) ─────────────────
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str, request: Request):
    origin = request.headers.get("origin", "*")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin if ALLOW_CREDENTIALS else "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "600",
        },
    )


# ── 프로젝트 ───────────────────────────────────────────────────────────
@app.post("/api/projects")
def create_project_endpoint(payload: ProjectCreateRequest):
    project = create_project(payload)
    return project.model_dump()


@app.get("/api/projects/{project_id}")
def get_project_endpoint(project_id: str):
    try:
        project = read_project(project_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Project not found") from error
    return {
        **project.model_dump(),
        "asset_map": read_asset_map(project_id),
        "assets": list_assets(project_id),
    }


@app.put("/api/projects/{project_id}")
def update_project_endpoint(project_id: str, payload: ProjectUpdateRequest):
    try:
        project = update_project(project_id, payload.model_dump())
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Project not found") from error
    return project.model_dump()


def _scene_ids_for_project(project_id: str) -> list[str]:
    try:
        project = read_project(project_id)
    except FileNotFoundError:
        return []
    scenes = project.render_json.get("scenes", []) if project.render_json else []
    if not isinstance(scenes, list):
        return []
    return [
        str(scene.get("scene_id"))
        for scene in scenes
        if isinstance(scene, dict) and scene.get("scene_id")
    ]


def _ensure_project(project_id: str) -> None:
    try:
        read_project(project_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Project not found") from error


def _save_and_map(
    project_id: str,
    file: UploadFile,
    category: str,
    mapping_key: str,
    allowed_suffixes: tuple[str, ...],
    scene_id: str | None,
    max_upload_bytes: int,
) -> UploadResponse:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in allowed_suffixes:
        raise HTTPException(
            status_code=400,
            detail=f"허용되지 않는 파일 형식: {suffix}. 허용 형식: {', '.join(allowed_suffixes)}",
        )
    file.file.seek(0, 2)
    file_size = file.file.tell()
    if file_size == 0:
        raise HTTPException(status_code=400, detail="빈 파일은 업로드할 수 없습니다.")
    if file_size > max_upload_bytes:
        max_mb = max_upload_bytes // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"파일 크기 제한 초과: 최대 {max_mb}MB")
    file.file.seek(0)

    saved_name = save_upload_stream(
        project_id,
        category,
        file.filename or f"upload{suffix}",
        file.file,
    )

    mapping = read_asset_map(project_id)
    scenes = _scene_ids_for_project(project_id)
    matched_scene_id, status = choose_scene_id(saved_name, scenes, explicit_scene_id=scene_id)

    if mapping_key in ("images", "audio"):
        if matched_scene_id:
            mapping[mapping_key][matched_scene_id] = saved_name
    elif mapping_key == "bgm":
        if saved_name not in mapping[mapping_key]:
            mapping[mapping_key].append(saved_name)
    else:
        mapping[mapping_key].append(saved_name)

    write_asset_map(project_id, mapping)
    return UploadResponse(
        kind=mapping_key,
        filename=saved_name,
        scene_id=matched_scene_id,
        mapping_status=status,
    )


# ── 업로드 ─────────────────────────────────────────────────────────────
@app.post("/api/projects/{project_id}/upload/image")
def upload_image(project_id: str, file: UploadFile = File(...), scene_id: str | None = Form(default=None)):
    _ensure_project(project_id)
    return _save_and_map(
        project_id,
        file,
        "images",
        "images",
        (".png", ".jpg", ".jpeg", ".webp"),
        scene_id,
        MAX_IMAGE_UPLOAD_BYTES,
    )


@app.post("/api/projects/{project_id}/upload/audio")
def upload_audio(project_id: str, file: UploadFile = File(...), scene_id: str | None = Form(default=None)):
    _ensure_project(project_id)
    return _save_and_map(
        project_id,
        file,
        "audio",
        "audio",
        (".mp3", ".wav"),
        scene_id,
        MAX_AUDIO_UPLOAD_BYTES,
    )


@app.post("/api/projects/{project_id}/upload/subtitle")
def upload_subtitle(project_id: str, file: UploadFile = File(...), scene_id: str | None = Form(default=None)):
    _ensure_project(project_id)
    return _save_and_map(
        project_id,
        file,
        "subtitles",
        "subtitles",
        (".srt", ".txt"),
        scene_id,
        MAX_IMAGE_UPLOAD_BYTES,
    )


@app.post("/api/projects/{project_id}/upload/bgm")
def upload_bgm(project_id: str, file: UploadFile = File(...)):
    _ensure_project(project_id)
    return _save_and_map(
        project_id,
        file,
        "bgm",
        "bgm",
        (".mp3", ".wav"),
        None,
        MAX_AUDIO_UPLOAD_BYTES,
    )


# ── 에셋 ───────────────────────────────────────────────────────────────
@app.get("/api/projects/{project_id}/assets")
def get_assets(project_id: str):
    _ensure_project(project_id)
    return {
        "assets": list_assets(project_id),
        "asset_map": read_asset_map(project_id),
        "scene_ids": _scene_ids_for_project(project_id),
    }


@app.put("/api/projects/{project_id}/assets/map")
def update_asset_mapping(project_id: str, payload: dict[str, Any]):
    mapping = read_asset_map(project_id)
    kind = payload.get("kind")
    scene_id = payload.get("scene_id")
    filename = payload.get("filename")
    if kind not in ("images", "audio", "subtitles"):
        raise HTTPException(status_code=400, detail="kind는 images/audio/subtitles만 허용됩니다.")
    if not scene_id or not filename:
        raise HTTPException(status_code=400, detail="scene_id와 filename이 필요합니다.")
    mapping[kind][scene_id] = filename
    write_asset_map(project_id, mapping)
    return {"ok": True, "asset_map": mapping}


# ── 검증 / 렌더 ────────────────────────────────────────────────────────
@app.post("/api/projects/{project_id}/validate-render", response_model=ValidateResponse)
def validate_render(project_id: str):
    try:
        project = read_project(project_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Project not found") from error
    issues, missing_assets = validate_render_payload(project.render_json, read_asset_map(project_id))
    valid = not any(issue.level == "error" for issue in issues)
    return ValidateResponse(valid=valid, issues=issues, missing_assets=missing_assets)


@app.post("/api/projects/{project_id}/render", response_model=RenderJobResponse)
def create_render(project_id: str, payload: RenderJobCreateRequest = Body(default=RenderJobCreateRequest())):
    try:
        project = read_project(project_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Project not found") from error

    if not RENDER_WORKER_SEMAPHORE.acquire(blocking=False):
        raise HTTPException(status_code=429, detail="현재 렌더 대기열이 가득 참")

    job = create_render_job(project_id, payload.preset or "9:16")

    def _worker() -> None:
        try:
            run_render_job(project_id, job.job_id, project.render_json)
        except RenderError as error:
            fail_render_job(project_id, job.job_id, str(error))
        except Exception as error:  # noqa: BLE001
            fail_render_job(project_id, job.job_id, f"예상하지 못한 오류: {error}")
        finally:
            RENDER_WORKER_SEMAPHORE.release()

    Thread(target=_worker, daemon=True).start()
    return read_render_job_by_id(job.job_id)


@app.get("/api/render-jobs/{job_id}", response_model=RenderJobResponse)
def get_render_job(job_id: str):
    try:
        return read_render_job_by_id(job_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Render job not found") from error


@app.get("/api/render-jobs/{job_id}/log")
def get_render_log(job_id: str):
    try:
        job = read_render_job_by_id(job_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Render job not found") from error
    if not job.log_path:
        raise HTTPException(status_code=404, detail="Render log not found")
    base_dir = ensure_project_dirs(job.project_id)
    log_path = base_dir / job.log_path
    if not log_path.exists():
        raise HTTPException(status_code=404, detail="Render log not found")
    return FileResponse(log_path, media_type="text/plain; charset=utf-8")


@app.get("/api/render-jobs/{job_id}/result")
def get_render_result(job_id: str):
    try:
        job = read_render_job_by_id(job_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Render job not found") from error
    if job.status != "done" or not job.output_path:
        raise HTTPException(status_code=404, detail="Render output not ready")
    base_dir = ensure_project_dirs(job.project_id)
    output_path = base_dir / job.output_path
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Render output missing")
    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename=f"{job.job_id}.mp4",
        headers={"Content-Disposition": f'attachment; filename="{job.job_id}.mp4"'},
    )


@app.get("/api/render-jobs/{job_id}/thumbnail")
def get_render_thumbnail(job_id: str):
    try:
        job = read_render_job_by_id(job_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Render job not found") from error
    if job.status != "done" or not job.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not ready")
    base_dir = ensure_project_dirs(job.project_id)
    thumbnail_path = base_dir / job.thumbnail_path
    if not thumbnail_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail missing")
    return FileResponse(thumbnail_path, media_type="image/jpeg", filename=f"{job.job_id}.jpg")
