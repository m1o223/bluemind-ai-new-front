const STORAGE_KEY = "bluemind-ai-plans-v1";

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function loadAIPlans() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAIPlans(plans) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(plans) ? plans : []));
}

export function getPlanProgress(plan) {
  const tasks = (plan?.phases || []).flatMap((phase) => phase.tasks || []);
  if (!tasks.length) return { done: 0, total: 0, percent: 0 };
  const done = tasks.filter((task) => task.done).length;
  return { done, total: tasks.length, percent: Math.round((done / tasks.length) * 100) };
}

function detectPlanType(goal) {
  const text = String(goal || "").toLowerCase();
  if (/study|exam|school|homework|learn|تعلم|دراسة|اختبار|امتحان|واجب/.test(text)) return "study";
  if (/site|website|app|code|program|برمجة|موقع|تطبيق/.test(text)) return "product";
  if (/gym|sport|fitness|رياض|جيم|لياقة/.test(text)) return "fitness";
  if (/business|startup|launch|product|عمل|مشروع|إطلاق|منتج/.test(text)) return "business";
  return "general";
}

function phaseBlueprint(type) {
  const blueprints = {
    product: [
      ["Discovery", ["Define the product goal", "List target users", "Choose core features", "Set success criteria"]],
      ["Design", ["Sketch the main screens", "Choose colors and typography", "Review mobile and desktop layouts", "Prepare interaction notes"]],
      ["Build", ["Set up frontend structure", "Build the main user flow", "Connect backend or storage", "Add error and loading states"]],
      ["Launch", ["Test the full flow", "Fix usability issues", "Prepare launch checklist", "Publish and monitor feedback"]],
    ],
    study: [
      ["Study Setup", ["Define the subject and exam goal", "Collect books and notes", "Break chapters into small parts", "Set weekly study blocks"]],
      ["Learning", ["Study the first chapter", "Write short summaries", "Practice examples", "Ask AI for unclear topics"]],
      ["Practice", ["Solve exercises", "Review mistakes", "Create flashcards", "Repeat weak areas"]],
      ["Final Review", ["Take a mock test", "Review key formulas", "Summarize difficult parts", "Prepare exam-day plan"]],
    ],
    fitness: [
      ["Baseline", ["Set fitness goal", "Choose training days", "Check available equipment", "Measure starting point"]],
      ["Routine", ["Build weekly workout plan", "Add warm-up and stretching", "Plan recovery days", "Prepare simple meal habits"]],
      ["Progress", ["Track completed sessions", "Increase difficulty gradually", "Review energy and sleep", "Adjust the plan weekly"]],
    ],
    business: [
      ["Strategy", ["Define customer problem", "Write the offer", "Research competitors", "Choose launch channel"]],
      ["Preparation", ["Create basic brand assets", "Build landing or sales page", "Prepare pricing", "Write launch content"]],
      ["Launch", ["Publish the offer", "Collect early feedback", "Improve based on responses", "Plan next sales step"]],
    ],
    general: [
      ["Clarify", ["Define the final outcome", "Break the goal into milestones", "Choose timeline", "List required resources"]],
      ["Prepare", ["Collect materials", "Set weekly priorities", "Remove blockers", "Create a simple checklist"]],
      ["Execute", ["Complete the first milestone", "Review progress", "Adjust the next tasks", "Keep momentum"]],
      ["Review", ["Measure results", "Document lessons learned", "Decide next improvements", "Archive completed work"]],
    ],
  };
  return blueprints[type] || blueprints.general;
}

function createDescription(goal, answers) {
  const detail = answers.detail || "balanced";
  const timeline = answers.timeline || "flexible timing";
  const split = answers.split || "clear phases";
  return `A ${detail} AI-generated plan for ${goal.trim()} with ${split} and ${timeline}.`;
}

function buildRecommendations(type, answers) {
  const base = [
    "Finish one small milestone before expanding the plan.",
    "Review progress after each phase and adjust the next tasks.",
  ];
  if (type === "product") {
    base.unshift("Validate the main user flow before polishing the final design.");
  }
  if (type === "study") {
    base.unshift("Study in short focused parts and test yourself after each part.");
  }
  if (answers.detail === "simple") {
    base.push("Keep the plan simple: fewer tasks, stronger focus.");
  } else {
    base.push("Use detailed checkpoints so nothing important is missed.");
  }
  return base.slice(0, 4);
}

export function createAIPlanFromBrief(goal, answers = {}) {
  const type = detectPlanType(goal);
  const now = new Date().toISOString();
  const phases = phaseBlueprint(type).map(([title, tasks], phaseIndex) => ({
    id: uid("phase"),
    title,
    description: `Phase ${phaseIndex + 1} focuses on ${title.toLowerCase()} for this goal.`,
    tasks: tasks.map((taskTitle) => ({
      id: uid("task"),
      title: taskTitle,
      done: false,
      createdAt: now,
    })),
  }));

  return {
    id: uid("plan"),
    title: goal.trim().replace(/[.!؟]+$/, "").slice(0, 72) || "Untitled AI Plan",
    description: createDescription(goal, answers),
    goal: goal.trim(),
    answers,
    status: "Active",
    phases,
    recommendations: buildRecommendations(type, answers),
    createdAt: now,
    updatedAt: now,
  };
}

export function applyAIPlanInstruction(plan, instruction) {
  const text = String(instruction || "").trim();
  if (!text) return plan;
  const lower = text.toLowerCase();
  const updated = structuredClone(plan);
  updated.updatedAt = new Date().toISOString();

  if (/test|testing|اختبار|تجربة/.test(lower)) {
    updated.phases.push({
      id: uid("phase"),
      title: /اختبار|تجربة/.test(lower) ? "Testing" : "Testing",
      description: "Validate the work, catch issues, and prepare improvements before finishing.",
      tasks: ["Test the main flow", "Check edge cases", "Fix important issues", "Confirm readiness"].map((title) => ({
        id: uid("task"),
        title,
        done: false,
        createdAt: updated.updatedAt,
      })),
    });
    updated.recommendations = ["Run testing before final polish.", ...updated.recommendations].slice(0, 4);
    return updated;
  }

  if (/simple|simpler|أبسط|بسيط|قلل/.test(lower)) {
    updated.phases = updated.phases.map((phase) => ({
      ...phase,
      tasks: phase.tasks.slice(0, clamp(phase.tasks.length - 1, 2, 4)),
      description: `${phase.description} Kept simple and focused.`,
    }));
    updated.description = `${updated.description} Simplified for faster execution.`;
    updated.recommendations = ["Focus only on the next important task.", "Avoid adding extra work until the core plan is complete."];
    return updated;
  }

  if (/week|weeks|أسبوع|أسبوعين|two weeks|14/.test(lower)) {
    updated.phases = updated.phases.map((phase, index) => ({
      ...phase,
      title: `Week ${index + 1}: ${phase.title}`,
      description: `${phase.description} Scheduled as part of a weekly plan.`,
    }));
    updated.recommendations = ["Keep each week realistic and review progress at the end of the week.", ...updated.recommendations].slice(0, 4);
    return updated;
  }

  updated.recommendations = [
    `AI note: ${text.slice(0, 120)}`,
    "I updated the plan guidance. For structural changes, ask for a phase, deadline, or simplification.",
    ...updated.recommendations,
  ].slice(0, 4);
  return updated;
}
