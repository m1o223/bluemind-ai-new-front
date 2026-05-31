import api, { unwrapApiResponse } from "./api";

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function toTimeObject(time) {
  if (!time) return { hour: 9, minute: 0 };
  if (typeof time === "object") return time;

  const [hour = "9", minute = "0"] = String(time).split(":");
  return {
    hour: Number(hour),
    minute: Number(minute),
  };
}

function toTimeString(time) {
  if (!time) return "09:00";
  if (typeof time === "string") return time;

  return `${String(time.hour ?? 9).padStart(2, "0")}:${String(
    time.minute ?? 0,
  ).padStart(2, "0")}`;
}

function normalizeReminder(reminder) {
  if (!reminder) return reminder;

  const id = reminder.id || reminder._id;
  const reminderTime = reminder.reminderTime || toTimeString(reminder.time);

  return {
    ...reminder,
    _id: id,
    id,
    date: reminder.reminderDate || reminder.date,
    time: toTimeObject(reminderTime),
    reminderDate: reminder.reminderDate || reminder.date,
    reminderTime,
  };
}

function toApiPayload(data) {
  return {
    title: data.title,
    description: data.description || "",
    reminderDate: data.reminderDate || data.date,
    reminderTime: data.reminderTime || toTimeString(data.time),
    timezone: data.timezone || browserTimezone(),
    reminderBefore: data.reminderBefore ?? 0,
    tags: data.tags || [],
    category: data.category || "general",
    priority: data.priority || "normal",
    ...(data.status !== undefined ? { status: data.status } : {}),
    recurrence: data.recurrence || { frequency: "none", interval: 1 },
    aiGenerated: Boolean(data.aiGenerated),
    aiSuggested: Boolean(data.aiSuggested),
    aiContext: data.aiContext,
    aiReason: data.aiReason,
    linkedConversationId: data.linkedConversationId,
    linkedMemoryId: data.linkedMemoryId,
    metadata: data.metadata || {},
  };
}

export const getReminders = async (params = {}) => {
  const response = await api.get("/reminders", { params });
  const data = unwrapApiResponse(response);
  const reminders = data?.reminders || data?.items || [];

  return {
    items: reminders.map(normalizeReminder),
    reminders: reminders.map(normalizeReminder),
  };
};

export const createReminder = async (data) => {
  const response = await api.post("/reminders", toApiPayload(data));
  const result = unwrapApiResponse(response);
  return normalizeReminder(result?.reminder || result);
};

export const updateReminder = async (id, data) => {
  const response = await api.patch(`/reminders/${id}`, toApiPayload(data));
  const result = unwrapApiResponse(response);
  return normalizeReminder(result?.reminder || result);
};

export const deleteReminder = async (id) => {
  const response = await api.delete(`/reminders/${id}`);
  return unwrapApiResponse(response);
};

export const extractReminder = async (message) => {
  const response = await api.post("/reminders/ai-extract", {
    message,
    timezone: browserTimezone(),
    referenceDate: new Date().toISOString(),
  });

  return unwrapApiResponse(response);
};

export const suggestReminder = async (message, conversationId) => {
  const response = await api.post("/reminders/ai-suggest", {
    message,
    conversationId,
    timezone: browserTimezone(),
    referenceDate: new Date().toISOString(),
  });

  return unwrapApiResponse(response);
};

export const createSuggestedReminder = async (suggestion, conversationId) => {
  const reminder = suggestion?.suggestedReminder || suggestion;

  return createReminder({
    ...reminder,
    linkedConversationId: conversationId,
    aiGenerated: true,
    aiSuggested: true,
    aiReason: reminder?.aiReason || suggestion?.reason,
  });
};
