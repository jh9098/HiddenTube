import { renderTemplate } from "./runner.js";

export function extractVarKeys(vars) {
  return Object.keys(vars || {}).sort();
}

export function buildJsonResponsePrompt(promptTemplate, vars, schemaConfig = {}) {
  const renderedTask = renderTemplate(promptTemplate || "", vars);
  const responseMode = schemaConfig.responseMode || "schema";

  if (responseMode === "freeform") {
    const guide = (schemaConfig.freeformGuide || "").trim();
    return [
      "아래 작업 지시를 수행하고, 답변은 자유 형식으로 작성하세요.",
      guide ? `추가 가이드: ${guide}` : "",
      "",
      "[작업 지시]",
      renderedTask || "(작업 지시가 비어 있습니다. 필요한 작업을 작성하세요.)",
      "",
      "[업스트림 변수(참고용)]",
      JSON.stringify(vars || {}, null, 2),
    ]
      .filter(Boolean)
      .join("\n");
  }

  const schema = schemaConfig.schema || {
    type: "object",
    required: ["result_text", "used_inputs"],
    properties: {
      result_text: { type: "string", description: "결과 본문" },
      used_inputs: { type: "object", additionalProperties: true },
    },
    additionalProperties: true,
  };

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
    "- 모든 키 이름은 영어 snake_case 권장",
    "",
    JSON.stringify(schema, null, 2),
  ].join("\n");
}
