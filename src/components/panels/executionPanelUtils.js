export function getNodeExecutionState(node) {
  const manualResult = node?.data?.manualResult || "";
  const hasManualResult = manualResult.trim().length > 0;
  const hasResolvedInput = Boolean(
    node?.data?.resolvedInput && Object.keys(node.data.resolvedInput).length > 0
  );
  const hasRunError = Boolean(node?.data?.runError || node?.data?.parseError);

  if (hasRunError) return "error";
  if (hasManualResult) return "done";
  if (hasResolvedInput) return "ready";
  return "pending";
}

export function buildExecutionOrder(nodes, edges) {
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
