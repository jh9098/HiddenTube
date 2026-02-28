const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `요청 실패: ${response.status}`);
  }
  return response.json();
}

export function createProject(payload) {
  return request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getProject(projectId) {
  return request(`/api/projects/${projectId}`);
}

export function updateProject(projectId, payload) {
  return request(`/api/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getAssets(projectId) {
  return request(`/api/projects/${projectId}/assets`);
}

export function remapAsset(projectId, payload) {
  return request(`/api/projects/${projectId}/assets/map`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function validateRender(projectId) {
  return request(`/api/projects/${projectId}/validate-render`, { method: "POST" });
}

export function uploadAsset(projectId, type, file, sceneId = "") {
  const formData = new FormData();
  formData.append("file", file);
  if (sceneId) {
    formData.append("scene_id", sceneId);
  }

  return request(`/api/projects/${projectId}/upload/${type}`, {
    method: "POST",
    body: formData,
  });
}
