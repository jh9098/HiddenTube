import { nanoid } from "nanoid";

export const WORKFLOW_STORAGE_KEY = "hiddentube_workflow_v1";

export const NODE_STATUSES = ["idle", "ready", "running", "done", "error"];

export const NODE_CATALOG = [
  {
    type: "ContentInputNode",
    label: "내용입력",
    description: "영상 주제, 타깃, 길이 같은 기본 정보를 입력합니다.",
    configShape: {
      topic: "",
      originalText: "",
      targetAudience: "",
      tone: "정보형",
      cta: "",
      durationSec: 60,
    },
  },
  {
    type: "ScriptNode",
    label: "대본생성",
    description: "입력 정보를 바탕으로 영상 스크립트 프롬프트를 만듭니다.",
    configShape: { language: "ko", formatHint: "shorts" },
  },
  {
    type: "SceneBreakdownNode",
    label: "장면분해",
    description: "대본을 장면 단위로 쪼개는 프롬프트를 만듭니다.",
    configShape: { sceneCount: 6 },
  },
  {
    type: "ImagePromptNode",
    label: "이미지생성프롬프트",
    description: "장면별 이미지 생성용 프롬프트를 구성합니다.",
    configShape: { style: "cinematic", aspectRatio: "16:9" },
  },
  {
    type: "MotionSubtitleNode",
    label: "카메라모션+자막/TTS분리",
    description: "모션/자막/TTS 분리 프롬프트를 구성합니다.",
    configShape: { subtitle: true, ttsVoice: "female_ko_1" },
  },
  {
    type: "RenderJsonNode",
    label: "FFmpeg용 JSON",
    description: "렌더링용 최종 JSON 초안을 만듭니다.",
    configShape: { parseMode: "flexible", safetyNotes: "", aspectRatio: "16:9" },
  },

];

export function getNodeDefinition(nodeType) {
  return NODE_CATALOG.find((node) => node.type === nodeType) ?? NODE_CATALOG[0];
}

export function makeNodeData(nodeType) {
  const definition = getNodeDefinition(nodeType);
  return {
    type: nodeType,
    label: definition.label,
    description: definition.description,
    config: { ...definition.configShape },
    resolvedInput: {},
    generatedPrompt: "",
    manualResult: "",
    parsedOutput: {},
    parseError: "",
    output: {},
    status: "idle",
  };
}

export function createWorkflowNode(nodeType, position = { x: 120, y: 120 }) {
  return {
    id: nanoid(),
    type: nodeType,
    position,
    data: makeNodeData(nodeType),
  };
}

export function serializeWorkflow(workflow) {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      ...workflow,
    },
    null,
    2
  );
}

export function deserializeWorkflow(rawText) {
  const parsed = JSON.parse(rawText);
  if (!Array.isArray(parsed?.nodes) || !Array.isArray(parsed?.edges)) {
    throw new Error("워크플로우 JSON 형식이 올바르지 않습니다.");
  }
  return {
    nodes: parsed.nodes,
    edges: parsed.edges,
  };
}
