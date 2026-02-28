# 5단계 — 전체 연결 + 렌더 UX + API 확장 포인트

## 1) 현재 MVP 기능 목록
- 워크플로우 에디터에서 주제 입력부터 RenderJson 노드까지 프롬프트 체인을 구성/실행.
- 노드별 외부 AI 결과 수동 붙여넣기(manualResult) 및 파싱 결과 확인.
- 프로젝트 생성/저장/불러오기, 장면별 이미지/오디오/BGM 업로드 및 수동 재매핑.
- 렌더 전 검증(누락 자산, 타임라인, 자막 구조) 실행.
- 렌더 시작, 진행률 폴링, 실패 원인+해결 힌트, 완료 후 mp4/썸네일 미리보기 및 다운로드.

## 2) 실제 사용 흐름 (최종 사용자)
1. **주제 입력**: ContentInputNode config.topic 입력.
2. **프롬프트 생성**: 상단 `전체 프롬프트 실행`으로 Script/Scene/Image/Motion/RenderJson 프롬프트 생성.
3. **외부 결과 붙여넣기**: 각 노드 `manualResult`에 결과 JSON/텍스트를 입력.
4. **프로젝트 저장**: 프로젝트 생성 후 저장 버튼으로 서버 메타 반영.
5. **자산 업로드**: 이미지/TTS(오디오) 업로드, 필요 시 scene_id 수동 지정.
6. **자동/수동 매핑 확인**: 장면별 누락 셀을 확인하고 재배정.
7. **검증 실행**: 렌더 전 검증으로 에러/워닝 확인.
8. **렌더 실행**: 진행률과 상태를 확인.
9. **결과 확인/다운로드**: 썸네일/영상 미리보기 후 다운로드.

## 3) 화면별 설명
- **상단 툴바**: 저장/불러오기/템플릿/JSON 입출력 + 전체 프롬프트 실행.
- **캔버스**: React Flow 기반 노드 연결 및 실행 순서 편집.
- **오른쪽 패널(노드 상세)**: config JSON 편집, 프롬프트 확인, 외부 결과 붙여넣기, 파싱 결과 확인.
- **오른쪽 패널 하단(프로젝트/렌더)**:
  - 단계 상태 칩(프롬프트/붙여넣기/이미지/오디오)
  - “아직 필요한 것” 리스트
  - 자산 업로드/매핑/검증
  - 렌더 진행률 및 결과 미리보기

## 4) 프론트-백엔드 연결 구조
- 프론트
  - `projectApi`: 프로젝트/자산/검증 API 호출.
  - `renderApi`: 렌더 job 생성/조회 및 result/thumbnail/log URL 생성.
  - `projectWorkflowStatus`: 렌더 준비 상태 요약, 체크리스트, 오류 힌트 계산.
- 백엔드
  - `main.py`: 프로젝트 CRUD, 자산 매핑, 검증, 렌더 잡 생성/조회/결과 제공.
  - `render_engine.py`: ffmpeg 파이프라인 + 진행률 업데이트.
  - `render_job_store.py`: job 상태 저장 및 조회.

## 5) 렌더 진행 UX 요약
- 렌더 시작 시 job_id 생성(queued).
- 프론트는 1.2초 간격으로 상태 폴링.
- running 중 progress bar 갱신.
- failed 시 오류 본문 + 원인별 힌트 + log 링크 제공.
- done 시 썸네일/영상 내장 미리보기 + 다운로드 링크 제공.

## 6) 향후 API 연동 확장 포인트
### 백엔드 adapter/service 레이어
- `backend/app/services/generation_adapters.py`
  - `GenerationAdapter` 프로토콜, 요청/응답 DTO 정의.
- `backend/app/services/generation_service.py`
  - task_type 기준 어댑터 registry.
  - 현재는 미구현 fallback으로 명확한 확장 지점 확보.

### 확장 대상
- 이미지 생성 API: `task_type=image_generate` 어댑터 등록.
- TTS 생성 API: `task_type=tts_generate` 어댑터 등록.
- 장면 수 자동 확장: SceneBreakdown 출력 기준 scenes 재계산.
- 롱폼 16:9: `render_json.format`/`extensions.longform` 활용.
- 장면별 재렌더: scene 단위 부분 렌더 엔드포인트 추가.
- 프리셋 자막 스타일: `render_json.extensions.subtitle_preset` 추가.
- 여러 음성 선택: scene별 `voice_id` 확장.
- 자동 BGM 추천: `extensions.bgm_recommendation` 메타 저장.

## 7) 현재 제한사항
- 외부 생성 API는 아직 수동 붙여넣기 중심(MVP 의도).
- 프로젝트 불러오기 시 워크플로우 캔버스 자동 복원은 다음 단계.
- 자막 구조 검증은 기본 수준이며 스타일 프리셋 적용은 미구현.
- 렌더 실패 복구(자동 재시도)는 미구현.

## 8) 남은 리스크
- 사용자 입력 JSON 품질이 낮을 경우 parseError 증가.
- 대용량 파일 업로드 시 네트워크/디스크 이슈.
- ffmpeg 환경차(폰트 경로/코덱)로 렌더 실패 가능.

## 9) 다음 우선 개발 항목 제안
1. 프로젝트 불러오기 시 workflow_json 캔버스 복원 자동화.
2. 노드 타입 registry UI 개선(커스텀 노드 추가 wizard).
3. scene 단위 재렌더 API + 프론트 버튼.
4. 생성 API(이미지/TTS) 1개씩 adapter 실연동.
5. 렌더 완료물 버전 관리(이전 결과 비교/롤백).
