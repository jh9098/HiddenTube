---
name: verify-implementation
description: 프로젝트 구현 결과가 팀 규칙(컴포넌트 네이밍, 폴더 구조, 모듈 분리, Firestore 읽기 비용 점검)을 지키는지 자동 점검하고 수정 우선순위를 제시한다. /verify-implementation 실행, 배포 전 규격 검증, 또는 "우리 스탠다드대로 고쳐줘" 요청 시 사용한다.
---

# Verify Implementation Skill

1. `npm run verify-implementation`을 실행해 현재 위반 사항을 수집한다.
2. 위반 항목을 심각도 순서로 정리한다.
   - 빌드/런타임 장애
   - 규칙 위반(네이밍, 구조)
   - 유지보수 경고(파일 과대 길이)
3. Firestore 읽기 관련 패턴이 있으면 `references/firestore-read-checklist.md` 기준으로 최적화 제안을 작성한다.
4. 수정 작업 후 검증 명령을 다시 실행해 개선 여부를 확인한다.
5. 사용자에게는 다음 포맷으로 보고한다.
   - 변경 요약
   - 검증 명령 결과
   - Firestore 읽기 소모 검토 결과

## Rule Source

- 프로젝트별 커스텀 규칙: `references/project-rules.md`
- Firestore 읽기 점검: `references/firestore-read-checklist.md`
