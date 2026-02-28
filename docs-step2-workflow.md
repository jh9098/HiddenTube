# 2단계 구현 정리: 노드 실행 구조 + 프롬프트 생성 + 중간 산출물 관리

## 1) 노드 실행 구조
- 실행 순서는 그래프 edge를 기준으로 `topoSort`(위상 정렬)로 계산합니다.
- 모드는 3가지입니다.
  - 전체 실행: 모든 노드 실행
  - 단일 노드 실행: 선택 노드만 실행
  - 하위 연속 실행: 선택 노드부터 downstream 노드까지 실행
- 각 노드는 실행 시 아래 데이터를 갱신합니다.
  - `resolvedInput`: 상위 노드 output 병합본
  - `generatedPrompt`: 노드 타입별 프롬프트 템플릿 결과
  - `manualResult`: 사용자가 붙여넣은 외부 AI 결과
  - `parsedOutput`: manualResult 파싱 결과
  - `output`: 하위 노드에 전달할 최종 출력

## 2) prompt template 설계
- `buildPromptByNodeType`에서 노드 타입별 템플릿을 제공합니다.
- 공통 구성:
  - config JSON
  - resolved_input JSON
- 노드별 출력 형식을 JSON 스키마 형태로 지시합니다.
  - ScriptNode: title/hook/script/cta
  - SceneBreakdownNode: scenes[]
  - ImagePromptNode: scene_prompts[]
  - MotionSubtitleNode: scene_motion[]
  - RenderJsonNode: meta + scenes

## 3) output parsing 방식
- `manualResult`가 비어있으면 기본값/빈 객체 처리
- JSON 파싱 성공 시 그대로 반영
- JSON 파싱 실패 시:
  - 일반 노드: `raw_text`로 보존
  - RenderJsonNode: 자동 생성 draft를 사용하고 parseError 표시
- RenderJsonNode는 `normalizeRenderJson`로 보정합니다.
  - 기본 필드 강제 보장
  - `strict` 모드: 기본 필드만 반환
  - `flexible` 모드: 추가 필드 보존

## 4) render JSON 예시
```json
{
  "meta": {
    "title": "퇴근 후 10분, 돈 관리 루틴",
    "target_audience": "20~30대 직장인",
    "tone": "실용적이고 친근한 톤",
    "safety_notes": "투자 권유가 아닌 일반 정보 제공 목적",
    "cta": "댓글로 본인 루틴을 공유해 주세요",
    "estimated_total_duration_sec": 58
  },
  "scenes": [
    {
      "scene_id": "scene_1",
      "purpose": "문제 제기",
      "duration_sec": 8,
      "start_time": 0,
      "end_time": 8,
      "tts_text": "월급은 들어오는데 왜 통장은 늘 비어 있을까요?",
      "subtitle_lines": ["월급은 들어오는데", "통장은 왜 비어 있을까?"],
      "keywords": ["월급관리", "생활비", "루틴"],
      "visual_type": "image",
      "image_prompt_ko": "퇴근 후 지갑을 정리하는 직장인, 따뜻한 조명",
      "image_prompt_en": "Office worker organizing wallet after work, warm lighting",
      "negative_prompt": "low quality, blurry, watermark",
      "aspect_ratio": "16:9",
      "camera_motion": "slow zoom in",
      "transition_to_next": "fade",
      "overlay_text": "돈이 모이지 않는 이유",
      "overlay_position": "center",
      "sfx_optional": "soft whoosh",
      "bgm_mood_optional": "calm lo-fi"
    }
  ]
}
```

## 5) 다음 단계(업로드/매핑) 연결 방식
- 이번 단계 output은 모두 JSON 객체라서 다음 단계에서 쉽게 매핑 가능합니다.
- 예시:
  - `RenderJsonNode.output.scenes[].image_prompt_en` → 이미지 생성 API 입력
  - `RenderJsonNode.output.scenes[].tts_text` → TTS API 입력
  - 생성 완료 후 결과 URL을 scene에 `image_url`, `tts_url` 같은 추가 필드로 합쳐도 flexible 모드에서 유지됩니다.
