import { topoSort } from "./runner";
import { buildPromptByNodeType } from "./youtubePromptTemplates";
import {
  buildAdjacency,
  buildIncomingRefs,
  getNodePreferredOutput,
  parseManualResult,
  toNodeOutput,
} from "./executionContext";

function isReachableFrom(startId, targetId, adjacency) {
  if (startId === targetId) return true;
  const visited = new Set([startId]);
  const queue = [startId];

  while (queue.length) {
    const current = queue.shift();
    const nexts = adjacency.get(current) || [];
    for (const next of nexts) {
      if (next === targetId) return true;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return false;
}

function shouldRunNode(nodeId, startNodeId, runMode, adjacency) {
  if (!startNodeId) return true;
  if (runMode === "single") return nodeId === startNodeId;
  return isReachableFrom(startNodeId, nodeId, adjacency);
}

export function executeNodes(nodes, edges, { startNodeId = null, runMode = "downstream" } = {}) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = buildAdjacency(nodes, edges);

  let order = [];
  try {
    order = topoSort(nodes, edges);
  } catch (error) {
    return nodes.map((node) => {
      const shouldRun = shouldRunNode(node.id, startNodeId, runMode, adjacency);
      if (!shouldRun) return node;
      return {
        ...node,
        data: {
          ...node.data,
          status: "error",
          runError: error.message,
        },
      };
    });
  }

  const outputMap = new Map(nodes.map((node) => [node.id, getNodePreferredOutput(node)]));
  const updatedById = new Map();

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const shouldRun = shouldRunNode(nodeId, startNodeId, runMode, adjacency);
    if (!shouldRun) {
      updatedById.set(nodeId, node);
      continue;
    }

    const { refs, merged } = buildIncomingRefs(nodeId, edges, nodeMap, outputMap);
    const resolvedInput = {
      ...merged,
      _upstreamRefs: refs.map((ref) => ({
        nodeId: ref.nodeId,
        label: ref.label,
        type: ref.type,
        manualResult: ref.manualResult,
      })),
      _upstreamData: Object.fromEntries(refs.map((ref) => [ref.nodeId, ref.output])),
    };

    const mode = node.data.config?.parseMode || "flexible";
    const generatedPrompt = buildPromptByNodeType(node.type, node.data.config, resolvedInput);
    const manualResult = node.data.manualResult || "";

    const { parsedOutput, parseError } = parseManualResult(
      node.type,
      manualResult,
      mode,
      merged,
      node.data.config
    );

    const output = toNodeOutput(node.type, parsedOutput, node.data.config);

    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        resolvedInput,
        generatedPrompt,
        parsedOutput,
        output,
        parseError,
        status: parseError ? "error" : "done",
        upstreamNodeIds: refs.map((ref) => ref.nodeId),
        upstreamNodeSummaries: refs.map((ref) => ({
          nodeId: ref.nodeId,
          type: ref.type,
          label: ref.label,
        })),
        runError: "",
      },
    };

    updatedById.set(nodeId, updatedNode);
    outputMap.set(nodeId, output);
  }

  return nodes.map((node) => updatedById.get(node.id) || node);
}

export function buildPromptPackage(nodes) {
  return nodes
    .map((node) => {
      const prompt = node.data.generatedPrompt || "(생성된 프롬프트 없음)";
      return [`## ${node.data.label}`, `node_type: ${node.type}`, prompt].join("\n");
    })
    .join("\n\n");
}
