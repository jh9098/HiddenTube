# 노드 Context 전달 규칙 (Opal 방식 정리)

## 1) 어떤 upstream을 참조하나요?
- 기준은 **edge 방향(source -> target)** 입니다.
- 어떤 노드가 실행될 때, `target === 현재 노드 id` 인 edge의 source 노드만 참조합니다.
- 연결되지 않은 노드 출력은 절대 포함하지 않습니다.
- 실행 시점에 edge를 다시 계산하므로, 연결이 바뀌면 즉시 참조 컨텍스트도 바뀝니다.

## 2) 어떤 필드를 output으로 간주하나요?
노드 출력 우선순위:
1. `node.data.output` (정규화된 전달용 결과)
2. `node.data.parsedOutput` (JSON 파싱 성공 결과)
3. `node.data.manualResult` (텍스트/JSON 원문)

즉, 하위 노드는 가능한 한 `output`을 보고, 없으면 파싱 결과/수동 결과를 fallback으로 봅니다.

## 3) resolved prompt는 어떻게 만들어지나요?
각 노드는 `config.promptTemplate`(원본 템플릿)를 가집니다.
실행 시 아래 변수를 주입해서 `generatedPrompt`(resolved prompt)를 만듭니다.

- `{{upstream_summary}}`: 현재 연결된 상위 노드 목록 요약
- `{{upstream_json}}`: 상위 노드별 전달 데이터(JSON)
- `{{node_config_json}}`: 현재 노드 config(JSON)
- `{{resolved_input_json}}`: 내부 resolvedInput(JSON)

UI 패널에서 다음 4가지를 모두 확인할 수 있습니다.
- 원본 prompt template
- 참조 중인 상위 노드 목록
- resolved input/context
- resolved prompt

## 4) downstream에는 어떤 값이 전달되나요?
- 실행된 노드는 `output` 필드를 갱신합니다.
- 하위 노드는 upstream들의 output을 병합한 값을 기본 context로 받습니다.
- 내부 추적을 위해 `resolvedInput._upstreamRefs`, `resolvedInput._upstreamData` 메타도 함께 저장됩니다.

## 5) 실행 순서 / 순환 참조
- 실행 순서는 위상 정렬(topological sort)로 계산합니다.
- 사이클이 있으면 실행 실패로 처리하고, 실행 대상 노드를 `error` 상태로 바꿔 `runError`에 원인을 기록합니다.
