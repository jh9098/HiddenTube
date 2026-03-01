import React from "react";

const productionPlanSteps = [
  {
    title: "1) AI 결과물 수집",
    description: "Preview 단계에서 확보한 JSON/이미지 프롬프트/자막·음성 프롬프트를 기준으로 실제 AI 생성물을 수집합니다.",
    checklist: [
      "이미지 생성 결과(파일 + 프롬프트 버전) 업로드",
      "자막 텍스트(.srt/.txt) 업로드",
      "음성 파일(.mp3/.wav) 업로드",
    ],
  },
  {
    title: "2) JSON 기반 자산 매핑",
    description: "Render JSON의 scene 키 기준으로 업로드한 파일을 연결하고 누락을 검사합니다.",
    checklist: [
      "sceneId별 이미지/자막/음성 매칭",
      "길이(자막/음성) 기본 검증",
      "누락된 scene 즉시 경고",
    ],
  },
  {
    title: "3) FFmpeg 합성 실행",
    description: "매핑이 끝난 JSON을 ffmpeg 파이프라인에 넘겨 최종 영상 파일을 생성합니다.",
    checklist: [
      "합성 preset 선택(9:16/16:9 등)",
      "실행 로그/오류 로그 확인",
      "완성본 미리보기 + 다운로드",
    ],
  },
];

function ProductionWorkspace() {
  return (
    <section className="execution-pane production-pane">
      <h3 className="execution-node-title">Production 작업 공간 기획</h3>
      <p className="panel-help">
        이 탭은 “생성된 프롬프트를 실제 AI 작업으로 전환하고, 업로드 자산을 JSON에 매핑해 ffmpeg로 합성”하는
        다음 단계를 위한 공간입니다.
      </p>

      <div className="production-step-list">
        {productionPlanSteps.map((step) => (
          <article key={step.title} className="console-item">
            <h4>{step.title}</h4>
            <p>{step.description}</p>
            <ul>
              {step.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <article className="console-item production-next-actions">
        <h4>추천 구현 순서 (MVP)</h4>
        <ol>
          <li>Upload 패널: 이미지/자막/음성 파일 업로드 + sceneId 연결</li>
          <li>Validation 패널: JSON 기준 누락/형식 오류 검사</li>
          <li>Render 실행 패널: ffmpeg job 생성, 진행률/로그 표시</li>
        </ol>
      </article>
    </section>
  );
}

export default ProductionWorkspace;
