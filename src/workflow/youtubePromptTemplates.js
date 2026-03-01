import { resolvePromptTemplateWithMentions, formatReferenceTextFromOutput } from "../utils/promptMentions";
const DEFAULT_PROMPT_TEMPLATES = {
  ContentInputNode: "",
  ScriptNode: "",
  SceneBreakdownNode: "",
  ImagePromptNode: "",
  MotionSubtitleNode: "",
  RenderJsonNode: "",
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
      text: typeof ref.manualResult === "string" && ref.manualResult.trim()
        ? ref.manualResult.trim()
        : formatReferenceTextFromOutput(upstreamData?.[ref.nodeId]),
    }))
  );

  return String(template || "");
}
