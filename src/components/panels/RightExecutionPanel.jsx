import React, { useEffect, useMemo, useState } from "react";
import { resolvePreviewPrompt } from "./previewPromptResolver";

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

function collectConnectedNodeIds(startNodeId, edges) {
  if (!startNodeId) return new Set();

  const visited = new Set([startNodeId]);
  const queue = [startNodeId];

  while (queue.length) {
    const currentNodeId = queue.shift();
    edges.forEach((edge) => {
      if (edge.source !== currentNodeId || visited.has(edge.target)) return;
      visited.add(edge.target);
      queue.push(edge.target);
    });
  }

  return visited;
}

function PreviewWorkspace({ displayNodes, nodes, edges, onUpdateNodeManualResult, onExecuteFromNode }) {
  const [manualResponses, setManualResponses] = useState({});

  useEffect(() => {
    const next = {};
    displayNodes.forEach((node) => {
      next[node.id] = node.data?.manualResult || "";
    });
    setManualResponses(next);
  }, [displayNodes]);

  if (!displayNodes.length) {
    return <p className="panel-help">연결된 실행 노드가 없습니다. 노드 연결 상태를 확인해 주세요.</p>;
  }

  return (
    <section className="preview-workspace">
      {displayNodes.map((node) => {
        const isContentInputNode = node.type === "ContentInputNode";
        const promptText = resolvePreviewPrompt(node, nodes, edges);
        const manualResponse = manualResponses[node.id] ?? "";

        return (
          <article key={node.id} className="console-item">
            <h4>{node.data?.label}</h4>

            {!isContentInputNode && (
              <div className="step-action-row">
                <button type="button" className="toolbar-btn" onClick={() => navigator.clipboard.writeText(promptText)}>
                  프롬프트 복사
                </button>
              </div>
            )}

            <div className="field">
              <label>{isContentInputNode ? "내용 입력" : "답변 입력"}</label>
              <textarea
                className="config-editor"
                placeholder={isContentInputNode ? "여기에 초안 내용을 입력하세요." : "AI 답변을 붙여넣어 주세요."}
                value={manualResponse}
                onChange={(event) => {
                  const value = event.target.value;
                  setManualResponses((current) => ({ ...current, [node.id]: value }));
                }}
              />
            </div>

            <div className="step-action-row">
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => {
                  onUpdateNodeManualResult(node.id, manualResponse);
                  onExecuteFromNode(node.id);
                }}
              >
                저장 후 다음 노드로 전달
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function PreviewPanel({
  nodes,
  edges,
  projectTitle,
  onStart,
  hasStarted,
  onUpdateNodeManualResult,
  onExecuteFromNode
}) {
  const orderedNodeIds = useMemo(() => buildExecutionOrder(nodes, edges), [nodes, edges]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const orderedNodes = orderedNodeIds.map((nodeId) => nodeMap.get(nodeId)).filter(Boolean);

  const firstContentInputNode = useMemo(
    () => orderedNodes.find((node) => node.type === "ContentInputNode"),
    [orderedNodes]
  );

  const connectedNodeIds = useMemo(
    () => collectConnectedNodeIds(firstContentInputNode?.id, edges),
    [firstContentInputNode?.id, edges]
  );

  const displayNodes = useMemo(
    () => orderedNodes.filter((node) => connectedNodeIds.has(node.id)),
    [orderedNodes, connectedNodeIds]
  );

  return (
    <div className="execution-pane preview-pane">
      <div className="preview-hero">
        <div className="preview-logo" />
        <h3>{projectTitle}</h3>
        <button type="button" className="start-btn" onClick={onStart}>
          ✦ Start
        </button>
      </div>

      {!hasStarted && <p className="panel-help">Start를 누르면 내용 입력 단계가 시작됩니다.</p>}

      {hasStarted && (
        <PreviewWorkspace
          displayNodes={displayNodes}
          nodes={nodes}
          edges={edges}
          onUpdateNodeManualResult={onUpdateNodeManualResult}
          onExecuteFromNode={onExecuteFromNode}
        />
      )}
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
  onUpdateNodeLabel,
  onUpdateNodePromptTemplate,
  onDeleteNode,
}) {
  if (!selectedNode) {
    return <p className="panel-help">노드를 선택하면 Step 탭이 활성화됩니다.</p>;
  }

  const promptTemplate = selectedNode.data?.config?.promptTemplate || "";

  return (
    <div className="execution-pane">
      <h3 className="execution-node-title">✦ {selectedNode.data?.label}</h3>
      <div className="field">
        <label>노드 제목</label>
        <input value={selectedNode.data?.label || ""} onChange={(event) => onUpdateNodeLabel(selectedNode.id, event.target.value)} />
      </div>
      <div className="field">
        <label>명령어(Prompt)</label>
        <textarea
          className="config-editor"
          value={promptTemplate}
          onChange={(event) => onUpdateNodePromptTemplate(selectedNode.id, event.target.value)}
        />
      </div>

      <div className="step-action-row">
        <button
          type="button"
          className="toolbar-btn danger"
          onClick={() => onDeleteNode(selectedNode.id)}
        >
          이 Step 노드 삭제
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
  onDeleteNode,
}) {
  const [activeTab, setActiveTab] = useState("preview");
  const [hasStarted, setHasStarted] = useState(false);
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
        <PreviewPanel
          projectTitle={projectTitle}
          onStart={() => {
            onStart();
            setHasStarted(true);
          }}
          hasStarted={hasStarted}
          onUpdateNodeManualResult={onUpdateNodeManualResult}
          onExecuteFromNode={onExecuteFromNode}
        />
      )}
      {activeTab === "console" && <ConsolePanel nodes={nodes} edges={edges} onSelectNode={onSelectNode} />}
      {activeTab === "step" && (
        <StepPanel
          selectedNode={selectedNode}
          onUpdateNodeLabel={onUpdateNodeLabel}
          onUpdateNodePromptTemplate={onUpdateNodePromptTemplate}
          onDeleteNode={onDeleteNode}
        />
      )}
    </aside>
  );
}

export default RightExecutionPanel;
