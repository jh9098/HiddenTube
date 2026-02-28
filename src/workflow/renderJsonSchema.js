const DEFAULT_META = {
  title: "",
  target_audience: "",
  tone: "",
  safety_notes: "",
  cta: "",
  estimated_total_duration_sec: 60,
};

const DEFAULT_SCENE = {
  scene_id: "scene_1",
  purpose: "",
  duration_sec: 10,
  start_time: 0,
  end_time: 10,
  tts_text: "",
  subtitle_lines: [],
  keywords: [],
  visual_type: "image",
  image_prompt_ko: "",
  image_prompt_en: "",
  negative_prompt: "",
  aspect_ratio: "16:9",
  camera_motion: "",
  transition_to_next: "cut",
  overlay_text: "",
  overlay_position: "bottom-center",
  sfx_optional: "",
  bgm_mood_optional: "",
};

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function ensureNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeScene(scene, index) {
  const merged = {
    ...DEFAULT_SCENE,
    ...scene,
  };

  merged.scene_id = merged.scene_id || `scene_${index + 1}`;
  merged.duration_sec = ensureNumber(merged.duration_sec, DEFAULT_SCENE.duration_sec);
  merged.start_time = ensureNumber(merged.start_time, 0);
  merged.end_time = ensureNumber(merged.end_time, merged.start_time + merged.duration_sec);
  merged.subtitle_lines = ensureArray(merged.subtitle_lines).map(String);
  merged.keywords = ensureArray(merged.keywords).map(String);

  return merged;
}

export function normalizeRenderJson(payload, mode = "flexible") {
  const src = payload && typeof payload === "object" ? payload : {};
  const incomingMeta = src.meta && typeof src.meta === "object" ? src.meta : {};
  const meta = {
    ...DEFAULT_META,
    ...incomingMeta,
  };
  meta.estimated_total_duration_sec = ensureNumber(
    meta.estimated_total_duration_sec,
    DEFAULT_META.estimated_total_duration_sec
  );

  const incomingScenes = Array.isArray(src.scenes) ? src.scenes : [];
  const scenes = incomingScenes.length
    ? incomingScenes.map((scene, index) => normalizeScene(scene, index))
    : [normalizeScene({}, 0)];

  const normalized = {
    ...src,
    meta,
    scenes,
  };

  if (mode === "strict") {
    return {
      meta,
      scenes,
    };
  }

  return normalized;
}

export const RENDER_JSON_EXAMPLE = {
  meta: {
    title: "퇴근 후 10분, 돈 관리 루틴",
    target_audience: "20~30대 직장인",
    tone: "실용적이고 친근한 톤",
    safety_notes: "투자 권유가 아닌 일반 정보 제공 목적",
    cta: "댓글로 본인 루틴을 공유해 주세요",
    estimated_total_duration_sec: 58,
  },
  scenes: [
    {
      scene_id: "scene_1",
      purpose: "문제 제기",
      duration_sec: 8,
      start_time: 0,
      end_time: 8,
      tts_text: "월급은 들어오는데 왜 통장은 늘 비어 있을까요?",
      subtitle_lines: ["월급은 들어오는데", "통장은 왜 비어 있을까?"],
      keywords: ["월급관리", "생활비", "루틴"],
      visual_type: "image",
      image_prompt_ko: "퇴근 후 지갑을 정리하는 직장인, 따뜻한 조명",
      image_prompt_en: "Office worker organizing wallet after work, warm lighting",
      negative_prompt: "low quality, blurry, watermark",
      aspect_ratio: "16:9",
      camera_motion: "slow zoom in",
      transition_to_next: "fade",
      overlay_text: "돈이 모이지 않는 이유",
      overlay_position: "center",
      sfx_optional: "soft whoosh",
      bgm_mood_optional: "calm lo-fi",
    },
  ],
};
