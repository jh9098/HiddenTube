import {
  ROLE_OPTIONS,
  PROVIDER_OPTIONS,
  MODELS_BY_ROLE,
  DEFAULT_OUTPUT_KEY_BY_ROLE,
  DEFAULT_INSTRUCTIONS_BY_ROLE,
  DEFAULT_PROMPT_BY_ROLE,
} from "./catalog.js";

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
      { name: "value", label: "값 (value)", type: "textarea", placeholder: "예: 보험/경제 이슈" },
    ],
  },

  generate: {
    label: "AI 작업 (Manual Assisted)",
    category: "Generate",
    description:
      "역할/모델을 선택하고(초기엔 저장만), 프롬프트를 복사해 AI에서 결과를 받아 붙여넣습니다.",
    defaultConfig: {
      roleType: "text",
      provider: "google",
      modelId: "Gemini 3 Flash",
      outputKey: "script_text",
      instructions: DEFAULT_INSTRUCTIONS_BY_ROLE.text,
      promptTemplate: DEFAULT_PROMPT_BY_ROLE.text,

      // 수동 결과(초기 MVP)
      manualText: "",
      manualUrl: "",
      manualFileName: "",
    },
    fields: [
      { name: "roleType", label: "역할(Role)", type: "roleSelect" },
      { name: "provider", label: "Provider", type: "providerSelect" },
      { name: "modelId", label: "모델(Model)", type: "modelSelect" },
      { name: "outputKey", label: "출력 키(outputKey)", type: "text", placeholder: "script_text" },
      { name: "instructions", label: "이 단계에서 할 일(설명)", type: "textarea" },
      { name: "promptTemplate", label: "프롬프트 템플릿", type: "textarea" },
    ],
  },

  output: {
    label: "출력 (Output)",
    category: "Output",
    description: "최종 결과를 보여줍니다(초기엔 수동 합성/업로드 결과도 저장 가능).",
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

export const ROLE_META = {
  options: ROLE_OPTIONS,
  providers: PROVIDER_OPTIONS,
  modelsByRole: MODELS_BY_ROLE,
  defaultOutputKeyByRole: DEFAULT_OUTPUT_KEY_BY_ROLE,
  defaultInstructionsByRole: DEFAULT_INSTRUCTIONS_BY_ROLE,
  defaultPromptByRole: DEFAULT_PROMPT_BY_ROLE,
};

export function makeNodeData(type) {
  const def = NODE_DEFS[type];
  return {
    type,
    label: def.label,
    config: structuredClone(def.defaultConfig),
    status: "idle", // idle | todo | doing | done | error
    output: null,   // 노드 산출물(수동 입력 후 "적용" 시 채워짐)
    outputPreview: "",
    lastError: "",
  };
}
