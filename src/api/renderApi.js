import { buildApiUrl } from "./apiBaseUrl";

async function request(path, options = {}) {
  const response = await fetch(buildApiUrl(path), options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `요청 실패: ${response.status}`);
  }
  return response.json();
}

export function createRenderJob(projectId, payload = {}) {
  return request(`/api/projects/${projectId}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getRenderJob(jobId) {
  return request(`/api/render-jobs/${jobId}`);
}

export function getRenderResultUrl(jobId) {
  return buildApiUrl(`/api/render-jobs/${jobId}/result`);
}

export function getRenderThumbnailUrl(jobId) {
  return buildApiUrl(`/api/render-jobs/${jobId}/thumbnail`);
}

export function getRenderLogUrl(jobId) {
  return buildApiUrl(`/api/render-jobs/${jobId}/log`);
}
