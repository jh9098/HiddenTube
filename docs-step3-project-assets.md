# 3단계 구현 문서 — 프로젝트 저장 + 장면별 자산 업로드/매핑/검증

## 1) 저장 구조
백엔드는 로컬 파일 시스템 기준으로 프로젝트를 아래와 같이 저장합니다.

- `/backend/projects/{project_id}/images/`
- `/backend/projects/{project_id}/audio/`
- `/backend/projects/{project_id}/bgm/`
- `/backend/projects/{project_id}/sfx/`
- `/backend/projects/{project_id}/renders/`
- `/backend/projects/{project_id}/meta/project.json`
- `/backend/projects/{project_id}/meta/asset_map.json`

`project.json`에는 아래 필드를 저장합니다.
- `project_id`
- `title`
- `workflow_json`
- `node_outputs`
- `render_json`
- `created_at`
- `updated_at`

## 2) API 목록
- `POST /api/projects`: 프로젝트 생성
- `GET /api/projects/{project_id}`: 프로젝트 메타 + 자산 목록 + 매핑 조회
- `PUT /api/projects/{project_id}`: 프로젝트 메타 갱신
- `POST /api/projects/{project_id}/upload/image`: 이미지 업로드 + 자동 매핑
- `POST /api/projects/{project_id}/upload/audio`: 오디오 업로드 + 자동 매핑
- `POST /api/projects/{project_id}/upload/bgm`: BGM 업로드
- `GET /api/projects/{project_id}/assets`: 자산 목록/매핑 조회
- `PUT /api/projects/{project_id}/assets/map`: 수동 매핑 갱신
- `POST /api/projects/{project_id}/validate-render`: 렌더 전 검증 실행

## 3) 자동 매핑 규칙
업로드 파일명에서 `scene_id`를 추론합니다.

- `scene_01.png` → `scene_01`
- `01.png`, `1.png` → 장면 번호 기반 `scene_01` 또는 장면 순서 매핑
- 파일명에 scene_id 문자열이 직접 들어있으면 우선 매핑
- 사용자가 `scene_id`를 수동 입력하면 자동 규칙보다 우선
- 추론 실패 시 `unmapped` 상태로 저장되고, UI에서 수동 재배정 가능

## 4) 검증 규칙
`POST /validate-render`에서 아래를 검사합니다.

- `render_json` 존재 여부
- `render_json.scenes` 배열 유효성
- `scene_id` 중복 여부
- 장면별 이미지/오디오 매핑 존재 여부
- `subtitle_lines` 형식 유효성
- `duration_sec` 합계와 씬 시간(start/end) 정합성
- 누락 자산 목록(`missing_assets`) 생성

## 5) 프론트-백 연결 방식
- 프론트는 `src/api/projectApi.js`에서 FastAPI로 fetch 요청합니다.
- 기본 API URL은 `VITE_API_BASE_URL`(없으면 `http://localhost:8000`)입니다.
- `ProjectAssetsPanel`에서 프로젝트 생성/저장/불러오기, 파일 업로드, 수동 매핑, 검증 호출까지 처리합니다.
- 기존 노드 에디터의 `nodes/edges`에서 `workflow_json`, `node_outputs`, `render_json`를 추출해 저장합니다.
