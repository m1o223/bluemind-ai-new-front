const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";

function pickProviderMessage(details) {
  if (!details || typeof details !== "object") return "";
  return details.providerMessage || details.message || details.error?.message || "";
}

function normalizeErrorData({ payload, eventData }) {
  if (eventData && typeof eventData === "object") return eventData;
  if (payload?.error && typeof payload.error === "object") return payload.error;
  if (payload && typeof payload === "object") return payload;
  return {};
}

function buildStreamErrorMessage({ fallback = "AI stream failed", status, statusText, payload, eventData, endpoint, networkError }) {
  const data = normalizeErrorData({ payload, eventData });
  const code = data.code || networkError?.code || "";
  const message = data.message || networkError?.message || fallback;
  const details = data.details || eventData?.details || {};
  const providerMessage = pickProviderMessage(details);
  const statusTextPart = statusText ? ` ${statusText}` : "";
  const codePart = code ? ` (${code})` : "";
  const providerPart = providerMessage && providerMessage !== message ? ` Details: ${providerMessage}` : "";

  if (networkError) {
    return `Failed to reach BlueMind backend${endpoint ? ` at ${endpoint}` : ""}. ${networkError.name || "NetworkError"}: ${message}`;
  }

  if (status) {
    return `Request failed with status ${status}${statusTextPart}${codePart}: ${message}${providerPart}`;
  }

  if (code) {
    return `${code}: ${message}${providerPart}`;
  }

  return `${message}${providerPart}`;
}

export function createStreamError(options = {}) {
  const data = normalizeErrorData(options);
  const details = data.details || options.eventData?.details || {};
  const error = new Error(buildStreamErrorMessage(options));
  error.name = "BlueMindStreamError";
  error.status = options.status || data.statusCode || options.eventData?.statusCode;
  error.statusText = options.statusText;
  error.code = data.code || options.eventData?.code || options.networkError?.code || "AI_STREAM_FAILED";
  error.details = details;
  error.streamId = data.streamId || options.eventData?.streamId;
  error.endpoint = options.endpoint;
  error.payload = options.payload || options.eventData;
  error.stackTrace = data.stack || options.eventData?.stack || "";
  error.cause = options.networkError || options.cause;
  error.diagnostics = {
    name: error.name,
    message: error.message,
    status: error.status,
    statusText: error.statusText,
    code: error.code,
    endpoint: error.endpoint,
    streamId: error.streamId,
    details: error.details,
    payload: error.payload,
    stack: error.stackTrace || error.stack,
    cause: error.cause ? {
      name: error.cause.name,
      message: error.cause.message,
      stack: error.cause.stack,
    } : undefined,
  };
  return error;
}

export function logStreamError(scope, error) {
  const diagnostics = error?.diagnostics || {
    name: error?.name,
    message: error?.message,
    status: error?.status,
    code: error?.code,
    details: error?.details,
    stack: error?.stackTrace || error?.stack,
  };
  console.error(`[BlueMind AI stream error] ${scope}`, diagnostics, error);
}

export function formatStreamErrorForDisplay(error, fallback = "AI failed to respond.") {
  const message = error?.message || fallback;
  if (!IS_DEVELOPMENT) return message;

  const lines = [message];
  if (error?.code) lines.push(`Code: ${error.code}`);
  if (error?.status) lines.push(`Status: ${error.status}${error.statusText ? ` ${error.statusText}` : ""}`);
  if (error?.streamId) lines.push(`Stream ID: ${error.streamId}`);
  if (error?.details && Object.keys(error.details).length > 0) {
    lines.push(`Details: ${JSON.stringify(error.details, null, 2)}`);
  }
  const stack = error?.stackTrace || error?.stack;
  if (stack) lines.push(`Stack:\n${stack}`);
  return lines.join("\n");
}
