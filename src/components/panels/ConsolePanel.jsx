import React, { useMemo } from "react";
import { getStatusMeta } from "../status/statusMeta";
import { buildExecutionOrder, getNodeExecutionState } from "./executionPanelUtils";

function ConsolePanel({ nodes, edges, onSelectNode }) {
  const orderedNodeIds = useMemo(() => buildExecutionOrder(nodes, edges), [nodes, edges]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  return (
    <div className="execution-pane" data-panel-first-focus="true">
      {orderedNodeIds.map((nodeId) => {
        const node = nodeMap.get(nodeId);
        if (!node) return null;
        const statusMeta = getStatusMeta(getNodeExecutionState(node));

        return (
          <article key={node.id} className="console-item">
            <header>
              <button type="button" className="console-node-title" onClick={() => onSelectNode(node.id)}>
                {node.data?.label}
              </button>
              <span className={`status-badge ${statusMeta.className}`}>
                <span aria-hidden="true">{statusMeta.icon}</span> {statusMeta.label}
              </span>
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

export default ConsolePanel;
