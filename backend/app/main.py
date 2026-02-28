from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .mapping import choose_scene_id
from .schemas import ProjectCreateRequest, ProjectUpdateRequest, UploadResponse, ValidateResponse
from .storage import (
    DATA_ROOT,
    create_project,
    list_assets,
    read_asset_map,
    read_project,
    save_upload,
    update_project,
    write_asset_map,
)
from .validator import validate_render_payload

app = FastAPI(title="HiddenTube API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/projects", StaticFiles(directory=DATA_ROOT), name="projects")


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
    return [str(scene.get("scene_id")) for scene in scenes if isinstance(scene, dict) and scene.get("scene_id")]


def _save_and_map(
    project_id: str,
    file: UploadFile,
    category: str,
    mapping_key: str,
    allowed_suffixes: tuple[str, ...],
    scene_id: str | None,
) -> UploadResponse:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in allowed_suffixes:
        raise HTTPException(status_code=400, detail=f"허용되지 않는 파일 형식입니다: {suffix}")

    content = file.file.read()
    saved_name = save_upload(project_id, category, file.filename or f"upload{suffix}", content)

    mapping = read_asset_map(project_id)
    scenes = _scene_ids_for_project(project_id)
    matched_scene_id, status = choose_scene_id(saved_name, scenes, explicit_scene_id=scene_id)

    if mapping_key in ("images", "audio"):
        if matched_scene_id:
            mapping[mapping_key][matched_scene_id] = saved_name
    else:
        mapping[mapping_key].append(saved_name)

    write_asset_map(project_id, mapping)

    return UploadResponse(
        kind=mapping_key,
        filename=saved_name,
        scene_id=matched_scene_id,
        mapping_status=status,
    )


@app.post("/api/projects/{project_id}/upload/image")
def upload_image(project_id: str, file: UploadFile = File(...), scene_id: str | None = Form(default=None)):
    return _save_and_map(project_id, file, "images", "images", (".png", ".jpg", ".jpeg", ".webp"), scene_id)


@app.post("/api/projects/{project_id}/upload/audio")
def upload_audio(project_id: str, file: UploadFile = File(...), scene_id: str | None = Form(default=None)):
    return _save_and_map(project_id, file, "audio", "audio", (".mp3", ".wav"), scene_id)


@app.post("/api/projects/{project_id}/upload/bgm")
def upload_bgm(project_id: str, file: UploadFile = File(...)):
    return _save_and_map(project_id, file, "bgm", "bgm", (".mp3", ".wav"), None)


@app.get("/api/projects/{project_id}/assets")
def get_assets(project_id: str):
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
    if kind not in ("images", "audio"):
        raise HTTPException(status_code=400, detail="kind는 images 또는 audio만 허용됩니다.")
    if not scene_id or not filename:
        raise HTTPException(status_code=400, detail="scene_id와 filename이 필요합니다.")

    mapping[kind][scene_id] = filename
    write_asset_map(project_id, mapping)
    return {"ok": True, "asset_map": mapping}


@app.post("/api/projects/{project_id}/validate-render", response_model=ValidateResponse)
def validate_render(project_id: str):
    try:
        project = read_project(project_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Project not found") from error

    issues, missing_assets = validate_render_payload(project.render_json, read_asset_map(project_id))
    valid = not any(issue.level == "error" for issue in issues)
    return ValidateResponse(valid=valid, issues=issues, missing_assets=missing_assets)

