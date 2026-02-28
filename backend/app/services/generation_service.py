from typing import Any

from .generation_adapters import GenerationAdapter, GenerationRequest, NotImplementedAdapter


class GenerationService:
    """외부 생성 API 연동 확장 지점.

    현재 MVP에서는 수동 붙여넣기/업로드 흐름을 사용하고,
    이후 이미지 API/TTS API 연동 시 adapter를 등록해 사용한다.
    """

    def __init__(self) -> None:
        self._adapters: dict[str, GenerationAdapter] = {}
        self._fallback = NotImplementedAdapter()

    def register_adapter(self, task_type: str, adapter: GenerationAdapter) -> None:
        self._adapters[task_type] = adapter

    def run(self, task_type: str, prompt: str, *, scene_id: str | None = None, options: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = GenerationRequest(task_type=task_type, prompt=prompt, scene_id=scene_id, options=options or {})
        adapter = self._adapters.get(task_type, self._fallback)
        result = adapter.generate(payload)
        return {
            "provider": result.provider,
            "task_type": result.task_type,
            "content": result.content,
            "meta": result.meta,
        }


generation_service = GenerationService()
