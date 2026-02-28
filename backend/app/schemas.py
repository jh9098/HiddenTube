from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ProjectCreateRequest(BaseModel):
    title: str = "새 프로젝트"
    workflow_json: dict[str, Any] = Field(default_factory=dict)
    node_outputs: dict[str, Any] = Field(default_factory=dict)
    render_json: dict[str, Any] = Field(default_factory=dict)


class ProjectUpdateRequest(BaseModel):
    title: str | None = None
    workflow_json: dict[str, Any] | None = None
    node_outputs: dict[str, Any] | None = None
    render_json: dict[str, Any] | None = None


class ProjectMeta(BaseModel):
    project_id: str
    title: str
    workflow_json: dict[str, Any]
    node_outputs: dict[str, Any]
    render_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class UploadResponse(BaseModel):
    kind: str
    filename: str
    scene_id: str | None = None
    mapping_status: str


class ValidationIssue(BaseModel):
    code: str
    level: str
    message: str
    scene_id: str | None = None


class ValidateResponse(BaseModel):
    valid: bool
    issues: list[ValidationIssue]
    missing_assets: list[dict[str, str]]
