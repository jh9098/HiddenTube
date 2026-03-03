function getStorageKey(projectId, nodeId) {
  return `hiddentube_preview_draft_${projectId || "default"}_${nodeId}`;
}

export function loadPreviewDraft(projectId, nodeId) {
  try {
    return localStorage.getItem(getStorageKey(projectId, nodeId)) ?? "";
  } catch {
    return "";
  }
}

export function savePreviewDraft(projectId, nodeId, value) {
  try {
    localStorage.setItem(getStorageKey(projectId, nodeId), value);
    return true;
  } catch {
    return false;
  }
}
