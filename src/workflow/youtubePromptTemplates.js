function pretty(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function buildPromptByNodeType(nodeType, config, resolvedInput) {
  const shared = `# config\n${pretty(config)}\n\n# resolved_input\n${pretty(resolvedInput)}`;

  if (nodeType === "ScriptNode") {
    return [
      "당신은 유튜브 쇼츠 대본 작가입니다.",
      "아래 입력을 기반으로 60초 내외 스크립트를 작성하세요.",
      "출력은 JSON으로: {\"title\":\"\",\"hook\":\"\",\"script\":\"\",\"cta\":\"\"}",
      shared,
    ].join("\n\n");
  }

  if (nodeType === "SceneBreakdownNode") {
    return [
      "당신은 영상 연출 기획자입니다.",
      "대본을 장면 단위로 분해하세요.",
      "출력은 JSON으로: {\"scenes\":[{\"scene_id\":\"scene_1\",\"purpose\":\"\",\"duration_sec\":8,\"tts_text\":\"\",\"keywords\":[\"\"]}]}",
      shared,
    ].join("\n\n");
  }

  if (nodeType === "ImagePromptNode") {
    return [
      "당신은 AI 이미지 프롬프트 디자이너입니다.",
      "장면별로 image_prompt_ko, image_prompt_en, negative_prompt를 작성하세요.",
      "출력은 JSON으로: {\"scene_prompts\":[{\"scene_id\":\"scene_1\",\"visual_type\":\"image\",\"image_prompt_ko\":\"\",\"image_prompt_en\":\"\",\"negative_prompt\":\"\",\"aspect_ratio\":\"16:9\"}]}",
      shared,
    ].join("\n\n");
  }

  if (nodeType === "MotionSubtitleNode") {
    return [
      "당신은 모션 그래픽/자막 편집 기획자입니다.",
      "장면별 camera_motion, subtitle_lines, tts_text, transition_to_next를 설계하세요.",
      "출력은 JSON으로: {\"scene_motion\":[{\"scene_id\":\"scene_1\",\"camera_motion\":\"\",\"subtitle_lines\":[\"\"],\"tts_text\":\"\",\"transition_to_next\":\"cut\",\"overlay_text\":\"\",\"overlay_position\":\"bottom-center\"}]}",
      shared,
    ].join("\n\n");
  }

  if (nodeType === "RenderJsonNode") {
    return [
      "당신은 영상 렌더 JSON 조립기입니다.",
      "최종 출력은 meta + scenes 배열을 가진 JSON만 반환하세요.",
      "기본 스키마 필드를 누락하지 말고 추가 필드는 유지하세요.",
      shared,
    ].join("\n\n");
  }

  return ["입력 노드", shared].join("\n\n");
}
