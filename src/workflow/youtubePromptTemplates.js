import { resolvePromptTemplateWithMentions, formatReferenceTextFromOutput } from "../utils/promptMentions";
function pretty(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const DEFAULT_PROMPT_TEMPLATES = {
  ContentInputNode: [
    "콘텐츠 입력 노드입니다.",
    "현재 입력된 주제/타깃 정보를 아래 JSON으로 유지하세요.",
    "{{node_config_json}}",
  ].join("\n\n"),
  ScriptNode: [
    "당신은 유튜브 쇼츠 대본 작가입니다.",
    "아래 연결된 상위 노드의 결과를 참고해 60초 내외 스크립트를 작성하세요.",
    "출력은 JSON: {\"title\":\"\",\"hook\":\"\",\"script\":\"\",\"cta\":\"\"}",
    "# 연결된 상위 노드",
    "{{upstream_summary}}",
    "# 상위 노드 전달 데이터(JSON)",
    "{{upstream_json}}",
    "# 노드 설정(JSON)",
    "{{node_config_json}}",
  ].join("\n\n"),
  SceneBreakdownNode: [
    "당신은 영상 연출 기획자입니다.",
    "대본을 장면 단위로 분해하세요.",
    "출력은 JSON: {\"scenes\":[{\"scene_id\":\"scene_1\",\"purpose\":\"\",\"duration_sec\":8,\"tts_text\":\"\",\"keywords\":[\"\"]}]}",
    "# 연결된 상위 노드",
    "{{upstream_summary}}",
    "# 상위 노드 전달 데이터(JSON)",
    "{{upstream_json}}",
    "# 노드 설정(JSON)",
    "{{node_config_json}}",
  ].join("\n\n"),
  ImagePromptNode: [
    "당신은 AI 이미지 프롬프트 디자이너입니다.",
    "장면별 이미지 프롬프트를 작성하세요.",
    "출력은 JSON: {\"scene_prompts\":[{\"scene_id\":\"scene_1\",\"visual_type\":\"image\",\"image_prompt_ko\":\"\",\"image_prompt_en\":\"\",\"negative_prompt\":\"\",\"aspect_ratio\":\"16:9\"}]}",
    "# 연결된 상위 노드",
    "{{upstream_summary}}",
    "# 상위 노드 전달 데이터(JSON)",
    "{{upstream_json}}",
    "# 노드 설정(JSON)",
    "{{node_config_json}}",
  ].join("\n\n"),
  MotionSubtitleNode: [
    "당신은 모션 그래픽/자막 기획자입니다.",
    "Script + Scene 정보를 함께 참고해 자막/TTS/카메라모션을 분리하세요.",
    "출력은 JSON: {\"scene_motion\":[{\"scene_id\":\"scene_1\",\"camera_motion\":\"slow zoom in\",\"subtitle_lines\":[\"\"],\"tts_text\":\"\",\"transition_to_next\":\"cut\"}]}",
    "# 연결된 상위 노드",
    "{{upstream_summary}}",
    "# 상위 노드 전달 데이터(JSON)",
    "{{upstream_json}}",
    "# 노드 설정(JSON)",
    "{{node_config_json}}",
  ].join("\n\n"),
  RenderJsonNode: [
    "당신은 영상 렌더 JSON 조립기입니다.",
    "Scene + Image + Motion 결과를 합쳐 최종 render_json을 작성하세요.",
    "최종 출력은 meta + scenes 배열을 가진 JSON만 반환하세요.",
    "# 연결된 상위 노드",
    "{{upstream_summary}}",
    "# 상위 노드 전달 데이터(JSON)",
    "{{upstream_json}}",
    "# 노드 설정(JSON)",
    "{{node_config_json}}",
  ].join("\n\n"),
};

export function getDefaultPromptTemplate(nodeType) {
  return DEFAULT_PROMPT_TEMPLATES[nodeType] || "{{upstream_json}}\n\n{{node_config_json}}";
}

export function buildPromptByNodeType(nodeType, config, resolvedInput) {
  const rawTemplate = config?.promptTemplate || getDefaultPromptTemplate(nodeType);
  const refs = Array.isArray(resolvedInput?._upstreamRefs) ? resolvedInput._upstreamRefs : [];
  const upstreamData = resolvedInput?._upstreamData || {};
  const template = resolvePromptTemplateWithMentions(
    rawTemplate,
    refs.map((ref) => ({
      id: ref.nodeId,
      label: ref.label,
      mentionToken: ref.label,
      text: formatReferenceTextFromOutput(upstreamData?.[ref.nodeId]),
    }))
  );
  const summary = refs.length
    ? refs.map((ref) => `- ${ref.label} (${ref.type}, id=${ref.nodeId})`).join("\n")
    : "- 연결된 상위 노드가 없습니다.";
  const context = {
    upstream_summary: summary,
    upstream_json: pretty(resolvedInput?._upstreamData || {}),
    node_config_json: pretty(config || {}),
    resolved_input_json: pretty(resolvedInput || {}),
  };

  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? "");
}
