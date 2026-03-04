# 모바일 UX QA 체크리스트 (Production 중심)

## 1) 스타일 클래스 인벤토리 (`src/styles.css` 기준)

### 인터랙션 요소
- `.ui-button`
- `.ui-tabs-trigger`
- `.production-tab-btn`
- `.production-btn`

### 상태/보조 텍스트 요소
- `.status-badge`
- `.console-subtitle`
- `.draft-saved-badge`
- `.production-subtitle`
- `.production-subtitle-muted`
- `.production-project-id`
- `.production-message`
- `.render-job-progress-text`
- `.render-job-failed-reason`

## 2) 최소 모바일 지원 해상도
- 360 x 800
- 390 x 844
- 430 x 932
- 768 x 1024

## 3) 필수 시나리오
1. 프로젝트 생성 (작업 시작)
2. 노드 추가 및 render_json 저장
3. 에셋 업로드/매핑
4. 렌더 시작 및 상태/로그 확인

## 4) 검증 기준

### 레이아웃 깨짐
- 텍스트 잘림, 버튼 겹침, 가로 스크롤이 없는지 확인.
- `production-content`, `render-job-card`, `console-item` 사이 간격이 충분한지 확인.

### 터치 타깃
- 버튼/탭/주요 클릭 영역 최소 높이 44px.
- 오조작 없이 단일 탭으로 90% 이상 성공.

### 텍스트 가독성
- 본문 최소 14px.
- 보조 텍스트 최소 12px.
- 상태 배지/경고/오류 문구가 대비(어두운 텍스트 + 밝은 배경)로 식별 가능한지 확인.

### 스크롤 충돌
- 상단/하단 고정 영역(헤더, 모바일 CTA)과 본문 스크롤 충돌이 없는지 확인.
- 아코디언 확장/축소 시 탭 전환 오동작이 없는지 확인.

## 5) 간이 QA 클릭 미스율 기준 (변경 전/후 비교)
- **측정 방식:** 주요 10개 터치 행동(탭 전환, 업로드 영역 선택, 다음 단계, 렌더 시작)을 3회씩 반복.
- **지표:** 잘못된 UI가 열리거나 의도와 다른 동작이 발생한 횟수 / 총 시도 횟수.
- **합격 기준:**
  - 변경 후 클릭 미스율 5% 이하.
  - 변경 전 대비 최소 30% 이상 개선.

## 6) 주요 컴포넌트 수동 점검 루틴
- `TopToolbar`: 버튼 높이/문구 잘림/상태 메시지 확인.
- `WorkflowEditor`: 노드 추가 FAB, 캔버스 스크롤/확대 축소 충돌 확인.
- `RightExecutionPanel`: 탭/상태 배지/로그 카드 터치 영역 확인.
- `ProductionWorkspace`: 단계 전환, 누락 안내, 하단 CTA 동작 확인.

## 7) 릴리즈 품질 게이트 운영
- PR 체크리스트에 모바일 항목 포함.
- 릴리즈 전 필수로 위 시나리오를 실행.
- 분기별 모바일 UI 회고(회귀 이슈/개선점 정리) 진행.
