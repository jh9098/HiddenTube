// Capability(기능) 기반 모델 선택(오팔 느낌)
// 역할을 고정하지 않고 "이 단계에서 할 일"을 자유 입력 가능.
// Capability는 모델 필터링용(선택만 저장)

export const CAPABILITY_OPTIONS = [
  { id: "research", label: "리서치(Research)" },
  { id: "text", label: "텍스트(Text)" },
  { id: "image", label: "이미지(Image)" },
  { id: "voice", label: "음성(Voice/TTS)" },
  { id: "video", label: "영상(Video)" },
  { id: "music", label: "음악(Music)" },
  { id: "compose", label: "합성/편집(Compose)" },
  { id: "upload", label: "업로드(Upload)" },
  { id: "custom", label: "커스텀(Custom)" },
];

export const PROVIDER_OPTIONS = [
  { id: "google", label: "Google" },
  { id: "manual", label: "Manual(수동)" },
  { id: "other", label: "Other" },
];

export const MODELS_BY_CAPABILITY = {
  research: [
    "Gemini 3 Flash",
    "Gemini 2.5 Flash",
    "Gemini 2.5 Pro",
    "Gemini 3 Pro",
    "Plan and Execute with Gemini 2.5 Flash",
    "Deep Research with Gemini 2.5 Flash",
  ],
  text: [
    "Gemini 3 Flash",
    "Gemini 2.5 Flash",
    "Gemini 2.5 Pro",
    "Gemini 3 Pro",
    "Plan and Execute with Gemini 2.5 Flash",
  ],
  image: ["Imagen 4", "Nano Banana", "Nano Banana Pro"],
  voice: ["AudioLM"],
  video: ["Veo"],
  music: ["Lyria 2"],
  compose: ["Manual"],
  upload: ["Manual"],
  custom: ["Custom"],
};

// 노드 outputKey 기본값(변수로 내려갈 키)
export const DEFAULT_OUTPUT_KEY_BY_CAPABILITY = {
  research: "research_text",
  text: "script_text",
  image: "image_ref",
  voice: "audio_ref",
  video: "video_ref",
  music: "music_ref",
  compose: "compose_ref",
  upload: "upload_ref",
  custom: "result",
};

// 노드에 기본으로 깔리는 "할 일" 텍스트
export const DEFAULT_TODO_BY_CAPABILITY = {
  research: "입력 주제를 기준으로 최신 트렌드/근거를 조사해 요약한다.",
  text: "리서치 결과를 바탕으로 훅/씬/나레이션/자막을 작성한다.",
  image: "썸네일/장면 이미지 프롬프트를 만들고 결과(링크/파일)를 기록한다.",
  voice: "나레이션 음성을 생성하고 결과(링크/파일)를 기록한다.",
  video: "씬별 영상 생성/소스 확보 후 결과(링크/파일)를 기록한다.",
  music: "쇼츠 BGM을 생성하고 결과(링크/파일)를 기록한다.",
  compose: "영상+음성+자막 합성 결과를 기록한다.",
  upload: "유튜브 업로드(제목/설명/태그/예약) 결과를 기록한다.",
  custom: "자유롭게 할 일을 작성한다.",
};

// 기본 프롬프트 템플릿(변수 치환: {{topic}}, 업스트림 결과 등)
export const DEFAULT_PROMPT_BY_CAPABILITY = {
  research:
    "주제: {{topic}}\n목표: 유튜브 쇼츠 제작에 필요한 최신 트렌드/근거 요약\n요구:\n- 핵심 사실 5개\n- 트렌드 관점 2개\n- 오해 포인트 1개\n- 검색 키워드 5개\n\n결과는 한국어로.",
  text:
    "주제: {{topic}}\n리서치: {{research_text}}\n\n20초 쇼츠 대본을 작성해줘.\n형식:\n1) 훅 1줄\n2) 포인트 3개(각 1~2문장)\n3) 마무리 CTA 1줄\n\n말하듯 자연스럽게.",
  image:
    "주제: {{topic}}\n대본: {{script_text}}\n\n썸네일/장면 이미지 프롬프트 3개 만들어줘.\n- 한국어/영어 둘 다\n- 짧은 텍스트 오버레이 문구 포함",
  voice:
    "대본: {{script_text}}\n\n나레이션용으로 다듬어줘.\n- 20초 내\n- 호흡/강세 표시\n- 너무 길면 축약",
  video:
    "주제: {{topic}}\n대본: {{script_text}}\n\n씬 6개로 나눠서 씬별로:\n- 화면 설명\n- 소스 유형(직접촬영/스톡/생성)\n- 자막 문구\n를 표로 정리해줘.",
  music:
    "주제: {{topic}}\n톤: 정보형/긴장감/밝음 중 택1\n\n쇼츠 BGM 프롬프트 3개:\n- BPM/분위기/악기/장르 참고",
  compose:
    "합성 체크리스트:\n- 1080x1920, 30fps\n- 오디오 -14LUFS 근처\n- 자막 가독성\n- 컷 템포",
  upload:
    "업로드 체크리스트:\n- 제목 60자 이내\n- 설명 2~3줄 + 해시태그 3~5개\n- 썸네일\n- 공개/예약\n- 정책/저작권 확인",
  custom:
    "주제: {{topic}}\n업스트림 결과를 참고해 원하는 작업을 수행하도록 지시문을 작성하세요.\n",
};

export const ASSET_SOURCES = [
  { id: "upload", label: "Upload file" },
  { id: "drive", label: "My Drive(메타)" },
  { id: "youtube", label: "YouTube 링크" },
  { id: "text", label: "Text" },
  { id: "drawing", label: "Drawing(메타)" },
];
