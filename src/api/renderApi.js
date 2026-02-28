const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function buildUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function request(path, options = {}) {
  const response = await fetch(buildUrl(path), options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `요청 실패: ${response.status}`);
  }
  return response.json();
}

export function createRenderJob(projectId) {
  return request(`/api/projects/${projectId}/render`, { method: "POST" });
}

export function getRenderJob(jobId) {
  return request(`/api/render-jobs/${jobId}`);
}

export function getRenderResultUrl(jobId) {
  return buildUrl(`/api/render-jobs/${jobId}/result`);
}

export function getRenderThumbnailUrl(jobId) {
  return buildUrl(`/api/render-jobs/${jobId}/thumbnail`);
}

export function getRenderLogUrl(jobId) {
  return buildUrl(`/api/render-jobs/${jobId}/log`);
}
