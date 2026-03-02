import React from "react";
import { NODE_CATALOG } from "../../utils/workflowData";
import Button from "../ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";

function NodeLibraryPanel({ onAddNode }) {
  return (
    <aside className="side-panel node-library-panel">
      <Card>
        <CardHeader>
          <CardTitle>노드 추가</CardTitle>
          <CardDescription>유튜브 생성 흐름에 필요한 기본 노드입니다.</CardDescription>
        </CardHeader>
        <CardContent className="node-library-list">
          {NODE_CATALOG.map((nodeType) => (
            <Button
              key={nodeType.type}
              type="button"
              variant="outline"
              className="node-library-btn"
              onClick={() => onAddNode(nodeType.type)}
            >
              <strong>{nodeType.label}</strong>
              <span>{nodeType.description}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </aside>
  );
}

export default NodeLibraryPanel;
