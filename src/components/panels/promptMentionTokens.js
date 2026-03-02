function normalizeMentionLabel(label) {
  return String(label || "")
    .trim()
    .replace(/\s+/g, "");
}

export function toMentionToken(label) {
  const normalized = normalizeMentionLabel(label);
  return normalized ? `@${normalized}` : "";
}

export function stripTrailingMentionLine(template) {
  const safeTemplate = String(template || "");
  const match = safeTemplate.match(/(?:\n|^)(?:@[\w가-힣-]+\s*)+$/u);
  if (!match) return safeTemplate;
  return safeTemplate.slice(0, match.index).trimEnd();
}

export function composePromptTemplate(baseText, mentionLabels) {
  const safeBase = stripTrailingMentionLine(baseText).trimEnd();
  const mentionLine = mentionLabels
    .map((label) => toMentionToken(label))
    .filter(Boolean)
    .join(" ");

  if (!mentionLine) return safeBase;
  if (!safeBase) return mentionLine;
  return `${safeBase}\n${mentionLine}`;
}

