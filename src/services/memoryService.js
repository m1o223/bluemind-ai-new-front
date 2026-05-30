import api, { unwrapApiResponse } from "./api";

export const getMemories = async () => {
  const response = await api.get("/memory");
  return unwrapApiResponse(response)?.memories || [];
};

export const createMemory = async (memory) => {
  const response = await api.post("/memory", memory);
  return unwrapApiResponse(response)?.memory;
};

export const updateMemory = async (id, memory) => {
  const response = await api.patch(`/memory/${id}`, memory);
  return unwrapApiResponse(response)?.memory;
};

export const deleteMemory = async (id) => {
  const response = await api.delete(`/memory/${id}`);
  return unwrapApiResponse(response);
};
