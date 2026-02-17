import { renderTemplate } from "./runner.js";

export function extractVarKeys(vars) {
  return Object.keys(vars || {}).sort();
}

export function buildJsonResponsePrompt(promptTemplate, vars) {
  const renderedTask = renderTemplate(promptTemplate || "", vars);
  const varKeys = extractVarKeys(vars);
  const schemaProperties = varKeys.length
    ? varKeys
        .map(
          (key) =>
            `    "${key}": { "type": ["string", "number", "boolean", "object", "array", "null"], "description": "업스트림 노드에서 전달된 값" }`
        )
        .join(",\n")
    : "    \"note\": { \"type\": \"string\", \"description\": \"업스트림 입력이 없을 때 기본 안내\" }";

  return [
    "당신은 반드시 JSON만 반환해야 합니다. 설명 문장/코드블록/마크다운을 절대 포함하지 마세요.",
    "",
    "[작업 지시]",
    renderedTask || "(작업 지시가 비어 있습니다. 필요한 작업을 작성하세요.)",
    "",
    "[업스트림 변수(참고용)]",
    JSON.stringify(vars || {}, null, 2),
    "",
    "[반환 JSON 스키마 요구사항]",
    "- 아래 JSON Schema를 만족하는 JSON 객체 1개만 반환",
    "- 모든 키 이름은 영어 snake_case 사용",
    "- downstream에서 사용할 핵심 결과는 summary, result_text, keywords 배열에 반드시 채우기",
    "",
    "{",
    '  "type": "object",',
    '  "required": ["summary", "result_text", "keywords", "used_inputs"],',
    '  "properties": {',
    '    "summary": { "type": "string", "description": "결과 요약" },',
    '    "result_text": { "type": "string", "description": "다음 노드에서 바로 쓸 본문" },',
    '    "keywords": { "type": "array", "items": { "type": "string" }, "description": "핵심 키워드" },',
    '    "used_inputs": {',
    '      "type": "object",',
    '      "properties": {',
    schemaProperties,
    "      },",
    '      "additionalProperties": true',
    "    }",
    "  },",
    '  "additionalProperties": true',
    "}",
  ].join("\n");
}
