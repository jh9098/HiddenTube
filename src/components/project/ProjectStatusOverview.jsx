import React from "react";
import { getStatusBadgeClass } from "./projectWorkflowStatus";

function ProjectStatusOverview({ readiness }) {
  return (
    <>
      <div className="workflow-status-grid">
        <div className={getStatusBadgeClass(readiness.promptReadyCount === readiness.promptTotalCount)}>
          프롬프트 생성: {readiness.promptReadyCount}/{readiness.promptTotalCount}
        </div>
        <div className={getStatusBadgeClass(readiness.manualInputDoneCount === readiness.manualInputTotalCount)}>
          결과 붙여넣기: {readiness.manualInputDoneCount}/{readiness.manualInputTotalCount}
        </div>
        <div className={getStatusBadgeClass(readiness.missingImageScenes.length === 0)}>
          이미지 매핑: {readiness.sceneIds.length - readiness.missingImageScenes.length}/{readiness.sceneIds.length}
        </div>
        <div className={getStatusBadgeClass(readiness.missingAudioScenes.length === 0)}>
          TTS/오디오 매핑: {readiness.sceneIds.length - readiness.missingAudioScenes.length}/{readiness.sceneIds.length}
        </div>
      </div>

      <div className="needs-panel">
        <strong>아직 필요한 것</strong>
        {readiness.needs.length === 0 ? (
          <p className="ok-text">모든 필수 조건이 준비되었습니다.</p>
        ) : (
          <ul>
            {readiness.needs.map((need) => (
              <li key={need} className="warn-text">{need}</li>
            ))}
          </ul>
        )}
      </div>

      <h4>렌더 전 최종 체크리스트</h4>
      <div className="validation-panel">
        <p>- render_json scenes 존재: {readiness.scenes.length > 0 ? "예" : "아니오"}</p>
        <p>- 이미지 누락: {readiness.missingImageScenes.length}건</p>
        <p>- TTS/오디오 누락: {readiness.missingAudioScenes.length}건</p>
        <p>- 파싱/자막 문제: {readiness.parseErrorCount}건</p>
        <p>- 검증 오류: {readiness.blockingIssueCount}건</p>
      </div>
    </>
  );
}

export default ProjectStatusOverview;
