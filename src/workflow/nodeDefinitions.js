export const NODE_DEFS = {
  input: {
    label: "입력 (Input)",
    category: "Input",
    description: "주제/키워드 등 시작 데이터를 넣습니다.",
    defaultConfig: {
      key: "topic",
      value: "유튜브 쇼츠 주제",
    },
    fields: [
      { name: "key", label: "키 (key)", type: "text", placeholder: "topic" },
      { name: "value", label: "값 (value)", type: "textarea", placeholder: "예: 건강 뉴스" },
    ],
  },
  generate: {
    label: "생성 (Generate/LLM)",
    category: "Generate",
    description: "프롬프트 템플릿으로 텍스트를 생성(여기선 시뮬레이션)합니다.",
    defaultConfig: {
      model: "gemini-1.5-pro (mock)",
      temperature: 0.7,
      promptTemplate:
        "주제: {{topic}}\n타겟: {{target}}\n\n위 내용을 바탕으로 20초 쇼츠 대본(훅 1줄 + 3포인트)을 생성해줘.",
    },
    fields: [
      { name: "model", label: "모델", type: "text", placeholder: "gemini..." },
      { name: "temperature", label: "온도(0~1)", type: "number", placeholder: "0.7" },
      { name: "promptTemplate", label: "프롬프트 템플릿", type: "textarea" },
    ],
  },
  output: {
    label: "출력 (Output)",
    category: "Output",
    description: "최종 결과를 보여줍니다.",
    defaultConfig: {
      format: "text",
      title: "최종 결과",
    },
    fields: [
      { name: "title", label: "제목", type: "text", placeholder: "최종 결과" },
      { name: "format", label: "포맷", type: "select", options: ["text", "json"] },
    ],
  },
};

export function makeNodeData(type) {
  const def = NODE_DEFS[type];
  return {
    type,
    label: def.label,
    config: structuredClone(def.defaultConfig),
    status: "idle", // idle | running | success | error
    output: null,   // 실행 결과 (객체)
    outputPreview: "",
    lastError: "",
  };
}
