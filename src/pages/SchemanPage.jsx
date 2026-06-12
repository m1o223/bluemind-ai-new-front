import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Dumbbell,
  Edit3,
  FileImage,
  Focus,
  Maximize2,
  Moon,
  MoreHorizontal,
  Paperclip,
  PiggyBank,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { inputClasses, typeClasses } from "@/lib/interactions";
import { useApp } from "@/context/AppContext";
import { analyzeSchoolScheduleImage } from "@/services/studyPlanService";

const STORAGE_KEY = "bluemind_ai_plans_v2";
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const COLORS = ["var(--bm-primary)", "#2563EB", "var(--bm-success)", "#8B5CF6", "var(--bm-warning)", "var(--bm-error)", "var(--bm-info)"];
const RTL_LANGUAGE_RE = /^(ar|fa|he|ur|ku)/i;

const PLAN_TYPES = [
  { id: "gym", icon: Dumbbell, title: "schemaTypeGym", subtitle: "schemaTypeGymSubtitle" },
  { id: "study", icon: CalendarDays, title: "schemaTypeStudy", subtitle: "schemaTypeStudySubtitle" },
  { id: "sleep", icon: Moon, title: "schemaTypeSleep", subtitle: "schemaTypeSleepSubtitle" },
  { id: "nutrition", icon: Utensils, title: "schemaTypeNutrition", subtitle: "schemaTypeNutritionSubtitle" },
  { id: "money", icon: PiggyBank, title: "schemaTypeMoney", subtitle: "schemaTypeMoneySubtitle" },
  { id: "productivity", icon: Focus, title: "schemaTypeProductivity", subtitle: "schemaTypeProductivitySubtitle" },
  { id: "custom", icon: Sparkles, title: "schemaTypeCustom", subtitle: "schemaTypeCustomSubtitle" },
];

const REMINDER_OPTIONS = [
  { value: "disabled", label: "schemaReminderDisabled" },
  { value: "exact", label: "schemaReminderExact" },
  { value: "10", label: "schemaReminder10" },
  { value: "30", label: "schemaReminder30" },
];

const VIEW_MODES = ["day", "week", "month"];
const schemaThemeCss = `
  [data-schema-theme="light"] button:not([style*="background"]) {
    background-color: var(--bm-bg-elevated);
    color: var(--bm-text-primary);
    border-color: var(--bm-border-strong);
    border-width: 1px;
    border-style: solid;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }

  [data-schema-theme="light"] button:not([style*="background"]):hover {
    background-color: var(--bm-hover-bg);
    border-color: var(--bm-text-muted);
    color: var(--bm-text-primary);
  }

  [data-schema-theme="light"] button[disabled],
  [data-schema-theme="light"] button:disabled {
    background-color: var(--bm-border) !important;
    border-color: var(--bm-border-strong) !important;
    color: var(--bm-text-secondary) !important;
    cursor: not-allowed;
    opacity: 1;
  }

  [data-schema-theme="light"] input,
  [data-schema-theme="light"] select,
  [data-schema-theme="light"] textarea {
    background-color: #FFFFFF !important;
    color: var(--bm-text-primary) !important;
    border-color: var(--bm-text-muted) !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  }

  [data-schema-theme="light"] input::placeholder,
  [data-schema-theme="light"] textarea::placeholder {
    color: var(--bm-text-secondary) !important;
    opacity: 1;
  }

  [data-schema-theme="light"] input:focus,
  [data-schema-theme="light"] select:focus,
  [data-schema-theme="light"] textarea:focus {
    border-color: var(--bm-primary) !important;
    box-shadow: 0 0 0 3px rgba(25, 59, 104, 0.16);
    outline: none;
  }

  [data-schema-theme="light"] [class*="border-[var(--bm-border)]"],
  [data-schema-theme="light"] [class*="border-\\[\\var(--bm-border)\\]"] {
    border-color: var(--bm-border-strong) !important;
  }

  [data-schema-theme="light"] [class*="bg-white"],
  [data-schema-theme="light"] [class*="bg-\\[\\var(--bm-bg-elevated)\\]"] {
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  }

  [data-schema-theme="dark"] button:not([style*="background"]) {
    color: inherit;
  }
`;

function uid(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readPlans() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writePlans(plans) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // Local persistence is best-effort until backend storage is connected.
  }
}

function hexToRgba(hex, alpha = 1) {
  const normalized = String(hex || "var(--bm-primary)").replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(value, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

function getTextOnColor(hex) {
  const normalized = String(hex || "var(--bm-primary)").replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(value, 16);
  const red = ((number >> 16) & 255) / 255;
  const green = ((number >> 8) & 255) / 255;
  const blue = (number & 255) / 255;
  const luminance = [red, green, blue]
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

  return luminance > 0.52 ? "var(--bm-text-primary)" : "#FFFFFF";
}

function addHours(time, hours) {
  const [hh, mm] = String(time || "16:00").split(":").map(Number);
  const total = (((hh || 0) + hours) * 60 + (mm || 0)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function activeDays(count) {
  const map = {
    1: ["monday"],
    2: ["monday", "thursday"],
    3: ["monday", "wednesday", "friday"],
    4: ["monday", "tuesday", "thursday", "saturday"],
    5: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    6: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    7: DAYS,
  };
  return map[count] || map[4];
}

function getTimetableBounds(timetable) {
  const entryMinutes = (timetable?.entries || []).flatMap((entry) => [
    timeToMinutes(entry.startTime),
    timeToMinutes(entry.endTime),
  ]);
  const start = timetable?.timeRange?.start ? timeToMinutes(timetable.timeRange.start) : Math.min(...entryMinutes, 8 * 60);
  const end = timetable?.timeRange?.end ? timeToMinutes(timetable.timeRange.end) : Math.max(...entryMinutes, 16 * 60);

  return {
    start: Math.max(0, Number.isFinite(start) ? start : 8 * 60),
    end: Math.min(24 * 60, Number.isFinite(end) ? end : 16 * 60),
  };
}

function isBreakEntry(entry) {
  const value = [
    entry?.subject,
    entry?.type,
    entry?.notes,
    entry?.room,
  ].filter(Boolean).join(" ").toLowerCase();

  return /\b(lunch|rast|rest|break|pause|dinner)\b/.test(value);
}

function isMealEntry(entry) {
  const value = [
    entry?.subject,
    entry?.type,
    entry?.notes,
  ].filter(Boolean).join(" ").toLowerCase();

  return /\b(lunch|dinner)\b/.test(value);
}

function task(day, time, title, description, color, type) {
  return {
    id: uid("task"),
    day,
    time,
    title,
    description,
    color,
    type,
    done: false,
  };
}

function groupedTasks(tasks) {
  return DAYS.reduce((acc, day) => {
    acc[day] = tasks.filter((item) => item.day === day).sort((a, b) => a.time.localeCompare(b.time));
    return acc;
  }, {});
}

function getPlanType(type) {
  return PLAN_TYPES.find((item) => item.id === type) || PLAN_TYPES[0];
}

function getQuestionFlow(type, answers, t) {
  if (!type) return [];

  if (type === "gym") {
    const goal = answers.goal;
    const flow = [
      {
        id: "goal",
        title: t("schemaQuestionGymGoal"),
        type: "choice",
        options: [
          ["lose_weight", "schemaGoalLoseWeight"],
          ["gain_muscle", "schemaGoalGainMuscle"],
          ["stamina", "schemaGoalStamina"],
          ["strength", "schemaGoalStrength"],
        ],
      },
    ];

    if (goal === "lose_weight") {
      flow.push(
        { id: "currentWeight", title: t("schemaQuestionCurrentWeight"), type: "number", suffix: "kg" },
        { id: "targetWeight", title: t("schemaQuestionTargetWeight"), type: "number", suffix: "kg" },
        { id: "nutritionStyle", title: t("schemaQuestionNutritionPreference"), type: "choice", options: [["balanced", "schemaNutritionBalanced"], ["low_carb", "schemaNutritionLowCarb"], ["high_protein", "schemaNutritionHighProtein"]] },
      );
    } else if (goal === "gain_muscle") {
      flow.push(
        { id: "trainingExperience", title: t("schemaQuestionTrainingExperience"), type: "choice", options: [["new", "schemaExperienceNew"], ["some", "schemaExperienceSome"], ["experienced", "schemaExperienceExperienced"]] },
        { id: "equipment", title: t("schemaQuestionEquipment"), type: "choice", options: [["gym", "schemaEquipmentGym"], ["home", "schemaEquipmentHome"], ["bodyweight", "schemaEquipmentBodyweight"]] },
        { id: "proteinFocus", title: t("schemaQuestionProtein"), type: "choice", options: [["normal", "schemaProteinNormal"], ["high", "schemaProteinHigh"], ["vegetarian", "schemaProteinVegetarian"]] },
      );
    } else if (goal) {
      flow.push(
        { id: "trainingStyle", title: t("schemaQuestionTrainingStyle"), type: "choice", options: [["strength", "schemaTrainingStrength"], ["cardio", "schemaTrainingCardio"], ["hybrid", "schemaTrainingHybrid"]] },
        { id: "limitations", title: t("schemaQuestionLimitations"), type: "text", placeholder: t("schemaLimitationsPlaceholder"), optional: true },
      );
    }

    flow.push(
      { id: "daysPerWeek", title: t("schemaQuestionWorkoutDays"), type: "slider", min: 1, max: 7 },
      { id: "timeRange", title: t("schemaQuestionPreferredTime"), type: "timeRange" },
      { id: "supportingFile", title: t("schemaQuestionOptionalUpload"), type: "uploadAny", optional: true },
      { id: "reminders", title: t("schemaQuestionReminders"), type: "choice", options: REMINDER_OPTIONS.map((item) => [item.value, item.label]) },
    );
    return flow;
  }

  if (type === "study") {
    return [
      { id: "scheduleImage", title: t("schemaQuestionUploadSchedule"), type: "schoolTimetableUpload" },
      ...(answers.scheduleNeedsClarification ? [{ id: "scheduleClarification", title: answers.scheduleClarificationQuestion || t("schemaQuestionScheduleClarification"), type: "text", placeholder: t("schemaScheduleClarificationPlaceholder") }] : []),
      { id: "focusSubject", title: t("schemaQuestionFocusSubject"), type: "text", placeholder: t("schemaSubjectPlaceholder") },
      { id: "studyHours", title: t("schemaQuestionStudyHours"), type: "slider", min: 1, max: 6 },
      { id: "studyTime", title: t("schemaQuestionStudyTime"), type: "timeRange" },
      { id: "studyGoal", title: t("schemaQuestionStudyGoal"), type: "choice", options: [["grades", "schemaGoalGrades"], ["exams", "schemaGoalExams"], ["focus", "schemaGoalFocus"], ["catch_up", "schemaGoalCatchUp"]] },
      { id: "supportingFile", title: t("schemaQuestionOptionalUpload"), type: "uploadAny", optional: true },
      { id: "reminders", title: t("schemaQuestionReminders"), type: "choice", options: REMINDER_OPTIONS.map((item) => [item.value, item.label]) },
    ];
  }

  if (type === "sleep") {
    return [
      { id: "sleepProblem", title: t("schemaQuestionSleepProblem"), type: "choice", options: [["late", "schemaSleepLate"], ["waking", "schemaSleepWaking"], ["tired", "schemaSleepTired"], ["routine", "schemaSleepRoutine"]] },
      { id: "bedTime", title: t("schemaQuestionBedTime"), type: "time" },
      { id: "wakeTime", title: t("schemaQuestionWakeTime"), type: "time" },
      { id: "screenHabit", title: t("schemaQuestionScreenHabit"), type: "choice", options: [["low", "schemaScreenLow"], ["medium", "schemaScreenMedium"], ["high", "schemaScreenHigh"]] },
      { id: "supportingFile", title: t("schemaQuestionOptionalUpload"), type: "uploadAny", optional: true },
      { id: "reminders", title: t("schemaQuestionReminders"), type: "choice", options: REMINDER_OPTIONS.map((item) => [item.value, item.label]) },
    ];
  }

  if (type === "nutrition") {
    return [
      { id: "nutritionGoal", title: t("schemaQuestionNutritionGoal"), type: "choice", options: [["fat_loss", "schemaGoalFatLoss"], ["muscle", "schemaGoalMuscleFood"], ["energy", "schemaGoalEnergy"], ["healthy", "schemaGoalHealthy"]] },
      { id: "mealsPerDay", title: t("schemaQuestionMeals"), type: "slider", min: 2, max: 6 },
      { id: "dietStyle", title: t("schemaQuestionDietStyle"), type: "choice", options: [["normal", "schemaDietNormal"], ["vegetarian", "schemaDietVegetarian"], ["halal", "schemaDietHalal"], ["simple", "schemaDietSimple"]] },
      { id: "allergies", title: t("schemaQuestionAllergies"), type: "text", placeholder: t("schemaAllergiesPlaceholder"), optional: true },
      { id: "timeRange", title: t("schemaQuestionMealPrepTime"), type: "timeRange" },
      { id: "supportingFile", title: t("schemaQuestionOptionalUpload"), type: "uploadAny", optional: true },
      { id: "reminders", title: t("schemaQuestionReminders"), type: "choice", options: REMINDER_OPTIONS.map((item) => [item.value, item.label]) },
    ];
  }

  if (type === "money") {
    return [
      { id: "savingGoal", title: t("schemaQuestionSavingGoal"), type: "text", placeholder: t("schemaSavingGoalPlaceholder") },
      { id: "monthlyIncome", title: t("schemaQuestionIncome"), type: "number", suffix: "$" },
      { id: "spendingIssue", title: t("schemaQuestionSpendingIssue"), type: "choice", options: [["food", "schemaSpendFood"], ["shopping", "schemaSpendShopping"], ["subscriptions", "schemaSpendSubscriptions"], ["unknown", "schemaSpendUnknown"]] },
      { id: "reviewDay", title: t("schemaQuestionReviewDay"), type: "choice", options: DAYS.map((day) => [day, `schemanDay_${day}`]) },
      { id: "supportingFile", title: t("schemaQuestionOptionalUpload"), type: "uploadAny", optional: true },
      { id: "reminders", title: t("schemaQuestionReminders"), type: "choice", options: REMINDER_OPTIONS.map((item) => [item.value, item.label]) },
    ];
  }

  if (type === "productivity") {
    return [
      { id: "productivityGoal", title: t("schemaQuestionProductivityGoal"), type: "choice", options: [["deep_work", "schemaProductivityDeepWork"], ["routine", "schemaProductivityRoutine"], ["less_phone", "schemaProductivityPhone"], ["projects", "schemaProductivityProjects"]] },
      { id: "workWindow", title: t("schemaQuestionWorkWindow"), type: "timeRange" },
      { id: "distraction", title: t("schemaQuestionDistraction"), type: "choice", options: [["phone", "schemaDistractionPhone"], ["fatigue", "schemaDistractionFatigue"], ["noise", "schemaDistractionNoise"], ["unclear", "schemaDistractionUnclear"]] },
      { id: "daysPerWeek", title: t("schemaQuestionFocusDays"), type: "slider", min: 1, max: 7 },
      { id: "supportingFile", title: t("schemaQuestionOptionalUpload"), type: "uploadAny", optional: true },
      { id: "reminders", title: t("schemaQuestionReminders"), type: "choice", options: REMINDER_OPTIONS.map((item) => [item.value, item.label]) },
    ];
  }

  return [
    { id: "customGoal", title: t("schemaQuestionCustomGoal"), type: "text", placeholder: t("schemaCustomGoalPlaceholder") },
    { id: "daysPerWeek", title: t("schemaQuestionCustomDays"), type: "slider", min: 1, max: 7 },
    { id: "timeRange", title: t("schemaQuestionCustomTime"), type: "timeRange" },
    { id: "supportingFile", title: t("schemaQuestionOptionalUpload"), type: "uploadAny", optional: true },
    { id: "reminders", title: t("schemaQuestionReminders"), type: "choice", options: REMINDER_OPTIONS.map((item) => [item.value, item.label]) },
  ];
}

function isAnswered(question, answers) {
  if (!question || question.optional) return true;
  if (question.type === "schoolTimetableUpload") {
    return Boolean(answers.timetable?.entries?.length);
  }
  const value = answers[question.id];
  if (question.type === "upload") return true;
  if (question.type === "timeRange") return Boolean(answers.from && answers.to);
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function taskTemplates(type, answers, t) {
  const subject = answers.focusSubject || t("schemaStudyDefaultSubject");
  const maps = {
    gym: [
      [t("schemaTaskWorkout"), t("schemaTaskWorkoutDesc"), "training", COLORS[1]],
      [t("schemaTaskNutrition"), t("schemaTaskNutritionDesc"), "meal", COLORS[2]],
      [t("schemaTaskRecovery"), t("schemaTaskRecoveryDesc"), "recovery", COLORS[3]],
    ],
    study: [
      [t("schemaTaskClassReview", { subject }), t("schemaTaskClassReviewDesc"), "study", COLORS[1]],
      [t("schemaTaskFocusStudy", { subject }), t("schemaTaskFocusStudyDesc"), "study", COLORS[3]],
      [t("schemaTaskExamPractice"), t("schemaTaskExamPracticeDesc"), "review", COLORS[4]],
    ],
    sleep: [
      [t("schemaTaskWindDown"), t("schemaTaskWindDownDesc"), "sleep", COLORS[3]],
      [t("schemaTaskScreenOff"), t("schemaTaskScreenOffDesc"), "sleep", COLORS[4]],
      [t("schemaTaskMorningLight"), t("schemaTaskMorningLightDesc"), "routine", COLORS[2]],
    ],
    nutrition: [
      [t("schemaTaskMealPrep"), t("schemaTaskMealPrepDesc"), "meal", COLORS[2]],
      [t("schemaTaskWater"), t("schemaTaskWaterDesc"), "habit", COLORS[6]],
      [t("schemaTaskBalancedMeal"), t("schemaTaskBalancedMealDesc"), "meal", COLORS[4]],
    ],
    money: [
      [t("schemaTaskBudgetReview"), t("schemaTaskBudgetReviewDesc"), "money", COLORS[1]],
      [t("schemaTaskSavingsTransfer"), t("schemaTaskSavingsTransferDesc"), "money", COLORS[2]],
      [t("schemaTaskSpendingAudit"), t("schemaTaskSpendingAuditDesc"), "review", COLORS[4]],
    ],
    productivity: [
      [t("schemaTaskDeepWork"), t("schemaTaskDeepWorkDesc"), "focus", COLORS[1]],
      [t("schemaTaskAdminClear"), t("schemaTaskAdminClearDesc"), "admin", COLORS[4]],
      [t("schemaTaskDailyReview"), t("schemaTaskDailyReviewDesc"), "review", COLORS[2]],
    ],
  };
  return maps[type] || maps.productivity;
}

function createStudyTasksAroundTimetable(answers, t, appColor) {
  const timetable = answers.timetable;
  const schoolEntries = timetable?.entries || [];
  const schoolEndByDay = DAYS.reduce((acc, day) => {
    const dayEntries = schoolEntries.filter((entry) => entry.day === day);
    acc[day] = dayEntries.length
      ? Math.max(...dayEntries.map((entry) => timeToMinutes(entry.endTime)))
      : null;
    return acc;
  }, {});
  const focusSubject = answers.focusSubject || t("schemaStudyDefaultSubject");
  const studyGoal = answers.studyGoal || "focus";
  const tasks = [];

  DAYS.forEach((day) => {
    if (!schoolEndByDay[day]) return;

    const homeworkTime = minutesToTime(Math.min(21 * 60, schoolEndByDay[day] + 90));
    const reviewTime = minutesToTime(Math.min(21 * 60 + 30, schoolEndByDay[day] + 180));
    tasks.push(task(day, homeworkTime, t("schemaTaskHomework", { subject: focusSubject }), t("schemaTaskHomeworkDesc"), appColor, "study"));

    if (["exams", "grades", "focus"].includes(studyGoal)) {
      tasks.push(task(day, reviewTime, t("schemaTaskReviewFromSchedule"), t("schemaTaskReviewFromScheduleDesc"), COLORS[3], "review"));
    }
  });

  tasks.push(task("sunday", "17:00", t("schemaTaskWeeklyReview"), t("schemaTaskWeeklyReviewDesc"), COLORS[4], "review"));

  return tasks;
}

function createPlan(type, answers, t, appColor) {
  const planType = getPlanType(type);

  if (type === "study" && answers.timetable?.entries?.length) {
    const tasks = createStudyTasksAroundTimetable(answers, t, appColor);

    return {
      id: uid("plan"),
      type,
      title: t("schemaGeneratedTitle", { type: t(planType.title) }),
      subtitle: t("schemaStudyTimetablePlanSubtitle"),
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reminders: answers.reminders || "disabled",
      answers,
      timetable: answers.timetable,
      sourceImage: answers.scheduleImageAsset || null,
      tasks,
      progress: 0,
      insights: [
        t("schemaInsightStudyAfterSchool"),
        t("schemaInsightWeeklyReview"),
        t("schemaInsightReminder"),
      ],
      habits: [
        { id: "homework", label: t("schemaHabitHomework"), value: 0 },
        { id: "review", label: t("schemaHabitReview"), value: 0 },
        { id: "focus", label: t("schemanHabitFocus"), value: 0 },
        { id: "sleep", label: t("schemanHabitSleep"), value: 0 },
      ],
    };
  }

  const daysCount = Number(answers.daysPerWeek || answers.studyHours || 4);
  const days = activeDays(Math.min(7, Math.max(1, daysCount)));
  const from = answers.from || answers.studyTimeFrom || answers.workWindowFrom || "16:00";
  const templates = taskTemplates(type, answers, t);
  const tasks = [];

  days.forEach((day, index) => {
    const first = templates[index % templates.length];
    const second = templates[(index + 1) % templates.length];
    tasks.push(task(day, from, first[0], first[1], first[3], first[2]));
    tasks.push(task(day, addHours(from, 2), second[0], second[1], second[3], second[2]));
  });

  if (type === "study" && answers.scheduleImageName) {
    tasks.unshift(task("monday", "08:00", t("schemaTaskImportedSchedule"), t("schemaTaskImportedScheduleDesc"), appColor, "image"));
  }

  return {
    id: uid("plan"),
    type,
    title: t("schemaGeneratedTitle", { type: t(planType.title) }),
    subtitle: t(planType.subtitle),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reminders: answers.reminders || "disabled",
    answers,
    tasks,
    progress: 0,
    insights: [
      t("schemaInsightBalance"),
      t("schemaInsightRecovery"),
      t("schemaInsightReminder"),
    ],
    habits: [
      { id: "sleep", label: t("schemanHabitSleep"), value: 0 },
      { id: "water", label: t("schemanHabitWater"), value: 0 },
      { id: "focus", label: t("schemanHabitFocus"), value: 0 },
      { id: "consistency", label: t("schemanHabitConsistency"), value: 0 },
    ],
  };
}

function Header({ isDark, onBack, t }) {
  return (
    <header className={cn("sticky top-0 z-20 border-b px-4 py-4 sm:px-6", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-colors", isDark ? "text-[var(--bm-text-muted)] hover:bg-[var(--bm-bg-elevated)] hover:text-white" : "text-[var(--bm-text-secondary)] hover:bg-[var(--bm-hover-bg)] hover:text-[var(--bm-text-primary)]")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <BrandLogo showName={false} logoClassName="h-9 w-9" />
          <div>
            <h1 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("schemaPageTitle")}</h1>
            <p className={cn("hidden text-sm sm:block", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("schemaPageSubtitle")}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function NotificationBanner({ isDark, appColor, t }) {
  const [visible, setVisible] = useState(() => typeof Notification !== "undefined" && Notification.permission === "default");
  const accentText = getTextOnColor(appColor);

  if (!visible) return null;

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      toast[result === "granted" ? "success" : "error"](result === "granted" ? t("schemaNotificationsEnabled") : t("schemaNotificationsBlocked"));
      setVisible(false);
    } catch {
      toast.error(t("schemaNotificationsUnavailable"));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("mb-5 rounded-xl border p-4", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", isDark ? "bg-[var(--bm-bg-elevated)]" : "bg-[var(--bm-active-bg)]")}>
            <Bell className="h-5 w-5" style={{ color: appColor }} />
          </div>
          <div>
            <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("schemaNotificationPromptTitle")}</p>
            <p className={cn("mt-1 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("schemaNotificationPromptBody")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setVisible(false)} className={cn("rounded-xl border px-4 py-2 text-sm", isDark ? "border-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]")}>
            {t("cancel")}
          </button>
          <button type="button" onClick={requestPermission} className="rounded-xl px-4 py-2 text-sm font-medium" style={{ backgroundColor: appColor, color: accentText }}>
            {t("schemaAllowNotifications")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PlanTypeCard({ item, isDark, appColor, onClick, t }) {
  const Icon = item.icon;
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick(item.id)}
      className={cn("min-h-[190px] rounded-2xl border p-6 text-left transition-all sm:min-h-[210px]", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-elevated)] hover:border-[#466589] hover:bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border-strong)] bg-white shadow-sm shadow-slate-200/60 hover:border-[var(--bm-primary)]/40 hover:bg-[var(--bm-bg-elevated)] hover:shadow-md")}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: hexToRgba(appColor, isDark ? 0.22 : 0.12) }}>
        <Icon className="h-6 w-6" style={{ color: appColor }} />
      </div>
      <h3 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t(item.title)}</h3>
      <p className={cn("mt-3 text-sm leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t(item.subtitle)}</p>
    </motion.button>
  );
}

function EmptyCreateScreen({ isDark, appColor, onSelectType, t }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <div className={cn("mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl", isDark ? "bg-[var(--bm-bg-elevated)]" : "bg-white border border-[var(--bm-border-strong)] shadow-sm")}>
          <Sparkles className="h-6 w-6" style={{ color: appColor }} />
        </div>
        <h2 className={cn("text-3xl font-semibold tracking-tight sm:text-4xl", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("schemaCreateTitle")}</h2>
        <p className={cn("mx-auto mt-3 max-w-xl text-sm leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("schemaCreateSubtitle")}</p>
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLAN_TYPES.map((item) => <PlanTypeCard key={item.id} item={item} isDark={isDark} appColor={appColor} onClick={onSelectType} t={t} />)}
      </div>
    </div>
  );
}

function PlansDashboard({ plans, isDark, appColor, onCreate, onOpen, onDelete, onToggleActive, t }) {
  const accentText = getTextOnColor(appColor);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={cn("text-2xl font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("schemaDashboardTitle")}</h2>
          <p className={cn("mt-1 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("schemaDashboardSubtitle")}</p>
        </div>
        <Button type="button" onClick={() => onCreate()} className="rounded-xl px-4" style={{ backgroundColor: appColor, color: accentText }}>
          <Plus className="h-4 w-4" />
          {t("schemaNewPlan")}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => {
          const type = getPlanType(plan.type);
          const Icon = type.icon;
          const completed = plan.tasks.filter((taskItem) => taskItem.done).length;
          const progress = plan.tasks.length ? Math.round((completed / plan.tasks.length) * 100) : 0;
          return (
            <motion.div
              key={plan.id}
              layout
              className={cn("rounded-xl border p-5 transition-all", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white")}
            >
              <div className="flex items-start gap-4">
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", isDark ? "bg-[var(--bm-bg-elevated)]" : "bg-[var(--bm-active-bg)]")}>
                  <Icon className="h-5 w-5" style={{ color: appColor }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={cn("truncate text-base font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{plan.title}</h3>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs", plan.active ? "bg-[var(--bm-success)]/15 text-[var(--bm-success)]" : isDark ? "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-muted)]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-secondary)]")}>
                      {plan.active ? t("schemaActive") : t("schemaSavedOnly")}
                    </span>
                  </div>
                  <p className={cn("mt-1 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{plan.subtitle}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/10">
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: appColor }} />
                  </div>
                  <div className={cn("mt-3 flex flex-wrap gap-3 text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>
                    <span>{plan.tasks.length} {t("schemaTasksLower")}</span>
                    <span>{progress}% {t("schemaDoneLower")}</span>
                    <span>{plan.reminders === "disabled" ? t("schemaNoReminders") : t("schemaRemindersOn")}</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button type="button" onClick={() => onOpen(plan.id)} className="rounded-xl" style={{ backgroundColor: appColor, color: accentText }}>
                  {t("schemaOpenPlan")}
                </Button>
                <Button type="button" variant="outline" onClick={() => onToggleActive(plan.id)} className="rounded-xl">
                  {plan.active ? t("schemaPausePlan") : t("schemaRunPlan")}
                </Button>
                <Button type="button" variant="outline" onClick={() => onDelete(plan.id)} className="rounded-xl text-red-500">
                  <Trash2 className="h-4 w-4" />
                  {t("delete")}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionInput({ question, answers, setAnswers, isDark, appColor, t }) {
  const fileRef = useRef(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const accentText = getTextOnColor(appColor);
  const setValue = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));

  if (question.type === "choice") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map(([value, labelKey]) => {
          const selected = answers[question.id] === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setValue(question.id, value)}
              className={cn("rounded-xl border px-4 py-4 text-left text-sm font-medium transition-all", selected ? "" : isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)] text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)] hover:bg-[var(--bm-bg-elevated)]")}
              style={selected ? { backgroundColor: appColor, borderColor: appColor, color: accentText } : undefined}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "slider") {
    const value = Number(answers[question.id] || question.min || 1);
    return (
      <div className={cn("rounded-xl border p-5", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
        <div className="mb-5 flex items-center justify-between">
          <span className={cn("text-sm", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{question.min}</span>
          <span className="rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: appColor, color: accentText }}>{value}</span>
          <span className={cn("text-sm", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{question.max}</span>
        </div>
        <input
          type="range"
          min={question.min}
          max={question.max}
          value={value}
          onChange={(event) => setValue(question.id, Number(event.target.value))}
          className="w-full"
          style={{ accentColor: appColor }}
        />
      </div>
    );
  }

  if (question.type === "timeRange") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          type="time"
          value={answers.from || "16:00"}
          onChange={(event) => setAnswers((prev) => ({ ...prev, from: event.target.value }))}
          className="font-semibold"
        />
        <Input
          type="time"
          value={answers.to || "20:00"}
          onChange={(event) => setAnswers((prev) => ({ ...prev, to: event.target.value }))}
          className="font-semibold"
        />
      </div>
    );
  }

  if (question.type === "time") {
    return (
      <Input
        type="time"
        value={answers[question.id] || "22:30"}
        onChange={(event) => setValue(question.id, event.target.value)}
        className="font-semibold"
      />
    );
  }

  if (question.type === "schoolTimetableUpload") {
    const fileName = answers.scheduleImageName;
    const preview = answers.scheduleImagePreview;
    const timetable = answers.timetable;

    return (
      <div className="space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const previewUrl = URL.createObjectURL(file);
            setAnswers((prev) => ({
              ...prev,
              scheduleImageName: file.name,
              scheduleImagePreview: previewUrl,
            }));
            setIsAnalyzing(true);

            try {
              const result = await analyzeSchoolScheduleImage(file);
              const clarificationQuestions = result.timetable?.clarificationQuestions || [];
              setAnswers((prev) => ({
                ...prev,
                scheduleImage: file.name,
                scheduleImageName: file.name,
                scheduleImagePreview: previewUrl,
                scheduleImageAsset: result.image,
                timetable: result.timetable,
                scheduleNeedsClarification: clarificationQuestions.length > 0 || (result.timetable?.entries || []).some((entry) => entry.needsClarification),
                scheduleClarificationQuestion: clarificationQuestions[0] || "",
              }));
              toast.success(t("schemaTimetableAnalyzed"));
            } catch (error) {
              console.error("[study-timetable:analyze]", error.response?.data || error.message);
              toast.error(error.response?.data?.error?.message || error.message || t("schemaTimetableAnalyzeFailed"));
              setAnswers((prev) => ({
                ...prev,
                timetable: null,
                scheduleNeedsClarification: false,
              }));
            } finally {
              setIsAnalyzing(false);
            }
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isAnalyzing}
          className={cn("flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors disabled:opacity-70", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)] hover:bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border-strong)] bg-white hover:bg-[var(--bm-bg-elevated)]")}
        >
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", isDark ? "bg-[var(--bm-bg-elevated)]" : "bg-[var(--bm-active-bg)]")}>
            {isAnalyzing ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: appColor }} /> : <FileImage className="h-5 w-5" style={{ color: appColor }} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
              {isAnalyzing ? t("schemaAnalyzingTimetable") : fileName || t("schemaUploadSchoolSchedule")}
            </p>
            <p className={cn("mt-1 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("schemaUploadSchoolScheduleHint")}</p>
          </div>
          {preview && <img src={preview} alt="" className="h-14 w-14 rounded-xl object-cover" />}
        </button>

        {timetable?.entries?.length > 0 && (
          <div className={cn("rounded-xl border p-4", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border-strong)] bg-[var(--bm-bg-elevated)]")}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("schemaTimetableReady")}</p>
                <p className={cn("mt-1 text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                  {t("schemaTimetableReadyMeta", { count: timetable.entries.length })}
                </p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs", isDark ? "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)]" : "bg-white text-[var(--bm-text-secondary)]")}>
                {Math.round((timetable.confidence || 0) * 100)}%
              </span>
            </div>
            <MiniTimetablePreview timetable={timetable} isDark={isDark} />
            {answers.scheduleNeedsClarification && (
              <p className="mt-3 text-xs text-amber-500">{t("schemaTimetableNeedsClarification")}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (question.type === "upload" || question.type === "uploadAny") {
    const fileNameKey = `${question.id}Name`;
    const previewKey = `${question.id}Preview`;
    const fileName = answers[fileNameKey] || answers.scheduleImageName;
    const preview = answers[previewKey] || answers.scheduleImagePreview;
    const acceptsAny = question.type === "uploadAny";
    return (
      <div>
        <input
          ref={fileRef}
          type="file"
          accept={acceptsAny ? "image/*,application/pdf,.pdf,.doc,.docx,.txt" : "image/*"}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const isImage = file.type?.startsWith("image/");
            setAnswers((prev) => ({
              ...prev,
              [question.id]: file.name,
              [fileNameKey]: file.name,
              [previewKey]: isImage ? URL.createObjectURL(file) : "",
              ...(question.id === "scheduleImage" ? {
                scheduleImageName: file.name,
                scheduleImagePreview: isImage ? URL.createObjectURL(file) : "",
              } : {}),
            }));
            toast.success(t("schemaImageUploaded"));
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn("flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)] hover:bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white hover:bg-[var(--bm-bg-elevated)]")}
        >
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", isDark ? "bg-[var(--bm-bg-elevated)]" : "bg-[var(--bm-active-bg)]")}>
            {acceptsAny ? <Paperclip className="h-5 w-5" style={{ color: appColor }} /> : <FileImage className="h-5 w-5" style={{ color: appColor }} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{fileName || t(acceptsAny ? "schemaUploadAnyButton" : "schemaUploadImageButton")}</p>
            <p className={cn("mt-1 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t(acceptsAny ? "schemaUploadAnyHint" : "schemaUploadImageHint")}</p>
          </div>
          {preview && <img src={preview} alt="" className="h-14 w-14 rounded-xl object-cover" />}
        </button>
        <p className={cn("mt-3 text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{t("schemaUploadOptional")}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        type={question.type === "number" ? "number" : "text"}
        value={answers[question.id] || ""}
        onChange={(event) => setValue(question.id, event.target.value)}
        placeholder={question.placeholder || ""}
        className="pr-12 font-semibold"
      />
      {question.suffix && <span className={cn("absolute right-4 top-1/2 -translate-y-1/2 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{question.suffix}</span>}
    </div>
  );
}

function MiniTimetablePreview({ timetable, isDark }) {
  const entries = (timetable?.entries || []).slice(0, 5);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {entries.map((entry, index) => (
        <div key={`${entry.day}-${entry.startTime}-${index}`} className={cn("rounded-lg border-l-4 px-3 py-2 text-xs", isDark ? "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)]" : "bg-white text-[var(--bm-text-secondary)]")} style={{ borderLeftColor: entry.color || "var(--bm-primary)" }}>
          <span className="font-semibold">{entry.day} {entry.startTime}</span>
          <span className="mx-1">-</span>
          <span>{entry.subject}</span>
        </div>
      ))}
    </div>
  );
}

function SetupFlow({ setup, isDark, appColor, onClose, onComplete, t }) {
  const selectedType = setup?.type || "custom";
  const initialAnswers = useMemo(() => ({
    daysPerWeek: 4,
    studyHours: 2,
    mealsPerDay: 3,
    from: "16:00",
    to: "20:00",
    reminders: "10",
    ...(setup?.answers || {}),
  }), [setup]);
  const [answers, setAnswers] = useState(initialAnswers);
  const [step, setStep] = useState(0);
  const accentText = getTextOnColor(appColor);
  const flow = useMemo(() => getQuestionFlow(selectedType, answers, t), [selectedType, answers, t]);
  const visibleFlow = useMemo(() => flow.filter((item) => !answers[`${item.id}Inferred`]), [answers, flow]);
  const question = visibleFlow[Math.min(step, visibleFlow.length - 1)];
  const progress = visibleFlow.length ? ((Math.min(step, visibleFlow.length - 1) + 1) / visibleFlow.length) * 100 : 0;

  useEffect(() => {
    if (step > visibleFlow.length - 1) setStep(Math.max(0, visibleFlow.length - 1));
  }, [visibleFlow.length, step]);

  if (!question) return null;

  const goNext = () => {
    if (!isAnswered(question, answers)) {
      toast.error(t("schemaAnswerRequired"));
      return;
    }
    if (step < visibleFlow.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    onComplete(answers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        className={cn("w-full max-w-2xl overflow-hidden rounded-2xl border shadow-xl", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white")}
      >
        <div className={cn("border-b p-5", isDark ? "border-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)]")}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className={cn("text-xs font-medium uppercase tracking-[0.18em]", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{t("schemaAiSetup")}</p>
              <h2 className={cn("mt-1 text-lg font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t(getPlanType(selectedType).title)}</h2>
            </div>
            <button type="button" onClick={onClose} className={cn("flex h-8 w-8 items-center justify-center rounded-lg", isDark ? "text-[var(--bm-text-muted)] hover:bg-[var(--bm-bg-elevated)]" : "text-[var(--bm-text-secondary)] hover:bg-[var(--bm-hover-bg)]")}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className={cn("h-1 overflow-hidden rounded-full", isDark ? "bg-[var(--bm-bg-elevated)]" : "bg-[var(--bm-hover-bg)]")}>
            <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }} style={{ backgroundColor: appColor }} />
          </div>
        </div>

        <div className="p-5">
          <div className="mb-5 space-y-3">
            {answers.initialPrompt && (
              <div className={cn("ml-auto max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6", isDark ? "bg-[var(--bm-bg-elevated)] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]")}>
                {answers.initialPrompt}
              </div>
            )}
            <div className={cn("mr-auto max-w-[92%] rounded-2xl border px-4 py-3 text-sm leading-6", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)] text-[var(--bm-text-secondary)]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)]")}>
              {t("schemaAiUnderstood", { type: t(getPlanType(selectedType).title) })}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${question.id}-${step}`}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18 }}
            >
              <div className="mb-5 flex items-start gap-3">
                <div className={cn("mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", isDark ? "bg-[var(--bm-bg-elevated)]" : "bg-[var(--bm-active-bg)]")}>
                  <Sparkles className="h-4 w-4" style={{ color: appColor }} />
                </div>
                <h3 className={cn("text-xl font-semibold leading-8", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{question.title}</h3>
              </div>
              <QuestionInput question={question} answers={answers} setAnswers={setAnswers} isDark={isDark} appColor={appColor} t={t} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={cn("flex items-center justify-between border-t p-5", isDark ? "border-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)]")}>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (step === 0) {
                onClose?.();
                return;
              }
              setStep((value) => Math.max(0, value - 1));
            }}
            className="rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("back")}
          </Button>
          <Button type="button" onClick={goNext} className="rounded-xl" style={{ backgroundColor: appColor, color: accentText }}>
            {step === visibleFlow.length - 1 ? t("schemaGeneratePlan") : t("schemaNextQuestion")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function GeneratingOverlay({ open, progress, isDark, appColor, t }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("w-full max-w-md rounded-2xl border p-6 text-center shadow-xl", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white")}
      >
        <motion.div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: hexToRgba(appColor, isDark ? 0.24 : 0.12) }}
          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          <Sparkles className="h-7 w-7" style={{ color: appColor }} />
        </motion.div>
        <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("schemaBuildingTitle")}</h3>
        <p className={cn("mt-2 text-sm leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("schemaBuildingSubtitle")}</p>
        <div className={cn("mt-6 h-2 overflow-hidden rounded-full", isDark ? "bg-[var(--bm-bg-elevated)]" : "bg-[var(--bm-hover-bg)]")}>
          <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }} style={{ backgroundColor: appColor }} />
        </div>
        <p className={cn("mt-3 text-xs font-medium", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{Math.round(progress)}%</p>
      </motion.div>
    </div>
  );
}

function PlanTypePickerModal({ open, isDark, appColor, onClose, onSelectType, t }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        className={cn("w-full max-w-4xl rounded-2xl border p-5 shadow-xl", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white")}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className={cn("text-xs font-medium uppercase tracking-[0.18em]", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{t("schemaAiSetup")}</p>
            <h2 className={cn("mt-1 text-xl font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("schemaChoosePlanType")}</h2>
            <p className={cn("mt-1 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("schemaChoosePlanTypeHint")}</p>
          </div>
          <button type="button" onClick={onClose} className={cn("flex h-8 w-8 items-center justify-center rounded-lg", isDark ? "text-[var(--bm-text-muted)] hover:bg-[var(--bm-bg-elevated)]" : "text-[var(--bm-text-secondary)] hover:bg-[var(--bm-hover-bg)]")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLAN_TYPES.map((item) => (
            <PlanTypeCard key={item.id} item={item} isDark={isDark} appColor={appColor} onClick={onSelectType} t={t} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function TaskCard({ taskItem, isDark, editMode, onEdit, onDragStart }) {
  const taskText = getTextOnColor(taskItem.color);

  return (
    <motion.div
      layout
      draggable
      onDragStart={() => onDragStart(taskItem.id)}
      whileHover={{ y: -2 }}
      className={cn("group cursor-grab rounded-xl border p-3 transition-all", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)] hover:bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white hover:shadow-sm")}
      style={{ borderLeft: `3px solid ${taskItem.color}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium" style={{ backgroundColor: taskItem.color, color: taskText }}>
            <Clock3 className="h-3 w-3" />
            {taskItem.time}
          </span>
          <p className={cn("mt-2 truncate text-sm font-semibold", taskItem.done && "line-through opacity-60", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{taskItem.title}</p>
          <p className={cn("mt-1 line-clamp-2 text-xs leading-5", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{taskItem.description}</p>
        </div>
        <button type="button" onClick={() => onEdit(taskItem)} className={cn("rounded-lg p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100", isDark ? "hover:bg-[var(--bm-bg-elevated)]" : "hover:bg-[var(--bm-hover-bg)]")}>
          {editMode ? <Edit3 className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
        </button>
      </div>
    </motion.div>
  );
}

function DayColumn({ day, items, isDark, editMode, appColor, onEdit, onAddTask, onDropTask, onDragStart, t }) {
  return (
    <div onDragOver={(event) => event.preventDefault()} onDrop={() => onDropTask(day)} className={cn("min-h-[320px] rounded-xl border p-3", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={cn("text-sm font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t(`schemanDay_${day}`)}</h3>
        <span className={cn("text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.map((item) => <TaskCard key={item.id} taskItem={item} isDark={isDark} editMode={editMode} onEdit={onEdit} onDragStart={onDragStart} />)}
        {editMode && (
          <button type="button" onClick={() => onAddTask(day)} className={cn("flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm", isDark ? "border-[var(--bm-border-strong)] text-[var(--bm-text-muted)] hover:bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border-strong)] text-[var(--bm-text-secondary)] hover:bg-white")}>
            <Plus className="h-4 w-4" style={{ color: appColor }} />
            {t("schemanAddTask")}
          </button>
        )}
      </div>
    </div>
  );
}

function TaskEditor({ taskItem, isDark, appColor, onClose, onUpdate, onDelete, onDuplicate, t }) {
  if (!taskItem) return null;
  const inputClass = cn(inputClasses.compact, typeClasses.small, "font-semibold");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn("w-full max-w-md rounded-2xl border p-5 shadow-xl", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white")}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("schemanEditTask")}</h3>
          <button type="button" onClick={onClose} className={cn("rounded-lg p-2", isDark ? "hover:bg-[var(--bm-bg-elevated)]" : "hover:bg-[var(--bm-hover-bg)]")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <Input className={inputClass} value={taskItem.title} onChange={(event) => onUpdate(taskItem.id, { title: event.target.value })} />
          <Input className={inputClass} value={taskItem.description} onChange={(event) => onUpdate(taskItem.id, { description: event.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="time" className={inputClass} value={taskItem.time} onChange={(event) => onUpdate(taskItem.id, { time: event.target.value })} />
            <select value={taskItem.day} onChange={(event) => onUpdate(taskItem.id, { day: event.target.value })} className={inputClass}>
              {DAYS.map((day) => <option key={day} value={day}>{t(`schemanDay_${day}`)}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button key={color} type="button" onClick={() => onUpdate(taskItem.id, { color })} className={cn("h-8 w-8 rounded-full border-2", taskItem.color === color ? "border-white ring-2" : "border-transparent")} style={{ backgroundColor: color, "--tw-ring-color": hexToRgba(appColor, 0.5) }} />
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => onUpdate(taskItem.id, { done: !taskItem.done })} className="rounded-xl">{t("schemanMarkDone")}</Button>
          <Button type="button" variant="outline" onClick={() => onDuplicate(taskItem)} className="rounded-xl">{t("schemanDuplicate")}</Button>
          <Button type="button" variant="destructive" onClick={() => onDelete(taskItem.id)} className="col-span-2 rounded-xl">{t("delete")}</Button>
        </div>
      </motion.div>
    </div>
  );
}

function TimetableView({ timetable, isDark, appColor, onEntryClick, t }) {
  const entries = (timetable?.entries || []).filter((entry) => entry.startTime && entry.endTime);
  const days = (timetable?.days?.length ? timetable.days : DAYS.map((day) => ({
    key: day,
    label: t(`schemanDay_${day}`),
    originalLabel: t(`schemanDay_${day}`),
  }))).filter((day) => entries.some((entry) => entry.day === day.key));
  const bounds = getTimetableBounds(timetable);
  const totalMinutes = Math.max(60, bounds.end - bounds.start);
  const timelineHeight = Math.max(560, Math.min(980, totalMinutes * 1.35));
  const rowMarks = [];

  for (let mark = Math.floor(bounds.start / 30) * 30; mark <= bounds.end; mark += 30) {
    rowMarks.push(mark);
  }

  if (!entries.length) return null;

  return (
    <div className={cn("mb-6 rounded-lg border p-3", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border-strong)] bg-[var(--bm-bg-elevated)]")}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("schemaSchoolTimetable")}</h3>
          <p className={cn("mt-1 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("schemaSchoolTimetableSubtitle")}</p>
        </div>
      <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs", isDark ? "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)]" : "bg-white text-[var(--bm-text-secondary)]")}>
          {Math.round((timetable.confidence || 0) * 100)}% {t("schemaConfidence")}
        </span>
      </div>
      <div className="space-y-3 md:hidden">
        {days.map((day) => (
          <div key={day.key} className={cn("rounded-xl border p-3", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border-strong)] bg-white")}>
            <h4 className={cn("mb-2 text-sm font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{day.label}</h4>
            <div className="space-y-2">
              {entries
                .filter((entry) => entry.day === day.key)
                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                .map((entry, index) => (
                  <button
                    key={`${day.key}-${entry.startTime}-${entry.subject}-${index}`}
                    type="button"
                    onClick={() => onEntryClick(entry)}
                    className="w-full rounded-lg px-3 py-2 text-left"
                    style={{ backgroundColor: entry.color || appColor, color: getTextOnColor(entry.color || appColor) }}
                  >
                    <span className="block text-sm font-bold leading-tight">{entry.subject}</span>
                    <span className="mt-1 block text-xs font-semibold">{entry.startTime} - {entry.endTime}</span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto pb-2 md:block">
        <div
          className={cn("min-w-[960px] overflow-hidden rounded border", isDark ? "border-[#4A4A4A] bg-[var(--bm-bg-card)]" : "border-[var(--bm-text-muted)] bg-white")}
          style={{ display: "grid", gridTemplateColumns: `82px repeat(${Math.max(days.length, 1)}, minmax(150px, 1fr))` }}
        >
          <div className={cn("border-b px-2 py-2 text-center text-xs font-extrabold uppercase", isDark ? "border-[#4A4A4A] bg-[var(--bm-bg-elevated)] text-white" : "border-[var(--bm-text-muted)] bg-[var(--bm-active-bg)] text-[var(--bm-text-primary)]")}>
            {minutesToTime(bounds.start)}
          </div>
            {days.map((day) => (
              <div key={day.key} className={cn("border-b border-l px-3 py-2 text-center text-sm font-extrabold", isDark ? "border-[#4A4A4A] bg-[var(--bm-bg-elevated)] text-white" : "border-[var(--bm-text-muted)] bg-[var(--bm-active-bg)] text-[var(--bm-text-primary)]")}>
                {day.label}
              </div>
            ))}

          <div className={cn("relative", isDark ? "bg-[var(--bm-bg-card)]" : "bg-[var(--bm-bg-elevated)]")} style={{ height: timelineHeight }}>
              {rowMarks.map((mark) => {
                const isHour = mark % 60 === 0;
                return (
                <div
                  key={mark}
                  className={cn(
                    "absolute left-0 right-0 pr-2 pt-1 text-right leading-none",
                    isHour ? "border-t text-[12px] font-extrabold" : "border-t border-dashed text-[10px] font-bold",
                    isDark ? (isHour ? "border-[#4A4A4A] text-white" : "border-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)]") : (isHour ? "border-[var(--bm-border-strong)] text-[var(--bm-text-primary)]" : "border-[var(--bm-active-bg)] text-[var(--bm-text-secondary)]")
                  )}
                  style={{ top: `${((mark - bounds.start) / totalMinutes) * 100}%` }}
                >
                  {minutesToTime(mark)}
                </div>
                );
              })}
            </div>

            {days.map((day) => (
            <div key={`${day.key}-body`} className={cn("relative border-l", isDark ? "border-[#4A4A4A] bg-[var(--bm-bg-card)]" : "border-[var(--bm-text-muted)] bg-white")} style={{ height: timelineHeight }}>
                {rowMarks.map((mark) => {
                  const isHour = mark % 60 === 0;
                  return (
                  <div
                    key={mark}
                    className={cn(
                      "absolute left-0 right-0 border-t",
                      !isHour ? "border-dashed" : "",
                      isDark ? (isHour ? "border-[#4A4A4A]" : "border-[var(--bm-bg-elevated)]") : (isHour ? "border-[var(--bm-border-strong)]" : "border-[var(--bm-active-bg)]")
                    )}
                    style={{ top: `${((mark - bounds.start) / totalMinutes) * 100}%` }}
                  />
                  );
                })}
              {entries.filter((entry) => entry.day === day.key).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)).map((entry, index) => {
                  const start = timeToMinutes(entry.startTime);
                const end = Math.max(start + 10, timeToMinutes(entry.endTime));
                  const top = ((start - bounds.start) / totalMinutes) * 100;
                  const height = ((end - start) / totalMinutes) * 100;
                const isBreak = isBreakEntry(entry);
                const isMeal = isMealEntry(entry);
                const backgroundColor = isBreak
                  ? (isMeal ? (isDark ? "#4A341B" : "#FDE68A") : (isDark ? "#243647" : "#DBEAFE"))
                  : (entry.color || appColor);
                const textColor = isBreak ? (isMeal ? (isDark ? "#FFF7D6" : "#3B2500") : (isDark ? "#EAF4FF" : "#0F2F57")) : getTextOnColor(backgroundColor);

                  return (
                    <button
                      key={`${entry.day}-${entry.startTime}-${entry.subject}-${index}`}
                      type="button"
                      onClick={() => onEntryClick(entry)}
                    className={cn(
                      "absolute left-0 right-0 flex flex-col overflow-hidden border px-2 py-1 text-left transition-colors hover:z-10 hover:ring-2",
                      isBreak ? "border-dashed" : "",
                      isDark ? "border-black/30 hover:ring-white/25" : "border-white/80 hover:ring-[var(--bm-primary)]/25"
                    )}
                      style={{
                        top: `${Math.max(0, top)}%`,
                      height: `${Math.max(2.5, height)}%`,
                        backgroundColor,
                        color: textColor,
                      borderRadius: 2,
                      }}
                    >
                    <span className="block truncate text-[13px] font-extrabold leading-tight">{entry.subject}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-extrabold leading-tight">{entry.startTime} - {entry.endTime}</span>
                    {(entry.room || entry.teacher || entry.notes) && (
                      <span className="mt-0.5 block truncate text-[10px] font-bold leading-tight">
                        {[entry.room, entry.teacher, entry.notes].filter(Boolean).join(" - ")}
                      </span>
                    )}
                    </button>
                  );
                })}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function TimetableEntryModal({ entry, isDark, onClose, t }) {
  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn("w-full max-w-sm rounded-2xl border p-5 shadow-xl", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white")}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className={cn("text-xs uppercase tracking-[0.18em]", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{entry.day} · {entry.startTime} - {entry.endTime}</p>
            <h3 className={cn("mt-1 text-xl font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{entry.subject}</h3>
          </div>
          <button type="button" onClick={onClose} className={cn("rounded-lg p-2", isDark ? "hover:bg-[var(--bm-bg-elevated)]" : "hover:bg-[var(--bm-hover-bg)]")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <p className={isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]"}>{t("schemaType")}: {entry.type}</p>
          {entry.teacher && <p className={isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]"}>{t("schemaTeacher")}: {entry.teacher}</p>}
          {entry.room && <p className={isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]"}>{t("schemaRoom")}: {entry.room}</p>}
          {entry.notes && <p className={isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}>{entry.notes}</p>}
          {entry.needsClarification && <p className="text-amber-500">{t("schemaEntryNeedsClarification")}</p>}
        </div>
      </motion.div>
    </div>
  );
}

function PlanDetail({ plan, isDark, appColor, onBack, onChange, t }) {
  const [view, setView] = useState("week");
  const [activeDay, setActiveDay] = useState("monday");
  const [editMode, setEditMode] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTimetableEntry, setSelectedTimetableEntry] = useState(null);
  const [dragging, setDragging] = useState(null);
  const accentText = getTextOnColor(appColor);
  const grouped = useMemo(() => groupedTasks(plan.tasks), [plan.tasks]);
  const completed = plan.tasks.filter((item) => item.done).length;
  const progress = plan.tasks.length ? Math.round((completed / plan.tasks.length) * 100) : 0;

  const updatePlan = (patch) => onChange({ ...plan, ...patch, updatedAt: new Date().toISOString() });
  const updateTask = (taskId, patch) => {
    const nextTasks = plan.tasks.map((item) => item.id === taskId ? { ...item, ...patch } : item);
    updatePlan({ tasks: nextTasks });
    setSelectedTask((item) => item?.id === taskId ? { ...item, ...patch } : item);
  };
  const addTask = (day) => {
    const item = task(day, "09:00", t("schemanNewTask"), t("schemanNewTaskDescription"), appColor, "manual");
    updatePlan({ tasks: [...plan.tasks, item] });
    setSelectedTask(item);
  };
  const deleteTask = (taskId) => {
    updatePlan({ tasks: plan.tasks.filter((item) => item.id !== taskId) });
    setSelectedTask(null);
  };
  const duplicateTask = (item) => {
    updatePlan({ tasks: [...plan.tasks, { ...item, id: uid("task"), title: `${item.title} ${t("schemanCopySuffix")}` }] });
  };
  const dropTask = (day) => {
    if (!dragging) return;
    updateTask(dragging, { day });
    setDragging(null);
  };

  const content = (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className={cn("rounded-xl border p-5", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white")}>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button type="button" onClick={onBack} className={cn("mb-4 inline-flex items-center gap-2 text-sm", isDark ? "text-[var(--bm-text-muted)] hover:text-white" : "text-[var(--bm-text-secondary)] hover:text-[var(--bm-text-primary)]")}>
              <ArrowLeft className="h-4 w-4" />
              {t("schemaBackToPlans")}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-xs", plan.active ? "bg-[var(--bm-success)]/15 text-[var(--bm-success)]" : isDark ? "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-muted)]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-secondary)]")}>{plan.active ? t("schemaActive") : t("schemaSavedOnly")}</span>
              <span className={cn("rounded-full px-2.5 py-1 text-xs", isDark ? "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-muted)]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-secondary)]")}>{plan.reminders === "disabled" ? t("schemaNoReminders") : t("schemaRemindersOn")}</span>
            </div>
            <h2 className={cn("mt-3 text-2xl font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{plan.title}</h2>
            <p className={cn("mt-2 max-w-2xl text-sm leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("schemaPlanDetailSubtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setEditMode((value) => !value)} className="rounded-xl">{editMode ? t("schemanDoneEditing") : t("schemanEditSchedule")}</Button>
            <Button type="button" variant="outline" onClick={() => setFullScreen((value) => !value)} className="rounded-xl"><Maximize2 className="h-4 w-4" />{fullScreen ? t("schemanExitFullScreen") : t("schemanFullScreen")}</Button>
            <Button type="button" onClick={() => toast.success(t("schemaChangesSaved"))} className="rounded-xl" style={{ backgroundColor: appColor, color: accentText }}><Save className="h-4 w-4" />{t("save")}</Button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className={cn("rounded-xl border p-4", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
            <p className={cn("text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{t("schemaProgress")}</p>
            <p className={cn("mt-1 text-xl font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{progress}%</p>
          </div>
          <div className={cn("rounded-xl border p-4", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
            <p className={cn("text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{t("schemaTasksLower")}</p>
            <p className={cn("mt-1 text-xl font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{plan.tasks.length}</p>
          </div>
          <div className={cn("rounded-xl border p-4", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
            <p className={cn("text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{t("schemaActiveState")}</p>
            <p className={cn("mt-1 text-xl font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{plan.active ? t("schemaRunning") : t("schemaPaused")}</p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className={cn("inline-flex rounded-xl p-1", isDark ? "bg-[var(--bm-bg-card)]" : "bg-[var(--bm-hover-bg)]")}>
            {VIEW_MODES.map((mode) => (
              <button key={mode} type="button" onClick={() => setView(mode)} className={cn("rounded-lg px-4 py-2 text-sm transition-colors", view === mode ? "" : isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")} style={view === mode ? { backgroundColor: appColor, color: accentText } : undefined}>
                {t(`schemanView_${mode}`)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => toast.success(t("schemanExportStarted"))} className="rounded-xl"><BarChart3 className="h-4 w-4" />{t("schemanExportPdf")}</Button>
            <Button type="button" variant="outline" onClick={() => toast.success(t("schemanShareReady"))} className="rounded-xl"><Copy className="h-4 w-4" />{t("schemanSharePlan")}</Button>
            <Button type="button" variant="outline" onClick={() => toast.success(t("schemaPlanResetReady"))} className="rounded-xl"><RefreshCcw className="h-4 w-4" />{t("schemanResetPlan")}</Button>
          </div>
        </div>

        {plan.timetable?.entries?.length > 0 && (
          <TimetableView timetable={plan.timetable} isDark={isDark} appColor={appColor} onEntryClick={setSelectedTimetableEntry} t={t} />
        )}

        {view === "day" && (
          <div>
            <div className="mb-3 flex flex-wrap gap-2 pb-1 md:flex-nowrap md:overflow-x-auto">
              {DAYS.map((day) => <button key={day} type="button" onClick={() => setActiveDay(day)} className={cn("shrink-0 rounded-xl px-3 py-2 text-sm", activeDay === day ? "" : isDark ? "bg-[var(--bm-bg-card)] text-[var(--bm-text-muted)]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-secondary)]")} style={activeDay === day ? { backgroundColor: appColor, color: accentText } : undefined}>{t(`schemanDayShort_${day}`)}</button>)}
            </div>
            <DayColumn day={activeDay} items={grouped[activeDay] || []} isDark={isDark} editMode={editMode} appColor={appColor} onEdit={setSelectedTask} onAddTask={addTask} onDropTask={dropTask} onDragStart={setDragging} t={t} />
          </div>
        )}

        {view === "week" && (
          <div className="md:overflow-x-auto">
            <div className="grid grid-cols-1 gap-3 md:min-w-[980px] md:grid-cols-7">
              {DAYS.map((day) => <DayColumn key={day} day={day} items={grouped[day] || []} isDark={isDark} editMode={editMode} appColor={appColor} onEdit={setSelectedTask} onAddTask={addTask} onDropTask={dropTask} onDragStart={setDragging} t={t} />)}
            </div>
          </div>
        )}

        {view === "month" && (
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-5 lg:grid-cols-7">
            {Array.from({ length: 35 }, (_, index) => {
              const day = DAYS[index % DAYS.length];
              return (
                <div key={index} className={cn("min-h-[115px] rounded-xl border p-3", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
                  <div className="flex justify-between text-xs">
                    <span className={isDark ? "text-white" : "text-[var(--bm-text-primary)]"}>{index + 1}</span>
                    <span className={isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]"}>{t(`schemanDayShort_${day}`)}</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {(grouped[day] || []).slice(0, 2).map((item) => <button key={`${index}-${item.id}`} type="button" onClick={() => setSelectedTask(item)} className="block w-full truncate rounded-lg px-2 py-1 text-left text-xs" style={{ backgroundColor: item.color, color: getTextOnColor(item.color) }}>{item.title}</button>)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className={cn("rounded-xl border p-4", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
            <h3 className={cn("mb-3 font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("schemanHabitTracker")}</h3>
            <div className="space-y-3">
              {plan.habits.map((habit) => <div key={habit.id}><div className="mb-1 flex justify-between text-sm"><span className={isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]"}>{habit.label}</span><span className={isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}>{habit.value}%</span></div><div className={cn("h-2 rounded-full", isDark ? "bg-[var(--bm-bg-elevated)]" : "bg-[var(--bm-border)]")}><div className="h-full rounded-full" style={{ width: `${habit.value}%`, backgroundColor: appColor }} /></div></div>)}
            </div>
          </div>
          <div className={cn("rounded-xl border p-4 lg:col-span-2", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
            <h3 className={cn("mb-3 font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("schemanSmartInsights")}</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {plan.insights.map((insight) => <button key={insight} type="button" onClick={() => toast.success(t("schemanSuggestionApplied"))} className={cn("rounded-xl p-3 text-left text-sm leading-6", isDark ? "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]" : "bg-white text-[var(--bm-text-secondary)] hover:bg-[var(--bm-hover-bg)]")}><Sparkles className="mb-2 h-4 w-4" style={{ color: appColor }} />{insight}</button>)}
            </div>
          </div>
        </div>
      </div>

      <TaskEditor taskItem={selectedTask} isDark={isDark} appColor={appColor} onClose={() => setSelectedTask(null)} onUpdate={updateTask} onDelete={deleteTask} onDuplicate={duplicateTask} t={t} />
      <TimetableEntryModal entry={selectedTimetableEntry} isDark={isDark} onClose={() => setSelectedTimetableEntry(null)} t={t} />
    </div>
  );

  return fullScreen ? <div className={cn("fixed inset-0 z-40 overflow-auto", isDark ? "bg-[var(--bm-bg-app)]" : "bg-[var(--bm-bg-app)]")}>{content}</div> : content;
}

export default function SchemanPage() {
  const navigate = useNavigate();
  const { t, prefs, resolvedTheme, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "var(--bm-primary)";
  const isRTL = RTL_LANGUAGE_RE.test(uiLanguage);
  const [plans, setPlans] = useState(readPlans);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [setupDraft, setSetupDraft] = useState(null);
  const [activePlanId, setActivePlanId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  useEffect(() => {
    writePlans(plans);
  }, [plans]);

  const activePlan = plans.find((plan) => plan.id === activePlanId);

  const startCreate = (type) => {
    if (!type) {
      setTypePickerOpen(true);
      return;
    }
    setTypePickerOpen(false);
    setSetupDraft({
      type,
      answers: {},
    });
  };

  const completeFlow = (answers) => {
    const type = setupDraft?.type || "custom";
    setSetupDraft(null);
    setGenerating(true);
    setGenerationProgress(5);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setGenerationProgress(Math.min(98, Math.round(((Date.now() - startedAt) / 3600) * 100)));
    }, 120);

    window.setTimeout(() => {
      window.clearInterval(interval);
      const plan = createPlan(type, answers, t, appColor);
      setPlans((prev) => [plan, ...prev]);
      setActivePlanId(plan.id);
      setGenerationProgress(100);
      setGenerating(false);
      toast.success(t("schemaPlanCreated"));
    }, 3800);
  };

  const updatePlan = (updatedPlan) => {
    setPlans((prev) => prev.map((plan) => plan.id === updatedPlan.id ? updatedPlan : plan));
  };

  const deletePlan = (planId) => {
    setPlans((prev) => prev.filter((plan) => plan.id !== planId));
    if (activePlanId === planId) setActivePlanId(null);
    toast.success(t("schemaPlanDeleted"));
  };

  const toggleActive = (planId) => {
    setPlans((prev) => prev.map((plan) => plan.id === planId ? { ...plan, active: !plan.active } : plan));
  };

  return (
    <div
      className={cn("min-h-screen", isDark ? "bg-[var(--bm-bg-app)]" : "bg-[var(--bm-bg-app)]")}
      dir={isRTL ? "rtl" : "ltr"}
      data-schema-theme={isDark ? "dark" : "light"}
      data-testid="scheman-page"
    >
      <style>{schemaThemeCss}</style>
      <Header isDark={isDark} onBack={() => navigate("/dashboard")} t={t} />
      <main>
        <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
          <NotificationBanner isDark={isDark} appColor={appColor} t={t} />
        </div>

        {activePlan ? (
          <PlanDetail plan={activePlan} isDark={isDark} appColor={appColor} onBack={() => setActivePlanId(null)} onChange={updatePlan} t={t} />
        ) : plans.length ? (
          <PlansDashboard plans={plans} isDark={isDark} appColor={appColor} onCreate={startCreate} onOpen={setActivePlanId} onDelete={deletePlan} onToggleActive={toggleActive} t={t} />
        ) : (
          <EmptyCreateScreen isDark={isDark} appColor={appColor} onSelectType={startCreate} t={t} />
        )}
      </main>

      <AnimatePresence>
        {typePickerOpen && (
          <PlanTypePickerModal
            open={typePickerOpen}
            isDark={isDark}
            appColor={appColor}
            onClose={() => setTypePickerOpen(false)}
            onSelectType={startCreate}
            t={t}
          />
        )}
        {setupDraft && (
          <SetupFlow
            setup={setupDraft}
            isDark={isDark}
            appColor={appColor}
            onClose={() => setSetupDraft(null)}
            onComplete={completeFlow}
            t={t}
          />
        )}
      </AnimatePresence>
      <GeneratingOverlay open={generating} progress={generationProgress} isDark={isDark} appColor={appColor} t={t} />
    </div>
  );
}
