import { MODEL_OPTIONS, DEFAULT_PROMPT, ASSET_SOURCES } from "./catalog.js";

export const NODE_DEFS = {
  input: {
    label: "입력 (Input)",
    category: "Input",
    description: "주제/키워드/기본 정보를 넣습니다. (자동으로 output 변수로 내려감)",
    defaultConfig: {
      key: "topic",
      value: "유튜브 쇼츠 주제",
    },
    fields: [
      { name: "key", label: "키(key)", type: "text", placeholder: "topic" },
      { name: "value", label: "값(value)", type: "textarea", placeholder: "예: 오늘의 경제 이슈" },
    ],
  },

  generate: {
    label: "작업 (Generate/Manual)",
    category: "Generate",
    description: "모델 1개를 선택하고 prompt를 작성한 뒤 결과를 수동 입력합니다.",
    defaultConfig: {
      modelId: "Gemini 3 Flash",
      prompt: DEFAULT_PROMPT,
      manualText: "",
      manualUrl: "",
      manualFileName: "",
    },
    fields: [
      { name: "modelId", label: "모델(Model)", type: "modelSelect" },
      { name: "prompt", label: "prompt", type: "textarea" },
    ],
  },

  asset: {
    label: "자산 (Asset)",
    category: "Asset",
    description: "외부자료/파일/링크/텍스트를 변수로 저장합니다.",
    defaultConfig: {
      source: "upload",
      assetKey: "asset_1",
      title: "자료",
      notes: "",
      text: "",
      url: "",
      fileName: "",
    },
    fields: [
      { name: "source", label: "소스(Source)", type: "assetSourceSelect" },
      { name: "assetKey", label: "변수 키(assetKey)", type: "text", placeholder: "asset_1" },
      { name: "title", label: "제목", type: "text", placeholder: "자료" },
      { name: "notes", label: "메모", type: "textarea" },
    ],
  },

  output: {
    label: "출력 (Output)",
    category: "Output",
    description: "최종 결과를 모아 표시합니다.",
    defaultConfig: {
      title: "최종 결과",
      format: "text",
    },
    fields: [
      { name: "title", label: "제목", type: "text", placeholder: "최종 결과" },
      { name: "format", label: "포맷", type: "select", options: ["text", "json"] },
    ],
  },
};

export const META = {
  models: MODEL_OPTIONS,
  assetSources: ASSET_SOURCES,
};

export function makeNodeData(type) {
  const def = NODE_DEFS[type];
  return {
    type,
    label: def.label,
    config: structuredClone(def.defaultConfig),
    status: "idle",
    output: null,
    outputPreview: "",
    lastError: "",
  };
}
