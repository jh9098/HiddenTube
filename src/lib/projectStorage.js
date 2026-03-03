import { nanoid } from "nanoid";
import { createYoutubeTemplate } from "../templates/youtubeTemplate";
import { serializeWorkflow } from "../utils/workflowData";

const PROJECT_INDEX_KEY = "hiddentube_projects_v2";

function safeParseArray(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function workflowStorageKey(projectId) {
  return `hiddentube_workflow_${projectId}_v1`;
}

function historyStorageKey(projectId) {
  return `hiddentube_workflow_history_${projectId}_v1`;
}

function nowText() {
  return new Date().toLocaleString("ko-KR");
}

export function listProjects() {
  return safeParseArray(localStorage.getItem(PROJECT_INDEX_KEY));
}

export function getProject(projectId) {
  return listProjects().find((project) => project.id === projectId) ?? null;
}

export function upsertProject(project) {
  const current = listProjects();
  const filtered = current.filter((item) => item.id !== project.id);
  const next = [{ ...project, updatedAt: project.updatedAt || nowText() }, ...filtered];
  localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(next));
  return next;
}

export function createProject(title = "Untitled Project") {
  const id = nanoid();
  const project = {
    id,
    title,
    updatedAt: nowText(),
  };

  const template = createYoutubeTemplate();
  localStorage.setItem(workflowStorageKey(id), serializeWorkflow(template));
  upsertProject(project);

  return project;
}

export function updateProjectTitle(projectId, title) {
  const existing = getProject(projectId);
  if (!existing) return null;

  const updated = {
    ...existing,
    title,
    updatedAt: nowText(),
  };

  upsertProject(updated);
  return updated;
}

export function saveProjectWorkflow(projectId, serializedWorkflow, title) {
  localStorage.setItem(workflowStorageKey(projectId), serializedWorkflow);

  const existing = getProject(projectId) ?? { id: projectId, title: "Untitled Project" };
  upsertProject({
    ...existing,
    title: title || existing.title,
    updatedAt: nowText(),
  });
}

export function loadProjectWorkflow(projectId) {
  return localStorage.getItem(workflowStorageKey(projectId));
}

export function getProjectStorageKeys(projectId) {
  return {
    workflowKey: workflowStorageKey(projectId),
    historyKey: historyStorageKey(projectId),
  };
}
