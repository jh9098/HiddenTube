import React, { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import { nanoid } from "nanoid";

import Inspector from "./components/Inspector.jsx";
import RunTimeline from "./components/RunTimeline.jsx";
import ArtifactsPanel from "./components/ArtifactsPanel.jsx";
import ApiKeysModal from "./components/ApiKeysModal.jsx";

import InputNode from "./nodes/InputNode.jsx";
import GenerateNode from "./nodes/GenerateNode.jsx";
import AssetNode from "./nodes/AssetNode.jsx";
import OutputNode from "./nodes/OutputNode.jsx";

import { makeNodeData } from "./workflow/nodeDefinitions.js";
import {
  topoSort,
  buildOutputsMapFromNodes,
  gatherIncomingVars,
  renderTemplate,
  previewOf,
  nowHHMMSS,
} from "./workflow/runner.js";

import { loadApiKeys, saveApiKeys } from "./workflow/apiKeys.js";

const STORAGE_KEY = "opal_mvp_workflow_v3";
const QUICK_NODE_BUTTONS = [
  { type: "input", label: "Input" },
  { type: "generate", label: "Generate" },
  { type: "asset", label: "Add Assets" },
  { type: "output", label: "Output" },
];
const ASSET_CHOICES = [
  { key: "upload", label: "파일 업로드" },
  { key: "url", label: "URL 링크" },
  { key: "text", label: "텍스트 메모" },
];

function makeInitial() {
  const n1 = {
    id: nanoid(),
    type: "inputNode",
    position: { x: 60, y: 160 },
    data: makeNodeData("input"),
  };
  n1.data.config.key = "topic";
  n1.data.config.value = "경제 뉴스 쇼츠";

  const n2 = {
    id: nanoid(),
    type: "generateNode",
    position: { x: 380, y: 120 },
    data: makeNodeData("generate"),
  };
  n2.data.config.capability = "research";

  const n3 = {
    id: nanoid(),
    type: "generateNode",
    position: { x: 700, y: 120 },
    data: makeNodeData("generate"),
  };
  n3.data.config.capability = "text";

  const n4 = {
    id: nanoid(),
    type: "outputNode",
    position: { x: 1020, y: 160 },
    data: makeNodeData("output"),
  };

  const e1 = { id: nanoid(), source: n1.id, target: n2.id };
  const e2 = { id: nanoid(), source: n2.id, target: n3.id };
  const e3 = { id: nanoid(), source: n3.id, target: n4.id };

  return { nodes: [n1, n2, n3, n4], edges: [e1, e2, e3] };
}

function serializeAll(nodes, edges, runs, currentRunId) {
  return JSON.stringify({ version: 3, nodes, edges, runs, currentRunId }, null, 2);
}
function deserializeAll(text) {
  const obj = JSON.parse(text);
  if (!obj || !Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) throw new Error("잘못된 형식");
  return {
    nodes: obj.nodes,
    edges: obj.edges,
    runs: Array.isArray(obj.runs) ? obj.runs : [],
    currentRunId: obj.currentRunId || "",
  };
}

function AppInner() {
  const rf = useReactFlow();
  const initial = useMemo(() => makeInitial(), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  const [assetMenuOpen, setAssetMenuOpen] = useState(false);
  const [artifactsOpen, setArtifactsOpen] = useState(false);

  const canvasRef = useRef(null);
  const connectingNodeIdRef = useRef(null);
  const connectionSucceededRef = useRef(false);

  const nodeTypes = useMemo(
    () => ({
      inputNode: InputNode,
      generateNode: GenerateNode,
      assetNode: AssetNode,
      outputNode: OutputNode,
    }),
    []
  );

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  const [runs, setRuns] = useState([]);
  const [currentRunId, setCurrentRunId] = useState("");

  const [apiKeys, setApiKeys] = useState(() => loadApiKeys());
  const [apiKeysOpen, setApiKeysOpen] = useState(false);

  const patchNodeData = useCallback(
    (nodeId, patch) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [setNodes]
  );

  const createNodeAtCanvas = useCallback(
    (type, configPatch = null) => {
      const id = nanoid();
      let flowType = "generateNode";
      if (type === "input") flowType = "inputNode";
      if (type === "generate") flowType = "generateNode";
      if (type === "asset") flowType = "assetNode";
      if (type === "output") flowType = "outputNode";

      const rect = canvasRef.current?.getBoundingClientRect();
      const position = rf.screenToFlowPosition({
        x: rect ? rect.left + rect.width * 0.5 : window.innerWidth * 0.5,
        y: rect ? rect.top + rect.height * 0.35 : window.innerHeight * 0.4,
      });

      const baseData = makeNodeData(type);
      const nextData = configPatch
        ? {
            ...baseData,
            config: {
              ...baseData.config,
              ...configPatch,
            },
          }
        : baseData;

      const newNode = {
        id,
        type: flowType,
        position: {
          x: position.x + Math.random() * 80 - 40,
          y: position.y + Math.random() * 60 - 30,
        },
        data: nextData,
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(id);
    },
    [rf, setNodes]
  );

  const onConnect = useCallback(
    (params) => {
      connectionSucceededRef.current = true;
      setEdges((eds) => addEdge({ ...params, id: nanoid() }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = nanoid();

      let flowType = "generateNode";
      if (type === "input") flowType = "inputNode";
      if (type === "generate") flowType = "generateNode";
      if (type === "asset") flowType = "assetNode";
      if (type === "output") flowType = "outputNode";

      const newNode = { id, type: flowType, position, data: makeNodeData(type) };
      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(id);
    },
    [rf, setNodes]
  );

  const startRun = useCallback(() => {
    let order = [];
    try {
      order = topoSort(nodes, edges);
    } catch (e) {
      alert(e?.message || String(e));
      return;
    }

    const runId = nanoid();
    const run = {
      id: runId,
      title: `Run #${runs.length + 1}`,
      createdAt: Date.now(),
      steps: order.map((nodeId) => ({
        stepId: nanoid(),
        nodeId,
        status: "todo",
        doneAt: null,
        snapshotPreview: "",
        snapshotOutput: null,
      })),
      events: [{ id: nanoid(), time: nowHHMMSS(), text: `Run created (steps=${order.length})` }],
    };

    setRuns((prev) => [run, ...prev]);
    setCurrentRunId(runId);
    if (order[0]) setSelectedNodeId(order[0]);
  }, [nodes, edges, runs.length]);

  const clearRuns = useCallback(() => {
    setRuns([]);
    setCurrentRunId("");
  }, []);

  const selectRun = useCallback((id) => setCurrentRunId(id), []);

  const selectNode = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    rf.setCenter(rf.getNode(nodeId)?.position?.x ?? 0, rf.getNode(nodeId)?.position?.y ?? 0, { zoom: 1.0 });
  }, [rf]);

  const focusNextTodoStep = useCallback((runId, justDoneStepId) => {
    const run = runs.find((r) => r.id === runId);
    if (!run) return;

    const idx = run.steps.findIndex((s) => s.stepId === justDoneStepId);
    if (idx < 0) return;

    for (let i = idx + 1; i < run.steps.length; i++) {
      if (run.steps[i].status === "todo") {
        selectNode(run.steps[i].nodeId);
        return;
      }
    }
    const firstTodo = run.steps.find((s) => s.status === "todo");
    if (firstTodo) selectNode(firstTodo.nodeId);
  }, [runs, selectNode]);

  const markStep = useCallback(
    (runId, stepId, status) => {
      setRuns((prev) =>
        prev.map((r) => {
          if (r.id !== runId) return r;

          const nodeForStep = (step) => nodes.find((n) => n.id === step.nodeId);

          const nextSteps = r.steps.map((s) => {
            if (s.stepId !== stepId) return s;

            const node = nodeForStep(s);
            const snapOut = node?.data?.output || null;
            const snapPrev = node?.data?.outputPreview || "";

            return {
              ...s,
              status,
              doneAt: status === "done" ? Date.now() : null,
              snapshotOutput: status === "done" ? snapOut : null,
              snapshotPreview: status === "done" ? snapPrev : "",
            };
          });

          return {
            ...r,
            steps: nextSteps,
            events: [{ id: nanoid(), time: nowHHMMSS(), text: `Step ${stepId.slice(0, 6)} -> ${status}` }, ...r.events],
          };
        })
      );

      const run = runs.find((r) => r.id === runId);
      const step = run?.steps.find((s) => s.stepId === stepId);
      if (step?.nodeId) patchNodeData(step.nodeId, { status });

      if (status === "done") focusNextTodoStep(runId, stepId);
    },
    [runs, nodes, patchNodeData, focusNextTodoStep]
  );

  const copyStepPrompt = useCallback(
    async (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.data.type !== "generate") {
        alert("이 노드에는 프롬프트가 없습니다.");
        return;
      }
      const outputsMap = buildOutputsMapFromNodes(nodes);
      const vars = gatherIncomingVars(nodeId, edges, outputsMap);
      const prompt = renderTemplate(node.data.config?.promptTemplate || "", vars);
      await navigator.clipboard.writeText(prompt);
      alert("프롬프트를 클립보드에 복사했습니다.");
    },
    [nodes, edges]
  );

  const saveAll = useCallback(() => {
    const json = serializeAll(nodes, edges, runs, currentRunId);
    localStorage.setItem(STORAGE_KEY, json);
    alert("저장 완료(localStorage).");
  }, [nodes, edges, runs, currentRunId]);

  const loadAll = useCallback(() => {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return alert("저장된 데이터가 없습니다.");
    try {
      const { nodes: n, edges: e, runs: rr, currentRunId: cr } = deserializeAll(text);
      setNodes(n);
      setEdges(e);
      setRuns(rr);
      setCurrentRunId(cr || "");
      setSelectedNodeId(null);
      alert("불러오기 완료.");
    } catch (err) {
      alert(`불러오기 실패: ${err?.message || String(err)}`);
    }
  }, [setNodes, setEdges]);

  const exportAll = useCallback(async () => {
    const json = serializeAll(nodes, edges, runs, currentRunId);
    await navigator.clipboard.writeText(json);
    alert("Export JSON을 클립보드에 복사했습니다.");
  }, [nodes, edges, runs, currentRunId]);

  const importAll = useCallback(() => {
    const text = prompt("붙여넣을 JSON을 입력하세요:");
    if (!text) return;
    try {
      const { nodes: n, edges: e, runs: rr, currentRunId: cr } = deserializeAll(text);
      setNodes(n);
      setEdges(e);
      setRuns(rr);
      setCurrentRunId(cr || "");
      setSelectedNodeId(null);
      alert("Import 완료.");
    } catch (err) {
      alert(`Import 실패: ${err?.message || String(err)}`);
    }
  }, [setNodes, setEdges]);

  const fitView = useCallback(() => rf.fitView({ padding: 0.2 }), [rf]);

  const buildFinalFromOutputNode = useCallback(() => {
    const outputNodes = nodes.filter((n) => n.data.type === "output");
    if (!outputNodes.length) return alert("Output 노드가 없습니다.");
    const outNode = outputNodes[outputNodes.length - 1];

    const outputsMap = buildOutputsMapFromNodes(nodes);
    const incoming = gatherIncomingVars(outNode.id, edges, outputsMap);

    patchNodeData(outNode.id, {
      output: { final: JSON.stringify(incoming, null, 2) },
      outputPreview: previewOf(incoming),
      status: "done",
    });

    alert("Output 노드에 upstream 결과를 final로 반영했습니다.");
  }, [nodes, edges, patchNodeData]);

  const openApiKeys = () => setApiKeysOpen(true);
  const closeApiKeys = () => setApiKeysOpen(false);
  const saveApiKeysAndState = (next) => {
    setApiKeys(next);
    saveApiKeys(next);
    alert("API Keys 저장 완료(localStorage).");
  };

  const onConnectStart = useCallback((_, params) => {
    connectionSucceededRef.current = false;
    connectingNodeIdRef.current = params?.nodeId || null;
  }, []);

  const onConnectEnd = useCallback((event) => {
    if (connectionSucceededRef.current) return;

    const sourceId = connectingNodeIdRef.current;
    connectingNodeIdRef.current = null;
    if (!sourceId) return;

    const nodeElFromPath = event.composedPath?.().find((el) => el?.classList?.contains?.("react-flow__node"));
    const nodeElFromPoint = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".react-flow__node");
    const targetNodeId = nodeElFromPath?.getAttribute?.("data-id") || nodeElFromPoint?.getAttribute?.("data-id");

    if (!targetNodeId || targetNodeId === sourceId) return;
    setEdges((eds) => addEdge({ id: nanoid(), source: sourceId, target: targetNodeId }, eds));
  }, [setEdges]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">YouTube Workflow MVP (Manual+Assets)</div>

        <button className="btn primary" onClick={startRun}>Start Run</button>

        <div className="sep" />

        <button className="btn" onClick={openApiKeys}>API Keys</button>

        <div className="sep" />

        <button className="btn" onClick={saveAll}>Save</button>
        <button className="btn" onClick={loadAll}>Load</button>
        <button className="btn" onClick={exportAll}>Export</button>
        <button className="btn" onClick={importAll}>Import</button>

        <div className="sep" />

        <button className="btn" onClick={fitView}>Fit View</button>
        <button className="btn" onClick={buildFinalFromOutputNode}>Build Final(Output)</button>
      </div>

      <div className="canvas" ref={canvasRef}>
        <div className="quickNodeBar">
          {QUICK_NODE_BUTTONS.map((item) => (
            <div key={item.type} style={{ position: "relative" }}>
              <button
                className="tabBtn quickNodeBtn"
                onClick={() => {
                  if (item.type !== "asset") {
                    createNodeAtCanvas(item.type);
                    return;
                  }
                  setAssetMenuOpen((prev) => !prev);
                }}
              >
                {item.label}
              </button>
              {item.type === "asset" && assetMenuOpen ? (
                <div className="assetMenu">
                  {ASSET_CHOICES.map((choice) => (
                    <button
                      key={choice.key}
                      className="assetMenuItem"
                      onClick={() => {
                        createNodeAtCanvas("asset", { source: choice.key, title: choice.label });
                        setAssetMenuOpen(false);
                      }}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <button className="btn artifactsToggle" onClick={() => setArtifactsOpen((prev) => !prev)}>
          Artifacts {artifactsOpen ? "닫기" : "보기"}
        </button>

        {artifactsOpen ? (
          <div className="artifactsDrawer">
            <ArtifactsPanel nodes={nodes} onSelectNode={selectNode} />
          </div>
        ) : null}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(params) => onConnect(params)}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onDragOver={(e) => onDragOver(e)}
          onDrop={(e) => onDrop(e)}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setAssetMenuOpen(false);
          }}
          fitView
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>

      <div className="right">
        <Inspector selectedNode={selectedNode} nodes={nodes} edges={edges} onPatchNodeData={patchNodeData} />
      </div>

      <div className="bottom">
        <RunTimeline
          runs={runs}
          currentRunId={currentRunId}
          nodes={nodes}
          onSelectRun={selectRun}
          onSelectNode={selectNode}
          onStartRun={startRun}
          onMarkStep={markStep}
          onCopyStepPrompt={copyStepPrompt}
          onClearRuns={clearRuns}
        />
      </div>

      <ApiKeysModal
        open={apiKeysOpen}
        keysObj={apiKeys}
        onClose={closeApiKeys}
        onSave={saveApiKeysAndState}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
