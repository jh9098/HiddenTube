import React from "react";

const STATUS_META = {
  queued: { text: "대기 중", className: "is-queued" },
  running: { text: "렌더링 중...", className: "is-running" },
  done: { text: "완료 ✅", className: "is-done" },
  failed: { text: "실패 ❌", className: "is-failed" },
};

export function getStatusMeta(status) {
  return STATUS_META[status] || { text: status, className: "" };
}

export default function RenderStatusBadge({ status }) {
  const meta = getStatusMeta(status);
  return <span className={`render-job-status-badge ${meta.className}`}>{meta.text}</span>;
}
