import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import {
  applyAIPlanInstruction,
  createAIPlanFromBrief,
  getPlanProgress,
  loadAIPlans,
  saveAIPlans,
} from "@/services/aiPlansService";

const QUICK_PROMPTS = [
  "خطة مشروع",
  "خطة دراسة",
  "خطة تعلم مهارة",
  "خطة رياضة",
  "خطة عمل",
  "خطة إطلاق منتج",
];

const QUESTIONS = [
  {
    id: "projectType",
    title: "ما نوع المشروع أو الهدف؟",
    placeholder: "مثال: موقع برمجة، مذاكرة رياضيات، إطلاق منتج...",
  },
  {
    id: "timeline",
    title: "كم المدة المتوقعة؟",
    placeholder: "مثال: أسبوعين، شهر، بدون مدة محددة...",
  },
  {
    id: "team",
    title: "هل تعمل وحدك أم مع فريق؟",
    placeholder: "مثال: وحدي، مع فريق صغير...",
  },
  {
    id: "detail",
    title: "هل تريد الخطة بسيطة أم مفصلة؟",
    options: ["simple", "balanced", "detailed"],
  },
  {
    id: "split",
    title: "هل تريدها مراحل أسبوعية أم مراحل عامة؟",
    options: ["weekly phases", "general phases"],
  },
];

const getTextOnColor = (hex) => {
  const normalized = String(hex || "#193B68").replace("#", "").padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(normalized, 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const luminance = [r, g, b]
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.52 ? "#111827" : "#FFFFFF";
};

function ProgressBar({ value, appColor, isDark }) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full", isDark ? "bg-white/[0.08]" : "bg-[#E5E7EB]")}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: appColor }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

function PageShell({ children, isDark, isRTL, fullScreen = false }) {
  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#1a1a1a] text-white" : "bg-[#FAFBFC] text-[#111827]")} dir={isRTL ? "rtl" : "ltr"} data-testid="ai-plans-page">
      <main className={cn("mx-auto px-4 py-6 sm:px-6 sm:py-8", fullScreen ? "max-w-[1500px]" : "max-w-7xl")}>
        {children}
      </main>
    </div>
  );
}

function EmptyBuilder({ isDark, appColor, accentText, onStart }) {
  const [goal, setGoal] = useState("");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl text-center">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: appColor, color: accentText }}>
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">ما الخطة التي تريد أن أبنيها لك؟</h1>
        <p className={cn("mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 sm:text-base", isDark ? "text-[#D7D7D7]" : "text-[#64748B]")}>
          اكتب هدفك، ثم سيطرح BlueMind أسئلة قصيرة قبل بناء خطة ذكية قابلة للتتبع.
        </p>

        <form
          className={cn("mt-8 rounded-[30px] border p-3 shadow-xl", isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}
          onSubmit={(event) => {
            event.preventDefault();
            if (goal.trim()) onStart(goal.trim());
          }}
        >
          <textarea
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            rows={4}
            className={cn("w-full resize-none bg-transparent px-3 py-3 text-base font-semibold leading-7 outline-none sm:text-lg", isDark ? "text-white placeholder:text-[#8A8A8A]" : "text-[#111827] placeholder:text-[#64748B]")}
            placeholder="اكتب هدفك هنا… مثال: أريد بناء موقع، أريد تعلم البرمجة، أريد خطة دراسة، أريد إطلاق مشروع."
            style={{ caretColor: isDark ? "#FFFFFF" : "#111827" }}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!goal.trim()}
              className="inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-bold text-white transition disabled:opacity-50"
              style={{ backgroundColor: appColor, color: accentText }}
            >
              <Sparkles className="h-4 w-4" />
              Build AI Plan
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setGoal(prompt);
                onStart(prompt);
              }}
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

function ClarifyBuilder({ goal, isDark, appColor, accentText, onCancel, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [value, setValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const question = QUESTIONS[step];

  const answerAndContinue = (answer) => {
    const nextAnswers = { ...answers, [question.id]: answer };
    setAnswers(nextAnswers);
    setValue("");
    if (step < QUESTIONS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    setGenerating(true);
    window.setTimeout(() => onComplete(createAIPlanFromBrief(goal, nextAnswers)), 900);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={cn("w-full max-w-2xl rounded-[32px] border p-5 shadow-xl sm:p-7", isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}>
        {generating ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin" style={{ color: appColor }} />
            <h2 className="mt-5 text-2xl font-extrabold">Generating your AI plan…</h2>
            <p className={cn("mt-2 text-sm font-semibold", isDark ? "text-[#D7D7D7]" : "text-[#64748B]")}>BlueMind is turning your answers into phases, tasks, and recommendations.</p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className={cn("text-xs font-bold uppercase tracking-[0.16em]", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>AI Plan Builder</p>
                <h2 className="mt-2 text-2xl font-extrabold">{question.title}</h2>
              </div>
              <button type="button" onClick={onCancel} className={cn("flex h-10 w-10 items-center justify-center rounded-full", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[#EEF2F7]")}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className={cn("mb-5 rounded-2xl px-4 py-3 text-sm font-semibold", isDark ? "bg-white/[0.06] text-[#D7D7D7]" : "bg-[#F8FAFC] text-[#475569]")}>
              {goal}
            </div>

            {question.options ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {question.options.map((option) => (
                  <button key={option} type="button" onClick={() => answerAndContinue(option)} className={cn("rounded-2xl border px-4 py-4 text-sm font-bold transition", isDark ? "border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1]" : "border-[#E5E7EB] bg-[#FAFBFC] hover:bg-[#EEF2F7]")}>
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); if (value.trim()) answerAndContinue(value.trim()); }}>
                <input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  autoFocus
                  className={cn("h-14 w-full rounded-2xl border bg-transparent px-4 text-base font-semibold outline-none", isDark ? "border-white/[0.08] text-white placeholder:text-[#8A8A8A]" : "border-[#E5E7EB] text-[#111827] placeholder:text-[#94A3B8]")}
                  placeholder={question.placeholder}
                  style={{ caretColor: isDark ? "#FFFFFF" : "#111827" }}
                />
                <button type="submit" disabled={!value.trim()} className="mt-4 h-12 w-full rounded-2xl text-sm font-bold transition disabled:opacity-50" style={{ backgroundColor: appColor, color: accentText }}>
                  Continue
                </button>
              </form>
            )}
            <ProgressBar value={Math.round(((step + 1) / QUESTIONS.length) * 100)} appColor={appColor} isDark={isDark} />
          </>
        )}
      </motion.section>
    </div>
  );
}

function Dashboard({ plans, isDark, appColor, accentText, onCreate, onOpen, onToggleStatus, onDelete }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className={cn("text-xs font-bold uppercase tracking-[0.16em]", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>AI Plans</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">خططي الذكية</h1>
          <p className={cn("mt-2 text-sm font-semibold", isDark ? "text-[#D7D7D7]" : "text-[#64748B]")}>My AI Plans Dashboard</p>
        </div>
        <button type="button" onClick={onCreate} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold" style={{ backgroundColor: appColor, color: accentText }}>
          <Plus className="h-4 w-4" />
          New AI Plan
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan, index) => {
          const progress = getPlanProgress(plan);
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
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", plan.status === "Active" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400")}>{plan.status}</span>
              </div>
              <ProgressBar value={progress.percent} appColor={appColor} isDark={isDark} />
              <div className={cn("mt-3 flex items-center justify-between text-xs font-bold", isDark ? "text-[#B8B8B8]" : "text-[#64748B]")}>
                <span>{progress.percent}%</span>
                <span>{progress.total} tasks</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => onOpen(plan.id)} className="rounded-2xl px-3 py-3 text-xs font-bold" style={{ backgroundColor: appColor, color: accentText }}>Open Plan</button>
                <button type="button" onClick={() => onToggleStatus(plan.id)} className={cn("rounded-2xl px-3 py-3 text-xs font-bold", isDark ? "bg-white/[0.07] hover:bg-white/[0.12]" : "bg-[#EEF2F7] text-[#193B68] hover:bg-[#E2E8F0]")}>
                  {plan.status === "Active" ? "Pause" : "Resume"}
                </button>
                <button type="button" onClick={() => onDelete(plan.id)} className="rounded-2xl bg-red-500/10 px-3 py-3 text-xs font-bold text-red-400 hover:bg-red-500/15">Delete</button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}

function PlanDetail({ plan, isDark, isRTL, appColor, accentText, onBack, onUpdate, onDelete }) {
  const [fullScreen, setFullScreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [instruction, setInstruction] = useState("");
  const progress = getPlanProgress(plan);

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

  return (
    <PageShell isDark={isDark} isRTL={isRTL} fullScreen={fullScreen}>
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
              Delete
            </button>
          </div>
        </div>

        <div className={cn("mb-6 rounded-[28px] border p-5", isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Progress" value={`${progress.percent}%`} isDark={isDark} />
            <Stat label="Tasks" value={`${progress.done}/${progress.total}`} isDark={isDark} />
            <Stat label="Status" value={plan.status} isDark={isDark} />
          </div>
          <div className="mt-5">
            <ProgressBar value={progress.percent} appColor={appColor} isDark={isDark} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {plan.phases.map((phase, index) => {
              const complete = phase.tasks.length > 0 && phase.tasks.every((task) => task.done);
              return (
                <motion.article key={phase.id} layout className={cn("rounded-[28px] border p-5 shadow-sm transition", complete ? "border-emerald-400/30 bg-emerald-500/10" : isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}>
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
                          {task.done ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 opacity-45" />}
                        </button>
                        <span className={cn("min-w-0 flex-1 text-sm font-bold", task.done && "line-through decoration-emerald-300/70")}>{task.title}</span>
                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <MiniAction label="Done" icon={Check} onClick={() => updateTask(phase.id, task.id, { done: true })} />
                          <MiniAction label="Not done" icon={X} onClick={() => updateTask(phase.id, task.id, { done: false })} />
                          {editMode && <MiniAction label="Edit" icon={Edit3} onClick={() => renameTask(phase.id, task)} />}
                          {editMode && <MiniAction label="Delete" icon={Trash2} onClick={() => deleteTask(phase.id, task.id)} danger />}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.article>
              );
            })}
          </div>

          <aside className="space-y-4">
            <div className={cn("rounded-[28px] border p-5", isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}>
              <h3 className="flex items-center gap-2 text-lg font-extrabold"><Sparkles className="h-5 w-5" style={{ color: appColor }} />AI Recommendations</h3>
              <div className="mt-4 space-y-2">
                {(plan.recommendations || []).map((item) => (
                  <p key={item} className={cn("rounded-2xl px-3 py-3 text-sm font-semibold leading-6", isDark ? "bg-white/[0.05] text-[#D7D7D7]" : "bg-[#F8FAFC] text-[#475569]")}>{item}</p>
                ))}
              </div>
            </div>
            <form
              className={cn("rounded-[28px] border p-5", isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white")}
              onSubmit={(event) => {
                event.preventDefault();
                const updated = applyAIPlanInstruction(plan, instruction);
                onUpdate(updated);
                setInstruction("");
                toast.success("AI updated the plan");
              }}
            >
              <h3 className="text-lg font-extrabold">Improve with AI</h3>
              <p className={cn("mt-2 text-sm font-semibold leading-6", isDark ? "text-[#D7D7D7]" : "text-[#64748B]")}>Try: Add a testing phase, make it simpler, or split it into two weeks.</p>
              <textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                rows={4}
                className={cn("mt-4 w-full resize-none rounded-2xl border bg-transparent px-4 py-3 text-sm font-semibold outline-none", isDark ? "border-white/[0.08] text-white placeholder:text-[#8A8A8A]" : "border-[#E5E7EB] text-[#111827] placeholder:text-[#94A3B8]")}
                placeholder="أضف مرحلة اختبار..."
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
  const { prefs, resolvedTheme, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "#193B68";
  const accentText = getTextOnColor(appColor);
  const isRTL = /^(ar|fa|he|ur|ku)/i.test(uiLanguage);
  const [plans, setPlans] = useState([]);
  const [mode, setMode] = useState("dashboard");
  const [draftGoal, setDraftGoal] = useState("");
  const [activePlanId, setActivePlanId] = useState("");

  useEffect(() => {
    const loaded = loadAIPlans();
    setPlans(loaded);
    setMode(loaded.length ? "dashboard" : "empty");
  }, []);

  useEffect(() => {
    saveAIPlans(plans);
  }, [plans]);

  const activePlan = useMemo(() => plans.find((plan) => plan.id === activePlanId), [plans, activePlanId]);

  const addPlan = (plan) => {
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
      setMode(plans.length > 1 ? "dashboard" : "empty");
    }
    toast.success("Plan deleted");
  };

  const toggleStatus = (planId) => {
    setPlans((current) => current.map((plan) => plan.id === planId ? {
      ...plan,
      status: plan.status === "Active" ? "Paused" : "Active",
      updatedAt: new Date().toISOString(),
    } : plan));
  };

  if (mode === "clarify") {
    return (
      <PageShell isDark={isDark} isRTL={isRTL}>
        <ClarifyBuilder
          goal={draftGoal}
          isDark={isDark}
          appColor={appColor}
          accentText={accentText}
          onCancel={() => setMode(plans.length ? "dashboard" : "empty")}
          onComplete={addPlan}
        />
      </PageShell>
    );
  }

  if (mode === "detail" && activePlan) {
    return (
      <PlanDetail
        plan={activePlan}
        isDark={isDark}
        isRTL={isRTL}
        appColor={appColor}
        accentText={accentText}
        onBack={() => setMode("dashboard")}
        onUpdate={updatePlan}
        onDelete={deletePlan}
      />
    );
  }

  if (!plans.length || mode === "empty") {
    return (
      <PageShell isDark={isDark} isRTL={isRTL}>
        <EmptyBuilder
          isDark={isDark}
          appColor={appColor}
          accentText={accentText}
          onStart={(goal) => {
            setDraftGoal(goal);
            setMode("clarify");
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell isDark={isDark} isRTL={isRTL}>
      <Dashboard
        plans={plans}
        isDark={isDark}
        appColor={appColor}
        accentText={accentText}
        onCreate={() => setMode("empty")}
        onOpen={(planId) => {
          setActivePlanId(planId);
          setMode("detail");
        }}
        onToggleStatus={toggleStatus}
        onDelete={deletePlan}
      />
    </PageShell>
  );
}
