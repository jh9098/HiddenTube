import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  createRenderJob,
  getRenderJob,
  getRenderLogUrl,
  getRenderResultUrl,
  getRenderThumbnailUrl,
} from "../../api/renderApi";
import RenderProgressBar from "./render/RenderProgressBar";
import RenderStatusBadge from "./render/RenderStatusBadge";

const POLL_INTERVAL_MS = 2500;

export default function RenderJobPanel({ projectId }) {
  const [job, setJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    async (jobId) => {
      try {
        const updated = await getRenderJob(jobId);
        setJob(updated);
        if (updated.status === "done" || updated.status === "failed") {
          stopPolling();
        }
      } catch {
        stopPolling();
      }
    },
    [stopPolling]
  );

  const startPolling = useCallback(
    (jobId) => {
      stopPolling();
      pollRef.current = setInterval(() => pollJob(jobId), POLL_INTERVAL_MS);
    },
    [pollJob, stopPolling]
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleStartRender = async () => {
    if (!projectId) {
      setError("프로젝트가 선택되지 않았습니다.");
      return;
    }
    setSubmitting(true);
    setError("");
    setJob(null);
    try {
      const newJob = await createRenderJob(projectId, { preset: "9:16" });
      setJob(newJob);
      startPolling(newJob.job_id);
    } catch (err) {
      setError("렌더 시작 실패: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isRenderBlocked = submitting || job?.status === "queued" || job?.status === "running";

  return (
    <div className="render-job-panel">
      <button
        type="button"
        onClick={handleStartRender}
        disabled={isRenderBlocked}
        className="production-btn production-btn-primary production-btn-block render-job-start-btn"
      >
        {submitting ? "렌더 요청 중..." : "🎬 렌더링 시작"}
      </button>

      {error && <div className="render-job-error">{error}</div>}

      {job && (
        <div className="render-job-card">
          <div className="render-job-head">
            <span className="render-job-id">{job.job_id}</span>
            <RenderStatusBadge status={job.status} />
          </div>

          <RenderProgressBar value={job.progress || 0} />

          <div className="render-job-progress-text">{job.progress}%</div>

          {job.status === "failed" && job.error_message && (
            <div className="render-job-failed-reason">{job.error_message}</div>
          )}

          {job.status === "done" && (
            <div className="render-job-result-wrap">
              <img
                src={getRenderThumbnailUrl(job.job_id)}
                alt="thumbnail"
                className="render-job-media"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />

              <details className="production-accordion" open>
                <summary className="production-accordion-summary">
                  <span>렌더 결과 미리보기</span>
                  <small>필수 정보</small>
                </summary>
                <div className="production-accordion-body">
                  <video src={getRenderResultUrl(job.job_id)} controls className="render-job-media" />
                </div>
              </details>

              <details className="production-accordion">
                <summary className="production-accordion-summary">
                  <span>다운로드/로그</span>
                  <small>상세</small>
                </summary>
                <div className="production-accordion-body">
                  <div className="render-job-actions">
                    <a
                      href={getRenderResultUrl(job.job_id)}
                      download={`${job.job_id}.mp4`}
                      className="render-job-link-btn is-download"
                    >
                      ⬇ MP4 다운로드
                    </a>
                    <a
                      href={getRenderLogUrl(job.job_id)}
                      target="_blank"
                      rel="noreferrer"
                      className="render-job-link-btn is-log"
                    >
                      📋 렌더 로그
                    </a>
                  </div>
                </div>
              </details>
            </div>
          )}

          {job.status === "failed" && (
            <a
              href={getRenderLogUrl(job.job_id)}
              target="_blank"
              rel="noreferrer"
              className="render-job-link-btn is-log is-block"
            >
              📋 오류 로그 확인
            </a>
          )}
        </div>
      )}
    </div>
  );
}
