import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Edit3,
  Expand,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import {
  applyAIPlanInstruction,
  createAIPlanFromConversation,
  getPlanningQuestions,
  getPlanProgress,
  getPlanStatus,
  hasEnoughPlanContext,
  loadAIPlans,
  saveAIPlans,
} from "@/services/aiPlansService";

const QUICK_PROMPTS = [
  "Build a website",
  "Learn programming",
  "Study for an exam",
  "Launch a startup",
  "Create a fitness routine",
  "Plan a school project",
];

const GENERATION_STEPS = [
  "Generating your plan...",
  "Creating phases...",
  "Organizing tasks...",
  "Finalizing roadmap...",
];

function getTextOnColor(hex) {
  const normalized = String(hex || "#193B68").replace("#", "").padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(normalized, 16);
  const red = ((value >> 16) & 255) / 255;
  const green = ((value >> 8) & 255) / 255;
  const blue = (value & 255) / 255;
  const luminance = [red, green, blue]
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.52 ? "#111827" : "#FFFFFF";
}

function PageShell({ children, isDark, fullScreen = false }) {
  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#1a1a1a] text-white" : "bg-[#FAFBFC] text-[#111827]")} data-testid="ai-plans-page">
      <main className={cn("mx-auto px-4 py-6 sm:px-6 sm:py-8", fullScreen ? "max-w-[1500px]" : "max-w-7xl")}>
        {children}
      </main>
    </div>
  );
}

function ProgressBar({ value, appColor, isDark }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full", isDark ? "bg-white/[0.08]" : "bg-[#E5E7EB]")}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: appColor }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
    </div>
  );
}

function StartScreen({ isDark, appColor, accentText, onStart }) {
  const [goal, setGoal] = useState("");

  const submit = (nextGoal = goal) => {
    const cleanGoal = String(nextGoal || "").trim();
    if (cleanGoal) onStart(cleanGoal);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl text-center">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: appColor, color: accentText }}>
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">What would you like to plan?</h1>
        <p className={cn("mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 sm:text-base", isDark ? "text-[#D7D7D7]" : "text-[#64748B]")}>
          Tell BlueMind your goal, project, or study target and it will help you build a complete step-by-step plan.
        </p>

        <form
          className={cn("mt-8 rounded-[30px] border p-3 shadow-xl", isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <textarea
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            rows={4}
            className={cn("w-full resize-none bg-transparent px-3 py-3 text-base font-semibold leading-7 outline-none sm:text-lg", isDark ? "text-white placeholder:text-[#8A8A8A]" : "text-[#111827] placeholder:text-[#64748B]")}
            placeholder="Describe your goal..."
            style={{ caretColor: isDark ? "#FFFFFF" : "#111827" }}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!goal.trim()}
              className="inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-bold transition disabled:opacity-50"
              style={{ backgroundColor: appColor, color: accentText }}
            >
              Start Planning
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => submit(prompt)}
              className={cn("rounded-full border px-4 py-2 text-sm font-bold transition", isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-[#E5E7EB] bg-white text-[#193B68] hover:bg-[#EEF2F7]")}
            >
              {prompt}
            </button>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function ConversationBuilder({ goal, isDark, appColor, accentText, onCancel, onCreate }) {
  const [messages, setMessages] = useState(() => ([
    { role: "user", content: goal },
    { role: "ai", content: getPlanningQuestions(goal, []) },
  ]));
  const [answers, setAnswers] = useState([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const enough = hasEnoughPlanContext(goal, answers);

  useEffect(() => {
    if (!generating) return undefined;
    const interval = window.setInterval(() => {
      setGenerationStep((step) => Math.min(step + 1, GENERATION_STEPS.length - 1));
    }, 520);
    return () => window.clearInterval(interval);
  }, [generating]);

  const submitAnswer = (event) => {
    event.preventDefault();
    const clean = input.trim();
    if (!clean || generating) return;
    const nextAnswers = [...answers, { question: getPlanningQuestions(goal, answers), content: clean }];
    const nextQuestion = getPlanningQuestions(goal, nextAnswers);
    const nextMessages = [...messages, { role: "user", content: clean }];
    if (nextQuestion) {
      nextMessages.push({ role: "ai", content: nextQuestion });
    }
    if (hasEnoughPlanContext(goal, nextAnswers)) {
      nextMessages.push({ role: "ai", content: "I have enough information now. Would you like me to generate your plan?" });
    }
    setAnswers(nextAnswers);
    setMessages(nextMessages);
    setInput("");
  };

  const generate = () => {
    if (!enough || generating) return;
    setGenerating(true);
    setGenerationStep(0);
    window.setTimeout(() => onCreate(createAIPlanFromConversation(goal, answers)), 2300);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onCancel} className={cn("inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-bold", isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-white text-[#193B68] shadow-sm hover:bg-[#EEF2F7]")}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={generate}
          disabled={!enough || generating}
          className={cn("inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55", !enough && (isDark ? "bg-white/[0.07] text-[#A7A7A7]" : "bg-[#E5E7EB] text-[#64748B]"))}
          style={enough ? { backgroundColor: appColor, color: accentText } : undefined}
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {enough ? "Generate Plan" : "Not enough details yet"}
        </button>
      </div>

      <section className={cn("flex min-h-0 flex-1 flex-col rounded-[32px] border shadow-xl", isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}>
        <div className="border-b px-5 py-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB" }}>
          <h1 className="text-xl font-extrabold">AI Plan Builder</h1>
          <p className={cn("mt-1 text-sm font-semibold", isDark ? "text-[#D7D7D7]" : "text-[#64748B]")}>Answer a few questions so BlueMind can build a stronger plan.</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={`${message.role}-${index}-${message.content}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div className={cn("max-w-[82%] rounded-3xl px-4 py-3 text-sm font-semibold leading-6", message.role === "user" ? "text-white" : isDark ? "bg-white/[0.06] text-white" : "bg-[#F8FAFC] text-[#111827]")} style={message.role === "user" ? { backgroundColor: appColor, color: accentText } : undefined}>
                  {message.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {generating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-3xl border px-5 py-5 text-center", isDark ? "border-white/[0.08] bg-white/[0.05]" : "border-[#E5E7EB] bg-[#FAFBFC]")}>
              <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: appColor }} />
              <p className="mt-3 text-lg font-extrabold">{GENERATION_STEPS[generationStep]}</p>
            </motion.div>
          )}
        </div>

        <form onSubmit={submitAnswer} className="border-t p-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB" }}>
          <div className={cn("flex items-end gap-3 rounded-[28px] border px-4 py-3", isDark ? "border-white/[0.08] bg-[#1a1a1a]" : "border-[#E5E7EB] bg-[#FAFBFC]")}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={1}
              disabled={generating}
              className={cn("max-h-32 min-h-8 flex-1 resize-none bg-transparent text-base font-semibold leading-8 outline-none", isDark ? "text-white placeholder:text-[#8A8A8A]" : "text-[#111827] placeholder:text-[#64748B]")}
              placeholder="Answer BlueMind..."
              style={{ caretColor: isDark ? "#FFFFFF" : "#111827" }}
            />
            <button type="submit" disabled={!input.trim() || generating} className="flex h-10 w-10 items-center justify-center rounded-full text-white disabled:opacity-50" style={{ backgroundColor: appColor, color: accentText }}>
              <Plus className="h-5 w-5 rotate-45" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Dashboard({ plans, isDark, appColor, accentText, onCreate, onOpen, onEdit, onToggleStatus, onDelete }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className={cn("text-xs font-bold uppercase tracking-[0.16em]", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>AI Plans</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">My AI Plans</h1>
          <p className={cn("mt-2 text-sm font-semibold", isDark ? "text-[#D7D7D7]" : "text-[#64748B]")}>Open, edit, track, or continue any plan you created.</p>
        </div>
        <button type="button" onClick={onCreate} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold" style={{ backgroundColor: appColor, color: accentText }}>
          <Plus className="h-4 w-4" />
          New Plan
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan, index) => {
          const progress = getPlanProgress(plan);
          const status = getPlanStatus(plan);
          return (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={cn("rounded-[28px] border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl", isDark ? "border-white/[0.08] bg-[#202020] hover:bg-[#242424]" : "border-[#E5E7EB] bg-white hover:bg-[#F8FAFC]")}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-extrabold">{plan.title}</h2>
                  <p className={cn("mt-2 line-clamp-2 text-sm font-semibold leading-6", isDark ? "text-[#D7D7D7]" : "text-[#64748B]")}>{plan.description}</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", status === "Completed" ? "bg-emerald-500/15 text-emerald-400" : status === "Active" ? "bg-sky-500/15 text-sky-400" : "bg-amber-500/15 text-amber-400")}>{status}</span>
              </div>
              <ProgressBar value={progress.percent} appColor={appColor} isDark={isDark} />
              <div className={cn("mt-3 grid grid-cols-3 gap-2 text-xs font-bold", isDark ? "text-[#B8B8B8]" : "text-[#64748B]")}>
                <span>{progress.percent}%</span>
                <span>{progress.phases} phases</span>
                <span>{progress.total} tasks</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button type="button" onClick={() => onOpen(plan.id)} className="rounded-2xl px-3 py-3 text-xs font-bold" style={{ backgroundColor: appColor, color: accentText }}>Open Plan</button>
                <button type="button" onClick={() => onEdit(plan.id)} className={cn("rounded-2xl px-3 py-3 text-xs font-bold", isDark ? "bg-white/[0.07] hover:bg-white/[0.12]" : "bg-[#EEF2F7] text-[#193B68] hover:bg-[#E2E8F0]")}>Edit</button>
                <button type="button" onClick={() => onToggleStatus(plan.id)} disabled={status === "Completed"} className={cn("rounded-2xl px-3 py-3 text-xs font-bold disabled:opacity-50", isDark ? "bg-white/[0.07] hover:bg-white/[0.12]" : "bg-[#EEF2F7] text-[#193B68] hover:bg-[#E2E8F0]")}>{plan.status === "Paused" ? "Resume" : "Pause"}</button>
                <button type="button" onClick={() => onDelete(plan.id)} className="rounded-2xl bg-red-500/10 px-3 py-3 text-xs font-bold text-red-400 hover:bg-red-500/15">Delete</button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}

function PlanDetail({ plan, isDark, appColor, accentText, onBack, onUpdate, onDelete }) {
  const [fullScreen, setFullScreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [instruction, setInstruction] = useState("");
  const progress = getPlanProgress(plan);
  const status = getPlanStatus(plan);

  const updateTask = (phaseId, taskId, patch) => {
    onUpdate({
      ...plan,
      phases: plan.phases.map((phase) => phase.id === phaseId ? {
        ...phase,
        tasks: phase.tasks.map((task) => task.id === taskId ? { ...task, ...patch } : task),
      } : phase),
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteTask = (phaseId, taskId) => {
    onUpdate({
      ...plan,
      phases: plan.phases.map((phase) => phase.id === phaseId ? { ...phase, tasks: phase.tasks.filter((task) => task.id !== taskId) } : phase),
      updatedAt: new Date().toISOString(),
    });
  };

  const renameTask = (phaseId, task) => {
    const nextTitle = window.prompt("Edit task", task.title);
    if (nextTitle?.trim()) updateTask(phaseId, task.id, { title: nextTitle.trim() });
  };

  const applyInstruction = (event) => {
    event.preventDefault();
    if (!instruction.trim()) return;
    onUpdate(applyAIPlanInstruction(plan, instruction));
    setInstruction("");
    toast.success("Plan updated");
  };

  return (
    <PageShell isDark={isDark} fullScreen={fullScreen}>
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <button type="button" onClick={onBack} className={cn("mb-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold", isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-white text-[#193B68] shadow-sm hover:bg-[#EEF2F7]")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{plan.title}</h1>
            <p className={cn("mt-3 max-w-3xl text-sm font-semibold leading-7", isDark ? "text-[#D7D7D7]" : "text-[#64748B]")}>{plan.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Edit3} label="Edit Plan" isDark={isDark} active={editMode} onClick={() => setEditMode((value) => !value)} />
            <ActionButton icon={Expand} label="Full Screen" isDark={isDark} active={fullScreen} onClick={() => setFullScreen((value) => !value)} />
            <ActionButton icon={Save} label="Save" isDark={isDark} onClick={() => toast.success("Plan saved")} />
            <button type="button" onClick={() => onDelete(plan.id)} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-red-500/10 px-4 text-sm font-bold text-red-400 hover:bg-red-500/15">
              <Trash2 className="h-4 w-4" />
              Delete Plan
            </button>
          </div>
        </div>

        <div className={cn("mb-6 rounded-[28px] border p-5", isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Progress" value={`${progress.percent}%`} isDark={isDark} />
            <Stat label="Phases" value={progress.phases} isDark={isDark} />
            <Stat label="Tasks" value={`${progress.completed}/${progress.total}`} isDark={isDark} />
            <Stat label="Status" value={status} isDark={isDark} />
          </div>
          <div className="mt-5">
            <ProgressBar value={progress.percent} appColor={appColor} isDark={isDark} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-4 xl:grid-cols-2">
            {plan.phases.map((phase, index) => {
              const complete = phase.tasks.length > 0 && phase.tasks.every((task) => task.done);
              return (
                <motion.article key={phase.id} layout className={cn("rounded-[26px] border p-5 shadow-sm transition", complete ? "border-emerald-400/30 bg-emerald-500/10" : isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className={cn("text-xs font-bold uppercase tracking-[0.16em]", complete ? "text-emerald-400" : isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>Phase {index + 1}</p>
                      <h2 className="mt-1 text-xl font-extrabold">{phase.title}</h2>
                      <p className={cn("mt-2 text-sm font-semibold leading-6", isDark ? "text-[#D7D7D7]" : "text-[#64748B]")}>{phase.description}</p>
                    </div>
                    {complete && <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">Completed</span>}
                  </div>
                  <div className="space-y-2">
                    {phase.tasks.map((task) => (
                      <div key={task.id} className={cn("group flex items-center gap-3 rounded-2xl border px-3 py-3 transition", task.done ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : isDark ? "border-white/[0.06] bg-white/[0.035]" : "border-[#E5E7EB] bg-[#FAFBFC]")}>
                        <button type="button" onClick={() => updateTask(phase.id, task.id, { done: !task.done })} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border", task.done ? "border-emerald-400 bg-emerald-500 text-white" : isDark ? "border-white/[0.12]" : "border-[#CBD5E1]")}>
                          {task.done ? <Check className="h-4 w-4" /> : null}
                        </button>
                        <span className={cn("min-w-0 flex-1 text-sm font-bold", task.done && "line-through decoration-emerald-300/70")}>{task.title}</span>
                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <MiniAction label="Complete" icon={Check} onClick={() => updateTask(phase.id, task.id, { done: true })} />
                          <MiniAction label="Not complete" icon={X} onClick={() => updateTask(phase.id, task.id, { done: false })} />
                          {editMode && <MiniAction label="Edit" icon={Edit3} onClick={() => renameTask(phase.id, task)} />}
                          {editMode && <MiniAction label="Delete" icon={Trash2} danger onClick={() => deleteTask(phase.id, task.id)} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.article>
              );
            })}
          </div>

          <aside className="space-y-4">
            <div className={cn("rounded-[26px] border p-5", isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}>
              <h3 className="flex items-center gap-2 text-lg font-extrabold"><Sparkles className="h-5 w-5" style={{ color: appColor }} />AI Recommendations</h3>
              <div className="mt-4 space-y-2">
                {(plan.recommendations || []).map((item) => (
                  <p key={item} className={cn("rounded-2xl px-3 py-3 text-sm font-semibold leading-6", isDark ? "bg-white/[0.05] text-[#D7D7D7]" : "bg-[#F8FAFC] text-[#475569]")}>{item}</p>
                ))}
              </div>
            </div>
            <form onSubmit={applyInstruction} className={cn("rounded-[26px] border p-5", isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}>
              <h3 className="text-lg font-extrabold">Improve with AI</h3>
              <p className={cn("mt-2 text-sm font-semibold leading-6", isDark ? "text-[#D7D7D7]" : "text-[#64748B]")}>Try: Make this plan simpler, add a testing phase, or split this into two weeks.</p>
              <textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                rows={4}
                className={cn("mt-4 w-full resize-none rounded-2xl border bg-transparent px-4 py-3 text-sm font-semibold outline-none", isDark ? "border-white/[0.08] text-white placeholder:text-[#8A8A8A]" : "border-[#E5E7EB] text-[#111827] placeholder:text-[#94A3B8]")}
                placeholder="Add a testing phase..."
                style={{ caretColor: isDark ? "#FFFFFF" : "#111827" }}
              />
              <button type="submit" disabled={!instruction.trim()} className="mt-3 h-11 w-full rounded-2xl text-sm font-bold disabled:opacity-50" style={{ backgroundColor: appColor, color: accentText }}>Apply AI Update</button>
            </form>
          </aside>
        </div>
      </motion.section>
    </PageShell>
  );
}

function ActionButton({ icon: Icon, label, isDark, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition", active ? "bg-white text-[#111827]" : isDark ? "bg-white/[0.07] hover:bg-white/[0.12]" : "bg-white text-[#193B68] shadow-sm hover:bg-[#EEF2F7]")}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function MiniAction({ icon: Icon, label, onClick, danger }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cn("flex h-8 w-8 items-center justify-center rounded-full transition", danger ? "text-red-400 hover:bg-red-500/10" : "hover:bg-white/10")}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Stat({ label, value, isDark }) {
  return (
    <div className={cn("rounded-2xl px-4 py-4", isDark ? "bg-white/[0.05]" : "bg-[#F8FAFC]")}>
      <p className={cn("text-xs font-bold uppercase tracking-[0.14em]", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

export default function AIPlansPage() {
  const { prefs, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "#193B68";
  const accentText = getTextOnColor(appColor);
  const [plans, setPlans] = useState([]);
  const [mode, setMode] = useState("dashboard");
  const [draftGoal, setDraftGoal] = useState("");
  const [activePlanId, setActivePlanId] = useState("");

  useEffect(() => {
    const loaded = loadAIPlans();
    setPlans(loaded);
    setMode(loaded.length ? "dashboard" : "start");
  }, []);

  useEffect(() => {
    saveAIPlans(plans);
  }, [plans]);

  const activePlan = useMemo(() => plans.find((plan) => plan.id === activePlanId), [plans, activePlanId]);

  const createPlan = (plan) => {
    setPlans((current) => [plan, ...current]);
    setActivePlanId(plan.id);
    setMode("detail");
    toast.success("AI plan created");
  };

  const updatePlan = (updatedPlan) => {
    setPlans((current) => current.map((plan) => plan.id === updatedPlan.id ? updatedPlan : plan));
  };

  const deletePlan = (planId) => {
    if (!window.confirm("Delete this AI plan?")) return;
    setPlans((current) => current.filter((plan) => plan.id !== planId));
    if (activePlanId === planId) {
      setActivePlanId("");
      setMode(plans.length > 1 ? "dashboard" : "start");
    }
    toast.success("Plan deleted");
  };

  const editPlan = (planId) => {
    const plan = plans.find((item) => item.id === planId);
    const nextTitle = window.prompt("Edit plan title", plan?.title || "");
    if (!nextTitle?.trim()) return;
    updatePlan({ ...plan, title: nextTitle.trim(), updatedAt: new Date().toISOString() });
  };

  const toggleStatus = (planId) => {
    setPlans((current) => current.map((plan) => plan.id === planId ? {
      ...plan,
      status: plan.status === "Paused" ? "Active" : "Paused",
      updatedAt: new Date().toISOString(),
    } : plan));
  };

  if (mode === "conversation") {
    return (
      <PageShell isDark={isDark}>
        <ConversationBuilder
          goal={draftGoal}
          isDark={isDark}
          appColor={appColor}
          accentText={accentText}
          onCancel={() => setMode(plans.length ? "dashboard" : "start")}
          onCreate={createPlan}
        />
      </PageShell>
    );
  }

  if (mode === "detail" && activePlan) {
    return (
      <PlanDetail
        plan={activePlan}
        isDark={isDark}
        appColor={appColor}
        accentText={accentText}
        onBack={() => setMode("dashboard")}
        onUpdate={updatePlan}
        onDelete={deletePlan}
      />
    );
  }

  if (!plans.length || mode === "start") {
    return (
      <PageShell isDark={isDark}>
        <StartScreen
          isDark={isDark}
          appColor={appColor}
          accentText={accentText}
          onStart={(goal) => {
            setDraftGoal(goal);
            setMode("conversation");
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell isDark={isDark}>
      <Dashboard
        plans={plans}
        isDark={isDark}
        appColor={appColor}
        accentText={accentText}
        onCreate={() => setMode("start")}
        onOpen={(planId) => {
          setActivePlanId(planId);
          setMode("detail");
        }}
        onEdit={editPlan}
        onToggleStatus={toggleStatus}
        onDelete={deletePlan}
      />
    </PageShell>
  );
}
