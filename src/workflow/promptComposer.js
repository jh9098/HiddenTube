import { renderTemplate } from "./runner.js";

function stringifyValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function extractVarKeys(vars) {
  return Object.keys(vars || {}).sort();
}

export function buildModelInputPrompt(promptText, vars, connectedNodeNames = []) {
  const renderedPrompt = renderTemplate(promptText || "", vars);
  const upstreamAnswers = Object.entries(vars || {})
    .map(([key, value]) => `${key}: ${stringifyValue(value)}`)
    .join("\n\n");

  const mergedTopic = [upstreamAnswers, renderedPrompt].filter(Boolean).join("\n");

  return [
    "Start the research",
    "",
    "Do the research according about this topic:",
    "",
    "---",
    "",
    mergedTopic || "(입력/연결 노드 데이터 없음)",
    "",
    "---",
    "",
    connectedNodeNames.length
      ? `Referenced nodes: ${connectedNodeNames.join(", ")}`
      : "Referenced nodes: (none)",
  ].join("\n");
}
