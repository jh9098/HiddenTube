// /src/workflow/apiKeys.js
// 로컬 저장(localStorage) 기반 API 키 관리

export const API_KEYS_STORAGE_KEY = "opal_mvp_api_keys_v1";

/**
 * API 키 스키마(확장 가능)
 * - google: Gemini/Imagen/Veo/AudioLM/Lyria 등
 * - youtube: YouTube Data API
 * - other: 추후 확장
 */
export function getDefaultApiKeys() {
  return {
    google: {
      general: "", // Gemini/기타 공통
      research: "",
      text: "",
      image: "",
      voice: "",
      video: "",
      music: "",
    },
    youtube: {
      apiKey: "", // YouTube Data API Key
      clientId: "", // OAuth Client ID (추후 자동 업로드 대비)
      clientSecret: "", // OAuth Client Secret (추후)
    },
    other: {},
  };
}

export function loadApiKeys() {
  try {
    const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (!raw) return getDefaultApiKeys();
    const parsed = JSON.parse(raw);
    return deepMerge(getDefaultApiKeys(), parsed);
  } catch {
    return getDefaultApiKeys();
  }
}

export function saveApiKeys(keysObj) {
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keysObj, null, 2));
}

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(base, incoming) {
  const out = structuredClone(base);
  if (!isObject(incoming)) return out;
  for (const [k, v] of Object.entries(incoming)) {
    if (isObject(v) && isObject(out[k])) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}

/** 화면에 표시할 때만 마스킹 */
export function maskKey(s) {
  const str = String(s || "");
  if (!str) return "";
  if (str.length <= 6) return "*".repeat(str.length);
  return str.slice(0, 2) + "*".repeat(Math.max(2, str.length - 6)) + str.slice(-4);
}
