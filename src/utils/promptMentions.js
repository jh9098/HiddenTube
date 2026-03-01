function normalizeToken(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");
}

function toMentionToken(label) {
  return (label || "").trim().replace(/\s+/g, "");
}

function getNodeReferenceText(node) {
  const manualResult = String(node?.data?.manualResult || "").trim();
  if (manualResult) return manualResult;

  const output = node?.data?.output;
  const outputText = formatReferenceTextFromOutput(output);
  if (outputText) return outputText;

  return "";
}

export function formatReferenceTextFromOutput(output) {
  if (!output || typeof output !== "object" || Object.keys(output).length === 0) return "";

  if (typeof output.raw_text === "string" && output.raw_text.trim()) {
    return output.raw_text;
  }

  const contentInput = output.content_input;
  if (contentInput && typeof contentInput === "object") {
    if (typeof contentInput.text === "string" && contentInput.text.trim()) {
      return contentInput.text;
    }
    if (typeof contentInput.original_text === "string" && contentInput.original_text.trim()) {
      return contentInput.original_text;
    }
    if (typeof contentInput.originalText === "string" && contentInput.originalText.trim()) {
      return contentInput.originalText;
    }
    if (typeof contentInput.topic === "string" && contentInput.topic.trim()) {
      return contentInput.topic;
    }
    return "";
  }

  return JSON.stringify(output, null, 2);
}

export function getIncomingReferenceNodes(targetNodeId, nodes, edges) {
  if (!targetNodeId) return [];

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const incomingSourceIds = edges.filter((edge) => edge.target === targetNodeId).map((edge) => edge.source);

  return incomingSourceIds
    .map((sourceId) => nodeMap.get(sourceId))
    .filter(Boolean)
    .map((node) => ({
      id: node.id,
      label: node.data?.label || "이름 없는 노드",
      mentionToken: toMentionToken(node.data?.label || "이름 없는 노드"),
      text: getNodeReferenceText(node),
    }));
}

export function findMentionContext(text, cursorPosition) {
  const safeText = text || "";
  const cursor = Math.max(0, Math.min(cursorPosition ?? safeText.length, safeText.length));
  const beforeCursor = safeText.slice(0, cursor);
  const atIndex = beforeCursor.lastIndexOf("@");

  if (atIndex < 0) return null;

  const tokenBeforeAt = beforeCursor.slice(0, atIndex);
  if (tokenBeforeAt && !/\s$/.test(tokenBeforeAt)) return null;

  const query = beforeCursor.slice(atIndex + 1);
  if (/\s/.test(query)) return null;

  return {
    start: atIndex,
    end: cursor,
    query,
  };
}

export function insertMentionToken(text, mentionToken, context) {
  if (!context) return text;
  const safeText = text || "";
  return `${safeText.slice(0, context.start)}@${mentionToken}${safeText.slice(context.end)}`;
}

export function extractMentionLabels(text) {
  if (!text) return [];
  const matches = text.matchAll(/@([^\s@]+)/g);
  return Array.from(matches, (match) => match[1]);
}

export function resolvePromptTemplateWithMentions(template, referenceNodes) {
  const safeTemplate = template || "";
  if (!safeTemplate.includes("@")) return safeTemplate;

  const lookup = new Map();
  referenceNodes.forEach((node) => {
    const normalizedMentionToken = normalizeToken(node.mentionToken);
    const normalizedLabel = normalizeToken(node.label);
    if (!lookup.has(normalizedMentionToken)) {
      lookup.set(normalizedMentionToken, node.text || "");
    }
    if (!lookup.has(normalizedLabel)) {
      lookup.set(normalizedLabel, node.text || "");
    }
  });

  return safeTemplate.replace(/@([^\s@]+)/g, (fullMatch, rawLabel) => {
    const resolved = lookup.get(normalizeToken(rawLabel));
    return typeof resolved === "string" && resolved.length > 0 ? resolved : fullMatch;
  });
}
