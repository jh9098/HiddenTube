const PROMPT_NODE_ORDER = [
  "ContentInputNode",
  "ScriptNode",
  "SceneBreakdownNode",
  "ImagePromptNode",
  "MotionSubtitleNode",
  "RenderJsonNode",
];

function parseRenderJsonFromNodes(nodes) {
  const renderNode = nodes.find((node) => node.type === "RenderJsonNode");
  if (!renderNode) return {};

  if (renderNode.data?.parsedOutput && Object.keys(renderNode.data.parsedOutput).length > 0) {
    return renderNode.data.parsedOutput;
  }

  if (!renderNode.data?.manualResult) {
    return {};
  }

  try {
    return JSON.parse(renderNode.data.manualResult);
  } catch {
    return {};
  }
}

export function buildNodeOutputs(nodes) {
  return nodes.reduce((acc, node) => {
    acc[node.id] = {
      type: node.type,
      label: node.data.label,
      output: node.data.output,
      parsedOutput: node.data.parsedOutput,
      manualResult: node.data.manualResult,
      status: node.data.status,
      parseError: node.data.parseError,
    };
    return acc;
  }, {});
}

export function buildProjectPayload({ title, nodes, edges }) {
  return {
    title,
    workflow_json: { nodes, edges },
    node_outputs: buildNodeOutputs(nodes),
    render_json: parseRenderJsonFromNodes(nodes),
  };
}

export function summarizeProjectReadiness({ nodes, assets, validation }) {
  const renderJson = parseRenderJsonFromNodes(nodes);
  const scenes = Array.isArray(renderJson?.scenes) ? renderJson.scenes : [];
  const sceneIds = scenes.map((scene) => scene?.scene_id).filter(Boolean);

  const imageMap = assets.asset_map?.images ?? {};
  const audioMap = assets.asset_map?.audio ?? {};

  const missingImageScenes = sceneIds.filter((sceneId) => !imageMap[sceneId]);
  const missingAudioScenes = sceneIds.filter((sceneId) => !audioMap[sceneId]);

  const promptNodes = PROMPT_NODE_ORDER.map((type) => nodes.find((node) => node.type === type)).filter(Boolean);
  const promptReadyCount = promptNodes.filter((node) => {
    const generated = String(node.data?.generatedPrompt ?? "").trim();
    return generated.length > 0;
  }).length;

  const manualInputDoneCount = promptNodes.filter((node) => {
    if (node.type === "ContentInputNode") {
      return String(node.data?.config?.topic ?? "").trim().length > 0;
    }
    return String(node.data?.manualResult ?? "").trim().length > 0;
  }).length;

  const parseErrorCount = nodes.filter((node) => String(node.data?.parseError ?? "").trim().length > 0).length;
  const blockingIssues = validation?.issues?.filter((issue) => issue.level === "error") ?? [];

  const needs = [];
  if (scenes.length === 0) needs.push("render_json 없음 또는 scenes 비어있음");
  if (missingImageScenes.length > 0) needs.push(`이미지 누락 ${missingImageScenes.length}건`);
  if (missingAudioScenes.length > 0) needs.push(`TTS/오디오 누락 ${missingAudioScenes.length}건`);
  if (parseErrorCount > 0) needs.push(`자막/JSON 파싱 문제 ${parseErrorCount}건`);
  if (blockingIssues.length > 0) needs.push(`검증 오류 ${blockingIssues.length}건`);

  return {
    renderJson,
    scenes,
    sceneIds,
    missingImageScenes,
    missingAudioScenes,
    promptReadyCount,
    promptTotalCount: promptNodes.length,
    manualInputDoneCount,
    manualInputTotalCount: promptNodes.length,
    parseErrorCount,
    blockingIssueCount: blockingIssues.length,
    needs,
    readyToRender: needs.length === 0,
  };
}

export function getRenderErrorHint(message) {
  const text = String(message ?? "");
  if (text.includes("scene(") && text.includes("자산 매핑 누락")) {
    return "장면별 매핑 표에서 해당 scene_id에 이미지/오디오를 모두 연결한 뒤 다시 렌더하세요.";
  }
  if (text.includes("사전 검증 실패")) {
    return "렌더 전 검증을 먼저 실행해서 오류 코드를 확인하고, 누락된 항목을 보완하세요.";
  }
  if (text.includes("duration 정보가 올바르지")) {
    return "render_json 각 scene의 duration_sec 또는 start/end 시간 정보를 다시 확인하세요.";
  }
  if (text.includes("폰트를 찾지 못했습니다")) {
    return "백엔드 환경변수 HIDDENTUBE_SUBTITLE_FONT에 사용할 폰트 경로를 설정하세요.";
  }
  if (text.includes("ffmpeg 명령 실패")) {
    return "업로드 파일 포맷과 손상 여부를 확인하고, render log를 다운로드해 ffmpeg 에러 줄을 확인하세요.";
  }
  return "오류 메시지를 확인한 뒤, render log를 열어 상세 원인을 확인하세요.";
}

export function getStatusBadgeClass(ok) {
  return ok ? "status-chip ok" : "status-chip warn";
}
