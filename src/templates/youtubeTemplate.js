import { nanoid } from "nanoid";
import { makeNodeData } from "../utils/workflowData";

const TEMPLATE_STEPS = [
  "ContentInputNode",
  "ScriptNode",
  "SceneBreakdownNode",
  "ImagePromptNode",
  "MotionSubtitleNode",
  "RenderJsonNode",
  "AssetUploadNode",
  "RenderNode",
  "OutputNode",
];

export function createYoutubeTemplate() {
  const startX = 80;
  const gapX = 260;
  const y = 180;

  const nodes = TEMPLATE_STEPS.map((nodeType, index) => ({
    id: nanoid(),
    type: nodeType,
    position: { x: startX + gapX * index, y },
    data: makeNodeData(nodeType),
  }));

  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: nanoid(),
    source: node.id,
    target: nodes[index + 1].id,
    animated: false,
  }));

  return { nodes, edges };
}
