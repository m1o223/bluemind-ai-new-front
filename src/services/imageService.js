import api, { unwrapApiResponse } from "./api";

export const uploadChatImage = async (file, conversationId) => {
  const params = conversationId ? { conversationId } : {};
  const response = await api.post("/images/upload-binary", file, {
    params,
    headers: {
      "Content-Type": file.type,
      "X-File-Name": encodeURIComponent(file.name),
    },
  });

  return unwrapApiResponse(response)?.image;
};

export const analyzeImage = async (imageId, prompt) => {
  const response = await api.post(`/images/${imageId}/analyze`, {
    prompt,
  });

  return unwrapApiResponse(response);
};

export const generateImage = async (prompt, conversationId, options = {}) => {
  const response = await api.post("/images/generate", {
    prompt,
    conversationId,
    n: options.n || 1,
    size: options.size || "1024x1024",
    quality: options.quality || "auto",
    outputFormat: options.outputFormat || "png",
    background: options.background || "auto",
    metadata: options.metadata,
  });

  return unwrapApiResponse(response);
};

export const getImageUrl = (imageId) => {
  const baseUrl = api.defaults.baseURL?.replace(/\/$/, "");
  return `${baseUrl}/images/${imageId}/file`;
};

export const listImageHistory = async (options = {}) => {
  const response = await api.get("/images", {
    params: options,
  });

  return unwrapApiResponse(response)?.images || [];
};
