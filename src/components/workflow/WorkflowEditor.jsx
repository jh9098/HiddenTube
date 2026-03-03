import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from "reactflow";

import WorkflowNode from "../nodes/WorkflowNode";
import TopToolbar from "../panels/TopToolbar";
import CanvasNodeToolbar from "../panels/CanvasNodeToolbar";
import RightExecutionPanel from "../panels/RightExecutionPanel";
import { useWorkflowState } from "../../store/useWorkflowState";

const PROJECT_LIST_STORAGE_KEY = "hiddentube_projects_v1";

function readProjectCards() {
  try {
    const raw = localStorage.getItem(PROJECT_LIST_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProjectCards(cards) {
  localStorage.setItem(PROJECT_LIST_STORAGE_KEY, JSON.stringify(cards));
}

function ProjectListPage({ projects, onOpenProject }) {
  return (
    <div className="project-list-page">
      <h2>프로젝트 목록</h2>
      <p className="panel-help">카드를 누르면 캔버스 화면으로 이동합니다.</p>
      <div className="project-card-grid">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            className="project-card"
            onClick={() => onOpenProject(project.id)}
          >
            <strong>{project.title || "Untitled Project"}</strong>
            <span>{project.updatedAt || "방금"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkflowEditorBody() {
  const [message, setMessage] = useState("준비 완료");
  const [projectTitle, setProjectTitle] = useState("Untitled Project");
  const [activeView, setActiveView] = useState("canvas");
  const [projects, setProjects] = useState(() => readProjectCards());
  const workflow = useWorkflowState();

  const nodeTypes = useMemo(
    () => ({
      ContentInputNode: WorkflowNode,
      ScriptNode: WorkflowNode,
      SceneBreakdownNode: WorkflowNode,
      ImagePromptNode: WorkflowNode,
      MotionSubtitleNode: WorkflowNode,
      RenderJsonNode: WorkflowNode,
    }),
    []
  );

  const nodesWithActions = useMemo(
    () =>
      workflow.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onDetachIncoming: workflow.detachIncomingEdges,
        },
      })),
    [workflow.detachIncomingEdges, workflow.nodes]
  );

  const upsertCurrentProjectCard = (titleOverride) => {
    const now = new Date().toLocaleString("ko-KR");
    const nextProject = {
      id: "current-workflow",
      title: titleOverride || projectTitle,
      updatedAt: now,
      workflow: workflow.serializeCurrentWorkflow(),
    };

    setProjects((current) => {
      const filtered = current.filter((project) => project.id !== nextProject.id);
      const next = [nextProject, ...filtered];
      saveProjectCards(next);
      return next;
    });
  };

  const handleSave = () => {
    workflow.saveToLocalStorage();
    upsertCurrentProjectCard();
    setMessage("로컬 저장소에 저장되었습니다.");
  };

  const handleLoad = () => {
    try {
      workflow.loadFromLocalStorage();
      setMessage("저장된 워크플로우를 불러왔습니다.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleTemplateLoad = () => {
    workflow.loadTemplateWorkflow();
    setMessage("예시 템플릿 워크플로우를 불러왔습니다.");
  };

  const handleExport = () => {
    const content = workflow.serializeCurrentWorkflow();
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hiddentube-workflow.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("JSON 파일로 내보냈습니다.");
  };

  const handleImport = (text) => {
    try {
      workflow.importFromJson(text);
      setMessage("JSON 파일에서 워크플로우를 가져왔습니다.");
    } catch (error) {
      setMessage(`가져오기 실패: ${error.message}`);
    }
  };

  useEffect(() => {
    upsertCurrentProjectCard(projectTitle);
  }, [projectTitle]);

  useEffect(() => {
    const isTypingTarget = (target) => {
      if (!(target instanceof HTMLElement)) return false;

      const tagName = target.tagName.toLowerCase();
      const isTextInput =
        tagName === "input" ||
        tagName === "textarea" ||
        target.isContentEditable ||
        target.closest("[contenteditable='true']");

      return Boolean(isTextInput);
    };

    const handleKeyDown = (event) => {
      const isMetaPressed = event.ctrlKey || event.metaKey;
      const isTyping = isTypingTarget(event.target);

      if (event.key === "Delete" && !isTyping) {
        event.preventDefault();
        workflow.deleteSelectedElements();
        return;
      }

      if (isTyping) return;

      if (!isMetaPressed) return;

      const key = event.key.toLowerCase();
      if (key !== "z") return;

      event.preventDefault();

      if (event.shiftKey) {
        workflow.redo();
        return;
      }

      workflow.undo();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [workflow]);

  return (
    <div className="workflow-layout">
      <TopToolbar
        onHome={() => setActiveView("projects")}
        onNew={workflow.resetWorkflow}
        onSave={handleSave}
        onLoad={handleLoad}
        onLoadTemplate={handleTemplateLoad}
        onExport={handleExport}
        onImport={handleImport}
        onExecuteAll={() => {
          workflow.executeAllNodes();
          setMessage("전체 노드를 실행해 프롬프트/출력을 갱신했습니다.");
        }}
        onUndo={workflow.undo}
        onRedo={workflow.redo}
        canUndo={workflow.canUndo}
        canRedo={workflow.canRedo}
        message={message}
        projectTitle={projectTitle}
        onProjectTitleChange={setProjectTitle}
      />

      {activeView === "projects" ? (
        <main className="project-list-main">
          <ProjectListPage
            projects={projects}
            onOpenProject={(projectId) => {
              const target = projects.find((project) => project.id === projectId);
              if (target?.workflow) {
                workflow.importFromJson(target.workflow);
                setProjectTitle(target.title || "Untitled Project");
              }
              setActiveView("canvas");
              setMessage("프로젝트를 열었습니다.");
            }}
          />
        </main>
      ) : (
        <>
          <main className="canvas-area">
            <CanvasNodeToolbar onAddNode={workflow.addNode} />
            <ReactFlow
              nodes={nodesWithActions}
              edges={workflow.edges}
              onNodesChange={workflow.onNodesChange}
              onEdgesChange={workflow.onEdgesChange}
              onConnect={workflow.onConnect}
              nodeTypes={nodeTypes}
              onSelectionChange={workflow.setSelection}
              deleteKeyCode={["Delete"]}
              fitView
            >
              <Background gap={20} size={1} />
              <MiniMap zoomable pannable />
              <Controls />
            </ReactFlow>
          </main>
          <RightExecutionPanel
            nodes={workflow.nodes}
            edges={workflow.edges}
            projectTitle={projectTitle}
            selectedNode={workflow.selectedNode}
            onSelectNode={workflow.setSelectedNodeId}
            onDeleteNode={(nodeId) => workflow.deleteNodesByIds([nodeId])}
            onRemoveIncomingConnection={(targetNodeId, sourceNodeId) => {
              workflow.removeIncomingEdge(targetNodeId, sourceNodeId);
              setMessage("연결 노드 토큰을 제거해 엣지를 해제했습니다.");
            }}
            onMessage={(nextMessage) => setMessage(nextMessage)}
            onStart={() => {
              const firstNodeId = workflow.nodes.find((node) => node.type === "ContentInputNode")?.id;
              if (!firstNodeId) {
                setMessage("시작할 내용입력 노드를 찾지 못했습니다.");
                return;
              }
              workflow.setSelectedNodeId(firstNodeId);
              setMessage("Preview 단계 실행을 시작했습니다.");
            }}
            onUpdateNodeLabel={(nodeId, nextLabel) => {
              workflow.updateNodeMeta(nodeId, "label", nextLabel);
            }}
            onUpdateNodePromptTemplate={(nodeId, promptTemplate) => {
              workflow.updateNodeConfig(nodeId, (currentConfig) => ({ ...currentConfig, promptTemplate }));
            }}
            onExecuteFromNode={(nodeId, manualOverrides) => {
              const manualResult = manualOverrides?.[nodeId] ?? "";
              if (!manualResult.trim()) {
                return { ok: false, message: "저장할 입력값이 비어 있어 전달할 수 없습니다." };
              }

              try {
                workflow.executeFromNode(nodeId, manualOverrides);
                setMessage("저장 후 다음 단계로 전달했습니다.");
                return { ok: true };
              } catch (error) {
                return { ok: false, message: `저장 실패: ${error.message}` };
              }
            }}
          />
        </>
      )}
    </div>
  );
}

function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorBody />
    </ReactFlowProvider>
  );
}

export default WorkflowEditor;
