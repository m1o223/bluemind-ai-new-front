import ChatPage from "@/pages/ChatPage";

export default function MobileSearch() {
  return <ChatPage initialActiveMode="web_search" initialHistoryOpen={false} />;
}
