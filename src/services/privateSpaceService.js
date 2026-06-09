import api, { API_BASE_URL, getApiErrorMessage, unwrapApiResponse } from "./api";
import { readStoredRefreshSession, STORAGE_KEYS, storeRefreshSession, storeUser } from "./storageKeys";

function privateHeaders(accessToken) {
  return accessToken ? { "x-private-space-token": accessToken } : {};
}

function parseSseBlock(block) {
  const lines = block.split("\n");
  let event = "message";
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data += line.slice(5).trim();
  }

  if (!data) return { event, data: null };

  try {
    return { event, data: JSON.parse(data) };
  } catch {
    return { event, data };
  }
}

function persistStreamSession(session) {
  if (session?.token) localStorage.setItem(STORAGE_KEYS.token, session.token);
  if (session?.user) storeUser(session.user);
  if (session?.session) storeRefreshSession(session.session, session.refreshToken);
  return session;
}

async function refreshAccessToken() {
  const refreshToken = readStoredRefreshSession()?.refreshToken;
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  });

  if (!response.ok) return null;

  const payload = await response.json();
  return persistStreamSession(payload?.data ?? payload);
}

function createPrivateStreamRequest(privateSpaceId, accessToken, payload, signal) {
  const token = localStorage.getItem(STORAGE_KEYS.token);

  return fetch(`${API_BASE_URL}/private-spaces/${privateSpaceId}/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...privateHeaders(accessToken),
    },
    credentials: "include",
    body: JSON.stringify(payload),
    signal,
  });
}

export async function listPrivateSpaces() {
  try {
    const response = await api.get("/private-spaces");
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load private chats"));
  }
}

export async function createPrivateSpace({ name, pin, confirmPin }) {
  try {
    const response = await api.post("/private-spaces", { name, pin, confirmPin });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not create private chat"));
  }
}

export async function unlockPrivateSpace(privateSpaceId, pin) {
  try {
    const response = await api.post(`/private-spaces/${privateSpaceId}/unlock`, { pin });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Incorrect PIN. Try again."));
  }
}

export async function renamePrivateSpace(privateSpaceId, name) {
  try {
    const response = await api.patch(`/private-spaces/${privateSpaceId}`, { name });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not rename private chat"));
  }
}

export async function changePrivateSpacePin(privateSpaceId, { currentPin, newPin, confirmNewPin }) {
  try {
    const response = await api.patch(`/private-spaces/${privateSpaceId}/pin`, {
      currentPin,
      newPin,
      confirmNewPin,
    });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not change PIN"));
  }
}

export async function deletePrivateSpace(privateSpaceId) {
  try {
    const response = await api.delete(`/private-spaces/${privateSpaceId}`);
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not delete private chat"));
  }
}

export async function listPrivateSpaceChats(privateSpaceId, accessToken) {
  try {
    const response = await api.get(`/private-spaces/${privateSpaceId}/chats`, {
      headers: privateHeaders(accessToken),
    });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load private chat history"));
  }
}

export async function getPrivateSpaceChat(privateSpaceId, conversationId, accessToken) {
  try {
    const response = await api.get(`/private-spaces/${privateSpaceId}/chats/${conversationId}`, {
      headers: privateHeaders(accessToken),
    });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load private conversation"));
  }
}

export async function renamePrivateSpaceChat(privateSpaceId, conversationId, title, accessToken) {
  try {
    const response = await api.patch(`/private-spaces/${privateSpaceId}/chats/${conversationId}`, { title }, {
      headers: privateHeaders(accessToken),
    });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not rename private conversation"));
  }
}

export async function deletePrivateSpaceChat(privateSpaceId, conversationId, accessToken) {
  try {
    const response = await api.delete(`/private-spaces/${privateSpaceId}/chats/${conversationId}`, {
      headers: privateHeaders(accessToken),
    });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not delete private conversation"));
  }
}

export async function streamPrivateSpaceMessage({
  privateSpaceId,
  accessToken,
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

  if (conversationId) payload.conversationId = conversationId;
  if (imageIds.length > 0) payload.imageIds = imageIds;
  if (message?.trim()) payload.message = message.trim();
  if (metadata && Object.keys(metadata).length > 0) payload.metadata = metadata;
  if (mode) payload.mode = mode;

  let response = await createPrivateStreamRequest(privateSpaceId, accessToken, payload, signal);

  if (response.status === 401) {
    const session = await refreshAccessToken();
    if (session?.token) {
      response = await createPrivateStreamRequest(privateSpaceId, accessToken, payload, signal);
    }
  }

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || "Private chat stream failed");
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
        throw new Error(parsed.data?.message || "Private chat stream failed");
      }
    }
  }
}
