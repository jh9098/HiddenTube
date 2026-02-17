import React, { useMemo } from "react";
import { NODE_DEFS } from "../workflow/nodeDefinitions.js";

function Field({ field, value, onChange }) {
  const commonProps = {
    className: field.type === "textarea" ? "textarea" : field.type === "select" ? "select" : "input",
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
    placeholder: field.placeholder || "",
  };

  if (field.type === "textarea") return <textarea {...commonProps} />;
  if (field.type === "number")
    return <input {...commonProps} type="number" step="0.1" />;

  if (field.type === "select") {
    return (
      <select {...commonProps}>
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  return <input {...commonProps} type="text" />;
}

export default function Inspector({ selectedNode, onPatchNodeData }) {
  const def = useMemo(() => {
    if (!selectedNode) return null;
    return NODE_DEFS[selectedNode.data.type] || null;
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div>
        <div className="h1">속성</div>
        <div className="card small">
          노드를 선택하면 설정(프롬프트/파라미터)이 여기 표시됩니다.
        </div>
      </div>
    );
  }

  const fields = def?.fields || [];
  const cfg = selectedNode.data.config || {};

  return (
    <div>
      <div className="h1">속성</div>
      <div className="card">
        <div style={{ fontWeight: 800, marginBottom: 6 }}>{selectedNode.data.label}</div>
        <div className="kv">
          <span>id</span><b>{selectedNode.id}</b>
          <span>type</span><b>{selectedNode.data.type}</b>
          <span>status</span><b>{selectedNode.data.status}</b>
        </div>
        {selectedNode.data.lastError ? (
          <div style={{ marginTop: 10, color: "#ff6b6b", fontSize: 12 }}>
            에러: {selectedNode.data.lastError}
          </div>
        ) : null}
      </div>

      <div className="h2">설정</div>
      <div className="card">
        {fields.map((f) => (
          <div key={f.name} className="field">
            <div className="label">{f.label}</div>
            <Field
              field={f}
              value={cfg[f.name]}
              onChange={(val) => {
                const nextCfg = { ...cfg };
                if (f.type === "number") {
                  const n = Number(val);
                  nextCfg[f.name] = Number.isFinite(n) ? n : 0;
                } else {
                  nextCfg[f.name] = val;
                }
                onPatchNodeData(selectedNode.id, { config: nextCfg });
              }}
            />
          </div>
        ))}
      </div>

      <div className="h2">출력 프리뷰</div>
      <div className="card small" style={{ whiteSpace: "pre-wrap" }}>
        {selectedNode.data.outputPreview || "(아직 없음)"}
      </div>
    </div>
  );
}
