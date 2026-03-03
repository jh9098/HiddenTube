import React from "react";

export default function RenderProgressBar({ value }) {
  return (
    <div className="render-job-progress-track">
      <div className="render-job-progress-value" style={{ width: `${value}%` }} />
    </div>
  );
}
