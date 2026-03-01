import { buildPromptByNodeType } from "../../workflow/youtubePromptTemplates";
import { buildIncomingRefs, getNodePreferredOutput } from "../../workflow/executionContext";

export function resolvePreviewPrompt(node, nodes, edges) {
  if (!node) return "";

  const currentPromptTemplate = node.data?.config?.promptTemplate || "";
  const nodeMap = new Map((nodes || []).map((item) => [item.id, item]));
  const outputMap = new Map((nodes || []).map((item) => [item.id, getNodePreferredOutput(item)]));
  const { merged, refs } = buildIncomingRefs(node.id, edges || [], nodeMap, outputMap);

  const resolvedInput = {
    ...merged,
    _upstreamRefs: refs,
    _upstreamData: Object.fromEntries(refs.map((ref) => [ref.nodeId, ref.output])),
  };

  const resolvedPrompt = buildPromptByNodeType(node.type, node.data?.config, resolvedInput);

  return String(resolvedPrompt || currentPromptTemplate);
}
