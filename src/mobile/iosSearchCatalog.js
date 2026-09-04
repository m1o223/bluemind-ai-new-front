import api, { unwrapApiResponse } from "@/services/api";
import { getImageUrl } from "@/services/imageService";

export const IOS_SEARCH_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "chats", label: "Chats" },
  { id: "images", label: "Images" },
  { id: "documents", label: "Documents" },
  { id: "projects", label: "Projects" },
];

const decodeTitle = (value) => {
  const title = String(value || "").trim();
  try { return decodeURIComponent(title); } catch { return title; }
};

const routeFor = (result) => ({
  chats: `/mobile/chat?conversation=${encodeURIComponent(result.id)}`,
  images: `/mobile/create-image?image=${encodeURIComponent(result.id)}`,
  documents: `/mobile/write-edit?document=${encodeURIComponent(result.id)}`,
  projects: `/mobile/projects/${encodeURIComponent(result.id)}`,
}[result.type] || "");

export async function searchIOSCatalog(rawQuery, category = "all") {
  const query = String(rawQuery || "").trim();
  if (!query) return [];
  const response = await api.get("/search", { params: { q: query, type: category, limit: 40 } });
  return (unwrapApiResponse(response)?.results || []).map((result) => ({
    ...result,
    sourceId: result.id,
    category: result.type,
    title: decodeTitle(result.title),
    detail: result.snippet,
    thumbnail: result.type === "images" ? getImageUrl(result.id) : undefined,
    route: routeFor(result),
  }));
}
