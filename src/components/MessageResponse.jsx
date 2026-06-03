import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clipboard, Edit3, X } from "lucide-react";
import { toast } from "sonner";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import MarkdownText, { getDirectionalStyle } from "@/components/MarkdownText";

const RESPONSE_BLOCK_TYPES = new Set([
  "normal_message",
  "copy_text_block",
  "code_block",
  "editable_writing_block",
]);

const COPY_TEXT_REQUEST_RE = /\b(prompt|instruction|instructions|specification|spec|copy(?:able)?|paste|one text|plain text|for codex|to codex|developer tool|ai tool)\b/i;
const EDITABLE_WRITING_REQUEST_RE = /\b(email|message|whatsapp|apology|business message|social media|post|cover letter|cv paragraph|official letter|school note|letter to|message to|send to|reply to|draft)\b/i;

function copyToClipboard(text) {
  return navigator.clipboard.writeText(String(text || ""));
}

function splitCodeFences(text) {
  const value = String(text || "");
  const parts = [];
  const fenceRe = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = fenceRe.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        text: value.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: "code",
      language: match[1]?.trim() || "Text",
      code: match[2] || "",
    });
    lastIndex = fenceRe.lastIndex;
  }

  if (lastIndex < value.length) {
    parts.push({
      type: "text",
      text: value.slice(lastIndex),
    });
  }

  return parts.length ? parts : [{ type: "text", text: value }];
}

function inferResponseBlockType({ message, previousUserContent }) {
  const explicitType = message?.metadata?.responseBlockType || message?.metadata?.messageType;

  if (RESPONSE_BLOCK_TYPES.has(explicitType)) {
    return explicitType;
  }

  const content = String(message?.content || "");
  const previous = String(previousUserContent || "");

  if (/```[\s\S]*?```/.test(content)) {
    return "code_block";
  }

  if (COPY_TEXT_REQUEST_RE.test(previous)) {
    return "copy_text_block";
  }

  if (EDITABLE_WRITING_REQUEST_RE.test(previous)) {
    return "editable_writing_block";
  }

  return "normal_message";
}

function getEditableLabel(previousUserContent) {
  const value = String(previousUserContent || "").toLowerCase();

  if (value.includes("email")) return "Email";
  if (value.includes("post") || value.includes("social media")) return "Post";
  if (value.includes("letter")) return "Letter";
  if (value.includes("instruction")) return "Instructions";
  if (value.includes("message") || value.includes("whatsapp")) return "Message";
  return "Draft";
}

function ActionButton({ label, icon: Icon, onClick, active = false }) {
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-95",
        active
          ? isDark ? "bg-white/15 text-white" : "bg-[#EEF2FF] text-[#193B68]"
          : isDark ? "text-[#D7D7D7] hover:bg-white/[0.08] hover:text-white" : "text-[#475569] hover:bg-[#EEF2F7] hover:text-[#193B68]",
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4 stroke-[2.2]" />
    </button>
  );
}

function ResponseBlockShell({ label, children, actions, mono = false }) {
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={cn(
        "my-3 w-full max-w-[820px] overflow-hidden rounded-[20px] border shadow-sm md:rounded-[22px]",
        isDark ? "border-white/[0.08] bg-white/[0.055] text-[#F3F4F6]" : "border-black/[0.06] bg-white/85 text-[#111827] shadow-slate-200/70",
      )}
    >
      <div className={cn("flex items-center justify-between gap-3 border-b px-4 py-2.5 md:px-5", isDark ? "border-white/[0.07]" : "border-black/[0.06]")}>
        <span className={cn("text-xs font-bold uppercase tracking-[0.08em]", isDark ? "text-[#B8B8B8]" : "text-[#64748B]")}>
          {label}
        </span>
        <div className="flex items-center gap-1">{actions}</div>
      </div>
      <div className={cn("p-4 md:p-5", mono ? "font-mono text-[13px] leading-6 md:text-sm" : "text-[15px] leading-7 md:text-[16px] md:leading-8")}>
        {children}
      </div>
    </div>
  );
}

function CopyTextBlock({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(text);
    setCopied(true);
    toast.success("Copied");
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <ResponseBlockShell
      label="Plain text"
      actions={<ActionButton label="Copy" icon={copied ? Check : Clipboard} active={copied} onClick={handleCopy} />}
      mono
    >
      <pre className="max-w-full whitespace-pre-wrap break-words" style={getDirectionalStyle(text)}>
        {text}
      </pre>
    </ResponseBlockShell>
  );
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    toast.success("Copied");
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <ResponseBlockShell
      label={language || "Code"}
      actions={<ActionButton label="Copy code" icon={copied ? Check : Clipboard} active={copied} onClick={handleCopy} />}
      mono
    >
      <pre className="max-w-full overflow-x-auto whitespace-pre text-left" dir="ltr">
        <code>{code}</code>
      </pre>
    </ResponseBlockShell>
  );
}

function EditableWritingBlock({ text, previousUserContent }) {
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const [currentText, setCurrentText] = useState(text);
  const [draftText, setDraftText] = useState(text);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const label = getEditableLabel(previousUserContent);

  useEffect(() => {
    setCurrentText(text);
    setDraftText(text);
  }, [text]);

  const handleCopy = async (value = currentText) => {
    await copyToClipboard(value);
    setCopied(true);
    toast.success("Copied");
    window.setTimeout(() => setCopied(false), 1400);
  };

  const openEditor = () => {
    setDraftText(currentText);
    setIsEditing(true);
  };

  const saveDraft = () => {
    setCurrentText(draftText);
    setIsEditing(false);
  };

  return (
    <>
      <ResponseBlockShell
        label={label}
        actions={(
          <>
            <ActionButton label="Copy" icon={copied ? Check : Clipboard} active={copied} onClick={() => handleCopy(currentText)} />
            <ActionButton label="Edit" icon={Edit3} onClick={openEditor} />
          </>
        )}
      >
        <div className="whitespace-pre-wrap break-words" style={getDirectionalStyle(currentText)}>
          {currentText}
        </div>
      </ResponseBlockShell>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[95] flex items-end justify-center md:items-center md:p-4">
            <motion.button
              type="button"
              aria-label="Cancel edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => setIsEditing(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className={cn(
                "relative z-10 flex h-[82vh] w-full flex-col rounded-t-[28px] border p-4 shadow-2xl md:h-auto md:max-h-[70vh] md:max-w-[860px] md:rounded-[28px] md:p-5",
                isDark ? "border-white/[0.1] bg-[#202020] text-white" : "border-white bg-white text-[#111827]",
              )}
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold">{label}</h3>
                  <p className={cn("text-xs font-semibold", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>Edit the text before copying or saving.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={cn("flex h-10 w-10 items-center justify-center rounded-full", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[#EEF2F7]")}
                  aria-label="Close editor"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <textarea
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                className={cn(
                  "min-h-0 flex-1 resize-none rounded-[22px] border p-4 text-[16px] leading-7 outline-none md:max-h-[48vh]",
                  isDark ? "border-white/[0.09] bg-white/[0.055] text-white placeholder:text-[#777]" : "border-black/[0.06] bg-[#F8FAFC] text-[#111827] placeholder:text-[#94A3B8]",
                )}
                style={getDirectionalStyle(draftText)}
                autoFocus
              />

              <div className="mt-4 grid grid-cols-3 gap-2 md:flex md:justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={cn("h-11 rounded-2xl text-sm font-bold md:px-5", isDark ? "bg-white/[0.08] text-white hover:bg-white/[0.12]" : "bg-[#EEF2F7] text-[#111827] hover:bg-[#E2E8F0]")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(draftText)}
                  className={cn("h-11 rounded-2xl text-sm font-bold md:px-5", isDark ? "bg-white/[0.08] text-white hover:bg-white/[0.12]" : "bg-[#EEF2F7] text-[#193B68] hover:bg-[#E2E8F0]")}
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  className="h-11 rounded-2xl bg-[#193B68] text-sm font-bold text-white md:px-5"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function CodeResponse({ text }) {
  const parts = splitCodeFences(text);

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.type === "code") {
          return <CodeBlock key={`${index}-code`} language={part.language} code={part.code} />;
        }

        return part.text.trim()
          ? <MarkdownText key={`${index}-text`} text={part.text} />
          : null;
      })}
    </div>
  );
}

export function getMessageResponseType(input) {
  return inferResponseBlockType(input);
}

export default function MessageResponse({ message, previousUserContent = "", className = "" }) {
  const type = useMemo(
    () => inferResponseBlockType({ message, previousUserContent }),
    [message, previousUserContent],
  );
  const text = String(message?.content || "");

  if (type === "copy_text_block") {
    return <CopyTextBlock text={text} />;
  }

  if (type === "code_block") {
    return <CodeResponse text={text} />;
  }

  if (type === "editable_writing_block") {
    return <EditableWritingBlock text={text} previousUserContent={previousUserContent} />;
  }

  return <MarkdownText text={text} className={className} />;
}
