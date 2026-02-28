import React from "react";
import { getRenderErrorHint } from "./projectWorkflowStatus";

function ProgressBar({ value }) {
  return (
    <div className="render-progress">
      <div className="render-progress-bar" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function RenderJobStatusPanel({ renderJob, resultUrl, thumbUrl, logUrl }) {
  if (!renderJob) return null;

  return (
    <div className="render-job-panel">
      <h4>렌더 진행 상태</h4>
      <p>job_id: {renderJob.job_id}</p>
      <p>status: {renderJob.status}</p>
      <ProgressBar value={renderJob.progress ?? 0} />
      <p>{renderJob.progress ?? 0}%</p>

      {renderJob.status === "failed" && (
        <div className="validation-panel">
          <p className="error-text">렌더 실패: {renderJob.error_message}</p>
          <p className="warn-text">해결 힌트: {getRenderErrorHint(renderJob.error_message)}</p>
          <a href={logUrl} target="_blank" rel="noreferrer">render log 열기</a>
        </div>
      )}

      {renderJob.status === "done" && (
        <div className="validation-panel">
          <p className="ok-text">렌더 완료</p>
          <img src={thumbUrl} alt="렌더 썸네일" className="result-thumbnail" />
          <video src={resultUrl} controls className="result-video" />
          <div className="result-links">
            <a href={resultUrl}>mp4 다운로드</a>
            <a href={thumbUrl}>썸네일 다운로드</a>
            <a href={logUrl}>render log 보기</a>
          </div>
        </div>
      )}
    </div>
  );
}

export default RenderJobStatusPanel;
