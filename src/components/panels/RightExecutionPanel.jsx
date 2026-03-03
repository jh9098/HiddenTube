import React, { useEffect, useMemo, useState } from "react";
import { resolvePreviewPrompt } from "./previewPromptResolver";
import ProductionWorkspace from "./ProductionWorkspace";
import Button from "../ui/Button";
import { TabsList, TabsTrigger } from "../ui/Tabs";
import { Card, CardContent } from "../ui/Card";
import {
  buildPreviewFlow,
  getReadyNodeIds,
  getWaitingNodeIds,
} from "./previewFlow";
import { toMentionToken } from "./promptMentionTokens";
import PromptTokenEditor from "./PromptTokenEditor";

function getNodeExecutionState(node) {
  const manualResult = node?.data?.manualResult || "";
  const hasManualResult = manualResult.trim().length > 0;
  const hasResolvedInput = Boolean(
    node?.data?.resolvedInput && Object.keys(node.data.resolvedInput).length > 0
  );

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

function PreviewWorkspace({
  displayNodes,
  waitingNodes,
  nodes,
  edges,
  onExecuteFromNode,
  onMessage,
}) {
  const [manualResponses, setManualResponses] = useState({});

  useEffect(() => {
    const next = {};
    displayNodes.forEach((node) => {
      next[node.id] = node.data?.manualResult || "";
    });
    setManualResponses(next);
  }, [displayNodes]);

  const handleCopyPrompt = async (node) => {
    const resolvedPrompt = resolvePreviewPrompt(node, nodes, edges, manualResponses);

    if (!resolvedPrompt?.trim()) {
      onMessage?.("복사할 프롬프트가 없습니다. 먼저 프롬프트를 생성해 주세요.");
      return;
    }

    try {
      await navigator.clipboard.writeText(resolvedPrompt);
      onMessage?.("프롬프트를 복사했습니다.");
    } catch (error) {
      onMessage?.("프롬프트 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
    }
  };

  if (!displayNodes.length) {
    return <p className="panel-help">연결된 실행 노드가 없습니다. 노드 연결 상태를 확인해 주세요.</p>;
  }

  return (
    <section className="preview-workspace">
      {displayNodes.map((node) => {
        const isContentInputNode = node.type === "ContentInputNode";
        const manualResponse = manualResponses[node.id] ?? "";

        return (
          <article key={node.id} className="console-item">
            <h4>{node.data?.label}</h4>

            {!isContentInputNode && (
              <div className="step-action-row">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyPrompt(node)}
                >
                  프롬프트 복사
                </Button>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const result = await onExecuteFromNode(node.id, { [node.id]: manualResponse });
                  if (!result?.ok) {
                    onMessage?.(result?.message || "저장에 실패해 다음 단계로 전달할 수 없습니다.");
                  }
                }}
              >
                다음으로 전달
              </Button>
            </div>
          </article>
        );
      })}

      {waitingNodes.length > 0 && (
        <article className="console-item waiting-node-box">
          <h4>대기 중 노드</h4>
          <p className="console-subtitle">아직 전달 조건이 충족되지 않은 노드입니다.</p>
          <ul className="waiting-node-list">
            {waitingNodes.map((node) => (
              <li key={node.id}>{node.data?.label || "노드"}</li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
}

function PreviewPanel({
  nodes,
  edges,
  projectTitle,
  onStart,
  onCancel,
  hasStarted,
  canUndoPreview,
  onUndoPreview,
  onExecuteFromNode,
  onMessage,
}) {
  const orderedNodeIds = useMemo(() => buildExecutionOrder(nodes, edges), [nodes, edges]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const orderedNodes = orderedNodeIds.map((nodeId) => nodeMap.get(nodeId)).filter(Boolean);
  const [deliveredNodeIds, setDeliveredNodeIds] = useState([]);
  const [lastSnapshot, setLastSnapshot] = useState(null);

  const previewFlow = useMemo(() => buildPreviewFlow(nodes, edges), [nodes, edges]);

  useEffect(() => {
    if (!hasStarted) return;
    setDeliveredNodeIds((current) => current.filter((nodeId) => previewFlow.nodeById.has(nodeId)));
  }, [hasStarted, previewFlow]);

  const visibleNodeIds = useMemo(() => {
    if (!hasStarted) return [];
    const readyNodeIds = getReadyNodeIds(previewFlow, deliveredNodeIds);
    return [...previewFlow.contentInputNodeIds, ...readyNodeIds];
  }, [deliveredNodeIds, hasStarted, previewFlow]);

  const waitingNodeIds = useMemo(() => {
    if (!hasStarted) return [];
    return getWaitingNodeIds(previewFlow, deliveredNodeIds);
  }, [deliveredNodeIds, hasStarted, previewFlow]);

  const displayNodes = useMemo(
    () => orderedNodes.filter((node) => visibleNodeIds.includes(node.id)),
    [orderedNodes, visibleNodeIds]
  );

  const waitingNodes = useMemo(
    () => orderedNodes.filter((node) => waitingNodeIds.includes(node.id)),
    [orderedNodes, waitingNodeIds]
  );

  const handleDeliver = async (nodeId, manualOverrides) => {
    const result = await onExecuteFromNode(nodeId, manualOverrides);
    if (!result?.ok) return result;

    setDeliveredNodeIds((current) => (current.includes(nodeId) ? current : [...current, nodeId]));
    return result;
  };

  const handleCancel = () => {
    setLastSnapshot(deliveredNodeIds);
    setDeliveredNodeIds([]);
    onCancel();
  };

  const handleUndoCancel = () => {
    if (!lastSnapshot) return;
    setDeliveredNodeIds(lastSnapshot);
    onUndoPreview();
    setLastSnapshot(null);
  };

  return (
    <div className="execution-pane preview-pane">
      <div className="preview-hero">
        <div className="preview-logo" />
        <div className="preview-hero-title-box">
          <h3>{projectTitle || "Untitled Project"}</h3>
          {!hasStarted ? (
            <Button type="button" className="start-btn" onClick={onStart}>
              ✦ 시작하기
            </Button>
          ) : (
            <Button type="button" className="start-btn" variant="outline" onClick={handleCancel}>
              중단하기
            </Button>
          )}
          {!hasStarted && canUndoPreview && (
            <Button type="button" size="sm" variant="ghost" onClick={handleUndoCancel}>
              취소 되돌리기
            </Button>
          )}
        </div>
      </div>

      {!hasStarted && <p className="panel-help">시작하기를 누르면 내용 입력 단계가 시작됩니다.</p>}

      {hasStarted && (
        <PreviewWorkspace
          displayNodes={displayNodes}
          waitingNodes={waitingNodes}
          nodes={nodes}
          edges={edges}
          onExecuteFromNode={handleDeliver}
          onMessage={onMessage}
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
  nodes,
  edges,
  onUpdateNodeLabel,
  onUpdateNodePromptTemplate,
  onDeleteNode,
  onRemoveIncomingConnection,
}) {
  if (!selectedNode) {
    return <p className="panel-help">노드를 선택하면 Step 탭이 활성화됩니다.</p>;
  }

  const promptTemplate = selectedNode.data?.config?.promptTemplate || "";
  const incomingNodes = useMemo(() => {
    const sourceNodeById = new Map(nodes.map((node) => [node.id, node]));
    return edges
      .filter((edge) => edge.target === selectedNode.id)
      .map((edge) => sourceNodeById.get(edge.source))
      .filter(Boolean)
      .map((node) => ({ id: node.id, label: node.data?.label || "노드" }));
  }, [edges, nodes, selectedNode.id]);
  const handlePromptTemplateChange = (nextValue) => {
    onUpdateNodePromptTemplate(selectedNode.id, nextValue);
  };

  return (
    <div className="execution-pane">
      <h3 className="execution-node-title">✦ {selectedNode.data?.label}</h3>
      <div className="field">
        <label>노드 제목</label>
        <input value={selectedNode.data?.label || ""} onChange={(event) => onUpdateNodeLabel(selectedNode.id, event.target.value)} />
      </div>
      <div className="field">
        <label>명령어(Prompt)</label>
        <div className="prompt-editor-box">
          <PromptTokenEditor
            value={promptTemplate}
            mentionOptions={incomingNodes}
            onChange={handlePromptTemplateChange}
          />

          <div className="mention-token-list" role="list" aria-label="연결 노드 목록">
            {incomingNodes.map((node) => (
              <div key={node.id} className="mention-chip" role="listitem" title={`${node.label} 연결됨`}>
                <span className="mention-chip-icon" aria-hidden="true">🔗</span>
                <span className="mention-chip-label">{node.label}</span>
                <span className="mention-chip-token">{toMentionToken(node.label)}</span>
                <button
                  type="button"
                  className="mention-chip-remove"
                  aria-label={`${node.label} 연결 해제`}
                  onClick={() => onRemoveIncomingConnection(selectedNode.id, node.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="panel-help">
          상단 토큰 버튼을 누르면 커서 위치에 참조 아이콘이 삽입됩니다. 한글 IME 타이핑도 일반 입력처럼 동작합니다.
        </p>
      </div>

      <div className="step-action-row">
        <Button
          type="button"
          variant="destructive"
          onClick={() => onDeleteNode(selectedNode.id)}
        >
          이 Step 노드 삭제
        </Button>
      </div>
    </div>
  );
}

function RightExecutionPanel({
  nodes,
  edges,
  projectTitle,
  selectedNode,
  onSelectNode,
  onStart,
  onUpdateNodeLabel,
  onUpdateNodePromptTemplate,
  onExecuteFromNode,
  onDeleteNode,
  onRemoveIncomingConnection,
  onMessage,
}) {
  const [activeTab, setActiveTab] = useState("preview");
  const [hasStarted, setHasStarted] = useState(false);
  const [canUndoPreview, setCanUndoPreview] = useState(false);

  return (
    <aside className="side-panel right-execution-panel">
      <TabsList className="execution-tabs">
        <TabsTrigger active={activeTab === "preview"} onClick={() => setActiveTab("preview")}>
          미리보기
        </TabsTrigger>
        <TabsTrigger active={activeTab === "production"} onClick={() => setActiveTab("production")}>
          프로덕션
        </TabsTrigger>
        <TabsTrigger active={activeTab === "console"} onClick={() => setActiveTab("console")}>
          콘솔 보기
        </TabsTrigger>
        <TabsTrigger
          active={activeTab === "step"}
          disabled={!selectedNode}
          onClick={() => setActiveTab("step")}
        >
          스텝 편집
        </TabsTrigger>
      </TabsList>

      {activeTab === "preview" && (
        <Card className="execution-card">
          <CardContent>
            <PreviewPanel
              nodes={nodes}
              edges={edges}
              projectTitle={projectTitle}
              onStart={() => {
                onStart();
                setHasStarted(true);
                setCanUndoPreview(false);
              }}
              onCancel={() => {
                setHasStarted(false);
                setCanUndoPreview(true);
              }}
              canUndoPreview={canUndoPreview}
              onUndoPreview={() => {
                setHasStarted(true);
                setCanUndoPreview(false);
              }}
              hasStarted={hasStarted}
              onExecuteFromNode={onExecuteFromNode}
              onMessage={onMessage}
            />
          </CardContent>
        </Card>
      )}
      {activeTab === "production" && (
        <Card className="execution-card">
          <CardContent>
            <ProductionWorkspace nodes={nodes} edges={edges} projectTitle={projectTitle} onMessage={onMessage} />
          </CardContent>
        </Card>
      )}
      {activeTab === "console" && (
        <Card className="execution-card">
          <CardContent>
            <ConsolePanel nodes={nodes} edges={edges} onSelectNode={onSelectNode} />
          </CardContent>
        </Card>
      )}
      {activeTab === "step" && (
        <Card className="execution-card">
          <CardContent>
            <StepPanel
              selectedNode={selectedNode}
              nodes={nodes}
              edges={edges}
              onUpdateNodeLabel={onUpdateNodeLabel}
              onUpdateNodePromptTemplate={onUpdateNodePromptTemplate}
              onDeleteNode={onDeleteNode}
              onRemoveIncomingConnection={onRemoveIncomingConnection}
            />
          </CardContent>
        </Card>
      )}
    </aside>
  );
}

export default RightExecutionPanel;
