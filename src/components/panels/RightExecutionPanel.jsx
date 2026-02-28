import React, { useEffect, useMemo, useState } from "react";

function getNodeExecutionState(node) {
  const manualResult = node?.data?.manualResult || "";
  const hasManualResult = manualResult.trim().length > 0;
  const hasResolvedInput = Boolean(node?.data?.resolvedInput && Object.keys(node.data.resolvedInput).length > 0);

  if (node?.type === "ContentInputNode") {
    return hasManualResult ? "done" : "pending";
  }

  if (hasManualResult) return "done";
  if (hasResolvedInput) return "ready";
  return "pending";
}

function buildExecutionOrder(nodes, edges) {
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));

  edges.forEach((edge) => {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) return;
    indegree.set(edge.target, indegree.get(edge.target) + 1);
    adjacency.get(edge.source).push(edge.target);
  });

  const queue = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const order = [];

  while (queue.length) {
    const current = queue.shift();
    order.push(current);
    (adjacency.get(current) || []).forEach((targetId) => {
      const next = indegree.get(targetId) - 1;
      indegree.set(targetId, next);
      if (next === 0) queue.push(targetId);
    });
  }

  return order.length === nodes.length ? order : nodes.map((node) => node.id);
}

function gatherUpstreamText(node, allNodes) {
  const summaries = node?.data?.upstreamNodeSummaries || [];
  if (!summaries.length) return "";

  return summaries
    .map((summary) => {
      const sourceNode = allNodes.find((candidate) => candidate.id === summary.nodeId);
      if (!sourceNode) return null;
      const sourceOutput = sourceNode.data?.output;
      const sourceManual = sourceNode.data?.manualResult;
      const payload = sourceOutput && Object.keys(sourceOutput).length > 0 ? sourceOutput : sourceManual || "";
      return `[${summary.label}]\n${typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function PreviewPanel({ nodes, edges, projectTitle, onStart, onSelectNode }) {
  const orderedNodeIds = useMemo(() => buildExecutionOrder(nodes, edges), [nodes, edges]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const orderedNodes = orderedNodeIds.map((nodeId) => nodeMap.get(nodeId)).filter(Boolean);

  return (
    <div className="execution-pane preview-pane">
      <div className="preview-hero">
        <div className="preview-logo" />
        <h3>{projectTitle}</h3>
        <button type="button" className="start-btn" onClick={onStart}>
          ✦ Start
        </button>
      </div>

      <ul className="preview-step-list">
        {orderedNodes.map((node, index) => {
          const state = getNodeExecutionState(node);
          return (
            <li key={node.id} className={`preview-step-item ${state}`}>
              <button type="button" onClick={() => onSelectNode(node.id)}>
                {index + 1}. {node.data?.label}
              </button>
              <span>{state}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ConsolePanel({ nodes, edges, onSelectNode }) {
  const orderedNodeIds = useMemo(() => buildExecutionOrder(nodes, edges), [nodes, edges]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  return (
    <div className="execution-pane">
      {orderedNodeIds.map((nodeId) => {
        const node = nodeMap.get(nodeId);
        if (!node) return null;

        return (
          <article key={node.id} className="console-item">
            <header>
              <button type="button" className="console-node-title" onClick={() => onSelectNode(node.id)}>
                {node.data?.label}
              </button>
              <span className={`status-badge ${getNodeExecutionState(node)}`}>{getNodeExecutionState(node)}</span>
            </header>
            <p className="console-subtitle">명령어</p>
            <pre className="readonly-box">{node.data?.generatedPrompt || node.data?.config?.promptTemplate || "아직 없음"}</pre>
            <p className="console-subtitle">응답</p>
            <pre className="readonly-box">{node.data?.manualResult || "(입력 없음)"}</pre>
          </article>
        );
      })}
    </div>
  );
}

function StepPanel({
  selectedNode,
  nodes,
  onUpdateNodeLabel,
  onUpdateNodePromptTemplate,
  onUpdateNodeManualResult,
  onExecuteFromNode,
}) {
  const [manualResponse, setManualResponse] = useState(selectedNode?.data?.manualResult || "");
  const [uploadFileName, setUploadFileName] = useState("");

  useEffect(() => {
    setManualResponse(selectedNode?.data?.manualResult || "");
    setUploadFileName("");
  }, [selectedNode?.id, selectedNode?.data?.manualResult]);

  if (!selectedNode) {
    return <p className="panel-help">노드를 선택하면 Step 탭이 활성화됩니다.</p>;
  }

  const promptTemplate = selectedNode.data?.config?.promptTemplate || "";
  const upstreamText = gatherUpstreamText(selectedNode, nodes);
  const isContentInputNode = selectedNode.type === "ContentInputNode";

  return (
    <div className="execution-pane">
      <h3 className="execution-node-title">✦ {selectedNode.data?.label}</h3>
      <div className="field">
        <label>노드 제목</label>
        <input value={selectedNode.data?.label || ""} onChange={(event) => onUpdateNodeLabel(selectedNode.id, event.target.value)} />
      </div>

      {!isContentInputNode && (
        <>
          <div className="field">
            <label>명령어(Prompt)</label>
            <textarea
              className="config-editor"
              value={promptTemplate}
              onChange={(event) => onUpdateNodePromptTemplate(selectedNode.id, event.target.value)}
            />
          </div>

          <section className="panel-section">
            <h4>이전 노드 응답 컨텍스트</h4>
            <pre className="readonly-box">{upstreamText || "이전 노드 연결이 없습니다."}</pre>
          </section>

          <div className="step-action-row">
            <button type="button" className="toolbar-btn" onClick={() => navigator.clipboard.writeText(promptTemplate)}>
              프롬프트 복사
            </button>
          </div>
        </>
      )}

      <div className="field">
        <label>사용자 응답 입력</label>
        <textarea
          className="config-editor"
          placeholder={isContentInputNode ? "여기에 내용을 직접 입력해 주세요" : "각 단계에서 받은 답변을 붙여넣어 주세요"}
          value={manualResponse}
          onChange={(event) => setManualResponse(event.target.value)}
        />
      </div>

      {!isContentInputNode && (
        <div className="field">
          <label>업로드가 필요한 경우</label>
          <input
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setUploadFileName(file ? file.name : "");
            }}
          />
          {uploadFileName ? <p className="panel-help">선택 파일: {uploadFileName}</p> : null}
        </div>
      )}

      <div className="step-action-row">
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => {
            onUpdateNodeManualResult(selectedNode.id, manualResponse);
            onExecuteFromNode(selectedNode.id);
          }}
        >
          저장 후 다음 노드 실행
        </button>
      </div>
    </div>
  );
}

function RightExecutionPanel({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  onStart,
  onUpdateNodeLabel,
  onUpdateNodePromptTemplate,
  onUpdateNodeManualResult,
  onExecuteFromNode,
}) {
  const [activeTab, setActiveTab] = useState("preview");
  const projectTitle = useMemo(() => {
    const inputNode = nodes.find((node) => node.type === "ContentInputNode");
    return inputNode?.data?.config?.topic || "쇼츠자동화이걸로 Remix";
  }, [nodes]);

  return (
    <aside className="side-panel right-execution-panel">
      <nav className="execution-tabs">
        <button type="button" className={activeTab === "preview" ? "active" : ""} onClick={() => setActiveTab("preview")}>
          Preview
        </button>
        <button type="button" className={activeTab === "console" ? "active" : ""} onClick={() => setActiveTab("console")}>
          Console
        </button>
        <button
          type="button"
          className={activeTab === "step" ? "active" : ""}
          disabled={!selectedNode}
          onClick={() => setActiveTab("step")}
        >
          Step
        </button>
      </nav>

      {activeTab === "preview" && (
        <PreviewPanel nodes={nodes} edges={edges} projectTitle={projectTitle} onStart={onStart} onSelectNode={onSelectNode} />
      )}
      {activeTab === "console" && <ConsolePanel nodes={nodes} edges={edges} onSelectNode={onSelectNode} />}
      {activeTab === "step" && (
        <StepPanel
          selectedNode={selectedNode}
          nodes={nodes}
          onUpdateNodeLabel={onUpdateNodeLabel}
          onUpdateNodePromptTemplate={onUpdateNodePromptTemplate}
          onUpdateNodeManualResult={onUpdateNodeManualResult}
          onExecuteFromNode={onExecuteFromNode}
        />
      )}
    </aside>
  );
}

export default RightExecutionPanel;
