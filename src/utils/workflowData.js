import { nanoid } from "nanoid";

export const WORKFLOW_STORAGE_KEY = "hiddentube_workflow_v1";

export const NODE_STATUSES = ["idle", "ready", "running", "done", "error"];

export const NODE_CATALOG = [
  {
    type: "ContentInputNode",
    label: "내용입력",
    description: "영상 주제, 타깃, 길이 같은 기본 정보를 입력합니다.",
    configShape: { topic: "", audience: "", durationSec: 60 },
  },
  {
    type: "ScriptNode",
    label: "대본생성",
    description: "입력 정보를 바탕으로 영상 스크립트를 준비합니다.",
    configShape: { tone: "정보형", language: "ko" },
  },
  {
    type: "SceneBreakdownNode",
    label: "장면분해",
    description: "대본을 장면 단위로 쪼개고 구성안을 만듭니다.",
    configShape: { sceneCount: 6 },
  },
  {
    type: "ImagePromptNode",
    label: "이미지생성프롬프트",
    description: "장면별 이미지 생성용 프롬프트를 정리합니다.",
    configShape: { style: "cinematic", aspectRatio: "16:9" },
  },
  {
    type: "MotionSubtitleNode",
    label: "카메라모션+자막/TTS분리",
    description: "모션, 자막, 내레이션 트랙을 분리 설계합니다.",
    configShape: { subtitle: true, ttsVoice: "female_ko_1" },
  },
  {
    type: "RenderJsonNode",
    label: "FFmpeg용 JSON",
    description: "렌더링 파이프라인에서 사용할 중간 JSON 구조를 만듭니다.",
    configShape: { fps: 30, resolution: "1920x1080" },
  },
  {
    type: "AssetUploadNode",
    label: "자산업로드",
    description: "이미지/영상/오디오 같은 파일 자산을 연결합니다.",
    configShape: { source: "local", folder: "" },
  },
  {
    type: "RenderNode",
    label: "렌더",
    description: "렌더 실행 설정을 준비합니다.",
    configShape: { renderer: "ffmpeg", quality: "high" },
  },
  {
    type: "OutputNode",
    label: "결과출력",
    description: "최종 산출물 경로와 메타데이터를 확인합니다.",
    configShape: { outputFormat: "mp4" },
  },
];

export function getNodeDefinition(nodeType) {
  return NODE_CATALOG.find((node) => node.type === nodeType) ?? NODE_CATALOG[0];
}

export function makeNodeData(nodeType) {
  const definition = getNodeDefinition(nodeType);
  return {
    label: definition.label,
    description: definition.description,
    config: { ...definition.configShape },
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
