export function buildPreviewFlow(nodes, edges) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incomingById = new Map(nodes.map((node) => [node.id, []]));
  const outgoingById = new Map(nodes.map((node) => [node.id, []]));

  edges.forEach((edge) => {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) return;
    incomingById.get(edge.target).push(edge.source);
    outgoingById.get(edge.source).push(edge.target);
  });

  const contentInputNodeIds = nodes
    .filter((node) => node.type === "ContentInputNode")
    .map((node) => node.id);

  const connectedToContentInput = collectConnectedNodeIds(contentInputNodeIds, outgoingById);

  return {
    nodeById,
    incomingById,
    outgoingById,
    contentInputNodeIds,
    connectedToContentInput,
  };
}

function collectConnectedNodeIds(startNodeIds, outgoingById) {
  const visited = new Set(startNodeIds.filter(Boolean));
  const queue = [...visited];

  while (queue.length) {
    const nodeId = queue.shift();
    const targets = outgoingById.get(nodeId) || [];
    targets.forEach((targetId) => {
      if (visited.has(targetId)) return;
      visited.add(targetId);
      queue.push(targetId);
    });
  }

  return visited;
}

export function getReadyNodeIds(flow, deliveredNodeIds) {
  const deliveredSet = new Set(deliveredNodeIds);
  const readyNodeIds = [];

  flow.connectedToContentInput.forEach((nodeId) => {
    if (deliveredSet.has(nodeId)) return;
    if (flow.contentInputNodeIds.includes(nodeId)) return;

    const incoming = flow.incomingById.get(nodeId) || [];
    if (!incoming.length) return;

    const isReady = incoming.every((sourceId) => deliveredSet.has(sourceId));
    if (isReady) {
      readyNodeIds.push(nodeId);
    }
  });

  return readyNodeIds;
}

export function getWaitingNodeIds(flow, deliveredNodeIds) {
  const deliveredSet = new Set(deliveredNodeIds);
  const waitingNodeIds = [];

  flow.connectedToContentInput.forEach((nodeId) => {
    if (deliveredSet.has(nodeId)) return;
    if (flow.contentInputNodeIds.includes(nodeId)) return;

    const incoming = flow.incomingById.get(nodeId) || [];
    if (!incoming.length) return;

    const hasMissingIncoming = incoming.some((sourceId) => !deliveredSet.has(sourceId));
    if (hasMissingIncoming) {
      waitingNodeIds.push(nodeId);
    }
  });

  return waitingNodeIds;
}
