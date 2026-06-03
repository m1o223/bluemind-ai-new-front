import { deleteConversation, renameConversation } from "./chatService";

export async function renameChat(conversationId, title) {
  return renameConversation(conversationId, title);
}

export async function deleteChat(conversationId) {
  return deleteConversation(conversationId);
}

export async function shareChat(conversation, options = {}) {
  const origin = options.origin || window.location.origin;
  const appName = options.appName || "BlueMind AI";
  const url = `${origin}/chat?conversation=${conversation.conversationId}`;
  const title = conversation.title || appName;

  if (navigator.share) {
    try {
      await navigator.share({ title, text: title, url });
      return { method: "native", url };
    } catch (error) {
      if (error?.name === "AbortError") {
        return { method: "cancelled", url };
      }
    }
  }

  await navigator.clipboard?.writeText(url);
  return { method: "clipboard", url };
}
