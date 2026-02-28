import React, { useEffect, useMemo, useState } from "react";
import { NODE_STATUSES } from "../../utils/workflowData";

function prettyJson(value) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? "");
  }
}

function NodeInspectorPanel({
  selectedNode,
  onDelete,
  onUpdateMeta,
  onUpdateConfig,
  onUpdateManualResult,
  onUpdateStatus,
  onExecuteNode,
  onExecuteFromNode,
  onCopyPromptPackage,
}) {
  const [configDraft, setConfigDraft] = useState("{}");
  const [manualDraft, setManualDraft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const nextText = selectedNode ? prettyJson(selectedNode.data.config) : "{}";
    setConfigDraft(nextText);
    setManualDraft(selectedNode?.data?.manualResult ?? "");
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

  const handleManualApply = () => {
    onUpdateManualResult(manualDraft);
  };

  const promptPreview = useMemo(
    () => selectedNode?.data?.generatedPrompt || "아직 프롬프트가 생성되지 않았습니다.",
    [selectedNode]
  );

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
      <h2>노드 상세 패널</h2>
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

      <section className="panel-section">
        <h3>입력 설정</h3>
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
      </section>

      <section className="panel-section">
        <h3>이전 노드 기반 입력 미리보기</h3>
        <pre className="readonly-box">{prettyJson(selectedNode.data.resolvedInput)}</pre>
      </section>

      <section className="panel-section">
        <h3>생성된 프롬프트</h3>
        <pre className="readonly-box">{promptPreview}</pre>
      </section>

      <section className="panel-section">
        <h3>외부 AI 결과 붙여넣기</h3>
        <div className="field">
          <label htmlFor="manual-result">manualResult</label>
          <textarea
            id="manual-result"
            value={manualDraft}
            onChange={(event) => setManualDraft(event.target.value)}
            className="config-editor"
            placeholder="외부 AI 결과(JSON/텍스트)를 붙여넣어 주세요"
          />
          <button type="button" className="toolbar-btn" onClick={handleManualApply}>
            결과 저장
          </button>
        </div>
      </section>

      <section className="panel-section">
        <h3>파싱된 결과 미리보기</h3>
        <pre className="readonly-box">{prettyJson(selectedNode.data.parsedOutput)}</pre>
        {selectedNode.data.parseError && (
          <p className="error-text">파싱 경고: {selectedNode.data.parseError}</p>
        )}
      </section>

      <section className="panel-actions">
        <button type="button" className="toolbar-btn" onClick={onExecuteNode}>
          노드 실행
        </button>
        <button type="button" className="toolbar-btn" onClick={onExecuteFromNode}>
          다음 노드까지 연속 실행
        </button>
        <button type="button" className="toolbar-btn" onClick={onCopyPromptPackage}>
          전체 프롬프트 패키지 복사
        </button>
      </section>

      <section className="panel-section">
        <h3>output (읽기 전용)</h3>
        <pre className="readonly-box">{prettyJson(selectedNode.data.output)}</pre>
      </section>

      <button type="button" className="toolbar-btn danger" onClick={onDelete}>
        선택 노드 삭제
      </button>
    </aside>
  );
}

export default NodeInspectorPanel;
