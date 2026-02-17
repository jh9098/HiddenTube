import {
  CAPABILITY_OPTIONS,
  PROVIDER_OPTIONS,
  MODELS_BY_CAPABILITY,
  DEFAULT_OUTPUT_KEY_BY_CAPABILITY,
  DEFAULT_TODO_BY_CAPABILITY,
  DEFAULT_PROMPT_BY_CAPABILITY,
  ASSET_SOURCES,
} from "./catalog.js";

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
    description:
      "할 일을 자유롭게 적고, 프롬프트를 복사해 AI에서 결과를 받아 붙여넣습니다.",
    defaultConfig: {
      capability: "text",
      provider: "google",
      modelId: "Gemini 3 Flash",
      outputKey: "script_text",

      // 자유 입력
      todo: DEFAULT_TODO_BY_CAPABILITY.text,
      promptTemplate: DEFAULT_PROMPT_BY_CAPABILITY.text,

      // 응답 형식 설정
      responseMode: "schema", // schema | freeform
      schemaMode: "template", // template | json
      schemaFieldsText: "",
      schemaText: "",
      freeformGuide: "",
      enforceCoreFields: true,

      // 수동 결과
      manualText: "",
      manualUrl: "",
      manualFileName: "",
    },
    fields: [
      { name: "capability", label: "기능(Capability)", type: "capabilitySelect" },
      { name: "provider", label: "Provider", type: "providerSelect" },
      { name: "modelId", label: "모델(Model)", type: "modelSelect" },
      { name: "outputKey", label: "출력 키(outputKey)", type: "text", placeholder: "script_text" },
      { name: "todo", label: "이 단계에서 할 일(자유 입력)", type: "textarea" },
      { name: "promptTemplate", label: "프롬프트 템플릿(자유)", type: "textarea" },
    ],
  },

  asset: {
    label: "자산 (Asset)",
    category: "Asset",
    description: "외부자료/파일/링크/텍스트를 변수로 저장합니다.",
    defaultConfig: {
      source: "upload",     // upload | drive | youtube | text | drawing
      assetKey: "asset_1",  // downstream 변수 키
      title: "자료",
      notes: "",

      // 값(수동)
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
  capabilities: CAPABILITY_OPTIONS,
  providers: PROVIDER_OPTIONS,
  modelsByCapability: MODELS_BY_CAPABILITY,
  defaultOutputKeyByCapability: DEFAULT_OUTPUT_KEY_BY_CAPABILITY,
  defaultTodoByCapability: DEFAULT_TODO_BY_CAPABILITY,
  defaultPromptByCapability: DEFAULT_PROMPT_BY_CAPABILITY,
  assetSources: ASSET_SOURCES,
};

export function makeNodeData(type) {
  const def = NODE_DEFS[type];
  return {
    type,
    label: def.label,
    config: structuredClone(def.defaultConfig),
    status: "idle", // idle | todo | doing | done | error
    output: null,   // 변수 객체 (업스트림으로 전달)
    outputPreview: "",
    lastError: "",
  };
}
