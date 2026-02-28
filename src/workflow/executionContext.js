import { normalizeRenderJson } from "./renderJsonSchema";

function safeJsonParse(text) {
  if (!text || !text.trim()) return null;
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function toSerializable(value) {
  if (value === undefined) return null;
  try {
    JSON.stringify(value);
    return value;
  } catch {
    return String(value);
  }
}

export function getNodePreferredOutput(node) {
  const output = node?.data?.output;
  if (output && typeof output === "object" && Object.keys(output).length > 0) return output;

  const parsed = node?.data?.parsedOutput;
  if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) return parsed;

  const manual = String(node?.data?.manualResult || "").trim();
  if (!manual) return {};

  const parsedManual = safeJsonParse(manual);
  if (parsedManual?.ok && parsedManual.value && typeof parsedManual.value === "object") {
    return parsedManual.value;
  }
  return { raw_text: manual };
}

export function buildIncomingRefs(nodeId, edges, nodeMap, outputMap) {
  const incoming = edges.filter((edge) => edge.target === nodeId);
  const refs = incoming
    .map((edge) => {
      const src = nodeMap.get(edge.source);
      if (!src) return null;
      return {
        edgeId: edge.id,
        nodeId: src.id,
        type: src.type,
        label: src.data?.label || src.type,
        output: toSerializable(outputMap.get(src.id) || {}),
      };
    })
    .filter(Boolean);

  const merged = {};
  refs.forEach((ref) => Object.assign(merged, ref.output || {}));

  return { refs, merged };
}

export function toNodeOutput(nodeType, parsedOutput, config) {
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

  if (!parsedOutput || typeof parsedOutput !== "object") return {};
  if (nodeType === "SceneBreakdownNode" && Array.isArray(parsedOutput.scenes)) return { scenes: parsedOutput.scenes };
  if (nodeType === "ImagePromptNode" && Array.isArray(parsedOutput.scene_prompts)) {
    return { scene_prompts: parsedOutput.scene_prompts };
  }
  if (nodeType === "MotionSubtitleNode" && Array.isArray(parsedOutput.scene_motion)) {
    return { scene_motion: parsedOutput.scene_motion };
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

export function parseManualResult(nodeType, manualResult, mode, resolvedInput, config) {
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

  if (!manualResult.trim()) return { parsedOutput: {}, parseError: "" };

  const parsed = safeJsonParse(manualResult);
  if (!parsed?.ok) return { parsedOutput: { raw_text: manualResult }, parseError: parsed.error };

  return { parsedOutput: parsed.value, parseError: "" };
}

export function buildAdjacency(nodes, edges) {
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (adjacency.has(edge.source)) {
      adjacency.get(edge.source).push(edge.target);
    }
  }
  return adjacency;
}
