// 역할(유튜브 자동화 중심) + 역할별 선택 가능한 모델 목록(초기엔 선택만 저장)
export const ROLE_OPTIONS = [
  { id: "research", label: "리서치(Research)" },
  { id: "text", label: "텍스트/대본(Text)" },
  { id: "image", label: "이미지(Image)" },
  { id: "voice", label: "음성(TTS/Voice)" },
  { id: "video", label: "영상(Video)" },
  { id: "music", label: "음악(Music)" },
  { id: "compose", label: "편집/합성(Compose)" },
  { id: "upload", label: "업로드(Upload)" },
];

export const PROVIDER_OPTIONS = [
  { id: "google", label: "Google" },
  { id: "manual", label: "Manual(수동)" },
  { id: "other", label: "Other" },
];

export const MODELS_BY_ROLE = {
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
};

export const DEFAULT_OUTPUT_KEY_BY_ROLE = {
  research: "research_text",
  text: "script_text",
  image: "image_url",
  voice: "audio_url",
  video: "video_url",
  music: "music_url",
  compose: "edit_result",
  upload: "upload_result",
};

export const DEFAULT_INSTRUCTIONS_BY_ROLE = {
  research:
    "웹/자료를 조사해 핵심 근거를 요약하세요. (초기엔 직접 검색+AI 요약 후 결과를 붙여넣기)",
  text:
    "리서치 결과를 바탕으로 훅/씬/나레이션/자막을 만드세요. (초기엔 AI 결과를 붙여넣기)",
  image:
    "썸네일/장면 이미지 프롬프트를 만들고 생성한 이미지 링크/파일을 저장하세요.",
  voice:
    "나레이션 대본으로 TTS를 만들고 오디오 링크/파일을 저장하세요.",
  video:
    "장면/대본으로 영상(클립)을 만들고 영상 링크/파일을 저장하세요.",
  music:
    "BGM을 생성하고 링크/파일을 저장하세요.",
  compose:
    "영상+음성+자막을 합성하세요. (초기엔 편집툴로 직접 처리 후 결과 링크/메모 기록)",
  upload:
    "유튜브 업로드/메타데이터/예약발행을 진행하세요. (초기엔 수동 체크)",
};

// 역할별 기본 프롬프트 템플릿(복사해서 AI에 넣고 결과를 붙여넣는 용도)
export const DEFAULT_PROMPT_BY_ROLE = {
  research:
    "주제: {{topic}}\n목표: 20초 유튜브 쇼츠 제작에 쓸 리서치 요약\n요구:\n- 핵심 사실 5개(짧게)\n- 최신 이슈/트렌드 관점 2개\n- 오해하기 쉬운 포인트 1개\n- 출처 후보 키워드 5개(검색용)\n\n결과는 한국어로.",
  text:
    "주제: {{topic}}\n리서치 요약: {{research_text}}\n\n20초 유튜브 쇼츠 대본을 작성해줘.\n형식:\n1) 훅 1줄\n2) 포인트 3개(각 1~2문장)\n3) 마무리 CTA 1줄\n\n추가:\n- 말하듯 자연스럽게\n- 과장/허위 금지\n",
  image:
    "주제: {{topic}}\n대본: {{script_text}}\n\n유튜브 쇼츠 썸네일 이미지 프롬프트 3개 만들어줘.\n- 한국어/영어 버전 둘 다\n- 텍스트 오버레이 문구(짧게) 포함\n",
  voice:
    "대본: {{script_text}}\n\n위 대본을 나레이션용으로 다듬어줘.\n- 호흡/강세 표시\n- 20초 내 길이\n- 너무 길면 줄여줘\n",
  video:
    "주제: {{topic}}\n장면 아이디어/대본: {{script_text}}\n\n쇼츠용 장면(씬) 6개로 나눠서 각 씬마다:\n- 화면 설명\n- 필요한 영상 소스 유형(직접촬영/스톡/생성)\n- 자막 문구\n을 표로 정리해줘.",
  music:
    "주제: {{topic}}\n영상 톤: 정보형/긴장감/밝음 중 선택\n\n쇼츠 BGM 생성 프롬프트 3개를 만들어줘.\n- BPM/분위기/악기/참고 장르\n",
  compose:
    "준비물: 영상클립(들), 오디오, 자막\n\n합성 체크리스트:\n- 1080x1920, 30fps\n- 오디오 -14LUFS 근처\n- 자막 가독성 확보\n- 컷 편집 템포 조정\n",
  upload:
    "업로드 체크리스트:\n- 제목 60자 이내\n- 설명란 2~3줄 + 해시태그 3~5개\n- 썸네일 적용\n- 공개/예약 설정\n- 저작권/정책 확인\n",
};
