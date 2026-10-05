import api, { unwrapApiResponse } from "./api";

export async function listProjects(search = "") {
  const response = await api.get("/projects", {
    params: search.trim() ? { search: search.trim() } : undefined,
  });
  return unwrapApiResponse(response)?.projects || [];
}

export async function getProject(projectId) {
  const response = await api.get(`/projects/${encodeURIComponent(projectId)}`);
  return unwrapApiResponse(response)?.project;
}

export async function createProject(input) {
  const response = await api.post("/projects", {
    name: input.name.trim(),
    description: input.description.trim(),
  });
  return unwrapApiResponse(response)?.project;
}

export async function updateProject(projectId, input) {
  const response = await api.patch(`/projects/${encodeURIComponent(projectId)}`, input);
  return unwrapApiResponse(response)?.project;
}

export async function deleteProject(projectId) {
  const response = await api.delete(`/projects/${encodeURIComponent(projectId)}`);
  return unwrapApiResponse(response);
}
