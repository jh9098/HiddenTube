import React, { useMemo } from "react";

function dotClass(status) {
  if (status === "done") return "good";
  if (status === "doing") return "warn";
  if (status === "error") return "bad";
  return "";
}

export default function RunTimeline({
  runs,
  currentRunId,
  nodes,
  onSelectRun,
  onSelectNode,
  onStartRun,
  onMarkStep,
  onCopyStepPrompt,
  onClearRuns,
}) {
  const current = useMemo(() => runs.find((r) => r.id === currentRunId) || null, [runs, currentRunId]);

  const stepRows = useMemo(() => {
    if (!current) return [];
    return current.steps.map((s) => {
      const node = nodes.find((n) => n.id === s.nodeId);
      const cap = node?.data?.config?.capability || "";
      const model = node?.data?.config?.modelId || "";
      const label = node?.data?.label || "Node";
      return { ...s, label, cap, model };
    });
  }, [current, nodes]);

  const progress = useMemo(() => {
    if (!current || current.steps.length === 0) return 0;
    const done = current.steps.filter((s) => s.status === "done").length;
    return Math.round((done / current.steps.length) * 100);
  }, [current]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="h1" style={{ margin: 0 }}>Run 타임라인</div>
        <div className="small">{current ? `진행률 ${progress}%` : "Run이 없습니다"}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn primary" onClick={onStartRun}>Start Run</button>
          <button className="btn" onClick={onClearRuns} disabled={runs.length === 0}>Clear Runs</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
        <select
          className="select"
          value={currentRunId || ""}
          onChange={(e) => onSelectRun(e.target.value)}
          style={{ minWidth: 260 }}
        >
          <option value="" disabled>Run 선택</option>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} · {new Date(r.createdAt).toLocaleString()}
            </option>
          ))}
        </select>

        <div className="small">
          {current ? `steps=${current.steps.length} / events=${current.events.length}` : ""}
        </div>
      </div>

      <div className="h2">Steps</div>
      <div className="card" style={{ maxHeight: 170, overflow: "auto" }}>
        {current ? (
          stepRows.map((s, idx) => (
            <div
              key={s.stepId}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 150px 1fr 260px",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px dashed rgba(255,255,255,0.08)",
                alignItems: "center",
              }}
            >
              <div className="small" style={{ textAlign: "right" }}>{idx + 1}</div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`dot ${dotClass(s.status)}`}></span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{s.label}</div>
                  <div className="small">{s.cap ? `cap: ${s.cap}` : ""} {s.model ? `· model: ${s.model}` : ""}</div>
                </div>
              </div>

              <div className="small">
                상태: <b style={{ color: "#e8e8ea" }}>{s.status}</b>
                <div className="small">
                  {s.doneAt ? `완료: ${new Date(s.doneAt).toLocaleTimeString()}` : ""}
                </div>
              </div>

              <div className="small" style={{ whiteSpace: "pre-wrap" }}>
                {s.snapshotPreview || ""}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button className="btn" onClick={() => onSelectNode(s.nodeId)}>Open</button>
                <button className="btn" onClick={() => onCopyStepPrompt(s.nodeId)}>Copy Prompt</button>
                <button className="btn" onClick={() => onMarkStep(current.id, s.stepId, "doing")}>Doing</button>
                <button className="btn" onClick={() => onMarkStep(current.id, s.stepId, "done")}>Done</button>
                <button className="btn danger" onClick={() => onMarkStep(current.id, s.stepId, "todo")}>Reset</button>
              </div>
            </div>
          ))
        ) : (
          <div className="small">Start Run을 누르면 스텝 목록이 생성됩니다.</div>
        )}
      </div>

      <div className="h2">Events</div>
      <div className="card" style={{ maxHeight: 120, overflow: "auto" }}>
        {current ? (
          current.events.length ? (
            current.events.map((ev) => (
              <div className="logLine" key={ev.id}>
                [{ev.time}] {ev.text}
              </div>
            ))
          ) : (
            <div className="small">이벤트가 없습니다.</div>
          )
        ) : (
          <div className="small">Run을 선택하세요.</div>
        )}
      </div>
    </div>
  );
}
