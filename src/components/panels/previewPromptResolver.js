import { buildPromptByNodeType } from "../../workflow/youtubePromptTemplates";
import { buildIncomingRefs, getNodePreferredOutput } from "../../workflow/executionContext";

export function resolvePreviewPrompt(node, nodes, edges, manualResponses) {
  if (!node) return "";

  const currentPromptTemplate = node.data?.config?.promptTemplate || "";
  const nodeMap = new Map((nodes || []).map((item) => [item.id, item]));
  const outputMap = new Map((nodes || []).map((item) => {
    const manualText = manualResponses?.[item.id];
    if (typeof manualText === "string" && manualText.trim()) {
      return [item.id, { raw_text: manualText.trim() }];
    }
    return [item.id, getNodePreferredOutput(item)];
  }));
  const { merged, refs } = buildIncomingRefs(node.id, edges || [], nodeMap, outputMap);

  const patchedRefs = refs.map((ref) => {
    const manualText = manualResponses?.[ref.nodeId];
    if (typeof manualText === "string" && manualText.trim()) {
      return { ...ref, manualResult: manualText.trim() };
    }
    return ref;
  });

  const resolvedInput = {
    ...merged,
    _upstreamRefs: patchedRefs,
    _upstreamData: Object.fromEntries(patchedRefs.map((ref) => [ref.nodeId, ref.output])),
  };

  const resolvedPrompt = buildPromptByNodeType(node.type, node.data?.config, resolvedInput);

  return String(resolvedPrompt || currentPromptTemplate);
}
