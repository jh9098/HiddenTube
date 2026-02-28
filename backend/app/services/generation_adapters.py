from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class GenerationRequest:
    task_type: str
    prompt: str
    scene_id: str | None = None
    options: dict[str, Any] = field(default_factory=dict)


@dataclass
class GenerationResult:
    provider: str
    task_type: str
    content: str
    meta: dict[str, Any] = field(default_factory=dict)


class GenerationAdapter(Protocol):
    provider_name: str

    def generate(self, payload: GenerationRequest) -> GenerationResult:
        ...


class NotImplementedAdapter:
    provider_name = "not_implemented"

    def generate(self, payload: GenerationRequest) -> GenerationResult:
        raise NotImplementedError(
            f"{payload.task_type} 작업용 외부 생성 API 어댑터가 아직 연결되지 않았습니다."
        )
