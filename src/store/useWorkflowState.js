import { useCallback, useMemo, useState } from "react";
import { addEdge, useEdgesState, useNodesState } from "reactflow";

import {
  createWorkflowNode,
  deserializeWorkflow,
  NODE_STATUSES,
  serializeWorkflow,
  WORKFLOW_STORAGE_KEY,
} from "../utils/workflowData";
import { createYoutubeTemplate } from "../templates/youtubeTemplate";
import { buildPromptPackage, executeNodes } from "../workflow/youtubeExecution";

export function useWorkflowState() {
  const initialWorkflow = useMemo(() => createYoutubeTemplate(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialWorkflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialWorkflow.edges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const onConnect = useCallback(
    (connection) => {
      if (!connection?.source || !connection?.target || connection.source === connection.target) {
        return;
      }
      setEdges((currentEdges) => addEdge({ ...connection, id: `edge_${Date.now()}` }, currentEdges));
    },
    [setEdges]
  );

  const addNode = useCallback(
    (nodeType) => {
      const nextNode = createWorkflowNode(nodeType, {
        x: 200 + Math.random() * 180,
        y: 120 + Math.random() * 200,
      });
      setNodes((currentNodes) => [...currentNodes, nextNode]);
      setSelectedNodeId(nextNode.id);
    },
    [setNodes]
  );

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNodeId));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId)
    );
    setSelectedNodeId(null);
  }, [selectedNodeId, setEdges, setNodes]);

  const updateNodeData = useCallback(
    (nodeId, updater) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId) return node;
          return {
            ...node,
            data: typeof updater === "function" ? updater(node.data) : { ...node.data, ...updater },
          };
        })
      );
    },
    [setNodes]
  );

  const updateSelectedNodeMeta = useCallback(
    (field, value) => {
      if (!selectedNodeId) return;
      updateNodeData(selectedNodeId, (currentData) => ({ ...currentData, [field]: value }));
    },
    [selectedNodeId, updateNodeData]
  );

  const updateSelectedNodeConfigText = useCallback(
    (nextText) => {
      if (!selectedNodeId) return;
      try {
        const parsed = JSON.parse(nextText || "{}");
        updateNodeData(selectedNodeId, (currentData) => ({ ...currentData, config: parsed }));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: error.message };
      }
    },
    [selectedNodeId, updateNodeData]
  );

  const updateSelectedNodeManualResult = useCallback(
    (manualResult) => {
      if (!selectedNodeId) return;
      updateNodeData(selectedNodeId, (currentData) => ({ ...currentData, manualResult }));
    },
    [selectedNodeId, updateNodeData]
  );

  const updateSelectedNodeStatus = useCallback(
    (nextStatus) => {
      if (!selectedNodeId || !NODE_STATUSES.includes(nextStatus)) return;
      updateNodeData(selectedNodeId, (currentData) => ({ ...currentData, status: nextStatus }));
    },
    [selectedNodeId, updateNodeData]
  );

  const executeSelectedNodeOnly = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((currentNodes) => executeNodes(currentNodes, edges, { startNodeId: selectedNodeId, runMode: "single" }));
  }, [edges, selectedNodeId, setNodes]);

  const executeFromSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((currentNodes) => executeNodes(currentNodes, edges, { startNodeId: selectedNodeId, runMode: "downstream" }));
  }, [edges, selectedNodeId, setNodes]);

  const executeAllNodes = useCallback(() => {
    setNodes((currentNodes) => executeNodes(currentNodes, edges));
  }, [edges, setNodes]);

  const copyPromptPackage = useCallback(async () => {
    const content = buildPromptPackage(nodes);
    await navigator.clipboard.writeText(content);
    return content;
  }, [nodes]);

  const resetWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
  }, [setEdges, setNodes]);

  const loadTemplateWorkflow = useCallback(() => {
    const template = createYoutubeTemplate();
    setNodes(template.nodes);
    setEdges(template.edges);
    setSelectedNodeId(null);
  }, [setEdges, setNodes]);

  const saveToLocalStorage = useCallback(() => {
    const serialized = serializeWorkflow({ nodes, edges });
    localStorage.setItem(WORKFLOW_STORAGE_KEY, serialized);
    return serialized;
  }, [edges, nodes]);

  const loadFromLocalStorage = useCallback(() => {
    const savedText = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!savedText) {
      throw new Error("저장된 워크플로우가 없습니다.");
    }
    const loaded = deserializeWorkflow(savedText);
    setNodes(loaded.nodes);
    setEdges(loaded.edges);
    setSelectedNodeId(null);
  }, [setEdges, setNodes]);

  const importFromJson = useCallback(
    (rawText) => {
      const loaded = deserializeWorkflow(rawText);
      setNodes(loaded.nodes);
      setEdges(loaded.edges);
      setSelectedNodeId(null);
    },
    [setEdges, setNodes]
  );

  return {
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    addNode,
    deleteSelectedNode,
    updateSelectedNodeMeta,
    updateSelectedNodeConfigText,
    updateSelectedNodeManualResult,
    updateSelectedNodeStatus,
    executeSelectedNodeOnly,
    executeFromSelectedNode,
    executeAllNodes,
    copyPromptPackage,
    resetWorkflow,
    loadTemplateWorkflow,
    saveToLocalStorage,
    loadFromLocalStorage,
    importFromJson,
    serializeCurrentWorkflow: () => serializeWorkflow({ nodes, edges }),
  };
}
