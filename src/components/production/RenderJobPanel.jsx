// 렌더링 실행, 진행 상태 폴링, 결과 다운로드 패널
// 사용법: <RenderJobPanel projectId={projectId} />

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  createRenderJob,
  getRenderJob,
  getRenderLogUrl,
  getRenderResultUrl,
  getRenderThumbnailUrl,
} from "../../api/renderApi";

const POLL_INTERVAL_MS = 2500;

function ProgressBar({ value }) {
  return (
    <div
      style={{
        width: "100%",
        height: 8,
        borderRadius: 999,
        background: "#e5e7eb",
        overflow: "hidden",
        margin: "8px 0",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${value}%`,
          background: "linear-gradient(90deg, #6366f1, #22c55e)",
          transition: "width 0.4s ease",
          borderRadius: 999,
        }}
      />
    </div>
  );
}

function statusLabel(status) {
  if (status === "queued") return { text: "대기 중", color: "#6b7280" };
  if (status === "running") return { text: "렌더링 중...", color: "#1d4ed8" };
  if (status === "done") return { text: "완료 ✅", color: "#166534" };
  if (status === "failed") return { text: "실패 ❌", color: "#991b1b" };
  return { text: status, color: "#374151" };
}

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

  const sl = job ? statusLabel(job.status) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* 렌더 시작 버튼 */}
      <button
        onClick={handleStartRender}
        disabled={submitting || job?.status === "queued" || job?.status === "running"}
        style={{
          border: "none",
          borderRadius: 10,
          background: "#6366f1",
          color: "#fff",
          padding: "12px 0",
          fontSize: 15,
          fontWeight: 700,
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting || job?.status === "running" ? 0.7 : 1,
          width: "100%",
        }}
      >
        {submitting ? "렌더 요청 중..." : "🎬 렌더링 시작"}
      </button>

      {/* 에러 */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {/* 진행 상태 */}
      {job && (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 12,
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>{job.job_id}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: sl.color }}>{sl.text}</span>
          </div>

          <ProgressBar value={job.progress || 0} />

          <div style={{ fontSize: 11, color: "#6b7280", textAlign: "right" }}>{job.progress}%</div>

          {/* 실패 메시지 */}
          {job.status === "failed" && job.error_message && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#991b1b",
                background: "#fff1f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                padding: "6px 8px",
                whiteSpace: "pre-wrap",
              }}
            >
              {job.error_message}
            </div>
          )}

          {/* 완료 결과 */}
          {job.status === "done" && (
            <div style={{ marginTop: 10 }}>
              {/* 썸네일 */}
              <img
                src={getRenderThumbnailUrl(job.job_id)}
                alt="thumbnail"
                style={{
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  marginBottom: 10,
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />

              {/* 비디오 플레이어 */}
              <video
                src={getRenderResultUrl(job.job_id)}
                controls
                style={{
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  marginBottom: 10,
                }}
              />

              {/* 다운로드 / 로그 링크 */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <a
                  href={getRenderResultUrl(job.job_id)}
                  download={`${job.job_id}.mp4`}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    border: "none",
                    borderRadius: 8,
                    background: "#166534",
                    color: "#fff",
                    padding: "8px 0",
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  ⬇ MP4 다운로드
                </a>
                <a
                  href={getRenderLogUrl(job.job_id)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    textAlign: "center",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#374151",
                    padding: "8px 0",
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  📋 렌더 로그
                </a>
              </div>
            </div>
          )}

          {/* 실패 시 로그 링크 */}
          {job.status === "failed" && (
            <a
              href={getRenderLogUrl(job.job_id)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                marginTop: 8,
                textAlign: "center",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "#fff",
                color: "#374151",
                padding: "7px 0",
                fontSize: 12,
                textDecoration: "none",
              }}
            >
              📋 오류 로그 확인
            </a>
          )}
        </div>
      )}
    </div>
  );
}
