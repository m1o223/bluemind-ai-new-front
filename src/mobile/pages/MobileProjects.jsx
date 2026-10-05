import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Folder, MessageSquare, MoreVertical, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { isNativeIOSApp } from "@/capacitorRuntime";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import IOSNativeGlassButton from "@/mobile/components/IOSNativeGlassButton";
import { addNativeGlassActionListener, presentNativeIOSConfirmation, presentNativeIOSSelection, presentNativeIOSTextPrompt } from "@/mobile/nativeGlassBridge";
import { getApiErrorMessage } from "@/services/api";
import { deleteConversation, listConversations, renameConversation } from "@/services/chatService";
import { createProject, deleteProject, getProject, listProjects, updateProject } from "@/services/projectService";

const projectID = (project) => String(project?.id || project?._id || "");
const surfaceClass = "border border-white/[0.07] bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.065)]";

function anchorRect(element) {
  const rect = element?.getBoundingClientRect?.();
  return rect ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height } : undefined;
}

function requestID(prefix) {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}`;
}

function activityLabel(value) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function ProjectChatList({ project, isDark, nativeIOS, callbacks, onBack, onOpenChat, onNewChat }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listConversations(projectID(project));
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (error) { toast.error(error.message || "Could not load project chats"); }
    finally { setLoading(false); }
  }, [project]);
  useEffect(() => { void load(); }, [load]);

  const rename = useCallback(async (chat, value) => {
    const title = String(value || "").trim().slice(0, 120);
    if (!title || title === chat.title) return;
    try {
      await renameConversation(chat.conversationId, title);
      setItems((current) => current.map((item) => item.conversationId === chat.conversationId ? { ...item, title } : item));
      toast.success("Chat renamed");
    } catch (error) { toast.error(error.message || "Could not rename chat"); }
  }, []);
  const remove = useCallback(async (chat) => {
    try {
      await deleteConversation(chat.conversationId);
      setItems((current) => current.filter((item) => item.conversationId !== chat.conversationId));
      toast.success("Chat deleted");
    } catch (error) { toast.error(error.message || "Could not delete chat"); }
  }, []);
  const promptRename = (chat) => {
    if (!nativeIOS) return;
    const id = requestID("rename-project-chat");
    callbacks.current.set(id, (event) => { if (event.confirmed) void rename(chat, event.value); });
    void presentNativeIOSTextPrompt({ title: "Rename Chat", placeholder: "Chat title", value: chat.title || "", confirmTitle: "Rename", requestId: id });
  };
  const confirmDelete = (chat) => {
    if (!nativeIOS) return;
    const id = requestID("delete-project-chat");
    callbacks.current.set(id, (event) => { if (event.confirmed) void remove(chat); });
    void presentNativeIOSConfirmation({ title: "Delete Chat?", message: `“${chat.title || "New conversation"}” will be removed.`, confirmTitle: "Delete", destructive: true, requestId: id });
  };
  const openActions = (chat, element) => {
    if (!nativeIOS) return;
    const id = requestID("project-chat-actions");
    callbacks.current.set(id, (event) => {
      if (event.value === "rename") window.setTimeout(() => promptRename(chat), 150);
      if (event.value === "delete") window.setTimeout(() => confirmDelete(chat), 150);
    });
    void presentNativeIOSSelection({ title: chat.title || "Chat", requestId: id, anchorRect: anchorRect(element), options: [
      { label: "Rename", value: "rename", symbol: "pencil" },
      { label: "Delete", value: "delete", symbol: "trash", destructive: true },
    ] });
  };
  const needle = query.trim().toLocaleLowerCase();
  const visibleItems = useMemo(() => needle ? items.filter((item) => `${item.title || ""} ${item.preview || ""}`.toLocaleLowerCase().includes(needle)) : items, [items, needle]);

  return <div className="fixed inset-0 flex flex-col overflow-hidden bg-black text-white" data-testid="ios-project-chats">
    <header className="flex min-h-[70px] shrink-0 items-center px-4 pt-[env(safe-area-inset-top)]">
      <IOSNativeGlassButton id="project-back" symbol="arrow.left" label="Back to Projects" onClick={onBack} className="bm-mobile-glass-control" isDark={isDark}><ArrowLeft className="h-5 w-5" /></IOSNativeGlassButton>
      <h1 className="min-w-0 flex-1 truncate px-3 text-center text-[18px] font-bold">{project.name}</h1>
      <IOSNativeGlassButton id="project-new-chat" symbol="plus" label="New Chat" onClick={onNewChat} className="bm-mobile-glass-control" isDark={isDark}><Plus className="h-5 w-5" /></IOSNativeGlassButton>
    </header>
    <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <label className="mb-3 flex h-11 shrink-0 items-center gap-2 rounded-[16px] bg-white/[0.075] px-3 text-white/50"><Search className="h-[17px] w-[17px] shrink-0" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats" className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/35" />{query ? <button type="button" onClick={() => setQuery("")} className="flex h-8 w-8 items-center justify-center rounded-full" aria-label="Clear search"><X className="h-4 w-4" /></button> : null}</label>
      <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[22px] bg-white/[0.03]" aria-label={`${project.name} chats`}>
        {loading ? <p className="px-4 py-8 text-center text-sm text-white/45">Loading chats…</p> : visibleItems.length ? visibleItems.map((chat, index) => <article key={chat.conversationId} className={cn("relative flex min-h-[72px] items-center", index > 0 && "border-t border-white/[0.065]")}><button type="button" onClick={() => onOpenChat(chat.conversationId)} className="min-w-0 flex-1 px-4 py-3 text-start active:bg-white/[0.045]"><div className="flex items-baseline gap-3"><h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{chat.title || "New conversation"}</h2><time className="shrink-0 text-[11px] text-white/35">{activityLabel(chat.lastMessageAt || chat.updatedAt)}</time></div><p className="mt-1 truncate text-[13px] text-white/45">{chat.preview || "Open conversation"}</p></button><IOSNativeGlassButton id={`project-chat-actions-${chat.conversationId}`} symbol="ellipsis" label="Chat actions" onClick={(event) => openActions(chat, event.currentTarget)} className="bm-mobile-glass-control me-2 shrink-0" isDark={isDark}><MoreVertical className="h-[18px] w-[18px]" /></IOSNativeGlassButton></article>) : <div className="px-6 py-10 text-center"><MessageSquare className="mx-auto h-7 w-7 text-white/30" /><h2 className="mt-3 text-[17px] font-bold">{needle ? "No matching chats" : "No chats yet"}</h2><p className="mt-1 text-sm text-white/45">{needle ? "Try another search." : "Start a conversation in this project."}</p>{!needle ? <button type="button" onClick={onNewChat} className="mt-5 min-h-11 rounded-[17px] bg-[var(--bm-primary)] px-5 text-sm font-bold">New Chat</button> : null}</div>}
      </section>
    </main>
  </div>;
}

export default function MobileProjects() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const nativeIOS = isNativeIOSApp();
  const callbacks = useRef(new Map());
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const handleError = useCallback((error, fallback) => { if (error?.response?.status === 401) navigate("/mobile", { replace: true }); else toast.error(getApiErrorMessage(error, fallback)); }, [navigate]);
  const load = useCallback(async () => { setLoading(true); try { if (projectId) setProject(await getProject(projectId)); else setProjects(await listProjects()); } catch (error) { handleError(error, "Could not load projects"); } finally { setLoading(false); } }, [handleError, projectId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!nativeIOS) return undefined;
    let handle;
    const registry = callbacks.current;
    void addNativeGlassActionListener((event) => { const callback = registry.get(event?.requestId); if (!callback) return; registry.delete(event.requestId); callback(event); }).then((listener) => { handle = listener; });
    return () => { handle?.remove?.(); registry.clear(); };
  }, [nativeIOS]);

  const rename = async (target, value) => { const name = String(value || "").trim().slice(0, 100); if (!name || name === target.name) return; try { const updated = await updateProject(projectID(target), { name }); setProjects((current) => current.map((item) => projectID(item) === projectID(updated) ? updated : item)); toast.success("Project renamed"); } catch (error) { handleError(error, "Could not rename project"); } };
  const promptRename = (target) => { const id = requestID("rename-project"); callbacks.current.set(id, (event) => { if (event.confirmed) void rename(target, event.value); }); void presentNativeIOSTextPrompt({ title: "Rename Project", placeholder: "Project name", value: target.name, confirmTitle: "Rename", requestId: id }); };
  const confirmDelete = (target) => { const id = requestID("delete-project"); callbacks.current.set(id, async (event) => { if (!event.confirmed) return; try { await deleteProject(projectID(target)); setProjects((current) => current.filter((item) => projectID(item) !== projectID(target))); toast.success("Project deleted"); } catch (error) { handleError(error, "Could not delete project"); } }); void presentNativeIOSConfirmation({ title: "Delete Project?", message: "Its chats will return to normal chat history and will not be deleted.", confirmTitle: "Delete", destructive: true, requestId: id }); };
  const openProjectActions = (target, element) => { const id = requestID("project-actions"); callbacks.current.set(id, (event) => { if (event.value === "rename") window.setTimeout(() => promptRename(target), 150); if (event.value === "delete") window.setTimeout(() => confirmDelete(target), 150); }); void presentNativeIOSSelection({ title: target.name, requestId: id, anchorRect: anchorRect(element), options: [{ label: "Rename", value: "rename", symbol: "pencil" }, { label: "Delete", value: "delete", symbol: "trash", destructive: true }] }); };
  const create = () => { const id = requestID("create-project"); callbacks.current.set(id, async (event) => { const name = String(event.value || "").trim(); if (!event.confirmed || !name) return; try { const created = await createProject({ name, description: "" }); setProjects((current) => [created, ...current]); toast.success("Project created"); } catch (error) { handleError(error, "Could not create project"); } }); void presentNativeIOSTextPrompt({ title: "New Project", message: "Projects organize related conversations.", placeholder: "Project name", confirmTitle: "Create", requestId: id }); };

  if (projectId) {
    if (loading) return <div className="fixed inset-0 grid place-items-center bg-black text-sm text-white/45">Loading project…</div>;
    if (!project) return <div className="fixed inset-0 grid place-items-center bg-black text-sm text-white/45">Project not found.</div>;
    const route = `/mobile/projects/${projectId}`;
    return <ProjectChatList project={project} isDark={isDark} nativeIOS={nativeIOS} callbacks={callbacks} onBack={() => navigate("/mobile/projects")} onNewChat={() => navigate(`/mobile/chat?project=${encodeURIComponent(projectId)}&projectName=${encodeURIComponent(project.name)}&returnTo=${encodeURIComponent(route)}`)} onOpenChat={(conversationId) => navigate(`/mobile/chat?conversation=${encodeURIComponent(conversationId)}&project=${encodeURIComponent(projectId)}&projectName=${encodeURIComponent(project.name)}&returnTo=${encodeURIComponent(route)}`)} />;
  }

  return <div className="fixed inset-0 flex flex-col overflow-hidden bg-black text-white" data-testid="ios-projects-page"><header className="flex min-h-[70px] shrink-0 items-center px-4 pt-[env(safe-area-inset-top)]"><IOSNativeGlassButton id="projects-back" symbol="arrow.left" label="Back to Chat" onClick={() => navigate("/mobile/chat")} className="bm-mobile-glass-control" isDark={isDark}><ArrowLeft className="h-5 w-5" /></IOSNativeGlassButton><h1 className="flex-1 px-3 text-center text-[20px] font-bold">Projects</h1><IOSNativeGlassButton id="projects-add" symbol="plus" label="Create Project" onClick={create} className="bm-mobile-glass-control" isDark={isDark}><Plus className="h-5 w-5" /></IOSNativeGlassButton></header><main className="mx-auto min-h-0 w-full max-w-md flex-1 overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-2">{loading ? <p className="py-10 text-center text-sm text-white/45">Loading projects…</p> : projects.length ? <section className={cn("overflow-hidden rounded-[22px]", surfaceClass)} aria-label="Projects">{projects.map((item, index) => <article key={projectID(item)} className={cn("relative flex min-h-[68px] items-center", index > 0 && "border-t border-white/[0.065]")}><button type="button" onClick={() => navigate(`/mobile/projects/${projectID(item)}`)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-start active:bg-white/[0.045]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[var(--bm-primary)]/55"><Folder className="h-[18px] w-[18px]" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[16px] font-semibold">{item.name}</span><span className="mt-0.5 block text-xs text-white/40">{item.chatCount || 0} chats · {activityLabel(item.updatedAt)}</span></span></button><IOSNativeGlassButton id={`project-actions-${projectID(item)}`} symbol="ellipsis" label={`Actions for ${item.name}`} onClick={(event) => openProjectActions(item, event.currentTarget)} className="bm-mobile-glass-control me-2" isDark={isDark}><MoreVertical className="h-[18px] w-[18px]" /></IOSNativeGlassButton></article>)}</section> : <section className="px-6 py-12 text-center"><Folder className="mx-auto h-8 w-8 text-white/30" /><h2 className="mt-3 text-[18px] font-bold">No projects yet</h2><p className="mt-1 text-sm text-white/45">Create a folder for related chats.</p><button type="button" onClick={create} className="mt-5 min-h-11 rounded-[17px] bg-[var(--bm-primary)] px-5 text-sm font-bold">Create Project</button></section>}</main></div>;
}
