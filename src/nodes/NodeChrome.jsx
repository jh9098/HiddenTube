import React from "react";

function RunToggle({ status, onToggleRun }) {
  const isRunning = status === "doing";
  const icon = isRunning ? "■" : "▶";
  const label = isRunning ? "실행 중지" : "실행";

  return (
    <button className="nodeRunBtn" onClick={onToggleRun} type="button" title={label}>
      {icon}
    </button>
  );
}

export default function NodeChrome({ title, status, onToggleRun, children, className = "" }) {
  return (
    <div className={`nodeCard ${className}`.trim()}>
      <div className="nodeHeader">
        <div className="nodeTitleRow">
          <span className="nodeTitleIcon">✦</span>
          <div className="nodeTitle">{title}</div>
        </div>
        <RunToggle status={status} onToggleRun={onToggleRun} />
      </div>
      {children}
    </div>
  );
}
