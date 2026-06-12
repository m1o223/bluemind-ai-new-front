const STORAGE_KEY = "bluemind-ai-plans-v2";

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const clone = (value) => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

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
  const total = tasks.length;
  const completed = tasks.filter((task) => task.done).length;
  return {
    completed,
    total,
    phases: plan?.phases?.length || 0,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

export function getPlanStatus(plan) {
  const progress = getPlanProgress(plan);
  if (progress.total > 0 && progress.completed === progress.total) return "Completed";
  return plan?.status || "Active";
}

export function detectPlanType(goal) {
  const text = String(goal || "").toLowerCase();
  if (/website|site|platform|app|saas|e-commerce|frontend|backend|database|programming|code|coding|software/.test(text)) return "website";
  if (/study|exam|school|homework|math|mathematics|physics|chemistry|biology|history|geography|book|chapter|lesson/.test(text)) return "study";
  if (/startup|business|launch|product|marketing|sales|company|brand/.test(text)) return "business";
  if (/fitness|workout|gym|sport|running|diet|routine|training/.test(text)) return "fitness";
  return "general";
}

export function getPlanningQuestions(goal, answers = []) {
  const type = detectPlanType(goal);
  const shared = [
    "What deadline or time frame should this plan use?",
    "Do you want a simple plan or a detailed plan?",
  ];

  const topicQuestions = {
    website: [
      "What type of website do you want to build: portfolio, SaaS, e-commerce, AI tool, blog, or educational website?",
      "Do you need frontend only, or frontend and backend?",
      "Do you already have a design style, colors, or visual identity?",
      "What technologies do you want to use?",
    ],
    study: [
      "What grade, level, or subject are you studying?",
      "What book, topic, chapter, or pages should the plan cover?",
      "When is your exam or deadline?",
      "Do you want reading tasks, practice tasks, revision tasks, or all of them?",
    ],
    business: [
      "What are you trying to launch or build?",
      "Who is the target customer or audience?",
      "Do you already have a product, offer, or brand direction?",
      "What is your launch deadline?",
    ],
    fitness: [
      "What is your fitness goal?",
      "How many days per week can you train?",
      "Do you have equipment, a gym, or only home workouts?",
      "Are there any limits, injuries, or preferences I should consider?",
    ],
    general: [
      "What final outcome do you want?",
      "What resources or tools do you already have?",
      "Are you working alone or with other people?",
      "What should the plan avoid or focus on most?",
    ],
  };

  const questions = [...(topicQuestions[type] || topicQuestions.general), ...shared];
  return questions[answers.length] || null;
}

export function hasEnoughPlanContext(goal, answers) {
  return Boolean(String(goal || "").trim()) && Array.isArray(answers) && answers.filter((answer) => String(answer?.content || "").trim()).length >= 4;
}

function task(title) {
  return {
    id: uid("task"),
    title,
    done: false,
    createdAt: new Date().toISOString(),
  };
}

function phase(number, title, description, tasks) {
  return {
    id: uid("phase"),
    number,
    title,
    description,
    tasks: tasks.map(task),
  };
}

function answerText(answers) {
  return answers.map((answer) => answer.content).join(" ").toLowerCase();
}

function websitePlan(goal, answers) {
  const details = answerText(answers);
  const frontendOnly = /frontend only|front end only|frontend first|front first/.test(details);
  const darkBlue = /dark|blue|dark theme/.test(details);
  const phases = [
    phase(1, "Discovery and Scope", "Define the exact product direction before building screens.", [
      "Write the website purpose in one sentence",
      "Define the target users",
      "Choose core pages and features",
      "Decide success criteria for the first version",
    ]),
    phase(2, "Visual Identity", darkBlue ? "Build a dark, blue-accent design system for the product." : "Create a consistent visual identity for the product.", [
      "Choose background and surface colors",
      "Define accent color and button states",
      "Set typography and spacing rules",
      "Create hover and active interaction styles",
    ]),
    phase(3, "Core Pages", "Build the main user-facing pages first.", [
      "Design login page",
      "Design sign up page",
      "Build main chat or dashboard page",
      "Build settings page",
      "Make all pages responsive",
    ]),
    phase(4, "Components and Interactions", "Turn the UI into reusable pieces with smooth behavior.", [
      "Create shared buttons and inputs",
      "Create cards and modal components",
      "Add loading and empty states",
      "Review animations and transitions",
    ]),
    phase(5, frontendOnly ? "Frontend Testing and Launch" : "Backend, Testing, and Launch", frontendOnly ? "Validate the frontend and prepare the first public version." : "Connect the app logic and prepare for production.", frontendOnly ? [
      "Test desktop layout",
      "Test mobile layout",
      "Fix accessibility issues",
      "Prepare deployment checklist",
    ] : [
      "Plan authentication and database models",
      "Connect API endpoints",
      "Test full user flows",
      "Deploy and monitor production",
    ]),
  ];
  return phases;
}

function studyPlan() {
  return [
    phase(1, "Study Scope", "Turn the subject into small, clear learning parts.", [
      "List the chapters or topics",
      "Mark difficult sections",
      "Set exam or deadline date",
      "Choose study days",
    ]),
    phase(2, "Understand the Material", "Focus on understanding before memorizing.", [
      "Read the first section carefully",
      "Write a short summary",
      "Ask AI to explain unclear points",
      "Create examples for each key idea",
    ]),
    phase(3, "Practice", "Use exercises to find weak points.", [
      "Solve practice questions",
      "Review every mistake",
      "Create flashcards for important facts",
      "Repeat weak topics",
    ]),
    phase(4, "Revision", "Prepare for the final test or deadline.", [
      "Review summaries",
      "Take a mock test",
      "Revisit weak points",
      "Prepare a final checklist",
    ]),
  ];
}

function businessPlan() {
  return [
    phase(1, "Positioning", "Clarify what you are building and who it is for.", [
      "Define the customer problem",
      "Write the offer clearly",
      "Research competitors",
      "Choose the main launch channel",
    ]),
    phase(2, "Product Preparation", "Prepare the minimum version needed for launch.", [
      "Define the first version",
      "Create basic brand assets",
      "Prepare pricing or package options",
      "Write launch copy",
    ]),
    phase(3, "Launch", "Release, learn, and improve based on real feedback.", [
      "Publish the offer",
      "Collect early feedback",
      "Fix the biggest objections",
      "Plan the next sales step",
    ]),
  ];
}

function fitnessPlan() {
  return [
    phase(1, "Baseline", "Start with a realistic routine based on your current situation.", [
      "Define fitness goal",
      "Choose training days",
      "Check available equipment",
      "Set starting measurements",
    ]),
    phase(2, "Routine", "Build a repeatable weekly training structure.", [
      "Create workout schedule",
      "Add warm-up and stretching",
      "Plan recovery days",
      "Set simple nutrition habits",
    ]),
    phase(3, "Progress Tracking", "Improve gradually without overcomplicating the routine.", [
      "Track completed workouts",
      "Increase difficulty slowly",
      "Review sleep and energy",
      "Adjust the plan weekly",
    ]),
  ];
}

function generalPlan() {
  return [
    phase(1, "Clarify the Goal", "Make the outcome specific and easy to track.", [
      "Define the final result",
      "Break the goal into milestones",
      "Choose timeline",
      "List needed resources",
    ]),
    phase(2, "Prepare", "Remove friction before execution starts.", [
      "Collect materials",
      "Set weekly priorities",
      "Identify blockers",
      "Create a first checklist",
    ]),
    phase(3, "Execute", "Move through the plan in small steps.", [
      "Complete the first milestone",
      "Review progress",
      "Adjust next tasks",
      "Keep momentum",
    ]),
    phase(4, "Review", "Measure results and decide what to improve next.", [
      "Check completed work",
      "Document lessons learned",
      "Plan improvements",
      "Archive finished work",
    ]),
  ];
}

function buildPhases(goal, answers) {
  const type = detectPlanType(goal);
  if (type === "website") return websitePlan(goal, answers);
  if (type === "study") return studyPlan(goal, answers);
  if (type === "business") return businessPlan(goal, answers);
  if (type === "fitness") return fitnessPlan(goal, answers);
  return generalPlan(goal, answers);
}

function buildTitle(goal) {
  const cleaned = String(goal || "").trim().replace(/[.!?]+$/, "");
  if (!cleaned) return "Untitled AI Plan";
  return cleaned.length > 72 ? `${cleaned.slice(0, 69)}...` : cleaned;
}

function buildDescription(goal, answers) {
  const detailAnswer = answerText(answers);
  const detail = /simple/.test(detailAnswer) ? "simple" : /detailed/.test(detailAnswer) ? "detailed" : "balanced";
  return `A ${detail} AI-generated roadmap built from your goal and planning answers.`;
}

function buildRecommendations(goal, answers) {
  const type = detectPlanType(goal);
  if (type === "website") {
    return [
      "Finish the design system before building every page.",
      "Test the main user flow before polishing small details.",
      "Keep frontend and backend responsibilities clearly separated.",
    ];
  }
  if (type === "study") {
    return [
      "Study in short sessions and test yourself after each topic.",
      "Spend extra time on weak points instead of rereading everything.",
      "Use summaries, examples, and practice questions together.",
    ];
  }
  return [
    "Complete one phase before expanding the scope.",
    "Review progress after each phase and adjust the next tasks.",
    "Keep the plan small enough to act on every day.",
  ];
}

export function createAIPlanFromConversation(goal, answers = [], context = {}) {
  const now = new Date().toISOString();
  const attachments = Array.isArray(context.attachments) ? context.attachments : [];
  const messages = Array.isArray(context.messages) ? context.messages : [];
  return {
    id: uid("plan"),
    userId: null,
    title: buildTitle(goal),
    description: buildDescription(goal, answers),
    goal: String(goal || "").trim(),
    status: "Active",
    createdAt: now,
    updatedAt: now,
    aiConversation: {
      source: "ai_plans_builder",
      storage: "local_fallback_backend_ready",
      selectedQuickCard: context.selectedQuickCard || null,
      messages,
      answers,
      attachments,
      generatedDraftAt: now,
    },
    uploadedAttachments: attachments,
    generatedPlanDraft: {
      goal: String(goal || "").trim(),
      answers,
      attachments,
      createdAt: now,
    },
    phases: buildPhases(goal, answers),
    recommendations: buildRecommendations(goal, answers),
  };
}

export function applyAIPlanInstruction(plan, instruction) {
  const text = String(instruction || "").trim();
  if (!text) return plan;
  const lower = text.toLowerCase();
  const updated = clone(plan);
  updated.updatedAt = new Date().toISOString();

  if (/testing|test phase|add test|qa/.test(lower)) {
    updated.phases.push(phase(updated.phases.length + 1, "Testing and Quality Review", "Validate the plan before considering it complete.", [
      "Test the main workflow",
      "Check edge cases",
      "Fix important issues",
      "Confirm the final result is ready",
    ]));
    updated.recommendations = ["Run testing before final polish.", ...updated.recommendations].slice(0, 4);
    return updated;
  }

  if (/simpler|simple|reduce|less/.test(lower)) {
    updated.phases = updated.phases.map((item) => ({
      ...item,
      description: `${item.description} Kept focused and lighter.`,
      tasks: item.tasks.slice(0, Math.max(2, Math.min(3, item.tasks.length))),
    }));
    updated.description = `${updated.description} Simplified for faster execution.`;
    updated.recommendations = ["Focus only on the next important task.", "Avoid adding extra work until the core plan is complete."];
    return updated;
  }

  if (/two weeks|2 weeks|week|weekly/.test(lower)) {
    updated.phases = updated.phases.map((item, index) => ({
      ...item,
      title: `Week ${index + 1}: ${item.title}`,
      description: `${item.description} Scheduled as part of a weekly roadmap.`,
    }));
    updated.recommendations = ["Keep each week realistic and review progress at the end of the week.", ...updated.recommendations].slice(0, 4);
    return updated;
  }

  if (/add task|new task/.test(lower)) {
    const firstPhase = updated.phases[0];
    if (firstPhase) {
      firstPhase.tasks.push(task(text.replace(/^add task:?/i, "").trim() || "New AI suggested task"));
    }
    return updated;
  }

  updated.recommendations = [
    `AI note: ${text.slice(0, 120)}`,
    "For structural changes, ask BlueMind to add a phase, simplify the plan, or split it into weeks.",
    ...updated.recommendations,
  ].slice(0, 4);
  return updated;
}
