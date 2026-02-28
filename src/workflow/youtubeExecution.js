import { topoSort } from "./runner";
import { buildPromptByNodeType } from "./youtubePromptTemplates";
import { normalizeRenderJson } from "./renderJsonSchema";

function safeJsonParse(text) {
  if (!text || !text.trim()) return null;
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function mergeIncomingOutputs(nodeId, edges, outputMap) {
  const incoming = edges.filter((edge) => edge.target === nodeId);
  const merged = {};
  for (const edge of incoming) {
    Object.assign(merged, outputMap.get(edge.source) || {});
  }
  return merged;
}

function toNodeOutput(nodeType, parsedOutput, config) {
  if (nodeType === "ContentInputNode") {
    return {
      content_input: {
        topic: config.topic,
        original_text: config.originalText,
        target_audience: config.targetAudience,
        tone: config.tone,
        cta: config.cta,
        estimated_total_duration_sec: Number(config.durationSec || 60),
      },
    };
  }

  if (!parsedOutput || typeof parsedOutput !== "object") {
    return {};
  }

  return parsedOutput;
}

function buildRenderDraft(resolvedInput, config, mode) {
  const content = resolvedInput.content_input || {};
  const script = resolvedInput.script || {};
  const scenePack = resolvedInput.scenes ? { scenes: resolvedInput.scenes } : {};

  const imageMap = new Map((resolvedInput.scene_prompts || []).map((item) => [item.scene_id, item]));
  const motionMap = new Map((resolvedInput.scene_motion || []).map((item) => [item.scene_id, item]));

  let timeCursor = 0;

  const draft = {
    meta: {
      title: script.title || content.topic || "",
      target_audience: content.target_audience || content.targetAudience || "",
      tone: content.tone || "",
      safety_notes: config.safetyNotes || "",
      cta: script.cta || content.cta || "",
      estimated_total_duration_sec: Number(content.estimated_total_duration_sec || 60),
    },
    scenes: (scenePack.scenes || []).map((scene, index) => {
      const image = imageMap.get(scene.scene_id) || {};
      const motion = motionMap.get(scene.scene_id) || {};
      const duration = Number(scene.duration_sec || 8);
      const start = scene.start_time ?? timeCursor;
      const end = scene.end_time ?? start + duration;
      timeCursor = end;

      return {
        ...scene,
        scene_id: scene.scene_id || `scene_${index + 1}`,
        duration_sec: duration,
        start_time: start,
        end_time: end,
        tts_text: motion.tts_text || scene.tts_text || "",
        subtitle_lines: motion.subtitle_lines || [],
        visual_type: image.visual_type || "image",
        image_prompt_ko: image.image_prompt_ko || "",
        image_prompt_en: image.image_prompt_en || "",
        negative_prompt: image.negative_prompt || "",
        aspect_ratio: image.aspect_ratio || config.aspectRatio || "16:9",
        camera_motion: motion.camera_motion || "",
        transition_to_next: motion.transition_to_next || "cut",
        overlay_text: motion.overlay_text || "",
        overlay_position: motion.overlay_position || "bottom-center",
        sfx_optional: motion.sfx_optional || "",
        bgm_mood_optional: motion.bgm_mood_optional || "",
      };
    }),
  };

  return normalizeRenderJson(draft, mode);
}

function parseManualResult(nodeType, manualResult, mode, resolvedInput, config) {
  if (nodeType === "ContentInputNode") {
    return {
      parsedOutput: toNodeOutput(nodeType, null, config),
      parseError: "",
    };
  }

  if (nodeType === "RenderJsonNode") {
    if (manualResult.trim()) {
      const parsed = safeJsonParse(manualResult);
      if (!parsed?.ok) {
        return { parsedOutput: buildRenderDraft(resolvedInput, config, mode), parseError: parsed.error };
      }
      return {
        parsedOutput: normalizeRenderJson(parsed.value, mode),
        parseError: "",
      };
    }

    return {
      parsedOutput: buildRenderDraft(resolvedInput, config, mode),
      parseError: "",
    };
  }

  if (!manualResult.trim()) {
    return { parsedOutput: {}, parseError: "" };
  }

  const parsed = safeJsonParse(manualResult);
  if (!parsed?.ok) {
    return { parsedOutput: { raw_text: manualResult }, parseError: parsed.error };
  }

  return { parsedOutput: parsed.value, parseError: "" };
}

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
  const order = topoSort(nodes, edges);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const outputMap = new Map();

  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (adjacency.has(edge.source)) {
      adjacency.get(edge.source).push(edge.target);
    }
  }

  const updatedById = new Map();

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const shouldRun = shouldRunNode(nodeId, startNodeId, runMode, adjacency);

    if (!shouldRun) {
      outputMap.set(nodeId, node.data.output || {});
      updatedById.set(nodeId, node);
      continue;
    }

    const resolvedInput = mergeIncomingOutputs(nodeId, edges, outputMap);
    const mode = node.data.config?.parseMode || "flexible";
    const generatedPrompt = buildPromptByNodeType(node.type, node.data.config, resolvedInput);
    const manualResult = node.data.manualResult || "";

    const { parsedOutput, parseError } = parseManualResult(
      node.type,
      manualResult,
      mode,
      resolvedInput,
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
