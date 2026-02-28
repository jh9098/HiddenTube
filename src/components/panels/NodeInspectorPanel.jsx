import React, { useEffect, useState } from "react";
import { NODE_STATUSES } from "../../utils/workflowData";

function NodeInspectorPanel({
  selectedNode,
  onDelete,
  onUpdateMeta,
  onUpdateConfig,
  onUpdateStatus,
}) {
  const [configDraft, setConfigDraft] = useState("{}");
  const [error, setError] = useState("");

  useEffect(() => {
    const nextText = selectedNode ? JSON.stringify(selectedNode.data.config, null, 2) : "{}";
    setConfigDraft(nextText);
    setError("");
  }, [selectedNode]);

  const handleConfigApply = () => {
    const result = onUpdateConfig(configDraft);
    if (!result?.ok) {
      setError(result?.message ?? "JSON 형식을 확인해주세요.");
      return;
    }
    setError("");
  };

  if (!selectedNode) {
    return (
      <aside className="side-panel">
        <h2>노드 속성</h2>
        <p className="panel-help">캔버스에서 노드를 선택하면 설정을 편집할 수 있습니다.</p>
      </aside>
    );
  }

  return (
    <aside className="side-panel">
      <h2>노드 속성</h2>
      <div className="field">
        <label htmlFor="node-label">라벨</label>
        <input
          id="node-label"
          value={selectedNode.data.label}
          onChange={(event) => onUpdateMeta("label", event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="node-description">설명</label>
        <textarea
          id="node-description"
          value={selectedNode.data.description}
          onChange={(event) => onUpdateMeta("description", event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="node-status">상태</label>
        <select
          id="node-status"
          value={selectedNode.data.status}
          onChange={(event) => onUpdateStatus(event.target.value)}
        >
          {NODE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="node-config">config (JSON)</label>
        <textarea
          id="node-config"
          value={configDraft}
          onChange={(event) => setConfigDraft(event.target.value)}
          className="config-editor"
        />
        {error && <p className="error-text">{error}</p>}
        <button type="button" className="toolbar-btn" onClick={handleConfigApply}>
          config 적용
        </button>
      </div>
      <div className="field">
        <label>output (읽기 전용)</label>
        <pre className="readonly-box">{JSON.stringify(selectedNode.data.output, null, 2)}</pre>
      </div>
      <button type="button" className="toolbar-btn danger" onClick={onDelete}>
        선택 노드 삭제
      </button>
    </aside>
  );
}

export default NodeInspectorPanel;
