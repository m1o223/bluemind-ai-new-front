import api, { API_BASE_URL, getApiErrorMessage, unwrapApiResponse } from "./api";
import { STORAGE_KEYS, storeUser } from "./storageKeys";

function parseSseBlock(block) {
  const lines = block.split("\n");
  let event = "message";
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    }

    if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }

  if (!data) return { event, data: null };

  try {
    return { event, data: JSON.parse(data) };
  } catch {
    return { event, data };
  }
}

function persistStreamSession(session) {
  if (session?.token) {
    localStorage.setItem(STORAGE_KEYS.token, session.token);
  }

  if (session?.user) {
    storeUser(session.user);
  }

  return session;
}

async function refreshAccessToken() {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return persistStreamSession(payload?.data ?? payload);
}

function createStreamRequest(payload, signal) {
  const token = localStorage.getItem(STORAGE_KEYS.token);

  return fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
    signal,
  });
}

export async function streamChatMessage({
  message,
  imageIds = [],
  conversationId,
  mode,
  metadata,
  onReady,
  onAiStart,
  onDelta,
  onComplete,
  onError,
  signal,
}) {
  const payload = {};

  if (conversationId) {
    payload.conversationId = conversationId;
  }

  if (imageIds.length > 0) {
    payload.imageIds = imageIds;
  }

  if (message?.trim()) {
    payload.message = message.trim();
  }

  if (metadata && Object.keys(metadata).length > 0) {
    payload.metadata = metadata;
  }

  if (mode) {
    payload.mode = mode;
  }

  let response = await createStreamRequest(payload, signal);

  if (response.status === 401) {
    const session = await refreshAccessToken();

    if (session?.token) {
      response = await createStreamRequest(payload, signal);
    }
  }

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || "AI stream failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      const parsed = parseSseBlock(block.trim());

      if (parsed.event === "ready") onReady?.(parsed.data);
      if (parsed.event === "ai_start") onAiStart?.(parsed.data);
      if (parsed.event === "delta") onDelta?.(parsed.data);
      if (parsed.event === "complete") onComplete?.(parsed.data);
      if (parsed.event === "error") {
        onError?.(parsed.data);
        throw new Error(parsed.data?.message || "AI stream failed");
      }
    }
  }
}

export async function getLatestConversation() {
  try {
    const response = await api.get("/chat/conversations/latest");
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load chat history"));
  }
}

export async function listConversations() {
  try {
    const response = await api.get("/chat/conversations");
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load chat history"));
  }
}

export async function searchConversations(query, limit = 20) {
  try {
    const response = await api.get("/chat/conversations/search", {
      params: { q: query, limit },
    });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not search conversations"));
  }
}

export async function getConversation(conversationId) {
  try {
    const response = await api.get(`/chat/conversations/${conversationId}`);
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load conversation"));
  }
}

export async function renameConversation(conversationId, title) {
  try {
    const response = await api.patch(`/chat/conversations/${conversationId}`, { title });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not rename conversation"));
  }
}

export async function deleteConversation(conversationId) {
  try {
    const response = await api.delete(`/chat/conversations/${conversationId}`);
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not delete conversation"));
  }
}
