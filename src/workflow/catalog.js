// 모델 중심 선택: Capability/Provider를 따로 노출하지 않고, 모델 이름 자체로 역할을 구분합니다.

export const MODEL_OPTIONS = [
  "Gemini 3 Flash",
  "Gemini 2.5 Flash",
  "Gemini 2.5 Pro",
  "Gemini 3 Pro",
  "Plan and Execute with Gemini 2.5 Flash",
  "Deep Research with Gemini 2.5 Flash",
  "Imagen 4",
  "Nano Banana",
  "Nano Banana Pro",
  "AudioLM",
  "Veo",
  "Lyria 2",
  "Manual",
  "Custom",
];

export const DEFAULT_PROMPT = "입력값과 연결 노드의 답변을 참고해 작업을 수행하세요.";

export const ASSET_SOURCES = [
  { id: "upload", label: "Upload file" },
  { id: "drive", label: "My Drive(메타)" },
  { id: "youtube", label: "YouTube 링크" },
  { id: "text", label: "Text" },
  { id: "drawing", label: "Drawing(메타)" },
];
