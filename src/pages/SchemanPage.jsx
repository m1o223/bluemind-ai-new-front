import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Apple,
  ArrowLeft,
  BatteryCharging,
  Bed,
  BookOpen,
  BriefcaseBusiness,
  Brush,
  Bus,
  Calendar,
  Camera,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Coffee,
  Copy,
  Droplets,
  Dumbbell,
  FileText,
  Footprints,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Leaf,
  MessageSquare,
  Mic,
  Moon,
  MoreVertical,
  Music,
  Paperclip,
  PenLine,
  Plane,
  Plus,
  RefreshCcw,
  School,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Users,
  Utensils,
  WashingMachine,
  X,
} from "lucide-react";
import { toast } from "sonner";

import BrandLogo from "@/components/BrandLogo";
import BlueMindSendButton from "@/components/BlueMindSendButton";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, interactionClasses, typeClasses } from "@/lib/interactions";
import { streamChatMessage } from "@/services/chatService";
import { analyzeScheduleDocument } from "@/services/documentService";
import { analyzeImage, getImageUrl, uploadChatImage } from "@/services/imageService";

const SCHEDULE_STORAGE_KEY = "bluemind-schedule-state-v2";
const SCHEDULE_TUTORIAL_KEY = "bluemind-schedule-tutorial-complete-v1";
const GENERATED_TEMPLATE_STORAGE_KEY = "bluemind-schedule-generated-templates-v1";
const SCHEDULE_LIBRARY_STORAGE_KEY = "bluemind-schedule-library-v1";
const ACTIVE_SCHEDULE_ID_STORAGE_KEY = "bluemind-active-schedule-id-v1";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ALIASES = {
  Monday: ["Monday", "Mon", "Mandag", "Man", "Mån", "Mån.", "Maan"],
  Tuesday: ["Tuesday", "Tue", "Tues", "Tisdag", "Tis"],
  Wednesday: ["Wednesday", "Wed", "Onsdag", "Ons"],
  Thursday: ["Thursday", "Thu", "Thur", "Thurs", "Torsdag", "Tor"],
  Friday: ["Friday", "Fri", "Fredag", "Fre"],
  Saturday: ["Saturday", "Sat", "Lordag", "Lor", "Lör", "Lör.", "Loer"],
  Sunday: ["Sunday", "Sun", "Sondag", "Son", "Sön", "Sön.", "Soen"],
};
const HOURS = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, "0")}:00`);
const DAY_END_TIME = "23:59";
const DAY_END_MINUTES = (23 * 60) + 59;
const END_TIMES = [...HOURS.slice(1), DAY_END_TIME];
const ROW_HEIGHT = 48;
const DOCUMENT_UPLOAD_ACCEPT = [
  "application/pdf",
  ".pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  ".xlsx",
  ".xls",
  "text/csv",
  ".csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  ".docx",
  ".doc",
  "text/plain",
  ".txt",
  "application/rtf",
  "text/rtf",
  ".rtf",
].join(",");
const ICON_OPTIONS = [
  "Book",
  "Study",
  "School",
  "University",
  "Pen",
  "Laptop",
  "Code",
  "Dumbbell",
  "Running",
  "Yoga",
  "Bed",
  "Moon",
  "Coffee",
  "Apple",
  "Meal",
  "Water",
  "Briefcase",
  "Meeting",
  "Calendar",
  "Clock",
  "Car",
  "Bus",
  "Shopping",
  "Cleaning",
  "Laundry",
  "Music",
  "Camera",
  "Family",
  "Health",
  "Rest",
  "Travel",
];
const SCHEDULE_COLORS = [
  { name: "Sky Blue", value: "#3BA7F5" },
  { name: "Emerald Green", value: "#34C88A" },
  { name: "Lavender Purple", value: "#9B7CF6" },
  { name: "Coral", value: "#FF7A66" },
  { name: "Soft Orange", value: "#F6A24D" },
  { name: "Rose", value: "#F472B6" },
  { name: "Mint", value: "#5ED7B7" },
  { name: "Indigo", value: "#6675F6" },
  { name: "Cyan", value: "#22C7D9" },
  { name: "Warm Yellow", value: "#F2C94C" },
  { name: "Teal", value: "#2FB7A3" },
  { name: "Deep Blue", value: "#2F6DEB" },
];
const COLOR_OPTIONS = SCHEDULE_COLORS.map((color) => color.value);
const SCHEDULE_ICON_OPTIONS = [
  { id: "Book", label: "Book", Icon: BookOpen },
  { id: "Study", label: "Study", Icon: GraduationCap },
  { id: "School", label: "School", Icon: School },
  { id: "University", label: "University", Icon: Landmark },
  { id: "Pen", label: "Pen", Icon: PenLine },
  { id: "Laptop", label: "Laptop", Icon: Laptop },
  { id: "Code", label: "Code", Icon: Code2 },
  { id: "Dumbbell", label: "Dumbbell", Icon: Dumbbell },
  { id: "Running", label: "Running", Icon: Footprints },
  { id: "Yoga", label: "Yoga", Icon: Leaf },
  { id: "Bed", label: "Bed", Icon: Bed },
  { id: "Moon", label: "Moon", Icon: Moon },
  { id: "Coffee", label: "Coffee", Icon: Coffee },
  { id: "Apple", label: "Apple", Icon: Apple },
  { id: "Meal", label: "Meal", Icon: Utensils },
  { id: "Water", label: "Water", Icon: Droplets },
  { id: "Briefcase", label: "Briefcase", Icon: BriefcaseBusiness },
  { id: "Meeting", label: "Meeting", Icon: Users },
  { id: "Calendar", label: "Calendar", Icon: Calendar },
  { id: "Clock", label: "Clock", Icon: Clock },
  { id: "Car", label: "Car", Icon: Car },
  { id: "Bus", label: "Bus", Icon: Bus },
  { id: "Shopping", label: "Shopping", Icon: ShoppingBag },
  { id: "Cleaning", label: "Cleaning", Icon: Brush },
  { id: "Laundry", label: "Laundry", Icon: WashingMachine },
  { id: "Music", label: "Music", Icon: Music },
  { id: "Camera", label: "Camera", Icon: Camera },
  { id: "Family", label: "Family", Icon: Home },
  { id: "Health", label: "Health", Icon: HeartPulse },
  { id: "Rest", label: "Rest", Icon: BatteryCharging },
  { id: "Travel", label: "Travel", Icon: Plane },
  { id: "Sparkles", label: "AI Generated", Icon: Sparkles },
];
const SCHEDULE_TEMPLATE_CATEGORIES = [
  { id: "study", title: "Study", description: "School, exams, revision, reading, and learning routines.", icon: "Study" },
  { id: "fitness", title: "Fitness", description: "Training, recovery, workouts, and daily movement.", icon: "Dumbbell" },
  { id: "work", title: "Work", description: "Teams, shifts, meetings, projects, and business operations.", icon: "Briefcase" },
  { id: "family", title: "Family", description: "Household routines, children, care, and shared planning.", icon: "Family" },
  { id: "home", title: "Home", description: "Cleaning, chores, moving, maintenance, and home projects.", icon: "Home" },
  { id: "nutrition", title: "Nutrition", description: "Meals, hydration, health goals, and food planning.", icon: "Meal" },
  { id: "finance", title: "Finance", description: "Budgets, bills, saving routines, and money reviews.", icon: "Calendar" },
  { id: "travel", title: "Travel", description: "Trips, packing, transport, itineraries, and vacations.", icon: "Travel" },
  { id: "productivity", title: "Productivity", description: "Focus blocks, habits, deep work, and planning systems.", icon: "Clock" },
  { id: "health", title: "Health", description: "Sleep, medication, appointments, recovery, and wellbeing.", icon: "Health" },
  { id: "growth", title: "Personal Growth", description: "Goals, routines, reflection, skills, and self improvement.", icon: "Leaf" },
  { id: "hobbies", title: "Hobbies", description: "Music, creative projects, photography, and practice plans.", icon: "Music" },
  { id: "events", title: "Events", description: "Weddings, parties, launches, and event preparation.", icon: "Calendar" },
  { id: "ai-generated", title: "AI Generated", description: "Reusable templates created from generic user needs.", icon: "Sparkles" },
  { id: "custom-ai", title: "Custom AI Schedule", description: "Tell BlueMind anything you want to organize.", icon: "Code" },
];

const BASE_SCHEDULE_TEMPLATES = [
  { id: "study-schedule", category: "study", title: "Study Schedule", description: "Create an intelligent study schedule.", icon: "Study", questions: ["Subject", "Exam date", "Available study hours", "Weak topics", "Revision style"] },
  { id: "exam-preparation", category: "study", title: "Exam Preparation", description: "Plan focused revision before an exam.", icon: "Book", questions: ["Exam date", "Subjects", "Weak topics", "Practice needs", "Mock test timing"] },
  { id: "university-semester", category: "study", title: "University Semester Planner", description: "Organize lectures, assignments, exams, and study blocks.", icon: "University", questions: ["Courses", "Seminar times", "Deadlines", "Exam period", "Weekly study load"] },
  { id: "homework-planner", category: "study", title: "Homework Planner", description: "Balance homework across the week.", icon: "Pen", questions: ["Subjects", "Due dates", "Difficulty", "Available time"] },
  { id: "reading-schedule", category: "study", title: "Reading Schedule", description: "Break a book or reading list into clear sessions.", icon: "Book", questions: ["Book or material", "Pages", "Deadline", "Reading speed"] },
  { id: "language-learning", category: "study", title: "Language Learning", description: "Plan vocabulary, listening, grammar, and speaking practice.", icon: "School", questions: ["Language", "Current level", "Daily time", "Practice style"] },
  { id: "coding-practice", category: "study", title: "Coding Practice", description: "Create a programming practice routine.", icon: "Code", questions: ["Language", "Goal", "Practice days", "Project type"] },
  { id: "thesis-research", category: "study", title: "Thesis / Research Planner", description: "Structure research, writing, feedback, and revisions.", icon: "Laptop", questions: ["Topic", "Deadline", "Research stage", "Writing milestones"] },
  { id: "daily-revision", category: "study", title: "Daily Revision", description: "Build a consistent daily review routine.", icon: "Clock", questions: ["Subjects", "Available time", "Weak points", "Review method"] },
  { id: "flashcard-schedule", category: "study", title: "Flashcard Schedule", description: "Plan spaced repetition sessions.", icon: "Book", questions: ["Decks", "Daily target", "Exam date", "Hard topics"] },

  { id: "gym-schedule", category: "fitness", title: "Gym Schedule", description: "Create a personalized workout schedule.", icon: "Dumbbell", questions: ["Goal", "Experience level", "Training days", "Injuries", "Equipment", "Focus areas"] },
  { id: "weight-loss", category: "fitness", title: "Weight Loss Plan", description: "Plan cardio, strength, meals, and recovery.", icon: "Running", questions: ["Goal", "Current routine", "Training days", "Meal timing"] },
  { id: "muscle-building", category: "fitness", title: "Muscle Building", description: "Organize strength training and recovery.", icon: "Dumbbell", questions: ["Experience", "Equipment", "Training split", "Recovery needs"] },
  { id: "running-program", category: "fitness", title: "Running Program", description: "Create running sessions with rest and progression.", icon: "Running", questions: ["Distance goal", "Current level", "Running days", "Injuries"] },
  { id: "walking-routine", category: "fitness", title: "Walking Routine", description: "Build a simple walking habit.", icon: "Running", questions: ["Daily steps", "Available time", "Goal", "Preferred days"] },
  { id: "swimming-training", category: "fitness", title: "Swimming Training", description: "Plan pool sessions, technique, and endurance.", icon: "Water", questions: ["Skill level", "Pool days", "Goal", "Session length"] },
  { id: "stretching-routine", category: "fitness", title: "Stretching Routine", description: "Create mobility and flexibility sessions.", icon: "Yoga", questions: ["Focus areas", "Time per day", "Pain points", "Routine style"] },
  { id: "rehabilitation-plan", category: "fitness", title: "Rehabilitation Plan", description: "Plan gentle recovery routines.", icon: "Health", questions: ["Recovery focus", "Restrictions", "Session length", "Professional guidance"] },
  { id: "sleep-schedule", category: "fitness", title: "Sleep Schedule", description: "Design a consistent sleep and wind-down routine.", icon: "Bed", questions: ["Wake time", "Bedtime goal", "Evening habits", "Sleep issues"] },
  { id: "morning-routine", category: "fitness", title: "Morning Routine", description: "Plan a calm and useful morning structure.", icon: "Coffee", questions: ["Wake time", "Must-do tasks", "Energy goal", "Available time"] },
  { id: "evening-routine", category: "fitness", title: "Evening Routine", description: "Create a wind-down and preparation routine.", icon: "Moon", questions: ["Bedtime", "Evening tasks", "Relaxation needs", "Next-day prep"] },

  { id: "work-schedule", category: "work", title: "Work Schedule", description: "Organize work hours, breaks, and tasks.", icon: "Briefcase", questions: ["Working hours", "Breaks", "Main tasks", "Meeting load"] },
  { id: "business-schedule", category: "work", title: "Business Schedule", description: "Create work and employee schedules.", icon: "Briefcase", questions: ["Employees", "Working days", "Hours", "Break duration", "Shift preferences"] },
  { id: "employee-shift", category: "work", title: "Employee Shift Planner", description: "Plan fair shifts and coverage.", icon: "Meeting", questions: ["Employees", "Roles", "Opening hours", "Coverage rules", "Breaks"] },
  { id: "team-schedule", category: "work", title: "Team Schedule", description: "Coordinate team availability and focus blocks.", icon: "Meeting", questions: ["Team members", "Meetings", "Focus blocks", "Deadlines"] },
  { id: "meeting-planner", category: "work", title: "Meeting Planner", description: "Build a meeting cadence that does not overload the week.", icon: "Calendar", questions: ["Meeting types", "Participants", "Frequency", "Focus time"] },
  { id: "project-timeline", category: "work", title: "Project Timeline", description: "Turn milestones into a weekly schedule.", icon: "Laptop", questions: ["Project goal", "Deadline", "Milestones", "Team size"] },
  { id: "startup-planner", category: "work", title: "Startup Planner", description: "Plan product, marketing, operations, and launch tasks.", icon: "Code", questions: ["Idea", "Stage", "Team", "Launch date"] },
  { id: "freelancer-schedule", category: "work", title: "Freelancer Schedule", description: "Balance client work, admin, and outreach.", icon: "Briefcase", questions: ["Clients", "Deadlines", "Admin tasks", "Outreach goals"] },
  { id: "client-management", category: "work", title: "Client Management", description: "Plan follow-ups, delivery, and communication.", icon: "Meeting", questions: ["Clients", "Follow-up frequency", "Deliverables", "Review time"] },
  { id: "content-creator", category: "work", title: "Content Creator Workflow", description: "Plan scripting, recording, editing, and publishing.", icon: "Camera", questions: ["Platforms", "Post frequency", "Production steps", "Publishing days"] },
  { id: "restaurant-schedule", category: "work", title: "Restaurant Schedule", description: "Plan opening hours, roles, peak times, and shifts.", icon: "Meal", questions: ["Opening hours", "Employees", "Roles", "Peak hours", "Breaks", "Shift rules"] },

  { id: "meal-plan", category: "nutrition", title: "Meal Plan", description: "Plan meals around goals and timing.", icon: "Meal", questions: ["Goal", "Eating style", "Allergies", "Meal count", "Budget"] },
  { id: "hydration-schedule", category: "nutrition", title: "Hydration Schedule", description: "Create simple water and meal timing routines.", icon: "Water", questions: ["Wake time", "Activity level", "Goal", "Meal times"] },
  { id: "family-routine", category: "family", title: "Family Routine", description: "Coordinate family activities and responsibilities.", icon: "Family", questions: ["Family members", "School/work times", "Tasks", "Shared routines"] },
  { id: "autism-therapy", category: "family", title: "Autism Therapy Schedule", description: "Organize therapy, sensory breaks, school routines, and daily structure.", icon: "Health", questions: ["Main focus area", "Communication practice", "Sensory breaks", "School routines", "Therapy appointments", "Daily structure"] },
  { id: "newborn-baby", category: "family", title: "Newborn Baby Routine", description: "Plan feeding, sleep, care, and parent rest blocks.", icon: "Rest", questions: ["Feeding pattern", "Sleep needs", "Appointments", "Parent support"] },
  { id: "cleaning-schedule", category: "home", title: "Cleaning Schedule", description: "Split cleaning tasks across days.", icon: "Cleaning", questions: ["Rooms", "Tasks", "Frequency", "Available time"] },
  { id: "moving-house", category: "home", title: "Moving House", description: "Plan packing, admin, transport, and moving day tasks.", icon: "Home", questions: ["Move date", "Rooms", "Helpers", "Transport", "Admin tasks"] },
  { id: "budget-review", category: "finance", title: "Budget Review", description: "Schedule bills, saving checks, and money reviews.", icon: "Calendar", questions: ["Income dates", "Bills", "Savings goal", "Review frequency"] },
  { id: "travel-itinerary", category: "travel", title: "Travel Itinerary", description: "Plan transport, activities, meals, and rest.", icon: "Travel", questions: ["Destination", "Dates", "Transport", "Activities", "Budget"] },
  { id: "deep-work", category: "productivity", title: "Deep Work Schedule", description: "Protect focus time for demanding work.", icon: "Clock", questions: ["Focus goal", "Best energy time", "Interruptions", "Deadline"] },
  { id: "medication-routine", category: "health", title: "Medication Routine", description: "Organize medication and appointment reminders.", icon: "Health", questions: ["Medication times", "Appointments", "Meals", "Notes"] },
  { id: "habit-builder", category: "growth", title: "Habit Builder", description: "Build a weekly habit system.", icon: "Leaf", questions: ["Habit", "Trigger", "Frequency", "Reward"] },
  { id: "music-practice", category: "hobbies", title: "Music Practice", description: "Plan technique, songs, and review sessions.", icon: "Music", questions: ["Instrument", "Level", "Practice days", "Goals"] },
  { id: "wedding-planner", category: "events", title: "Wedding Planner", description: "Organize planning tasks, vendors, and event timeline.", icon: "Calendar", questions: ["Date", "Venue", "Vendors", "Guest count", "Tasks"] },
];
const TUTORIAL_STEPS = [
  {
    title: "This is your weekly planner.",
    body: "The grid starts empty so you can build a clean schedule from scratch.",
  },
  {
    title: "Design manually.",
    body: "Use manual mode to add schedule blocks directly into the weekly grid.",
  },
  {
    title: "Use BlueMind AI.",
    body: "BlueMind can help you think through the schedule before activities are generated.",
  },
  {
    title: "You're ready.",
    body: "Start with an empty weekly schedule and build from here.",
  },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_ALIASES = {
  jan: 0,
  january: 0,
  januari: 0,
  feb: 1,
  february: 1,
  februari: 1,
  mar: 2,
  march: 2,
  mars: 2,
  apr: 3,
  april: 3,
  may: 4,
  maj: 4,
  jun: 5,
  june: 5,
  juni: 5,
  jul: 6,
  july: 6,
  juli: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  okt: 9,
  october: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function startOfLocalDay(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildLocalDate(year, monthIndex, day) {
  const date = new Date(year, monthIndex, day);
  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateKey(value) {
  const date = startOfLocalDay(value);
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function parseDateKey(value = "") {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return buildLocalDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function normalizeDateYear(value) {
  const year = Number(value);
  if (!Number.isFinite(year)) return null;
  if (year >= 1000) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
}

function addDays(value, amount) {
  const date = startOfLocalDay(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function getWeekdayName(value) {
  const date = startOfLocalDay(value);
  return DAYS[(date.getDay() + 6) % 7];
}

function startOfIsoWeek(value = new Date()) {
  const date = startOfLocalDay(value);
  return addDays(date, -((date.getDay() + 6) % 7));
}

function getCurrentWeekStart() {
  return startOfIsoWeek(new Date());
}

function getIsoWeekInfo(value = new Date()) {
  const date = startOfLocalDay(value);
  const dayIndex = (date.getDay() + 6) % 7;
  const thursday = addDays(date, 3 - dayIndex);
  const weekYear = thursday.getFullYear();
  const firstWeekStart = startOfIsoWeek(new Date(weekYear, 0, 4));
  const week = 1 + Math.round((startOfIsoWeek(date).getTime() - firstWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return { week, year: weekYear };
}

function formatDayMonth(value) {
  const date = startOfLocalDay(value);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

function formatWeekRange(weekStart) {
  const start = startOfIsoWeek(weekStart);
  const end = addDays(start, 6);
  const startText = start.getFullYear() === end.getFullYear()
    ? formatDayMonth(start)
    : `${formatDayMonth(start)} ${start.getFullYear()}`;
  return `${startText} - ${formatDayMonth(end)} ${end.getFullYear()}`;
}

function getWeekDays(weekStart) {
  const start = startOfIsoWeek(weekStart);
  const todayKey = toDateKey(new Date());
  return DAYS.map((weekday, index) => {
    const date = addDays(start, index);
    const dateKey = toDateKey(date);
    return {
      weekday,
      shortWeekday: weekday.slice(0, 3),
      date,
      dateKey,
      dayOfMonth: date.getDate(),
      label: `${weekday} ${formatDayMonth(date)}`,
      shortLabel: `${weekday.slice(0, 3)} ${date.getDate()}`,
      isToday: dateKey === todayKey,
    };
  });
}

function getWeekDateForDay(day, weekStart) {
  const normalizedDay = findScheduleDay(day)?.day || day;
  const index = DAYS.indexOf(normalizedDay);
  if (index === -1) return null;
  const date = addDays(startOfIsoWeek(weekStart), index);
  return {
    date,
    dateKey: toDateKey(date),
    weekday: normalizedDay,
  };
}

function parseScheduleDate(value = "", options = {}) {
  const text = String(value || "");
  if (!text.trim()) return "";

  const direct = parseDateKey(text);
  if (direct) return toDateKey(direct);

  const candidates = [];
  const pushCandidate = (year, month, day) => {
    const normalizedYear = normalizeDateYear(year);
    const monthIndex = Number(month) - 1;
    const dayNumber = Number(day);
    if (!normalizedYear || monthIndex < 0 || monthIndex > 11 || dayNumber < 1 || dayNumber > 31) return;
    const date = buildLocalDate(normalizedYear, monthIndex, dayNumber);
    if (date) candidates.push(toDateKey(date));
  };

  for (const match of text.matchAll(/\b(19\d{2}|20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    pushCandidate(match[1], match[2], match[3]);
  }

  for (const match of text.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})\b/g)) {
    pushCandidate(match[3], match[2], match[1]);
  }

  for (const match of text.matchAll(/\b(\d{8}|\d{6})\b/g)) {
    const raw = match[1];
    if (raw.length === 8) {
      pushCandidate(raw.slice(0, 4), raw.slice(4, 6), raw.slice(6, 8));
      pushCandidate(raw.slice(4, 8), raw.slice(2, 4), raw.slice(0, 2));
    } else {
      pushCandidate(raw.slice(0, 2), raw.slice(2, 4), raw.slice(4, 6));
    }
  }

  const monthPattern = Object.keys(MONTH_ALIASES).join("|");
  const dayMonthPattern = new RegExp(`\\b(\\d{1,2})\\s+(${monthPattern})\\s*(\\d{2}|\\d{4})?\\b`, "gi");
  for (const match of text.matchAll(dayMonthPattern)) {
    const inferredYear = match[3] || options.year || getIsoWeekInfo(options.fallbackWeekStart || new Date()).year;
    const monthIndex = MONTH_ALIASES[match[2].toLowerCase()];
    pushCandidate(inferredYear, monthIndex + 1, match[1]);
  }

  const monthDayPattern = new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:,)?\\s*(\\d{2}|\\d{4})?\\b`, "gi");
  for (const match of text.matchAll(monthDayPattern)) {
    const inferredYear = match[3] || options.year || getIsoWeekInfo(options.fallbackWeekStart || new Date()).year;
    const monthIndex = MONTH_ALIASES[match[1].toLowerCase()];
    pushCandidate(inferredYear, monthIndex + 1, match[2]);
  }

  return candidates[0] || "";
}

function getBlockTitle(block = {}) {
  return block.title || block.name || block.label || block.activity || "Imported activity";
}

function getBlockStart(block = {}) {
  return normalizeScheduleTime(block.startTime || block.start || block.begin || "");
}

function getBlockEnd(block = {}) {
  return normalizeScheduleTime(block.endTime || block.end || block.finish || "");
}

function normalizeScheduleBlock(block = {}, options = {}) {
  const title = cleanImportedActivityName(getBlockTitle(block)) || "Imported activity";
  const start = getBlockStart(block);
  const end = getBlockEnd(block);
  const parsedDate = parseScheduleDate(block.date || block.dateKey || block.sourceCell || "", {
    fallbackWeekStart: options.fallbackWeekStart,
  });
  const dayFromBlock = findScheduleDay(block.weekday || block.day || block.days?.[0] || "")?.day;
  const fallbackDate = !parsedDate && dayFromBlock && options.fallbackWeekStart
    ? getWeekDateForDay(dayFromBlock, options.fallbackWeekStart)?.dateKey
    : "";
  const date = parsedDate || fallbackDate;
  const dateValue = parseDateKey(date);
  const weekday = dateValue ? getWeekdayName(dateValue) : dayFromBlock || "";
  const category = String(block.category || classifyScheduleActivity(title)).toLowerCase();

  return {
    ...block,
    id: block.id || `block-${Date.now().toString(36)}-${options.index || 0}`,
    name: title,
    title,
    category,
    date,
    weekday,
    start,
    end,
    startTime: start,
    endTime: end,
    days: weekday ? [weekday] : [],
    color: block.color || getScheduleColorForActivity(title, options.index || 0),
    icon: block.icon || guessScheduleIcon(title),
  };
}

function normalizeStoredScheduleState(value) {
  const fallbackWeekStart = getCurrentWeekStart();
  return value && typeof value === "object"
    ? {
        blocks: Array.isArray(value.blocks)
          ? value.blocks
              .map((block, index) => normalizeScheduleBlock(block, { fallbackWeekStart, index }))
              .filter((block) => block.date && block.start && block.end)
          : [],
        updatedAt: value.updatedAt || "",
      }
    : { blocks: [], updatedAt: "" };
}

function readStoredScheduleState() {
  try {
    const value = JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY) || "null");
    return normalizeStoredScheduleState(value);
  } catch {
    return { blocks: [], updatedAt: "" };
  }
}

function readRawScheduleLibrary() {
  try {
    const value = JSON.parse(localStorage.getItem(SCHEDULE_LIBRARY_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeScheduleLibrary(records) {
  try {
    localStorage.setItem(SCHEDULE_LIBRARY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Local persistence is best-effort until Schedule backend storage is added.
  }
}

function getActiveScheduleId() {
  try {
    return localStorage.getItem(ACTIVE_SCHEDULE_ID_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function setActiveScheduleId(scheduleId) {
  try {
    if (scheduleId) localStorage.setItem(ACTIVE_SCHEDULE_ID_STORAGE_KEY, scheduleId);
    else localStorage.removeItem(ACTIVE_SCHEDULE_ID_STORAGE_KEY);
  } catch {
    // Active schedule tracking is local-only.
  }
}

function inferScheduleRecordName(blocks = []) {
  const names = blocks.map((block) => getBlockTitle(block)).join(" ").toLowerCase();
  if (/shift|office|meeting|work|overtime|employee|roster/.test(names)) return "Work Schedule";
  if (/math|english|science|school|class|lesson|study|homework|exam|course|lecture/.test(names)) return "School Schedule";
  if (/gym|workout|fitness|training|run|cardio/.test(names)) return "Gym Schedule";
  if (/meal|lunch|dinner|nutrition|water|snack/.test(names)) return "Nutrition Schedule";
  return "Weekly Schedule";
}

function createScheduleRecord({ name = "Weekly Schedule", blocks = [], pinned = false, source = "manual", createdAt, updatedAt } = {}) {
  const now = new Date().toISOString();
  return {
    id: `schedule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: String(name || "Weekly Schedule").trim() || "Weekly Schedule",
    blocks,
    pinned: Boolean(pinned),
    source,
    createdAt: createdAt || now,
    updatedAt: updatedAt || createdAt || now,
  };
}

function normalizeScheduleRecord(record = {}, index = 0) {
  const now = new Date().toISOString();
  const blocks = Array.isArray(record.blocks)
    ? record.blocks
        .map((block, blockIndex) => normalizeScheduleBlock(block, { fallbackWeekStart: getCurrentWeekStart(), index: blockIndex }))
        .filter((block) => block.date && block.start && block.end)
    : [];

  return {
    id: record.id || `schedule-legacy-${index}`,
    name: String(record.name || inferScheduleRecordName(blocks)).trim() || "Weekly Schedule",
    blocks,
    pinned: Boolean(record.pinned),
    source: record.source || "manual",
    createdAt: record.createdAt || record.updatedAt || now,
    updatedAt: record.updatedAt || record.createdAt || now,
  };
}

function readScheduleLibrary() {
  const records = readRawScheduleLibrary().map(normalizeScheduleRecord);
  if (records.length) return records;

  const activeState = readStoredScheduleState();
  if (!activeState.blocks.length) return [];

  const migratedRecord = createScheduleRecord({
    name: inferScheduleRecordName(activeState.blocks),
    blocks: activeState.blocks,
    source: "legacy",
    createdAt: activeState.updatedAt,
    updatedAt: activeState.updatedAt,
  });
  writeScheduleLibrary([migratedRecord]);
  setActiveScheduleId(migratedRecord.id);
  return [migratedRecord];
}

function activateScheduleRecord(record) {
  if (!record) return;
  setActiveScheduleId(record.id);
  const nextState = {
    blocks: record.blocks || [],
    updatedAt: record.updatedAt || new Date().toISOString(),
    scheduleId: record.id,
    scheduleName: record.name,
  };
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // Local persistence is best-effort until Schedule backend storage is added.
  }
}

function readScheduleState() {
  const activeId = getActiveScheduleId();
  if (activeId) {
    const activeRecord = readRawScheduleLibrary()
      .map(normalizeScheduleRecord)
      .find((record) => record.id === activeId);
    if (activeRecord) {
      return {
        blocks: activeRecord.blocks,
        updatedAt: activeRecord.updatedAt,
        scheduleId: activeRecord.id,
        scheduleName: activeRecord.name,
      };
    }
  }

  return readStoredScheduleState();
}

function writeScheduleState(state) {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(state));
    const activeId = getActiveScheduleId();
    if (!activeId) return;

    const records = readRawScheduleLibrary().map(normalizeScheduleRecord);
    const recordIndex = records.findIndex((record) => record.id === activeId);
    if (recordIndex === -1) return;

    const updatedAt = state.updatedAt || new Date().toISOString();
    records[recordIndex] = {
      ...records[recordIndex],
      blocks: Array.isArray(state.blocks) ? state.blocks : [],
      updatedAt,
    };
    writeScheduleLibrary(records);
  } catch {
    // Local persistence is best-effort until Schedule backend storage is added.
  }
}

function readGeneratedScheduleTemplates() {
  try {
    const value = JSON.parse(localStorage.getItem(GENERATED_TEMPLATE_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeGeneratedScheduleTemplates(templates) {
  try {
    localStorage.setItem(GENERATED_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Generated templates are generic local drafts until the shared template backend is connected.
  }
}

function titleCaseTemplate(value = "") {
  return String(value || "")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function inferTemplateCategory(query = "") {
  const text = query.toLowerCase();
  if (/exam|study|school|university|homework|reading|language|python|coding|research|thesis/.test(text)) return "study";
  if (/gym|fitness|run|walk|muscle|weight|yoga|sleep|marathon|training/.test(text)) return "fitness";
  if (/restaurant|employee|shift|work|business|client|startup|project|team/.test(text)) return "work";
  if (/baby|family|child|autism|therapy|caregiver|parent/.test(text)) return "family";
  if (/meal|nutrition|diet|ramadan|food/.test(text)) return "nutrition";
  if (/travel|vacation|trip/.test(text)) return "travel";
  if (/wedding|event|party|launch/.test(text)) return "events";
  if (/home|moving|clean|laundry|house/.test(text)) return "home";
  return "ai-generated";
}

function inferTemplateIcon(query = "") {
  const text = query.toLowerCase();
  if (/restaurant|meal|nutrition|food|ramadan/.test(text)) return "Meal";
  if (/autism|therapy|health|care/.test(text)) return "Health";
  if (/python|coding|program/.test(text)) return "Code";
  if (/wedding|event/.test(text)) return "Calendar";
  if (/baby|family/.test(text)) return "Family";
  if (/gym|marathon|training/.test(text)) return "Dumbbell";
  if (/travel|vacation/.test(text)) return "Travel";
  if (/moving|home|house/.test(text)) return "Home";
  if (/work|business|employee|restaurant/.test(text)) return "Briefcase";
  if (/study|exam|school|learning/.test(text)) return "Study";
  return "Sparkles";
}

function createGeneratedScheduleTemplate(query = "") {
  const cleanTitle = titleCaseTemplate(query) || "Custom AI";
  const category = inferTemplateCategory(cleanTitle);
  const title = `${cleanTitle} Schedule`;
  return {
    id: `ai-${cleanTitle.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
    category: "ai-generated",
    originCategory: category,
    title,
    description: `A reusable AI-generated template for organizing ${cleanTitle.toLowerCase()} safely and clearly.`,
    icon: inferTemplateIcon(cleanTitle),
    aiGenerated: true,
    questions: [
      "Main goal",
      "Available days",
      "Important time limits",
      "People or roles involved",
      "Required breaks",
      "What should BlueMind optimize for?",
    ],
  };
}

function buildTemplateAssistantPrompt(template) {
  const questions = Array.isArray(template.questions) ? template.questions.join(", ") : "goals, available days, times, constraints, and preferred workflow";
  return [
    `The user selected the "${template.title}" schedule template.`,
    "Start a real BlueMind AI schedule workflow for this template.",
    "Do not create a fake form. Ask intelligent follow-up questions and adapt to the user's answers.",
    `Template category: ${template.originCategory || template.category}.`,
    `Template purpose: ${template.description}`,
    `Suggested setup questions: ${questions}.`,
    "Keep the questions privacy-safe and generic. Do not store personal names, addresses, private notes, uploaded content, or exact personal schedules in any shared template.",
    "When enough context is collected, help the user build a private schedule in the Schedule workspace.",
  ].join("\n");
}

function getTextOnColor(value) {
  if (!value || !String(value).startsWith("#")) return "#FFFFFF";
  const normalized = value.replace("#", "").padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  const red = ((number >> 16) & 255) / 255;
  const green = ((number >> 8) & 255) / 255;
  const blue = (number & 255) / 255;
  const luminance = [red, green, blue]
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

  return luminance > 0.52 ? "var(--bm-text-primary)" : "#FFFFFF";
}

function getScheduleIconOption(iconId) {
  return SCHEDULE_ICON_OPTIONS.find((item) => item.id === iconId) || SCHEDULE_ICON_OPTIONS[0];
}

function timeToIndex(value) {
  const hour = Number.parseInt(String(value).slice(0, 2), 10);
  return Number.isFinite(hour) ? Math.max(0, Math.min(24, hour)) : 0;
}

function timeToMinutes(value) {
  const match = String(value || "").match(/(\d{1,2})(?::|\.)(\d{2})?/);
  if (!match) return Math.min(DAY_END_MINUTES, timeToIndex(value) * 60);
  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return Math.max(0, Math.min(DAY_END_MINUTES, hour * 60 + minute));
}

function getNextEndTime(startTime) {
  return END_TIMES[Math.min(timeToIndex(startTime), END_TIMES.length - 1)] || DAY_END_TIME;
}

function getEndTimeOptions(startTime) {
  return END_TIMES.slice(Math.min(timeToIndex(startTime), END_TIMES.length - 1));
}

function hexToRgba(value, alpha = 1) {
  if (!value || !String(value).startsWith("#")) return `rgba(37, 99, 235, ${alpha})`;
  const normalized = value.replace("#", "").padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildScheduleContext(blocks) {
  if (!blocks.length) return "The dated schedule calendar is currently empty.";
  return blocks.map((block) => (
    `- ${getBlockTitle(block)}: ${block.date || "no date"} ${block.weekday || block.days?.join(", ") || ""} ${getBlockStart(block)} to ${getBlockEnd(block)}`
  )).join("\n");
}

function buildSchedulePrompt({ messages, latestText, blocks, selectedWeekStart, initial = false }) {
  const recentContext = messages
    .slice(-8)
    .map((message) => `${message.role === "assistant" ? "BlueMind" : "User"}: ${message.content}`)
    .join("\n");
  const weekStart = selectedWeekStart || getCurrentWeekStart();
  const weekInfo = getIsoWeekInfo(weekStart);
  const weekDays = getWeekDays(weekStart);

  return [
    "You are BlueMind AI inside the Schedule feature.",
    "Use the same real BlueMind AI reasoning style as the main chat, but focus only on helping the user design a dated weekly calendar.",
    "Do not behave like a form. Understand answers, ask follow-up questions, detect missing information, recommend improvements, and explain why.",
    "When a schedule image, PDF, spreadsheet, Word document, or screenshot is uploaded, first understand the schedule type, week number, real dates, weekdays, times, activities, breaks, repeated activities, and whether it looks official or personal.",
    "For timetable images, inspect every date/day column and every time row. Never summarize only the first day. Preserve date/day/time/activity mapping exactly.",
    "When extraction text contains SCHEDULE_IMPORT lines, treat them as the authoritative layout map for importing into the dated grid.",
    "SCHEDULE_IMPORT lines should use this date-aware format when possible: SCHEDULE_IMPORT: 2026-07-27 | Monday | 06:45 | 16:00 | Work.",
    "Official schedules such as school timetables, university timetables, company shift schedules, and employer-provided schedules should be imported exactly as provided. Do not suggest changing official schedules unless the user asks.",
    "Personal schedules such as gym plans, meal plans, personal study plans, travel plans, and daily routines should be discussed first. Ask the goal, compare the schedule with that goal, and ask before suggesting improvements.",
    "If the schedule purpose is unclear, ask: What is this schedule for? Offer examples such as School, University, Work, Gym, Weight loss, Meal plan, Study plan, Travel, Business, and Personal routine.",
    "If the user refuses improvements, respect that and import the schedule as provided.",
    "For school schedules, use short block labels such as MA, BI, PH, EN, SW, HI, AR, PE, and BR.",
    "Ask concise, useful questions based on what the user wants to build.",
    "",
    `Selected calendar week: Week ${weekInfo.week}, ${formatWeekRange(weekStart)}.`,
    `Visible dates: ${weekDays.map((day) => `${day.weekday} ${day.dateKey}`).join(", ")}.`,
    `Current schedule blocks:\n${buildScheduleContext(blocks)}`,
    recentContext ? `Conversation so far:\n${recentContext}` : "Conversation so far: none.",
    initial
      ? (latestText || "Start the conversation now with a friendly opener. Ask what kind of schedule the user wants to build.")
      : `Current user message: ${latestText}`,
  ].filter(Boolean).join("\n\n");
}

function formatScheduleFileSize(size) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeScheduleTime(value) {
  const match = String(value || "").match(/(\d{1,2})(?::|\.)(\d{2})|(\d{1,2})/);
  if (!match) return "";
  const hour = Number(match[1] ?? match[3]);
  const minute = Number(match[2] ?? 0);
  if (!Number.isFinite(hour) || hour < 0 || hour > 24) return "";
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return "";
  if (hour === 24 && minute === 0) return DAY_END_TIME;
  if (hour === 24) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function abbreviateScheduleName(name = "") {
  const text = String(name || "").trim();
  const lower = text.toLowerCase();
  const known = [
    [/mathematics|maths|math\b|matte|matematik/i, "Math"],
    [/english|engelska/i, "Eng"],
    [/science|naturkunskap/i, "Sci"],
    [/swedish|svenska/i, "Swe"],
    [/biology|biologi/i, "Bio"],
    [/physics|fysik/i, "Phys"],
    [/chemistry|kemi/i, "Chem"],
    [/history|historia/i, "Hist"],
    [/geography|geografi/i, "Geo"],
    [/sport|pe|idrott|gymnastik/i, "PE"],
    [/homework|assignment/i, "Homework"],
    [/lunch|meal/i, "Lunch"],
    [/break|rest|rast|pause/i, "Break"],
    [/morning shift/i, "Morning"],
    [/evening shift/i, "Evening"],
    [/night shift/i, "Night"],
    [/shift|work shift/i, "Shift"],
    [/meeting/i, "Meeting"],
    [/overtime/i, "Overtime"],
    [/office/i, "Office"],
  ];
  const match = known.find(([pattern]) => pattern.test(lower));
  if (match) return match[1];
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
  return text.length > 8 ? text.slice(0, 3).toUpperCase() : text;
}

function classifyScheduleActivity(activity = "") {
  const text = activity.toLowerCase();
  if (/break|rest|rast|pause/.test(text)) return "break";
  if (/math|english|science|biology|chemistry|physics|history|geography|swedish|school|class|lesson|study|homework|exam|course|lecture|seminar/.test(text)) return "education";
  if (/shift|office|meeting|work|overtime|employee|roster|standup|client|project/.test(text)) return "work";
  if (/gym|workout|fitness|training|run|cardio|sport|pe|yoga/.test(text)) return "fitness";
  if (/meal|food|breakfast|lunch|dinner|nutrition|water|snack/.test(text)) return "nutrition";
  if (/doctor|therapy|health|medicine|appointment/.test(text)) return "health";
  if (/clean|laundry|home|chores/.test(text)) return "home";
  if (/travel|flight|train|bus|commute|drive/.test(text)) return "travel";
  return "personal";
}

function getScheduleColorForActivity(activity = "", fallbackIndex = 0) {
  const category = classifyScheduleActivity(activity);
  const colorByCategory = {
    education: "#3BA7F5",
    work: "#6675F6",
    fitness: "#34C88A",
    nutrition: "#F6A24D",
    break: "#F2C94C",
    health: "#F472B6",
    home: "#5ED7B7",
    travel: "#22C7D9",
    personal: "#9B7CF6",
  };
  return colorByCategory[category] || COLOR_OPTIONS[fallbackIndex % COLOR_OPTIONS.length];
}

function guessScheduleIcon(activity = "") {
  const text = activity.toLowerCase();
  if (/sleep|nap|bed/i.test(text)) return "Bed";
  if (/rest|recover|break/i.test(text)) return "Rest";
  if (/gym|workout|train|cardio|run|fitness/i.test(text)) return "Dumbbell";
  if (/meal|food|breakfast|lunch|dinner|nutrition/i.test(text)) return "Apple";
  if (/water|drink|hydrate/i.test(text)) return "Water";
  if (/meeting|standup|team/i.test(text)) return "Meeting";
  if (/work|business|shift|office|overtime|roster/i.test(text)) return "Briefcase";
  if (/code|program|software|debug/i.test(text)) return "Code";
  if (/university|college|lecture|seminar/i.test(text)) return "University";
  if (/school|class|lesson|teacher/i.test(text)) return "School";
  if (/study|read|math|physics|chemistry|biology|science|english|history|geography|homework|exam/i.test(text)) return "Study";
  if (/drive|car|commute/i.test(text)) return "Car";
  if (/bus|transit/i.test(text)) return "Bus";
  if (/clean/i.test(text)) return "Cleaning";
  if (/laundry/i.test(text)) return "Laundry";
  return "Calendar";
}

function classifyScheduleText(text) {
  const content = String(text || "").toLowerCase();
  const officialScore = [
    /school timetable|class schedule|lesson schedule|university timetable|course schedule|veckoschema|schema/,
    /shift schedule|work roster|employee schedule|company schedule|arbetsschema/,
    /teacher|classroom|period|semester|department|employer|manager|klass|lektion|lÃ¤rare|larare/,
  ].filter((pattern) => pattern.test(content)).length;
  const personalScore = [
    /gym|workout|meal plan|weight loss|routine|personal|habit|diet|nutrition|fitness/,
    /my plan|daily routine|study plan|travel plan|sleep better|build muscle/,
  ].filter((pattern) => pattern.test(content)).length;

  if (officialScore > personalScore && officialScore > 0) return "official";
  if (personalScore > officialScore && personalScore > 0) return "personal";
  return "unclear";
}

function isAffirmativeText(text = "") {
  return /\b(yes|yeah|yep|sure|ok|okay|go ahead|improve|please|do it)\b/i.test(text);
}

function isNegativeText(text = "") {
  return /\b(no|nope|don't|do not|dont|skip|just import|import as is|as provided)\b/i.test(text);
}

function classifyPurposeText(text = "") {
  const content = String(text || "").toLowerCase();
  if (/school|university|college|class|course|work|company|shift|employer|business/.test(content)) return "official";
  if (/gym|weight|meal|nutrition|diet|fitness|study plan|personal|routine|travel|sleep|health/.test(content)) return "personal";
  return "unclear";
}

function normalizeImportedBlocks(blocks, classification = "unclear", options = {}) {
  void classification;
  const fallbackWeekStart = options.fallbackWeekStart || getCurrentWeekStart();
  const colorByName = new Map();
  return blocks.map((block, index) => {
    const normalizedBlock = normalizeScheduleBlock(block, { fallbackWeekStart, index });
    const sourceName = getBlockTitle(block);
    const displayName = abbreviateScheduleName(normalizedBlock.name);
    const colorKey = displayName.toLowerCase();
    if (!colorByName.has(colorKey)) {
      colorByName.set(colorKey, getScheduleColorForActivity(sourceName || displayName, colorByName.size));
    }
    return {
      ...normalizedBlock,
      name: displayName,
      title: displayName,
      category: normalizedBlock.category || classifyScheduleActivity(sourceName),
      color: colorByName.get(colorKey),
      icon: block.icon || guessScheduleIcon(sourceName || displayName),
    };
  }).filter((block) => block.date && block.start && block.end);
}

function escapeScheduleRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripScheduleMarkdown(value = "") {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/[*_`#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeScheduleComparable(value = "") {
  return stripScheduleMarkdown(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.]/g, "")
    .toLowerCase()
    .trim();
}

function findScheduleDay(value = "") {
  const text = String(value || "");
  for (const day of DAYS) {
    for (const alias of DAY_ALIASES[day]) {
      const pattern = new RegExp(`(^|[^A-Za-z])(${escapeScheduleRegex(alias)})(?=$|[^A-Za-z])`, "i");
      const match = text.match(pattern);
      if (match) return { day, matchText: match[2] };
    }
  }

  const comparable = normalizeScheduleComparable(text);
  for (const day of DAYS) {
    if (DAY_ALIASES[day].some((alias) => comparable === normalizeScheduleComparable(alias))) {
      return { day, matchText: text };
    }
  }

  return null;
}

function parseScheduleTimeRange(value = "") {
  const matches = String(value || "").matchAll(/(\d{1,2}(?::|\.)?\d{0,2})\s*(?:[-\u2013\u2014]|to|until|till)\s*(\d{1,2}(?::|\.)?\d{0,2})/gi);
  for (const match of matches) {
    const start = normalizeScheduleTime(match[1]);
    const end = normalizeScheduleTime(match[2]);
    if (start && end && timeToMinutes(end) > timeToMinutes(start)) {
      return { start, end, text: match[0] };
    }
  }
  return null;
}

function cleanImportedActivityName(value = "") {
  return stripScheduleMarkdown(value)
    .replace(/^schedule_import\s*:?\s*/i, "")
    .replace(/\b(19\d{2}|20\d{2})[-/.]\d{1,2}[-/.]\d{1,2}\b/g, "")
    .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.](\d{2}|\d{4})\b/g, "")
    .replace(/\b(?:\d{6}|\d{8})\b/g, "")
    .replace(/\bweek\s*\d{1,2}\b/gi, "")
    .replace(/^\W+|\W+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

function splitScheduleTableLine(line = "") {
  return String(line || "")
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => stripScheduleMarkdown(cell));
}

function isScheduleTableSeparator(cells = []) {
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(String(cell || "").replace(/\s/g, "")));
}

function getDateFromDayOrDate({ day, date, fallbackWeekStart }) {
  const parsedDate = parseScheduleDate(date || "", { fallbackWeekStart });
  if (parsedDate) {
    const dateValue = parseDateKey(parsedDate);
    return {
      date: parsedDate,
      weekday: dateValue ? getWeekdayName(dateValue) : day,
    };
  }

  if (day && fallbackWeekStart) {
    const dateInfo = getWeekDateForDay(day, fallbackWeekStart);
    if (dateInfo) return { date: dateInfo.dateKey, weekday: dateInfo.weekday };
  }

  return { date: "", weekday: day || "" };
}

function parseScheduleImportCells(cells = [], options = {}) {
  if (!cells.length) return null;
  const fallbackWeekStart = options.fallbackWeekStart || getCurrentWeekStart();
  const dateIndex = cells.findIndex((cell) => parseScheduleDate(cell, { fallbackWeekStart }));
  const dayIndex = cells.findIndex((cell) => findScheduleDay(cell));
  const rangeIndex = cells.findIndex((cell) => parseScheduleTimeRange(cell));
  const usedIndexes = new Set();
  const day = dayIndex >= 0 ? findScheduleDay(cells[dayIndex])?.day : "";
  const date = dateIndex >= 0 ? parseScheduleDate(cells[dateIndex], { fallbackWeekStart }) : "";
  let start = "";
  let end = "";

  if (dateIndex >= 0) usedIndexes.add(dateIndex);
  if (dayIndex >= 0) usedIndexes.add(dayIndex);

  if (rangeIndex >= 0) {
    const range = parseScheduleTimeRange(cells[rangeIndex]);
    start = range?.start || "";
    end = range?.end || "";
    usedIndexes.add(rangeIndex);
  } else {
    const timeCells = cells
      .map((cell, index) => ({ index, time: usedIndexes.has(index) ? "" : normalizeScheduleTime(cell) }))
      .filter((cell) => cell.time);
    const [startCell, endCell] = timeCells;
    start = startCell?.time || "";
    end = endCell?.time || "";
    if (startCell) usedIndexes.add(startCell.index);
    if (endCell) usedIndexes.add(endCell.index);
  }

  if (!start || !end || timeToMinutes(end) <= timeToMinutes(start)) return null;

  const dateInfo = getDateFromDayOrDate({ day, date, fallbackWeekStart });
  const name = cells
    .filter((_cell, index) => !usedIndexes.has(index))
    .join(" ");

  return {
    day: dateInfo.weekday || day,
    date: dateInfo.date,
    start,
    end,
    name,
  };
}

function parseScheduleBlocksFromText(text, options = {}) {
  const content = String(text || "");
  if (!content.trim()) return [];

  const blocks = [];
  const seen = new Set();
  const classification = options.classification || classifyScheduleText(content);
  const fallbackWeekStart = options.fallbackWeekStart || getCurrentWeekStart();

  const addBlock = ({ day, date, start, end, name, category }, index) => {
    if (!day || !start || !end || timeToMinutes(end) <= timeToMinutes(start)) return;
    const dateInfo = getDateFromDayOrDate({ day, date, fallbackWeekStart });
    if (!dateInfo.date) return;
    const cleanName = cleanImportedActivityName(name) || "Imported activity";
    const key = `${dateInfo.date}|${start}|${end}|${cleanName.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    blocks.push({
      id: `imported-${Date.now().toString(36)}-${blocks.length}-${index}`,
      name: cleanName,
      title: cleanName,
      category: category || classifyScheduleActivity(cleanName),
      date: dateInfo.date,
      weekday: dateInfo.weekday,
      start,
      end,
      startTime: start,
      endTime: end,
      days: [dateInfo.weekday],
      color: COLOR_OPTIONS[blocks.length % COLOR_OPTIONS.length],
      icon: guessScheduleIcon(cleanName),
    });
  };

  const lines = content
    .split(/\n|;|\r/)
    .map((line) => line.trim())
    .filter(Boolean);

  const tableLines = lines.filter((line) => line.includes("|"));
  tableLines.forEach((line, lineIndex) => {
    if (!/^schedule_import\s*:/i.test(line)) return;
    const cells = splitScheduleTableLine(line.replace(/^schedule_import\s*:?\s*/i, ""));
    const parsed = parseScheduleImportCells(cells, { fallbackWeekStart });
    if (parsed) addBlock(parsed, `import-${lineIndex}`);
  });

  tableLines.forEach((line, headerIndex) => {
    const headerCells = splitScheduleTableLine(line);
    if (isScheduleTableSeparator(headerCells)) return;
    const dayColumns = headerCells
      .map((cell, index) => {
        const day = findScheduleDay(cell)?.day;
        const date = parseScheduleDate(cell, { fallbackWeekStart });
        const dateValue = parseDateKey(date);
        const weekday = dateValue ? getWeekdayName(dateValue) : day;
        return {
          index,
          day: weekday,
          date: date || (weekday ? getWeekDateForDay(weekday, fallbackWeekStart)?.dateKey : ""),
        };
      })
      .filter((cell) => cell.day && cell.date);
    if (dayColumns.length < 2) return;

    for (let rowIndex = headerIndex + 1; rowIndex < tableLines.length; rowIndex += 1) {
      const rowCells = splitScheduleTableLine(tableLines[rowIndex]);
      if (isScheduleTableSeparator(rowCells)) continue;
      const timeCellIndex = rowCells.findIndex((cell) => parseScheduleTimeRange(cell));
      if (timeCellIndex === -1) {
        const nextHeaderDays = rowCells.filter((cell) => findScheduleDay(cell)).length;
        if (nextHeaderDays >= 2) break;
        continue;
      }
      const range = parseScheduleTimeRange(rowCells[timeCellIndex]);
      if (!range) continue;

      dayColumns.forEach(({ index, day, date }) => {
        const rawActivity = rowCells[index] || "";
        const activityParts = rawActivity
          .split(/\n|\/{2,}| {2,}/)
          .map((item) => cleanImportedActivityName(item))
          .filter(Boolean);
        activityParts.forEach((name, partIndex) => {
          addBlock({ day, date, start: range.start, end: range.end, name }, `table-${rowIndex}-${index}-${partIndex}`);
        });
      });
    }
  });

  lines.forEach((line, index) => {
    const dayMatch = findScheduleDay(line);
    const date = parseScheduleDate(line, { fallbackWeekStart });
    const range = parseScheduleTimeRange(line);
    const dayFromDate = date ? getWeekdayName(parseDateKey(date)) : "";
    if ((!dayMatch && !dayFromDate) || !range) return;

    const name = line
      .replace(dayMatch?.matchText || "", "")
      .replace(date || "", "")
      .replace(range.text, "");
    addBlock({ day: dayMatch?.day || dayFromDate, date, start: range.start, end: range.end, name }, `line-${index}`);
  });

  return normalizeImportedBlocks(blocks.slice(0, 168), classification, { fallbackWeekStart });
}

function resolveCommandDate(value = "", fallbackWeekStart = getCurrentWeekStart()) {
  const date = parseScheduleDate(value, { fallbackWeekStart });
  if (date) return date;

  const day = findScheduleDay(value)?.day;
  if (!day) return "";
  return getWeekDateForDay(day, fallbackWeekStart)?.dateKey || "";
}

function resolveCommandDateRange(value = "", fallbackWeekStart = getCurrentWeekStart()) {
  const text = String(value || "");
  const toIndex = text.toLowerCase().lastIndexOf(" to ");
  if (toIndex === -1) {
    return {
      fromDate: resolveCommandDate(text, fallbackWeekStart),
      toDate: "",
      beforeTo: text,
      afterTo: "",
    };
  }

  const beforeTo = text.slice(0, toIndex);
  const afterTo = text.slice(toIndex + 4);
  return {
    fromDate: resolveCommandDate(beforeTo, fallbackWeekStart),
    toDate: resolveCommandDate(afterTo, fallbackWeekStart),
    beforeTo,
    afterTo,
  };
}

function inferScheduleCommandTarget(value = "") {
  const text = String(value || "").toLowerCase();
  const targets = [
    { pattern: /\b(work|job|office|overtime)\b/, title: "Work", category: "work", term: "work" },
    { pattern: /\b(shift|morning shift|evening shift|night shift)\b/, title: "Shift", category: "work", term: "shift" },
    { pattern: /\b(meeting|standup)\b/, title: "Meeting", category: "work", term: "meeting" },
    { pattern: /\b(math|mathematics)\b/, title: "Math", category: "education", term: "math" },
    { pattern: /\b(english|eng)\b/, title: "Eng", category: "education", term: "english" },
    { pattern: /\b(science|biology|chemistry|physics|history|geography|swedish|class|lesson|lecture|study|homework)\b/, title: "Study", category: "education", term: "study" },
    { pattern: /\b(gym|workout|training|run|fitness)\b/, title: "Gym", category: "fitness", term: "gym" },
    { pattern: /\b(lunch|meal|breakfast|dinner|snack)\b/, title: "Lunch", category: "nutrition", term: "lunch" },
    { pattern: /\b(break|rest|pause|rast)\b/, title: "Break", category: "break", term: "break" },
    { pattern: /\b(doctor|therapy|medication|medicine|appointment)\b/, title: "Appointment", category: "health", term: "appointment" },
    { pattern: /\b(cleaning|clean|laundry|chores)\b/, title: "Cleaning", category: "home", term: "cleaning" },
    { pattern: /\b(travel|flight|train|bus|trip)\b/, title: "Travel", category: "travel", term: "travel" },
  ];
  return targets.find((target) => target.pattern.test(text)) || null;
}

function cleanScheduleCommandTitle(value = "") {
  return cleanImportedActivityName(String(value || "")
    .replace(/\b(add|create|schedule|please|my|an|a|the|event|activity|on|at|from|to|for|rename|delete|remove|move|change|set|update|duplicate|copy|clear)\b/gi, " ")
    .replace(/\d{1,2}(?::|\.)\d{2}/g, " ")
    .replace(/\s+/g, " "));
}

function inferScheduleCommandTitle(value = "", fallback = "Event") {
  const target = inferScheduleCommandTarget(value);
  if (target?.title) return target.title;
  const cleanTitle = cleanScheduleCommandTitle(value);
  return cleanTitle || fallback;
}

function blockMatchesScheduleTarget(block, target) {
  if (!target) return true;
  const title = getBlockTitle(block).toLowerCase();
  const category = String(block.category || classifyScheduleActivity(title)).toLowerCase();
  return category === target.category || title.includes(target.term) || title.includes(target.title.toLowerCase());
}

function findScheduleCommandMatches(blocks = [], { date = "", target = null, range = null, weekStart = null } = {}) {
  const weekDateKeys = weekStart ? new Set(getWeekDays(weekStart).map((day) => day.dateKey)) : null;
  return blocks.filter((block) => {
    if (date && block.date !== date) return false;
    if (!date && weekDateKeys && !weekDateKeys.has(block.date)) return false;
    if (!blockMatchesScheduleTarget(block, target)) return false;
    if (range) {
      const blockStart = getBlockStart(block);
      const blockEnd = getBlockEnd(block);
      return blockStart === range.start && blockEnd === range.end;
    }
    return true;
  });
}

function resolveSingleScheduleCommandMatch(blocks, criteria, actionLabel) {
  const matches = findScheduleCommandMatches(blocks, criteria);
  if (matches.length === 1) return { block: matches[0], message: "" };
  if (!matches.length) return { block: null, message: `I could not find a matching event to ${actionLabel}.` };
  return { block: null, message: `I found ${matches.length} matching events. Please include the exact time or event name so I do not change the wrong one.` };
}

function findScheduleCommandOverlap(blocks = [], candidate = {}, ignoredId = "") {
  const date = candidate.date;
  const start = timeToMinutes(candidate.startTime || candidate.start);
  const end = timeToMinutes(candidate.endTime || candidate.end);
  if (!date || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  return blocks.find((block) => {
    if (block.id === ignoredId || block.date !== date) return false;
    const blockStart = timeToMinutes(getBlockStart(block));
    const blockEnd = timeToMinutes(getBlockEnd(block));
    return blockStart < end && blockEnd > start;
  }) || null;
}

function getScheduleCommandOverlapMessage(candidate, overlap) {
  const date = candidate.date || overlap?.date || "that day";
  const start = candidate.startTime || candidate.start || "";
  const end = candidate.endTime || candidate.end || "";
  return `That would overlap with ${getBlockTitle(overlap)} on ${date}${start && end ? ` from ${start} to ${end}` : ""}. Please give a different time or tell me which event to move first.`;
}

function buildScheduleCommandBlock({ title, date, start, end, colorIndex = 0 }) {
  const dateValue = parseDateKey(date);
  const weekday = dateValue ? getWeekdayName(dateValue) : "";
  const category = classifyScheduleActivity(title);
  return normalizeScheduleBlock({
    id: `ai-command-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: title,
    title,
    category,
    date,
    weekday,
    start,
    end,
    startTime: start,
    endTime: end,
    days: weekday ? [weekday] : [],
    color: getScheduleColorForActivity(title, colorIndex),
    icon: guessScheduleIcon(title),
  }, { fallbackWeekStart: startOfIsoWeek(dateValue || new Date()), index: colorIndex });
}

function updateScheduleCommandBlock(block, updates = {}) {
  const nextTitle = updates.title || getBlockTitle(block);
  const nextDate = updates.date || block.date;
  const dateValue = parseDateKey(nextDate);
  const weekday = dateValue ? getWeekdayName(dateValue) : block.weekday;
  const nextCategory = updates.category || block.category || classifyScheduleActivity(nextTitle);
  const nextStart = updates.start || getBlockStart(block);
  const nextEnd = updates.end || getBlockEnd(block);
  return {
    ...block,
    ...updates,
    name: nextTitle,
    title: nextTitle,
    category: nextCategory,
    date: nextDate,
    weekday,
    start: nextStart,
    end: nextEnd,
    startTime: nextStart,
    endTime: nextEnd,
    days: weekday ? [weekday] : [],
    color: updates.color || block.color || getScheduleColorForActivity(nextTitle),
    icon: updates.icon || block.icon || guessScheduleIcon(nextTitle),
  };
}

function buildScheduleCommandResult(text, blocks = [], selectedWeekStart = getCurrentWeekStart()) {
  const command = String(text || "").trim();
  if (!command) return { handled: false };
  const lower = command.toLowerCase();
  const range = parseScheduleTimeRange(command);
  const target = inferScheduleCommandTarget(command);
  const date = resolveCommandDate(command, selectedWeekStart);
  const isExplicitCommand = /\b(add|create|delete|remove|cancel|move|reschedule|rename|change|update|set|duplicate|copy|clear)\b/.test(lower);
  const isScheduleAddCommand = /\bschedule\b/.test(lower) && Boolean(range) && Boolean(date || findScheduleDay(command));
  if (!isExplicitCommand && !isScheduleAddCommand) return { handled: false };

  const weekStartForDate = date ? startOfIsoWeek(parseDateKey(date)) : selectedWeekStart;
  const selectedWeekDateKeys = new Set(getWeekDays(weekStartForDate).map((day) => day.dateKey));

  if (/\bclear\b/.test(lower) && /\bweek\b/.test(lower)) {
    const nextBlocks = blocks.filter((block) => !selectedWeekDateKeys.has(block.date));
    const removed = blocks.length - nextBlocks.length;
    if (!removed) return { handled: true, status: "needs_clarification", message: "This week is already clear." };
    return { handled: true, status: "applied", blocks: nextBlocks, focusDate: toDateKey(weekStartForDate), message: `Cleared ${removed} event${removed === 1 ? "" : "s"} from this week.`, toast: "Week cleared." };
  }

  if (/\bclear\b/.test(lower) && (date || findScheduleDay(command))) {
    const dayDate = date || resolveCommandDate(command, selectedWeekStart);
    const nextBlocks = blocks.filter((block) => block.date !== dayDate);
    const removed = blocks.length - nextBlocks.length;
    if (!removed) return { handled: true, status: "needs_clarification", message: "That day is already clear." };
    return { handled: true, status: "applied", blocks: nextBlocks, focusDate: dayDate, message: `Cleared ${removed} event${removed === 1 ? "" : "s"} from ${dayDate}.`, toast: "Day cleared." };
  }

  if (/\b(add|create|schedule)\b/.test(lower) && !/\b(delete|remove|move|rename|duplicate|copy|clear)\b/.test(lower)) {
    if (!date || !range) {
      return { handled: true, status: "needs_clarification", message: "Please include a real date and start/end time, for example: Add work on January 4 from 07:00 to 14:00." };
    }
    const title = inferScheduleCommandTitle(command, "Event");
    const newBlock = buildScheduleCommandBlock({ title, date, start: range.start, end: range.end, colorIndex: blocks.length });
    const overlap = findScheduleCommandOverlap(blocks, newBlock);
    if (overlap) {
      return { handled: true, status: "needs_clarification", message: getScheduleCommandOverlapMessage(newBlock, overlap) };
    }
    return {
      handled: true,
      status: "applied",
      blocks: [...blocks, newBlock],
      focusDate: date,
      message: `Added ${newBlock.title} on ${date} from ${newBlock.startTime} to ${newBlock.endTime}.`,
      toast: "Event added.",
    };
  }

  if (/\b(delete|remove|cancel)\b/.test(lower)) {
    const { block, message } = resolveSingleScheduleCommandMatch(blocks, { date, target, range, weekStart: date ? null : selectedWeekStart }, "delete");
    if (!block) return { handled: true, status: "needs_clarification", message };
    return {
      handled: true,
      status: "applied",
      blocks: blocks.filter((item) => item.id !== block.id),
      focusDate: block.date,
      message: `Deleted ${getBlockTitle(block)} on ${block.date}.`,
      toast: "Event deleted.",
    };
  }

  if (/\b(move|reschedule)\b/.test(lower)) {
    const moveDates = resolveCommandDateRange(command, selectedWeekStart);
    const fromDate = moveDates.fromDate || date;
    const toDate = moveDates.toDate;
    if (!toDate) return { handled: true, status: "needs_clarification", message: "Please include the new real date or weekday for the move." };
    const moveTarget = inferScheduleCommandTarget(moveDates.beforeTo) || target;
    const { block, message } = resolveSingleScheduleCommandMatch(blocks, { date: fromDate, target: moveTarget, weekStart: fromDate ? null : selectedWeekStart }, "move");
    if (!block) return { handled: true, status: "needs_clarification", message };
    const nextRange = parseScheduleTimeRange(moveDates.afterTo);
    const movedBlock = updateScheduleCommandBlock(block, { date: toDate, start: nextRange?.start, end: nextRange?.end });
    const overlap = findScheduleCommandOverlap(blocks, movedBlock, block.id);
    if (overlap) {
      return { handled: true, status: "needs_clarification", message: getScheduleCommandOverlapMessage(movedBlock, overlap) };
    }
    const nextBlocks = blocks.map((item) => item.id === block.id
      ? movedBlock
      : item);
    return {
      handled: true,
      status: "applied",
      blocks: nextBlocks,
      focusDate: toDate,
      message: `Moved ${getBlockTitle(block)} to ${toDate}${nextRange ? ` from ${nextRange.start} to ${nextRange.end}` : ""}.`,
      toast: "Event moved.",
    };
  }

  if (/\b(duplicate|copy)\b/.test(lower)) {
    const copyDates = resolveCommandDateRange(command, selectedWeekStart);
    const sourceDate = copyDates.fromDate || date;
    const targetDate = copyDates.toDate || sourceDate;
    const { block, message } = resolveSingleScheduleCommandMatch(blocks, { date: sourceDate, target, range, weekStart: sourceDate ? null : selectedWeekStart }, "duplicate");
    if (!block) return { handled: true, status: "needs_clarification", message };
    const duplicate = updateScheduleCommandBlock({
      ...block,
      id: `ai-command-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    }, { date: targetDate });
    const overlap = findScheduleCommandOverlap(blocks, duplicate);
    if (overlap) {
      return { handled: true, status: "needs_clarification", message: getScheduleCommandOverlapMessage(duplicate, overlap) };
    }
    return {
      handled: true,
      status: "applied",
      blocks: [...blocks, duplicate],
      focusDate: targetDate,
      message: `Duplicated ${getBlockTitle(block)}${targetDate ? ` to ${targetDate}` : ""}.`,
      toast: "Event duplicated.",
    };
  }

  if (/\brename\b/.test(lower)) {
    const split = command.match(/\bto\s+(.+)$/i);
    const newTitle = cleanImportedActivityName(split?.[1] || "");
    if (!newTitle) return { handled: true, status: "needs_clarification", message: "What should I rename it to?" };
    const beforeTo = split ? command.slice(0, split.index) : command;
    const renameDate = resolveCommandDate(beforeTo, selectedWeekStart) || date;
    const renameTarget = inferScheduleCommandTarget(beforeTo) || target;
    const { block, message } = resolveSingleScheduleCommandMatch(blocks, { date: renameDate, target: renameTarget, weekStart: renameDate ? null : selectedWeekStart }, "rename");
    if (!block) return { handled: true, status: "needs_clarification", message };
    const nextBlocks = blocks.map((item) => item.id === block.id ? updateScheduleCommandBlock(item, { title: newTitle, category: classifyScheduleActivity(newTitle), icon: guessScheduleIcon(newTitle) }) : item);
    return { handled: true, status: "applied", blocks: nextBlocks, focusDate: block.date, message: `Renamed ${getBlockTitle(block)} to ${newTitle}.`, toast: "Event renamed." };
  }

  if (/\b(change|update|set)\b/.test(lower)) {
    const categoryMatch = lower.match(/\b(?:category|type)\b.*\bto\s+([a-z ]+)$/i);
    const nextRange = range;
    if (categoryMatch) {
      const categoryText = categoryMatch[1] || "";
      const nextCategory = classifyScheduleActivity(categoryText);
      const { block, message } = resolveSingleScheduleCommandMatch(blocks, { date, target, weekStart: date ? null : selectedWeekStart }, "change the category for");
      if (!block) return { handled: true, status: "needs_clarification", message };
      const nextTitle = getBlockTitle(block);
      const nextBlocks = blocks.map((item) => item.id === block.id ? updateScheduleCommandBlock(item, { category: nextCategory, color: getScheduleColorForActivity(categoryText), icon: guessScheduleIcon(categoryText || nextTitle) }) : item);
      return { handled: true, status: "applied", blocks: nextBlocks, focusDate: block.date, message: `Changed ${nextTitle} to ${nextCategory}.`, toast: "Category updated." };
    }

    if (nextRange) {
      const { block, message } = resolveSingleScheduleCommandMatch(blocks, { date, target, weekStart: date ? null : selectedWeekStart }, "change the time for");
      if (!block) return { handled: true, status: "needs_clarification", message };
      const updatedBlock = updateScheduleCommandBlock(block, { start: nextRange.start, end: nextRange.end });
      const overlap = findScheduleCommandOverlap(blocks, updatedBlock, block.id);
      if (overlap) {
        return { handled: true, status: "needs_clarification", message: getScheduleCommandOverlapMessage(updatedBlock, overlap) };
      }
      const nextBlocks = blocks.map((item) => item.id === block.id ? updatedBlock : item);
      return { handled: true, status: "applied", blocks: nextBlocks, focusDate: block.date, message: `Changed ${getBlockTitle(block)} to ${nextRange.start}-${nextRange.end}.`, toast: "Time updated." };
    }

    const commandDates = resolveCommandDateRange(command, selectedWeekStart);
    if (commandDates.toDate) {
      const { block, message } = resolveSingleScheduleCommandMatch(blocks, { date: commandDates.fromDate || date, target, weekStart: commandDates.fromDate || date ? null : selectedWeekStart }, "change the date for");
      if (!block) return { handled: true, status: "needs_clarification", message };
      const updatedBlock = updateScheduleCommandBlock(block, { date: commandDates.toDate });
      const overlap = findScheduleCommandOverlap(blocks, updatedBlock, block.id);
      if (overlap) {
        return { handled: true, status: "needs_clarification", message: getScheduleCommandOverlapMessage(updatedBlock, overlap) };
      }
      const nextBlocks = blocks.map((item) => item.id === block.id ? updatedBlock : item);
      return { handled: true, status: "applied", blocks: nextBlocks, focusDate: commandDates.toDate, message: `Changed ${getBlockTitle(block)} to ${commandDates.toDate}.`, toast: "Date updated." };
    }
  }

  return { handled: false };
}

async function extractReadableFileText(file) {
  const raw = await file.text().catch(() => "");
  return raw
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 9000);
}

function getScheduleDocumentType(file) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (type.includes("spreadsheet") || type.includes("excel") || /\.(xlsx|xls)$/.test(name)) return "Spreadsheet";
  if (type.includes("word") || /\.(docx|doc)$/.test(name)) return "Word";
  if (type.includes("csv") || name.endsWith(".csv")) return "CSV";
  if (type.includes("rtf") || name.endsWith(".rtf")) return "RTF";
  if (type.startsWith("text/") || /\.(txt|md|tsv)$/.test(name)) return "Text";
  return "";
}

function isSupportedScheduleDocument(file) {
  return Boolean(getScheduleDocumentType(file));
}

function getAttachmentKindLabel(attachment) {
  if (attachment.type === "image") return "Image";
  return attachment.documentType || (attachment.type === "pdf" ? "PDF" : "Document");
}

function ScheduleButton({ children, active = false, appColor, accentText, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-2xl px-4 font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        iconClasses.iconText,
        typeClasses.small,
        active ? "text-white shadow-[0_12px_30px_rgba(25,59,104,0.20)]" : interactionClasses.control,
        className,
      )}
      style={active ? { backgroundColor: appColor, color: accentText } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

function WeeklyGrid({ isDark, appColor, blocks, weekDays, editMode, onAddCell, onRequestDelete }) {
  const lineClass = isDark ? "border-white/[0.07]" : "border-[var(--bm-border)]";
  const headerBg = isDark ? "bg-white/[0.045]" : "bg-[var(--bm-bg-elevated)]";
  const cellBg = isDark ? "bg-transparent" : "bg-white";
  const getCellSegments = (dateInfo, hour) => {
    const cellStart = timeToMinutes(hour);
    const cellEnd = Math.min(cellStart + 60, DAY_END_MINUTES);
    const cellDuration = Math.max(1, cellEnd - cellStart);
    return blocks
      .filter((block) => {
        const blockStart = timeToMinutes(block.start);
        const blockEnd = timeToMinutes(block.end);
        return block.date === dateInfo.dateKey && blockStart < cellEnd && blockEnd > cellStart;
      })
      .map((block) => {
        const blockStart = timeToMinutes(block.start);
        const blockEnd = timeToMinutes(block.end);
        const segmentStart = Math.max(blockStart, cellStart);
        const segmentEnd = Math.min(blockEnd, cellEnd);
        const duration = Math.max(1, segmentEnd - segmentStart);
        return {
          block,
          duration,
          cellDuration,
          offset: Math.max(0, segmentStart - cellStart),
          isFirst: blockStart >= cellStart && blockStart < cellEnd,
          startsInside: blockStart > cellStart,
          endsInside: blockEnd < cellEnd,
        };
      })
      .sort((a, b) => timeToMinutes(a.block.start) - timeToMinutes(b.block.start));
  };

  return (
    <section className={cn("h-full overflow-hidden rounded-[28px] border shadow-sm", isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
      <div className="flex h-full flex-col">
        <div className={cn("grid grid-cols-[76px_repeat(7,minmax(116px,1fr))] border-b", lineClass, headerBg)}>
          <div className={cn("sticky left-0 z-40 flex h-14 items-center justify-center border-r font-bold", typeClasses.small, lineClass, headerBg, "text-[var(--bm-text-muted)]")}>Time</div>
          {weekDays.map((dayInfo) => (
            <div
              key={dayInfo.dateKey}
              className={cn(
                "flex h-14 flex-col items-center justify-center border-r px-3 text-center font-extrabold last:border-r-0",
                typeClasses.small,
                lineClass,
                dayInfo.isToday ? "relative" : "",
                isDark ? "text-white" : "text-[var(--bm-text-primary)]",
              )}
              style={dayInfo.isToday ? { boxShadow: `inset 0 3px 0 ${appColor}` } : undefined}
            >
              <span>{dayInfo.shortWeekday} {dayInfo.dayOfMonth}</span>
              <span className={cn("mt-0.5 font-bold", typeClasses.small, dayInfo.isToday ? "text-[var(--bm-primary)]" : "text-[var(--bm-text-muted)]")}>
                {MONTH_NAMES[dayInfo.date.getMonth()]}{dayInfo.isToday ? " - Today" : ""}
              </span>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div
            className="grid min-w-[900px] grid-cols-[76px_repeat(7,minmax(116px,1fr))]"
            style={{ gridTemplateRows: `repeat(${HOURS.length}, ${ROW_HEIGHT}px)` }}
          >
            {HOURS.map((hour) => (
              <div key={`time-${hour}`} className="contents">
                <div className={cn(
                  "sticky left-0 z-20 flex items-start justify-center border-b border-r pt-2 font-semibold",
                  typeClasses.small,
                  lineClass,
                  isDark ? "bg-[var(--bm-bg-card)]" : "bg-white",
                  "text-[var(--bm-text-muted)]",
                )}>
                  <span>{hour}</span>
                </div>
                {weekDays.map((dayInfo) => {
                  const segments = getCellSegments(dayInfo, hour);
                  const occupied = segments.length > 0;
                  return (
                    <div
                      key={`${dayInfo.dateKey}-${hour}`}
                      aria-label={`${dayInfo.label} ${hour}`}
                      className={cn(
                        "relative border-b border-r last:border-r-0",
                        lineClass,
                        !occupied && (dayInfo.isToday ? (isDark ? "bg-white/[0.03]" : "bg-[var(--bm-bg-elevated)]") : cellBg),
                        occupied && "overflow-hidden",
                      )}
                    >
                      {editMode && !occupied && (
                      <button
                        type="button"
                        onClick={() => onAddCell(dayInfo, hour)}
                        className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bm-primary)] text-white opacity-80 shadow-sm transition hover:opacity-100"
                        aria-label={`Add activity on ${dayInfo.label} at ${hour}`}
                      >
                        <Plus className="h-3 w-3 stroke-[3]" />
                      </button>
                      )}
                      {occupied && (
                        <div className="absolute inset-0">
                          {segments.map(({ block, duration, cellDuration, offset, isFirst, startsInside, endsInside }) => {
                            const ScheduleIcon = getScheduleIconOption(block.icon).Icon;
                            const activityTextColor = getTextOnColor(block.color);
                            const segmentTop = `${(offset / cellDuration) * 100}%`;
                            const segmentHeight = `${(duration / cellDuration) * 100}%`;
                            return (
                              <div
                                key={`${block.id}-${dayInfo.dateKey}-${hour}`}
                                className={cn(
                                  "group absolute left-0.5 right-0.5 flex min-h-[12px] min-w-0 items-center px-2",
                                  isFirst ? "justify-between gap-1.5" : "justify-center",
                                  startsInside ? "rounded-t-xl" : "rounded-t-md",
                                  endsInside ? "rounded-b-xl" : "rounded-b-md",
                                )}
                                style={{
                                  top: segmentTop,
                                  height: segmentHeight,
                                  background: `linear-gradient(135deg, ${hexToRgba(block.color, isDark ? 0.84 : 0.76)}, ${hexToRgba(block.color, isDark ? 0.72 : 0.62)})`,
                                  color: activityTextColor,
                                }}
                              >
                                {isFirst ? (
                                  <>
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <ScheduleIcon className="h-3.5 w-3.5 shrink-0 stroke-[2.4]" aria-hidden="true" />
                                      <span className={cn("truncate font-extrabold leading-tight", typeClasses.small)}>{block.name}</span>
                                    </div>
                                    {editMode && (
                                      <button
                                        type="button"
                                        onClick={() => onRequestDelete(block)}
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/25 text-base font-black leading-none text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/40"
                                        aria-label={`Delete ${block.name}`}
                                      >
                                        -
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <ScheduleIcon className="h-3.5 w-3.5 stroke-[2.4]" aria-hidden="true" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BlockModal({ isDark, appColor, accentText, weekDays, initialDay, initialDate, initialStart, onClose, onSave }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState(initialStart || "00:00");
  const [end, setEnd] = useState(getNextEndTime(initialStart || "00:00"));
  const [dateKeys, setDateKeys] = useState(() => {
    if (initialDate) return [initialDate];
    if (initialDay) {
      const match = (weekDays || []).find((day) => day.weekday === initialDay);
      return match ? [match.dateKey] : [];
    }
    return [];
  });
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [singleSlot, setSingleSlot] = useState(true);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const selectedIconOption = getScheduleIconOption(icon);
  const SelectedIcon = selectedIconOption.Icon;
  const nextEndTime = getNextEndTime(start);
  const visibleWeekDays = weekDays || getWeekDays(getCurrentWeekStart());

  const toggleDate = (dateKey) => {
    setDateKeys((current) => current.includes(dateKey) ? current.filter((item) => item !== dateKey) : [...current, dateKey]);
  };

  useEffect(() => {
    if (singleSlot || timeToMinutes(end) <= timeToMinutes(start)) {
      setEnd(nextEndTime);
    }
  }, [end, nextEndTime, singleSlot, start]);

  const save = () => {
    if (!name.trim()) {
      toast.error("Activity name is required.");
      return;
    }
    if (!dateKeys.length) {
      toast.error("Select at least one date.");
      return;
    }
    const finalEnd = singleSlot ? nextEndTime : end;
    if (timeToMinutes(finalEnd) <= timeToMinutes(start)) {
      toast.error("End time must be after start time.");
      return;
    }

    const title = name.trim();
    const selectedDates = visibleWeekDays.filter((day) => dateKeys.includes(day.dateKey));
    onSave(selectedDates.map((dateInfo, index) => ({
      id: `block-${Date.now().toString(36)}-${index}`,
      name: title,
      title,
      category: classifyScheduleActivity(title),
      date: dateInfo.dateKey,
      weekday: dateInfo.weekday,
      start,
      end: finalEnd,
      startTime: start,
      endTime: finalEnd,
      days: [dateInfo.weekday],
      color,
      icon,
    })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn("w-full max-w-xl rounded-[30px] border p-5 shadow-2xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]")}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className={cn("font-extrabold tracking-tight", typeClasses.sectionTitle)}>Create Schedule Block</h2>
          <button type="button" onClick={onClose} className={cn("rounded-full p-2", interactionClasses.control)} aria-label="Close block form">
            <X className={iconClasses.button} />
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className={cn("font-bold", typeClasses.small)}>Activity name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Sleep, Study, Gym..." className={cn(inputClasses.base, "h-12 rounded-2xl px-4 font-semibold")} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>Start time</span>
              <select value={start} onChange={(event) => setStart(event.target.value)} className={cn(inputClasses.base, "h-12 rounded-2xl px-4 font-semibold")}>
                {HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            </label>
            <div className="grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>Use only this time slot?</span>
              <div className={cn("grid h-12 grid-cols-2 gap-1 rounded-2xl border p-1", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
                {[
                  { label: "Yes", value: true },
                  { label: "No", value: false },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSingleSlot(item.value)}
                    className={cn("rounded-xl font-extrabold transition-all duration-200", typeClasses.small, singleSlot === item.value ? "text-white shadow-sm" : "text-[var(--bm-text-secondary)] hover:text-[var(--bm-text-primary)]")}
                    style={singleSlot === item.value ? { backgroundColor: appColor, color: accentText } : undefined}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className={cn("font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
                {singleSlot ? `${start} - ${nextEndTime}` : "Choose a longer time range below."}
              </span>
            </div>
          </div>

          {!singleSlot && (
            <label className="grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>End time</span>
              <select value={end} onChange={(event) => setEnd(event.target.value)} className={cn(inputClasses.base, "h-12 rounded-2xl px-4 font-semibold")}>
                {getEndTimeOptions(start).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            </label>
          )}

          <div className="grid gap-2">
            <span className={cn("font-bold", typeClasses.small)}>Dates this week</span>
            <div className="flex flex-wrap gap-2">
              {visibleWeekDays.map((dayInfo) => (
                <button
                  key={dayInfo.dateKey}
                  type="button"
                  onClick={() => toggleDate(dayInfo.dateKey)}
                  className={cn("rounded-full px-3 py-2 font-bold", typeClasses.small, dateKeys.includes(dayInfo.dateKey) ? "text-white" : interactionClasses.control)}
                  style={dateKeys.includes(dayInfo.dateKey) ? { backgroundColor: appColor, color: accentText } : undefined}
                >
                  {dayInfo.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>Color</span>
              <div className="grid grid-cols-6 gap-2">
                {SCHEDULE_COLORS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setColor(item.value)}
                    className={cn(
                      "group relative h-10 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5",
                      color === item.value ? "border-white shadow-md ring-2 ring-[var(--bm-primary)]" : isDark ? "border-white/[0.10]" : "border-[var(--bm-border)]",
                    )}
                    style={{ backgroundColor: item.value }}
                    aria-label={`Use ${item.name}`}
                    title={item.name}
                  >
                    {color === item.value && (
                      <Check className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 stroke-[3] text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>Icon</span>
              <button
                type="button"
                onClick={() => setIconPickerOpen((value) => !value)}
                className={cn(
                  "flex h-12 items-center justify-between gap-3 rounded-2xl border px-4 font-extrabold transition-all duration-200",
                  isDark ? "border-white/[0.08] bg-white/[0.045] text-white hover:bg-white/[0.07]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] text-[var(--bm-text-primary)] hover:bg-white",
                )}
                aria-expanded={iconPickerOpen}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <SelectedIcon className="h-5 w-5 shrink-0 stroke-[2.4]" />
                  <span className="truncate">{selectedIconOption.label}</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", iconPickerOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {iconPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className={cn("absolute left-0 right-0 top-[76px] z-20 max-h-64 overflow-y-auto rounded-2xl border p-2 shadow-xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)]" : "border-[var(--bm-border)] bg-white")}
                  >
                    <div className="grid grid-cols-2 gap-1.5">
                      {SCHEDULE_ICON_OPTIONS.map((item) => {
                        const Icon = item.Icon;
                        const selected = icon === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setIcon(item.id);
                              setIconPickerOpen(false);
                            }}
                            className={cn(
                              "flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left font-bold transition-all duration-200",
                              typeClasses.small,
                              selected ? "text-white" : interactionClasses.menuItem,
                            )}
                            style={selected ? { backgroundColor: appColor, color: accentText } : undefined}
                          >
                            <Icon className="h-4 w-4 shrink-0 stroke-[2.4]" />
                            <span className="truncate">{item.label}</span>
                            {selected && <Check className="ml-auto h-4 w-4 shrink-0 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          className={cn("mt-6 h-12 w-full rounded-2xl font-extrabold shadow-[0_12px_30px_rgba(25,59,104,0.20)]", typeClasses.body)}
          style={{ backgroundColor: appColor, color: accentText }}
        >
          Save
        </button>
      </motion.div>
    </div>
  );
}

function DeleteActivityDialog({ isDark, appColor, accentText, activity, onCancel, onDelete }) {
  if (!activity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn("w-full max-w-sm rounded-[28px] border p-6 shadow-2xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]")}
      >
        <h3 className={cn("font-extrabold tracking-tight", typeClasses.sectionTitle)}>Delete activity?</h3>
        <p className={cn("mt-3 font-semibold leading-7", typeClasses.body, "text-[var(--bm-text-secondary)]")}>
          Are you sure you want to delete this activity?
        </p>
        <p className={cn("mt-3 rounded-2xl px-4 py-3 font-extrabold", typeClasses.body, isDark ? "bg-white/[0.06]" : "bg-[var(--bm-bg-elevated)]")}>
          {activity.name}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={cn("rounded-2xl px-4 py-3 font-bold", typeClasses.small, interactionClasses.control)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onDelete(activity)}
            className={cn("rounded-2xl px-5 py-3 font-bold text-white shadow-[0_12px_30px_rgba(220,38,38,0.22)]", typeClasses.small)}
            style={{ backgroundColor: "var(--bm-error)", color: "#FFFFFF" }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ScheduleTypeDialog({ isDark, appColor, accentText, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [generatedTemplates, setGeneratedTemplates] = useState(readGeneratedScheduleTemplates);
  const normalizedQuery = query.trim().toLowerCase();
  const allTemplates = useMemo(() => [...BASE_SCHEDULE_TEMPLATES, ...generatedTemplates], [generatedTemplates]);
  const visibleTemplates = useMemo(() => {
    if (!normalizedQuery) return activeCategory ? allTemplates.filter((template) => template.category === activeCategory) : [];
    return allTemplates.filter((template) => (
      [template.title, template.description, template.category, ...(template.questions || [])]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    ));
  }, [activeCategory, allTemplates, normalizedQuery]);
  const categoryCounts = useMemo(() => {
    const counts = {};
    allTemplates.forEach((template) => {
      counts[template.category] = (counts[template.category] || 0) + 1;
      if (template.originCategory) counts[template.originCategory] = (counts[template.originCategory] || 0) + 1;
    });
    return counts;
  }, [allTemplates]);
  const activeCategoryInfo = SCHEDULE_TEMPLATE_CATEGORIES.find((category) => category.id === activeCategory);
  const noSearchResults = Boolean(normalizedQuery) && visibleTemplates.length === 0;

  const selectTemplate = (template) => {
    onSelect({
      ...template,
      assistantPrompt: buildTemplateAssistantPrompt(template),
    });
  };

  const createAiTemplate = () => {
    const template = createGeneratedScheduleTemplate(query);
    const nextTemplates = [template, ...generatedTemplates].slice(0, 50);
    setGeneratedTemplates(nextTemplates);
    writeGeneratedScheduleTemplates(nextTemplates);
    setQuery(template.title);
    setActiveCategory("ai-generated");
    toast.success(`${template.title} template created.`);
  };

  const renderTemplateCard = (template) => {
    const Icon = getScheduleIconOption(template.icon).Icon;
    return (
      <button
        key={template.id}
        type="button"
        onClick={() => selectTemplate(template)}
        className={cn(
          "group rounded-[24px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
          isDark ? "border-white/[0.08] bg-white/[0.045] hover:bg-white/[0.07]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] hover:bg-white",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_12px_26px_rgba(25,59,104,0.18)]"
            style={{ backgroundColor: appColor, color: accentText }}
          >
            <Icon className={iconClasses.card} />
          </span>
          {template.aiGenerated && (
            <span className={cn("rounded-full px-2.5 py-1 font-extrabold", typeClasses.small, isDark ? "bg-white/[0.08] text-white" : "bg-white text-[var(--bm-text-secondary)]")}>
              AI
            </span>
          )}
        </div>
        <span className={cn("mt-4 block font-extrabold", typeClasses.cardTitle)}>{template.title}</span>
        <span className={cn("mt-2 block font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-secondary)]")}>{template.description}</span>
      </button>
    );
  };

  const renderCategoryCard = (category) => {
    const Icon = getScheduleIconOption(category.icon).Icon;
    const isCustom = category.id === "custom-ai";
    return (
      <button
        key={category.id}
        type="button"
        onClick={() => {
          if (isCustom) {
            const template = createGeneratedScheduleTemplate("Custom AI");
            selectTemplate({
              ...template,
              title: "Custom AI Schedule",
              description: "BlueMind asks what you want to organize and builds a custom workflow.",
              questions: ["What do you want to organize?", "Important dates", "Available time", "Constraints", "Success goal"],
            });
            return;
          }
          setActiveCategory(category.id);
          setQuery("");
        }}
        className={cn(
          "group rounded-[24px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
          isDark ? "border-white/[0.08] bg-white/[0.045] hover:bg-white/[0.07]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] hover:bg-white",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_12px_26px_rgba(25,59,104,0.18)]"
            style={{ backgroundColor: appColor, color: accentText }}
          >
            <Icon className={iconClasses.card} />
          </span>
          {!isCustom && (
            <span className={cn("rounded-full px-2.5 py-1 font-extrabold", typeClasses.small, isDark ? "bg-white/[0.08] text-white" : "bg-white text-[var(--bm-text-secondary)]")}>
              {categoryCounts[category.id] || 0}
            </span>
          )}
        </div>
        <span className={cn("mt-4 block font-extrabold", typeClasses.cardTitle)}>{category.title}</span>
        <span className={cn("mt-2 block font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-secondary)]")}>{category.description}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn("flex h-[86vh] w-full max-w-5xl flex-col rounded-[30px] border p-5 shadow-2xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]")}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={cn("font-bold uppercase tracking-[0.16em]", typeClasses.small, "text-[var(--bm-text-muted)]")}>Create Custom Schedule</p>
            <h2 className={cn("mt-1 font-extrabold tracking-tight", typeClasses.sectionTitle)}>Schedule Template Gallery</h2>
          </div>
          <button type="button" onClick={onClose} className={cn("rounded-full p-2", interactionClasses.control)} aria-label="Close schedule type selection">
            <X className={iconClasses.button} />
          </button>
        </div>

        <div className={cn("bm-search-shell mt-5 flex h-12 items-center gap-3 rounded-2xl border px-4", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
          <Search className="h-5 w-5 shrink-0 text-[var(--bm-text-muted)]" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveCategory(null);
            }}
            placeholder="Search schedules..."
            className={cn("bm-search-input h-full min-w-0 flex-1 bg-transparent font-semibold outline-none", typeClasses.body, isDark ? "text-white placeholder:text-[var(--bm-text-muted)]" : "text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-secondary)]")}
          />
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
          {activeCategory && !normalizedQuery && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setActiveCategory(null)} className={cn("rounded-2xl px-4 py-2.5 font-bold", typeClasses.small, interactionClasses.control)}>
                Back
              </button>
              <p className={cn("min-w-0 truncate font-extrabold", typeClasses.cardTitle)}>{activeCategoryInfo?.title || "Templates"}</p>
            </div>
          )}

          {normalizedQuery ? (
            <>
              {visibleTemplates.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleTemplates.map(renderTemplateCard)}
                </div>
              )}
              {noSearchResults && (
                <div className={cn("rounded-[24px] border p-6 text-center", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
                  <Sparkles className="mx-auto h-9 w-9 text-[var(--bm-primary)]" />
                  <h3 className={cn("mt-4 font-extrabold", typeClasses.cardTitle)}>We couldn't find a template for "{query}".</h3>
                  <p className={cn("mx-auto mt-2 max-w-lg font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-secondary)]")}>
                    Would you like BlueMind AI to create a reusable, privacy-safe schedule template for this idea?
                  </p>
                  <div className="mt-5 flex justify-center gap-3">
                    <button type="button" onClick={createAiTemplate} className={cn("rounded-2xl px-5 py-3 font-extrabold text-white", typeClasses.small)} style={{ backgroundColor: appColor, color: accentText }}>
                      Yes, create it
                    </button>
                    <button type="button" onClick={() => setQuery("")} className={cn("rounded-2xl px-5 py-3 font-extrabold", typeClasses.small, interactionClasses.control)}>
                      No
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : activeCategory ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleTemplates.length > 0 ? visibleTemplates.map(renderTemplateCard) : (
                <div className={cn("col-span-full rounded-[24px] border p-6 text-center", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
                  <p className={cn("font-extrabold", typeClasses.cardTitle)}>No templates here yet.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {SCHEDULE_TEMPLATE_CATEGORIES.map(renderCategoryCard)}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ScheduleImagePreview({ image, isDark, onClose }) {
  if (!image?.src) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={cn("relative max-h-[92vh] w-full max-w-5xl rounded-[24px] border p-3 shadow-2xl", isDark ? "border-white/[0.12] bg-[var(--bm-bg-modal)]" : "border-white/20 bg-white")}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/80"
          aria-label="Close image preview"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={image.src}
          alt={image.name || "Schedule image preview"}
          className="mx-auto max-h-[82vh] w-full rounded-[18px] object-contain"
        />
        {image.name && (
          <p className={cn("mt-2 truncate px-1 font-bold", typeClasses.small, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{image.name}</p>
        )}
      </motion.div>
    </div>
  );
}

function ScheduleAssistant({ isDark, appColor, blocks, selectedWeekStart, startSignal, startContext, chatVisible, onImportBlocks, onApplyCommand }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [pendingImport, setPendingImport] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const messagesEndRef = useRef(null);
  const sendLockRef = useRef(false);
  const lastStartSignalRef = useRef(0);
  const pendingAttachmentsRef = useRef([]);
  const cameraInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const textareaRef = useRef(null);
  const canSend = Boolean(input.trim() || pendingAttachments.length) && !isSending && !isUploading;
  const hasConversation = messages.length > 0;
  const selectedWeekInfo = getIsoWeekInfo(selectedWeekStart || getCurrentWeekStart());
  const selectedWeekRange = formatWeekRange(selectedWeekStart || getCurrentWeekStart());

  const focusTextarea = useCallback((event) => {
    const target = event?.target;
    if (target?.closest?.("button,a,input,select,[role='button'],[role='menuitem'],[contenteditable='true']")) {
      return;
    }
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  const resizeInput = (element) => {
    if (!element) return;
    element.style.height = "auto";
    const nextHeight = Math.min(Math.max(element.scrollHeight, 52), 112);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > 112 ? "auto" : "hidden";
  };

  const resetConversation = () => {
    setMessages([]);
    setConversationId("");
    setInput("");
    setPendingAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
      });
      return [];
    });
    setPendingImport(null);
    setPreviewImage(null);
    setAddMenuOpen(false);
    sendLockRef.current = false;
  };

  const streamAssistant = async ({ latestText = "", initial = false, userMessage = null, imageIds = [] }) => {
    if (sendLockRef.current) return;
    sendLockRef.current = true;
    setIsSending(true);

    const assistantId = `assistant-${Date.now()}`;
    const baseMessages = userMessage ? [...messages, userMessage] : messages;

    setMessages((current) => [
      ...current,
      ...(userMessage ? [userMessage] : []),
      { id: assistantId, role: "assistant", content: "", isThinking: true },
    ]);

    let streamedText = "";
    try {
      await streamChatMessage({
        message: buildSchedulePrompt({ messages: baseMessages, latestText, blocks, selectedWeekStart, initial }),
        imageIds,
        conversationId,
        mode: "work",
        metadata: {
          source: "schedule",
          schedule: true,
          scheduleAssistant: true,
          uploadedImageIds: imageIds,
          selectedWeek: {
            week: selectedWeekInfo.week,
            year: selectedWeekInfo.year,
            range: selectedWeekRange,
          },
          scheduleBlocks: blocks.map(({ id, name, title, category, date, weekday, start, startTime, end, endTime, days, color, icon }) => ({ id, name, title, category, date, weekday, start, startTime, end, endTime, days, color, icon })),
        },
        onReady: (payload) => {
          const nextConversationId = payload?.conversation?.conversationId;
          if (nextConversationId) setConversationId(nextConversationId);
        },
        onAiStart: () => {
          setMessages((current) => current.map((message) => (
            message.id === assistantId ? { ...message, isThinking: false } : message
          )));
        },
        onDelta: (payload) => {
          const token = payload?.token || "";
          if (!token) return;
          streamedText += token;
          setMessages((current) => current.map((message) => (
            message.id === assistantId ? { ...message, content: streamedText, isThinking: false } : message
          )));
        },
        onComplete: (payload) => {
          const finalText = streamedText.trim() || payload?.message?.content || "";
          setMessages((current) => current.map((message) => (
            message.id === assistantId ? { ...message, content: finalText, isThinking: false } : message
          )));
        },
      });
    } catch (error) {
      console.error("Schedule assistant stream failed", error);
      setMessages((current) => current.map((message) => (
        message.id === assistantId
          ? { ...message, content: "I could not connect to BlueMind AI right now. Please try again.", isThinking: false, error: true }
          : message
      )));
      toast.error(error?.message || "Schedule AI request failed.");
    } finally {
      setIsSending(false);
      sendLockRef.current = false;
    }
  };

  useEffect(() => {
    if (!startSignal || startSignal === lastStartSignalRef.current) return;
    lastStartSignalRef.current = startSignal;
    streamAssistant({
      initial: true,
      latestText: startContext || "Start the conversation now with a friendly opener. Ask what kind of schedule the user wants to build.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    if (!chatVisible) return undefined;
    const element = textareaRef.current;
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body && activeElement !== document.documentElement && activeElement !== element) {
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
      resizeInput(textareaRef.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chatVisible, hasConversation]);

  useEffect(() => () => {
    pendingAttachmentsRef.current.forEach((attachment) => {
      if (attachment.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
    });
  }, []);

  const removePendingAttachment = (attachmentId) => {
    setPendingAttachments((current) => {
      const attachment = current.find((item) => item.id === attachmentId);
      if (attachment?.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
      if (previewImage?.id === attachmentId) setPreviewImage(null);
      return current.filter((item) => item.id !== attachmentId);
    });
  };

  const addPendingFiles = (files, preferredType = "mixed", source = "upload") => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;
    setAddMenuOpen(false);

    const nextAttachments = [];
    selectedFiles.slice(0, 4).forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const documentType = getScheduleDocumentType(file);

      if ((preferredType === "image" || preferredType === "camera" || preferredType === "mixed") && isImage) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
          toast.error(`${file.name} is not a supported image. Use PNG, JPG, JPEG, or WEBP.`);
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 8MB.`);
          return;
        }
        nextAttachments.push({
          id: `pending-image-${Date.now()}-${file.name}-${file.size}`,
          file,
          name: file.name || (source === "camera" ? "Camera photo" : "Uploaded image"),
          type: "image",
          source,
          localPreviewUrl: URL.createObjectURL(file),
        });
        return;
      }

      if ((preferredType === "document" || preferredType === "mixed") && isSupportedScheduleDocument(file)) {
        if (file.size > 12 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 12MB.`);
          return;
        }
        nextAttachments.push({
          id: `pending-document-${Date.now()}-${file.name}-${file.size}`,
          file,
          name: file.name,
          type: "document",
          documentType,
          size: file.size,
          source,
        });
        return;
      }

      toast.error(`${file.name} is not supported here.`);
    });

    if (!nextAttachments.length) return;
    setPendingAttachments((current) => [...current, ...nextAttachments].slice(0, 4));
  };

  const processAttachmentsForSend = async (attachments) => {
    const messageAttachments = [];
    const imageIds = [];
    const contextParts = [];
    const imageFiles = attachments.filter((attachment) => attachment.type === "image");
    const documentFiles = attachments.filter((attachment) => attachment.type === "document");

    if (imageFiles.length) {
      const uploadedImages = [];
      const analyses = [];
      for (const attachment of imageFiles) {
        try {
          const image = await uploadChatImage(attachment.file);
          const analysis = await analyzeImage(
            image.id,
            [
              "Analyze this uploaded schedule completely at high detail. Inspect the entire image from edge to edge; do not stop after the first day, first column, or first page area.",
              "Read every visible date/day column, every time slot or row, every class, subject, break, lunch, free period, and activity.",
              "Preserve the original layout by mapping each activity to its exact real date, weekday, and exact start/end time.",
              "Detect schedule type, week number, dates, weekdays, exact times including partial times, activities, activity names, breaks, repeated activities, and whether it looks official or personal.",
              "If headers use compact dates such as 260727, interpret them as YYMMDD and convert to ISO dates such as 2026-07-27.",
              "Decide whether it should be imported directly or discussed first.",
              "If it is official, preserve the schedule exactly.",
              "If it is a school schedule, identify subjects and use clean labels when possible: Mathematics=Math, English=Eng, Science=Sci, Swedish=Swe, Biology=Bio, Chemistry=Chem, History=Hist, Geography=Geo, PE/Sport=PE, Lunch=Lunch, Break=Break.",
              "In extractedText, include an IMPORTABLE SCHEDULE section with one line per visible block using exactly this format: SCHEDULE_IMPORT: 2026-07-27 | Monday | 09:00 | 09:50 | Mathematics.",
              `If the source has no dates, use the visible workspace week as fallback only: Week ${selectedWeekInfo.week}, ${selectedWeekRange}.`,
              "Include Monday through Friday or all available days. Include breaks and lunch when visible. Do not omit repeated activities.",
            ].join(" "),
          );
          if (analysis?.analysis) analyses.push(analysis.analysis);
          const uploaded = {
            id: image.id,
            imageId: image.id,
            name: image.originalName || attachment.name || "Uploaded image",
            type: "image",
            previewUrl: getImageUrl(image.id),
          };
          uploadedImages.push(uploaded);
          messageAttachments.push(uploaded);
          imageIds.push(image.id);
        } catch (error) {
          toast.error(error?.message || "Image upload failed.");
        }
      }

      const analysisText = analyses
        .map((analysis) => [analysis.extractedText, analysis.description, Array.isArray(analysis.objects) ? analysis.objects.join(", ") : ""].filter(Boolean).join("\n"))
        .filter(Boolean)
        .join("\n\n");
      const classification = classifyScheduleText(analysisText);
      const importedBlocks = parseScheduleBlocksFromText(analysisText, { classification, fallbackWeekStart: selectedWeekStart });
      if (importedBlocks.length > 0) {
        onImportBlocks?.(importedBlocks);
        setPendingImport(null);
        toast.success(`${importedBlocks.length} schedule ${importedBlocks.length === 1 ? "block" : "blocks"} imported from image.`);
      } else if (uploadedImages.length) {
        setPendingImport({
          source: "image",
          classification,
          blocks: importedBlocks,
          analysisText,
        });
        toast.info(classification === "personal" ? "BlueMind analyzed the schedule. It will discuss the goal before importing." : "BlueMind analyzed the schedule. It needs the schedule purpose before importing.");
      }

      if (uploadedImages.length) {
        const source = uploadedImages.some((image) => image.name.toLowerCase().includes("camera")) ? "camera photo" : "schedule image";
        contextParts.push([
          `Analyze the uploaded ${source} (${uploadedImages.length === 1 ? uploadedImages[0].name : `${uploadedImages.length} images`}) as a schedule, not just OCR.`,
          `Detected schedule category: ${classification}.`,
          importedBlocks.length > 0
            ? "The schedule was imported automatically into the grid. Acknowledge that it was reconstructed from the whole image."
            : classification === "personal"
              ? "This looks personal. Ask: What is the goal of this schedule? Then compare the schedule to that goal and ask before suggesting improvements."
              : "The purpose is not fully clear. Ask: What is this schedule for? Offer examples: School, University, Work, Gym, Weight loss, Meal plan, Study plan, Travel, Business, Personal routine.",
          analysisText ? `Image analysis:\n${analysisText}` : "",
        ].filter(Boolean).join("\n\n"));
      }
    }

    if (documentFiles.length) {
      const analyzedDocuments = [];
      for (const attachment of documentFiles.slice(0, 3)) {
        let result = null;
        let fallbackText = "";
        try {
          result = await analyzeScheduleDocument(attachment.file);
        } catch (error) {
          fallbackText = await extractReadableFileText(attachment.file);
          toast.error(error?.message || `${attachment.name} could not be fully analyzed. Using readable text fallback.`);
        }

        const analysis = result?.analysis || {};
        const document = result?.document || {};
        const extractedText = [
          analysis.scheduleText,
          analysis.extractedText,
          analysis.structure,
          document.extractedText,
          fallbackText,
        ].filter(Boolean).join("\n\n");

        analyzedDocuments.push({
          attachment,
          result,
          analysis,
          text: extractedText,
        });

        messageAttachments.push({
          id: attachment.id,
          name: attachment.name,
          type: "document",
          documentType: analysis.documentType || document.detectedType || attachment.documentType || "Document",
          size: attachment.size,
        });
      }

      const combinedText = analyzedDocuments.map(({ attachment, analysis, text }) => [
        `File: ${attachment.name}`,
        `Detected document type: ${analysis.documentType || attachment.documentType || "Document"}`,
        `Schedule type: ${analysis.scheduleKind || "unknown"}`,
        `Summary: ${analysis.summary || ""}`,
        text || "No readable embedded text was extracted.",
      ].filter(Boolean).join("\n")).join("\n\n");
      const aiClassification = analyzedDocuments.find(({ analysis }) => analysis.classification)?.analysis?.classification;
      const classification = aiClassification || classifyScheduleText(combinedText);
      const importedBlocks = parseScheduleBlocksFromText(combinedText, { classification, fallbackWeekStart: selectedWeekStart });

      if (importedBlocks.length > 0) {
        onImportBlocks?.(importedBlocks);
        setPendingImport(null);
        toast.success(`${importedBlocks.length} schedule ${importedBlocks.length === 1 ? "block" : "blocks"} imported from document.`);
      } else {
        setPendingImport({
          source: "document",
          classification,
          blocks: importedBlocks,
          analysisText: combinedText,
        });
        toast.info("BlueMind analyzed the document, but it needs clearer schedule times before importing.");
      }

      const names = documentFiles.map((attachment) => `${attachment.name}${formatScheduleFileSize(attachment.size) ? ` (${formatScheduleFileSize(attachment.size)})` : ""}`).join(", ");
      contextParts.push([
        `The user uploaded schedule document file(s): ${names}.`,
        "BlueMind detected the document type automatically and analyzed rows, columns, dates, times, merged cells, empty cells, and recurring events where available.",
        `Detected schedule category: ${classification}.`,
        importedBlocks.length > 0
          ? "The schedule was imported automatically into the grid. Acknowledge that it was reconstructed from the uploaded document."
          : "No reliable importable blocks were found. Ask for a clearer file or ask one concise clarification about the missing times/days.",
        `Document analysis:\n${combinedText || "No readable text extracted."}`,
      ].join("\n\n"));
    }

    return { messageAttachments, imageIds, contextText: contextParts.filter(Boolean).join("\n\n") };
  };

  const copyAssistantMessage = async (content) => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied.");
    } catch {
      toast.error("Could not copy message.");
    }
  };

  const retryAssistantMessage = (messageId) => {
    const messageIndex = messages.findIndex((message) => message.id === messageId);
    const previousUserMessage = messages.slice(0, messageIndex).reverse().find((message) => message.role === "user");
    streamAssistant({
      latestText: previousUserMessage?.content
        ? `Regenerate the previous Schedule answer for this user message: ${previousUserMessage.content}`
        : "Regenerate the previous Schedule answer.",
    });
  };

  const submit = async () => {
    if (!canSend || sendLockRef.current) return;
    sendLockRef.current = true;
    const value = input.trim();
    const attachmentsToSend = pendingAttachments;
    setInput("");
    setPendingAttachments([]);
    window.requestAnimationFrame(() => {
      resizeInput(textareaRef.current);
      textareaRef.current?.focus({ preventScroll: true });
    });
    setAddMenuOpen(false);
    setIsUploading(Boolean(attachmentsToSend.length));

    let processed = { messageAttachments: [], imageIds: [], contextText: "" };
    try {
      if (attachmentsToSend.length) {
        processed = await processAttachmentsForSend(attachmentsToSend);
      }
    } catch (error) {
      console.error("Schedule attachment preparation failed", error);
      toast.error(error?.message || "Attachment preparation failed.");
      setIsUploading(false);
      sendLockRef.current = false;
      return;
    } finally {
      attachmentsToSend.forEach((attachment) => {
        if (attachment.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
      });
      setIsUploading(false);
    }

    const attachmentLabel = processed.messageAttachments.length
      ? processed.messageAttachments.map((attachment) => attachment.name).join(", ")
      : "";
    const displayText = value || (attachmentLabel ? `Uploaded ${attachmentLabel}` : "");
    if (!attachmentsToSend.length && !pendingImport && value) {
      const commandResult = onApplyCommand?.(value);
      if (commandResult?.handled) {
        const timestamp = Date.now();
        setMessages((current) => [
          ...current,
          {
            id: `user-${timestamp}`,
            role: "user",
            content: displayText,
            attachments: [],
          },
          {
            id: `assistant-${timestamp}`,
            role: "assistant",
            content: commandResult.message || "Done. I updated the schedule.",
            isThinking: false,
          },
        ]);
        sendLockRef.current = false;
        window.requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
        return;
      }
    }

    let pendingContext = "";
    if (!attachmentsToSend.length && pendingImport && value) {
      const purposeClassification = classifyPurposeText(value);
      const userRejectedImprovements = isNegativeText(value);
      const userAcceptedImprovements = isAffirmativeText(value);

      if (pendingImport.stage === "improvement-choice") {
        if (userRejectedImprovements && pendingImport.blocks.length > 0) {
          onImportBlocks?.(pendingImport.blocks);
          setPendingImport(null);
          pendingContext = [
            "The user does not want improvements.",
            "Respect the choice and say: No problem. I will import the schedule as you provided it.",
            `${pendingImport.blocks.length} block(s) were imported exactly from the uploaded schedule.`,
          ].join("\n");
        } else if (userAcceptedImprovements) {
          pendingContext = [
            "The user accepted schedule improvements.",
            "Discuss the detected issues and improvements step by step before changing the schedule.",
            "Focus on realistic improvements such as rest time, meal timing, study spacing, workout balance, breaks, intensity, sleep timing, and feasibility.",
            `Original schedule analysis:\n${pendingImport.analysisText}`,
          ].join("\n\n");
        }
      } else if (purposeClassification === "official" && pendingImport.blocks.length > 0) {
        onImportBlocks?.(normalizeImportedBlocks(pendingImport.blocks, "official", { fallbackWeekStart: selectedWeekStart }));
        setPendingImport(null);
        pendingContext = [
          "The user clarified this is an official schedule.",
          "It has been imported exactly as provided. Do not suggest changing it unless the user asks.",
        ].join("\n");
      } else if (userRejectedImprovements && pendingImport.blocks.length > 0) {
        onImportBlocks?.(pendingImport.blocks);
        setPendingImport(null);
        pendingContext = [
          "The user does not want optimization or discussion.",
          "The schedule was imported as provided. Acknowledge this respectfully.",
        ].join("\n");
      } else if (purposeClassification === "personal" || pendingImport.classification === "personal") {
        setPendingImport({ ...pendingImport, stage: "improvement-choice", goal: value });
        pendingContext = [
          `The user explained the schedule goal/purpose: ${value}`,
          "Compare the uploaded schedule to this goal.",
          "If there are mismatches, say you noticed a few issues that may not support the goal and ask whether the user wants suggestions.",
          "Do not import or change the schedule yet unless the user accepts or refuses improvements.",
          `Uploaded schedule analysis:\n${pendingImport.analysisText}`,
        ].join("\n\n");
      } else {
        pendingContext = [
          `The user answered about the schedule purpose: ${value}`,
          "If this still does not clearly tell whether the schedule is official or personal, ask one concise clarification.",
          "If it is official, import exactly. If it is personal, ask the goal before improving.",
          `Uploaded schedule analysis:\n${pendingImport.analysisText}`,
        ].join("\n\n");
      }
    }
    const latestText = [value, processed.contextText, pendingContext].filter(Boolean).join("\n\n");
    sendLockRef.current = false;
    streamAssistant({
      latestText: latestText || displayText,
      imageIds: processed.imageIds,
      userMessage: {
        id: `user-${Date.now()}`,
        role: "user",
        content: displayText,
        attachments: processed.messageAttachments,
      },
    });
  };

  const handleUploadFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;
    addPendingFiles(selectedFiles, "image", "upload");
  };

  const handleDocumentFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;
    addPendingFiles(selectedFiles, "document", "upload");
  };

  if (!chatVisible) return null;

  return (
    <>
    <motion.aside
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn("self-start flex h-[60vh] min-h-[430px] max-h-[680px] w-full flex-col rounded-[28px] border p-4 shadow-sm", isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo
            showName={false}
            small
            logoClassName="h-8 w-8"
            className="shrink-0"
          />
          <p className={cn("truncate font-extrabold", typeClasses.cardTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>BlueMind AI</p>
        </div>
        <button
          type="button"
          onClick={resetConversation}
          className={cn("shrink-0 rounded-full px-3 py-1.5 font-extrabold", typeClasses.small, interactionClasses.control)}
        >
          New Chat
        </button>
      </header>

      {!hasConversation && (
        <div className="flex min-h-0 flex-1 flex-col justify-center py-6">
          <h2 className={cn("text-center font-extrabold tracking-tight", typeClasses.sectionTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
            Are you ready?
          </h2>
          <p className={cn("mx-auto mt-3 max-w-[340px] text-center font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-secondary)]")}>
            BlueMind is ready to help you build your perfect schedule.
          </p>
        </div>
      )}

      <div className={cn("min-h-0 flex-1 space-y-5 overflow-y-auto pr-1", hasConversation ? "mt-4" : "hidden")}>
        {hasConversation && messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              {message.role === "assistant" ? (
                <div className="w-full px-1">
                  <p className={cn("font-extrabold", typeClasses.small, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>BlueMind</p>
                  {message.isThinking ? (
                    <p className={cn("mt-2 font-semibold leading-7", typeClasses.body, "text-[var(--bm-text-secondary)]")}>BlueMind is thinking...</p>
                  ) : (
                    <>
                      <p className={cn("mt-2 whitespace-pre-wrap font-semibold leading-7", typeClasses.body, message.error ? "text-[var(--bm-error)]" : "text-[var(--bm-text-primary)]")}>{message.content}</p>
                      {!message.error && message.content && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <button type="button" onClick={() => toast.success("Thanks for the feedback.")} className={cn("flex h-8 w-8 items-center justify-center rounded-full", interactionClasses.control)} aria-label="Like response">
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => toast.info("Feedback noted.")} className={cn("flex h-8 w-8 items-center justify-center rounded-full", interactionClasses.control)} aria-label="Dislike response">
                            <ThumbsDown className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => copyAssistantMessage(message.content)} className={cn("flex h-8 w-8 items-center justify-center rounded-full", interactionClasses.control)} aria-label="Copy response">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => retryAssistantMessage(message.id)} className={cn("flex h-8 w-8 items-center justify-center rounded-full", interactionClasses.control)} aria-label="Retry response">
                            <RefreshCcw className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex max-w-[88%] flex-col items-end gap-2">
                  {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                    <div className="flex max-w-full flex-wrap justify-end gap-3">
                      {message.attachments.map((attachment) => (
                        <div key={attachment.id || attachment.name} className={cn("overflow-hidden rounded-[22px] border", isDark ? "border-white/[0.12] bg-white/[0.06]" : "border-[var(--bm-border)] bg-white")}>
                          {attachment.type === "image" ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage({
                                id: attachment.id || attachment.imageId,
                                src: attachment.localPreviewUrl || attachment.previewUrl,
                                name: attachment.name || "Uploaded schedule image",
                              })}
                              className="block max-w-full bg-black/5"
                              aria-label={`Preview ${attachment.name || "uploaded schedule image"}`}
                            >
                              <img
                                src={attachment.localPreviewUrl || attachment.previewUrl}
                                alt={attachment.name || "Uploaded schedule image"}
                                className="max-h-[360px] min-h-[180px] w-full min-w-[260px] max-w-[420px] object-contain"
                              />
                            </button>
                          ) : (
                            <div className="flex max-w-[180px] items-center gap-2 px-3 py-2">
                              <Paperclip className={iconClasses.button} />
                              <span className={cn("min-w-0 truncate font-bold", typeClasses.small)}>{attachment.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {message.content && (
                    <div
                      className="rounded-[20px] px-4 py-2.5 text-white"
                      style={{ backgroundColor: appColor }}
                    >
                      <p className={cn("whitespace-pre-wrap font-semibold leading-6", typeClasses.body)}>{message.content}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        className={cn("mt-auto shrink-0 rounded-[26px] border p-2.5 transition-all duration-200", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}
        onPointerDown={focusTextarea}
        onClick={focusTextarea}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <AnimatePresence initial={false}>
          {pendingAttachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 6, height: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mb-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto px-1"
            >
              {pendingAttachments.map((attachment) => (
                <motion.div
                  key={attachment.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className={cn("relative flex h-16 max-w-[180px] items-center overflow-hidden rounded-2xl border", isDark ? "border-white/[0.12] bg-white/[0.06]" : "border-[var(--bm-border)] bg-white")}
                >
                  {attachment.type === "image" ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPreviewImage({ id: attachment.id, src: attachment.localPreviewUrl, name: attachment.name });
                      }}
                      className="h-full w-20 shrink-0 overflow-hidden"
                      aria-label={`Preview ${attachment.name}`}
                    >
                      <img src={attachment.localPreviewUrl} alt={attachment.name} className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <div className="flex h-full w-20 items-center justify-center bg-[var(--bm-primary)]/10">
                      <FileText className="h-6 w-6 text-[var(--bm-primary)]" />
                    </div>
                  )}
                  <div className="min-w-0 px-2 pr-7">
                    <p className={cn("truncate font-extrabold", typeClasses.small, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{attachment.name}</p>
                    <p className={cn("mt-0.5 truncate font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
                      {getAttachmentKindLabel(attachment)} {formatScheduleFileSize(attachment.size || attachment.file?.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingAttachment(attachment.id)}
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/70"
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <X className="h-3 w-3 stroke-[3]" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex cursor-text items-end gap-2">
          <button
            type="button"
            onClick={() => setAddMenuOpen((value) => !value)}
            className={cn("mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", interactionClasses.control)}
            aria-label="Open schedule attachment menu"
          >
            <Plus className={iconClasses.button} />
          </button>

          <AnimatePresence>
            {addMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className={cn("absolute bottom-12 left-0 z-30 w-52 rounded-2xl border p-1.5 shadow-lg", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)]" : "border-[var(--bm-border)] bg-white")}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    cameraInputRef.current?.click();
                  }}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold", typeClasses.small, interactionClasses.menuItem)}
                >
                  <Camera className={iconClasses.button} />
                  Camera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    imageInputRef.current?.click();
                  }}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold", typeClasses.small, interactionClasses.menuItem)}
                >
                  <Paperclip className={iconClasses.button} />
                  Upload Image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    documentInputRef.current?.click();
                  }}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold", typeClasses.small, interactionClasses.menuItem)}
                >
                  <FileText className={iconClasses.button} />
                  Upload Document
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              resizeInput(event.currentTarget);
            }}
            onInput={(event) => resizeInput(event.currentTarget)}
            rows={1}
            placeholder="Describe your schedule..."
            className={cn(
              inputClasses.composer,
              "relative z-10 max-h-[112px] min-h-[52px] flex-1 resize-none bg-transparent px-2 py-3.5 font-semibold leading-6 outline-none transition-[height] duration-150",
              typeClasses.body,
              isDark ? "text-white placeholder:text-[var(--bm-text-muted)]" : "text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-secondary)]",
            )}
            style={{ caretColor: isDark ? "#FFFFFF" : "var(--bm-text-primary)", pointerEvents: "auto" }}
          />

          <div className="mb-1 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => toast.info("Microphone support for Schedule will be added next.")}
              className={cn("flex h-10 w-10 items-center justify-center rounded-full", interactionClasses.control)}
              aria-label="Use microphone"
            >
              <Mic className={iconClasses.button} />
            </button>
            <BlueMindSendButton isBusy={isSending || isUploading} canSend={canSend} appColor={appColor} sendLabel="Send schedule message" compact />
          </div>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = "";
            addPendingFiles(files, "camera", "camera");
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleUploadFileSelect}
        />
        <input
          ref={documentInputRef}
          type="file"
          accept={DOCUMENT_UPLOAD_ACCEPT}
          multiple
          className="hidden"
          onChange={handleDocumentFileSelect}
        />
      </form>
    </motion.aside>
    <AnimatePresence>
      {previewImage && (
        <ScheduleImagePreview
          image={previewImage}
          isDark={isDark}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </AnimatePresence>
    </>
  );
}

function ScheduleTutorial({ isDark, appColor, accentText, onComplete }) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn("w-full max-w-sm rounded-[28px] border p-6 shadow-2xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]")}
      >
        <div className="mb-5 flex items-center justify-between">
          <span className={cn("font-bold uppercase tracking-[0.16em]", typeClasses.small, "text-[var(--bm-text-muted)]")}>Schedule tutorial</span>
          <span className={cn("font-bold", typeClasses.small, "text-[var(--bm-text-muted)]")}>{step + 1}/{TUTORIAL_STEPS.length}</span>
        </div>
        <h3 className={cn("font-extrabold tracking-tight", typeClasses.sectionTitle)}>{current.title}</h3>
        <p className={cn("mt-3 font-semibold leading-7", typeClasses.body, "text-[var(--bm-text-secondary)]")}>{current.body}</p>
        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onComplete}
            className={cn("rounded-2xl px-4 py-3 font-bold", typeClasses.small, interactionClasses.menuItem)}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) onComplete();
              else setStep((value) => value + 1);
            }}
            className={cn("rounded-2xl px-5 py-3 font-bold shadow-[0_12px_30px_rgba(25,59,104,0.20)]", typeClasses.small)}
            style={{ backgroundColor: appColor, color: accentText }}
          >
            {isLast ? "Start" : "Next"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function sortSchedulesByDate(records = []) {
  return [...records].sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0));
}

function formatScheduleUpdatedLabel(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "Updated unknown";
  const today = startOfLocalDay(new Date());
  const updatedDay = startOfLocalDay(date);
  const dayDelta = Math.round((today.getTime() - updatedDay.getTime()) / (24 * 60 * 60 * 1000));
  if (dayDelta === 0) return "Updated today";
  if (dayDelta === 1) return "Updated yesterday";
  if (dayDelta > 1 && dayDelta < 7) return `Updated ${dayDelta} days ago`;
  return `Updated ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function getScheduleCardIcon(schedule = {}) {
  const blockIcon = schedule.blocks?.[0]?.icon;
  return getScheduleIconOption(blockIcon || guessScheduleIcon(schedule.name)).Icon;
}

function ScheduleToolbarButton({ children, onClick, active = false, appColor, accentText }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3.5 font-extrabold transition-all duration-200",
        typeClasses.small,
        active ? "text-white shadow-[0_10px_22px_rgba(25,59,104,0.16)]" : interactionClasses.control,
      )}
      style={active ? { backgroundColor: appColor, color: accentText } : undefined}
    >
      {children}
    </button>
  );
}

function ScheduleCardMenu({ schedule, isDark, onOpen, onRename, onDuplicate, onTogglePin, onDelete }) {
  const itemClass = cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-bold transition-colors", typeClasses.small);
  return (
    <div
      className={cn("absolute right-0 top-10 z-30 w-44 rounded-2xl border p-1.5 shadow-xl", isDark ? "border-white/[0.10] bg-[var(--bm-bg-modal)]" : "border-[var(--bm-border)] bg-white")}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" onClick={onOpen} className={cn(itemClass, interactionClasses.menuItem)}>
        <Calendar className={iconClasses.button} />
        Open
      </button>
      <button type="button" onClick={onRename} className={cn(itemClass, interactionClasses.menuItem)}>
        <PenLine className={iconClasses.button} />
        Rename
      </button>
      <button type="button" onClick={onDuplicate} className={cn(itemClass, interactionClasses.menuItem)}>
        <Copy className={iconClasses.button} />
        Duplicate
      </button>
      <button type="button" onClick={onTogglePin} className={cn(itemClass, interactionClasses.menuItem)}>
        <Star className={iconClasses.button} fill={schedule.pinned ? "currentColor" : "none"} />
        {schedule.pinned ? "Unpin" : "Pin"}
      </button>
      <button type="button" onClick={onDelete} className={cn(itemClass, "text-red-600 hover:bg-red-500/10")}>
        <Trash2 className={iconClasses.button} />
        Delete
      </button>
    </div>
  );
}

function SavedScheduleCard({ schedule, isDark, menuOpen, onToggleMenu, onOpen, onRename, onDuplicate, onTogglePin, onDelete }) {
  const Icon = getScheduleCardIcon(schedule);
  return (
    <motion.div
      layout
      className={cn(
        "group relative min-h-[116px] rounded-[22px] border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white",
      )}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", schedule.pinned ? "bg-[var(--bm-primary)] text-white" : isDark ? "bg-white/[0.07] text-white" : "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-primary)]")}>
            <Icon className={iconClasses.button} />
          </span>
          <div className="min-w-0">
            <h3 className={cn("truncate font-black leading-6", typeClasses.body)}>{schedule.name}</h3>
            <p className={cn("mt-2 truncate font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>{formatScheduleUpdatedLabel(schedule.updatedAt)}</p>
          </div>
        </div>

        <div className="relative -mr-1 -mt-1 shrink-0">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleMenu();
            }}
            className={cn("flex h-9 w-9 items-center justify-center rounded-full opacity-80 transition hover:opacity-100", interactionClasses.control)}
            aria-label={`Open menu for ${schedule.name}`}
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-4 w-4 stroke-[2.4]" />
          </button>

          {menuOpen && (
            <ScheduleCardMenu
              schedule={schedule}
              isDark={isDark}
              onOpen={onOpen}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onTogglePin={onTogglePin}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ScheduleHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { prefs, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "var(--bm-primary)";
  const accentText = getTextOnColor(appColor);
  const isMobileRoute = location.pathname.startsWith("/mobile");
  const basePath = isMobileRoute ? "/mobile/schedule" : "/schedule";
  const workspacePath = `${basePath}/workspace`;
  const customPath = `${basePath}/custom`;
  const [scheduleRecords, setScheduleRecords] = useState(readScheduleLibrary);
  const [openMenuId, setOpenMenuId] = useState("");
  const sortedSchedules = useMemo(() => sortSchedulesByDate(scheduleRecords), [scheduleRecords]);
  const pinnedSchedules = useMemo(() => sortedSchedules.filter((schedule) => schedule.pinned).slice(0, 2), [sortedSchedules]);
  const pinnedScheduleIds = useMemo(() => new Set(pinnedSchedules.map((schedule) => schedule.id)), [pinnedSchedules]);
  const savedSchedules = useMemo(() => sortedSchedules.filter((schedule) => !pinnedScheduleIds.has(schedule.id)), [pinnedScheduleIds, sortedSchedules]);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const closeMenu = () => setOpenMenuId("");
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [openMenuId]);

  const persistSchedules = (records) => {
    setScheduleRecords(records);
    writeScheduleLibrary(records);
  };

  const openWorkspaceForRecord = (record) => {
    activateScheduleRecord(record);
    navigate(workspacePath, { state: { fromScheduleHome: true, scheduleId: record.id } });
  };

  const createNewSchedule = () => {
    const record = createScheduleRecord({ name: "Weekly Schedule", blocks: [], source: "weekly" });
    const nextRecords = [record, ...scheduleRecords];
    persistSchedules(nextRecords);
    activateScheduleRecord(record);
    navigate(workspacePath, { state: { fromScheduleHome: true, scheduleId: record.id } });
  };

  const renameSchedule = (record) => {
    const nextName = window.prompt("Rename schedule", record.name)?.trim();
    setOpenMenuId("");
    if (nextName === undefined) return;
    if (!nextName) {
      toast.error("Schedule name is required.");
      return;
    }
    if (nextName === record.name) return;
    const now = new Date().toISOString();
    const nextRecords = scheduleRecords.map((item) => item.id === record.id ? { ...item, name: nextName, updatedAt: now } : item);
    persistSchedules(nextRecords);
    if (getActiveScheduleId() === record.id) activateScheduleRecord({ ...record, name: nextName, updatedAt: now });
    toast.success("Schedule renamed.");
  };

  const duplicateSchedule = (record) => {
    setOpenMenuId("");
    const duplicate = createScheduleRecord({
      name: `${record.name} Copy`,
      blocks: record.blocks,
      source: record.source || "manual",
    });
    persistSchedules([duplicate, ...scheduleRecords]);
    toast.success("Schedule duplicated.");
  };

  const togglePin = (record) => {
    setOpenMenuId("");
    if (!record.pinned && scheduleRecords.filter((item) => item.pinned).length >= 2) {
      toast.error("Only two schedules can be pinned.");
      return;
    }
    const nextRecords = scheduleRecords.map((item) => item.id === record.id ? { ...item, pinned: !item.pinned, updatedAt: new Date().toISOString() } : item);
    persistSchedules(nextRecords);
  };

  const deleteSchedule = (record) => {
    setOpenMenuId("");
    if (!window.confirm(`Delete ${record.name}?`)) return;
    const nextRecords = scheduleRecords.filter((item) => item.id !== record.id);
    persistSchedules(nextRecords);
    if (getActiveScheduleId() === record.id) {
      const nextActive = nextRecords[0];
      if (nextActive) activateScheduleRecord(nextActive);
      else {
        setActiveScheduleId("");
        writeScheduleState({ blocks: [], updatedAt: new Date().toISOString() });
      }
    }
    toast.success("Schedule deleted.");
  };

  const renderScheduleCards = (records) => records.map((schedule) => (
    <SavedScheduleCard
      key={schedule.id}
      schedule={schedule}
      isDark={isDark}
      menuOpen={openMenuId === schedule.id}
      onToggleMenu={() => setOpenMenuId((current) => current === schedule.id ? "" : schedule.id)}
      onOpen={() => {
        setOpenMenuId("");
        openWorkspaceForRecord(schedule);
      }}
      onRename={() => renameSchedule(schedule)}
      onDuplicate={() => duplicateSchedule(schedule)}
      onTogglePin={() => togglePin(schedule)}
      onDelete={() => deleteSchedule(schedule)}
    />
  ));

  return (
    <main className={cn("min-h-screen px-4 py-5 sm:px-6 lg:px-8", isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]")} data-testid="schedule-home-page">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1280px] flex-col gap-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className={cn("font-extrabold tracking-tight", typeClasses.pageTitle)}>Schedule Home</h1>
          <div className="flex flex-wrap gap-2">
            <ScheduleToolbarButton onClick={createNewSchedule} active appColor={appColor} accentText={accentText}>
              <Plus className={iconClasses.button} />
              New
            </ScheduleToolbarButton>
            <ScheduleToolbarButton onClick={() => navigate(customPath)} appColor={appColor} accentText={accentText}>
              <Sparkles className={iconClasses.button} />
              Custom
            </ScheduleToolbarButton>
          </div>
        </header>

        <section>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-[var(--bm-primary)] stroke-[2.4] text-[var(--bm-primary)]" />
            <h2 className={cn("font-extrabold tracking-tight", typeClasses.sectionTitle)}>Pinned Schedules</h2>
            <span className={cn("font-bold", typeClasses.small, "text-[var(--bm-text-muted)]")}>{pinnedSchedules.length}/2</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {pinnedSchedules.length ? renderScheduleCards(pinnedSchedules) : (
              <div className={cn("rounded-[20px] border border-dashed p-5 font-semibold", typeClasses.small, isDark ? "border-white/[0.10] text-white/70" : "border-[var(--bm-border)] text-[var(--bm-text-secondary)]")}>
                No pinned schedules
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 stroke-[2.4] text-[var(--bm-text-muted)]" />
            <h2 className={cn("font-extrabold tracking-tight", typeClasses.sectionTitle)}>Saved Schedules</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {savedSchedules.length ? renderScheduleCards(savedSchedules) : (
              <div className={cn("rounded-[20px] border border-dashed p-5 font-semibold", typeClasses.small, isDark ? "border-white/[0.10] text-white/70" : "border-[var(--bm-border)] text-[var(--bm-text-secondary)]")}>
                {scheduleRecords.length ? "All schedules are pinned" : "No saved schedules"}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export function ScheduleCustomPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { prefs, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "var(--bm-primary)";
  const accentText = getTextOnColor(appColor);
  const isMobileRoute = location.pathname.startsWith("/mobile");
  const basePath = isMobileRoute ? "/mobile/schedule" : "/schedule";
  const workspacePath = `${basePath}/workspace`;
  const [generatedTemplates] = useState(readGeneratedScheduleTemplates);
  const allTemplates = useMemo(() => [...BASE_SCHEDULE_TEMPLATES, ...generatedTemplates], [generatedTemplates]);
  const groupedTemplates = useMemo(() => SCHEDULE_TEMPLATE_CATEGORIES
    .map((category) => ({
      ...category,
      templates: allTemplates.filter((template) => template.category === category.id),
    }))
    .filter((category) => category.templates.length), [allTemplates]);

  const openTemplate = (template) => {
    const record = createScheduleRecord({ name: template.title, blocks: [], source: "template" });
    const records = [record, ...readScheduleLibrary()];
    writeScheduleLibrary(records);
    activateScheduleRecord(record);
    navigate(workspacePath, {
      state: {
        fromScheduleHome: true,
        scheduleId: record.id,
        scheduleAction: "template",
        templateId: template.id,
      },
    });
  };

  const openAiGenerated = () => {
    const record = createScheduleRecord({ name: "AI Generated Schedule", blocks: [], source: "ai" });
    const records = [record, ...readScheduleLibrary()];
    writeScheduleLibrary(records);
    activateScheduleRecord(record);
    navigate(workspacePath, { state: { fromScheduleHome: true, scheduleId: record.id, scheduleAction: "ai" } });
  };

  return (
    <main className={cn("min-h-screen px-4 py-5 sm:px-6 lg:px-8", isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]")} data-testid="schedule-custom-page">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1180px] flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button type="button" onClick={() => navigate(basePath)} className={cn("flex h-10 w-10 items-center justify-center rounded-full", interactionClasses.control)} aria-label="Back to Schedule Home">
              <ArrowLeft className={iconClasses.button} />
            </button>
            <h1 className={cn("mt-2 font-extrabold tracking-tight", typeClasses.pageTitle)}>Custom Schedule</h1>
          </div>
          <ScheduleButton onClick={openAiGenerated} active appColor={appColor} accentText={accentText}>
            <Sparkles className={iconClasses.button} />
            AI Generated Templates
          </ScheduleButton>
        </header>

        <section className="grid gap-5">
          {groupedTemplates.map((category) => {
            const CategoryIcon = getScheduleIconOption(category.icon).Icon;
            return (
              <div key={category.id} className={cn("rounded-[28px] border p-5", isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: appColor, color: accentText }}>
                    <CategoryIcon className={iconClasses.button} />
                  </span>
                  <div>
                    <h2 className={cn("font-extrabold", typeClasses.cardTitle)}>{category.title}</h2>
                    <p className={cn("font-semibold", typeClasses.small, "text-[var(--bm-text-secondary)]")}>{category.description}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {category.templates.map((template) => {
                    const TemplateIcon = getScheduleIconOption(template.icon).Icon;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => openTemplate(template)}
                        className={cn("flex min-h-[116px] items-start gap-3 rounded-[22px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5", isDark ? "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] hover:bg-white")}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: appColor, color: accentText }}>
                          <TemplateIcon className={iconClasses.button} />
                        </span>
                        <span className="min-w-0">
                          <span className={cn("block font-extrabold", typeClasses.body)}>{template.title}</span>
                          <span className={cn("mt-1 block font-semibold leading-5", typeClasses.small, "text-[var(--bm-text-secondary)]")}>{template.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}

export default function SchemanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { prefs, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "var(--bm-primary)";
  const accentText = getTextOnColor(appColor);
  const isMobileRoute = location.pathname.startsWith("/mobile");
  const scheduleHomePath = isMobileRoute ? "/mobile/schedule" : "/schedule";
  const initialRouteActionHandledRef = useRef(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [scheduleState, setScheduleState] = useState(readScheduleState);
  const [blockModal, setBlockModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [scheduleTypeOpen, setScheduleTypeOpen] = useState(false);
  const [aiStartSignal, setAiStartSignal] = useState(0);
  const [aiStartContext, setAiStartContext] = useState("");
  const [selectedWeekStart, setSelectedWeekStart] = useState(getCurrentWeekStart);
  const [tutorialOpen, setTutorialOpen] = useState(() => localStorage.getItem(SCHEDULE_TUTORIAL_KEY) !== "true");

  const blocks = useMemo(() => scheduleState.blocks || [], [scheduleState.blocks]);
  const hasBlocks = blocks.length > 0;
  const weekDays = useMemo(() => getWeekDays(selectedWeekStart), [selectedWeekStart]);
  const weekDateKeys = useMemo(() => new Set(weekDays.map((day) => day.dateKey)), [weekDays]);
  const visibleBlocks = useMemo(() => blocks.filter((block) => weekDateKeys.has(block.date)), [blocks, weekDateKeys]);
  const selectedWeekInfo = useMemo(() => getIsoWeekInfo(selectedWeekStart), [selectedWeekStart]);
  const selectedWeekRange = useMemo(() => formatWeekRange(selectedWeekStart), [selectedWeekStart]);
  const pageColumns = useMemo(() => (
    chatVisible ? "xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]" : "xl:grid-cols-1"
  ), [chatVisible]);

  const handleBackToScheduleHome = () => {
    if (location.state?.fromScheduleHome) {
      navigate(-1);
      return;
    }

    navigate(scheduleHomePath, { replace: true });
  };

  const goToPreviousWeek = () => setSelectedWeekStart((current) => addDays(current, -7));
  const goToNextWeek = () => setSelectedWeekStart((current) => addDays(current, 7));
  const goToCurrentWeek = () => setSelectedWeekStart(getCurrentWeekStart());

  useEffect(() => {
    writeScheduleState(scheduleState);
  }, [scheduleState]);

  useEffect(() => {
    if (initialRouteActionHandledRef.current) return;
    initialRouteActionHandledRef.current = true;
    const action = location.state?.scheduleAction;

    if (action === "create") {
      setScheduleTypeOpen(true);
      return;
    }

    if (action === "template") {
      const templateId = location.state?.templateId;
      const template = [...BASE_SCHEDULE_TEMPLATES, ...readGeneratedScheduleTemplates()].find((item) => item.id === templateId);
      if (template) {
        setChatVisible(true);
        setAiStartContext(buildTemplateAssistantPrompt(template));
        setAiStartSignal((value) => value + 1);
      } else {
        setScheduleTypeOpen(true);
      }
      return;
    }

    if (action === "ai") {
      setChatVisible(true);
      setAiStartContext(hasBlocks
        ? "The user opened Schedule from Schedule Home and wants BlueMind AI to improve the current saved schedule. Use the current schedule blocks as context and ask what they want to optimize."
        : "The user opened Schedule from Schedule Home and wants BlueMind AI to create a custom schedule. Ask what they want to organize and guide them conversationally.");
      setAiStartSignal((value) => value + 1);
      return;
    }

    if (action === "import") {
      setChatVisible(true);
      setAiStartContext("The user opened Schedule from Schedule Home to import a timetable, roster, calendar, PDF, spreadsheet, Word document, image, or screenshot. Invite them to upload the file with the attachment button and explain that BlueMind will reconstruct it into the Schedule Workspace.");
      setAiStartSignal((value) => value + 1);
    }
  }, [hasBlocks, location.state]);

  const handlePrimaryScheduleAction = () => {
    if (editMode) {
      setEditMode(false);
      toast.success("Schedule changes saved.");
      return;
    }

    setEditMode(true);
    toast.success("Schedule edit mode enabled.");
  };

  const selectScheduleType = (type) => {
    setScheduleTypeOpen(false);
    setChatVisible(true);
    setAiStartContext(type.assistantPrompt);
    setAiStartSignal((value) => value + 1);
  };

  const importScheduleBlocks = (importedBlocks) => {
    if (!importedBlocks?.length) return;
    const normalizedBlocks = normalizeImportedBlocks(importedBlocks, "official", { fallbackWeekStart: selectedWeekStart });
    const firstImportedDate = normalizedBlocks.map((block) => parseDateKey(block.date)).find(Boolean);
    setScheduleState((current) => ({
      ...current,
      blocks: [...(current.blocks || []), ...normalizedBlocks],
      updatedAt: new Date().toISOString(),
    }));
    if (firstImportedDate) setSelectedWeekStart(startOfIsoWeek(firstImportedDate));
    setEditMode(false);
  };

  const applyScheduleCommand = (commandText) => {
    const result = buildScheduleCommandResult(commandText, blocks, selectedWeekStart);
    if (!result?.handled) return result;

    if (result.status === "applied" && Array.isArray(result.blocks)) {
      setScheduleState((current) => ({
        ...current,
        blocks: result.blocks,
        updatedAt: new Date().toISOString(),
      }));
      const focusDate = parseDateKey(result.focusDate);
      if (focusDate) setSelectedWeekStart(startOfIsoWeek(focusDate));
      setEditMode(false);
      toast.success(result.toast || "Schedule updated.");
    }

    return result;
  };

  const saveBlock = (block) => {
    const nextBlocks = (Array.isArray(block) ? block : [block])
      .map((item, index) => normalizeScheduleBlock(item, { fallbackWeekStart: selectedWeekStart, index }))
      .filter((item) => item.date && item.start && item.end);
    if (!nextBlocks.length) return;
    setScheduleState((current) => ({
      ...current,
      blocks: [...(current.blocks || []), ...nextBlocks],
      updatedAt: new Date().toISOString(),
    }));
    setBlockModal(null);
    setEditMode(true);
    toast.success(`${nextBlocks.length} schedule ${nextBlocks.length === 1 ? "block" : "blocks"} added.`);
  };

  const deleteActivity = (activity) => {
    setScheduleState((current) => ({
      ...current,
      blocks: (current.blocks || []).filter((block) => block.id !== activity.id),
      updatedAt: new Date().toISOString(),
    }));
    setDeleteTarget(null);
    toast.success("Activity deleted.");
  };

  const closeTutorial = () => {
    localStorage.setItem(SCHEDULE_TUTORIAL_KEY, "true");
    setTutorialOpen(false);
  };

  return (
    <main className={cn("min-h-screen px-4 py-5 sm:px-6 lg:px-8", isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]")} data-testid="schedule-page">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1600px] flex-col gap-5">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <button
                type="button"
                onClick={handleBackToScheduleHome}
                className={cn("flex h-10 w-10 items-center justify-center rounded-full", interactionClasses.control)}
                aria-label="Back to Schedule Home"
              >
                <ArrowLeft className={iconClasses.button} />
              </button>
              <h1 className={cn("mt-1 font-extrabold tracking-tight", typeClasses.pageTitle)}>Schedule workspace</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
              <ScheduleButton onClick={() => setChatVisible((value) => !value)} active={chatVisible} appColor={appColor} accentText={accentText}>
                <MessageSquare className={iconClasses.button} />
                {chatVisible ? "Close Chat" : "Open Chat"}
              </ScheduleButton>
              <ScheduleButton onClick={handlePrimaryScheduleAction} active={editMode} appColor={appColor} accentText={accentText}>
                {editMode ? <Check className={iconClasses.button} /> : <PenLine className={iconClasses.button} />}
                {editMode ? "Save Changes" : "Edit Schedule"}
              </ScheduleButton>
            </div>
          </div>
          <div className="flex justify-start">
            <div className={cn("flex min-h-[52px] w-full items-center rounded-2xl border p-1 sm:w-auto", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-white")}>
              <button type="button" onClick={goToPreviousWeek} className={cn("flex h-10 w-10 items-center justify-center rounded-xl", interactionClasses.control)} aria-label="Previous week">
                <ChevronLeft className={iconClasses.button} />
              </button>
              <button
                type="button"
                onClick={goToCurrentWeek}
                className={cn("mx-1 flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-3 py-1 text-center font-extrabold sm:min-w-[236px]", typeClasses.small, isDark ? "text-white hover:bg-white/[0.06]" : "text-[var(--bm-text-primary)] hover:bg-[var(--bm-bg-elevated)]")}
                aria-label="Go to current week"
              >
                <span>Week {selectedWeekInfo.week}</span>
                <span className={cn("font-bold", typeClasses.small, "text-[var(--bm-text-muted)]")}>{selectedWeekRange}</span>
              </button>
              <button type="button" onClick={goToNextWeek} className={cn("flex h-10 w-10 items-center justify-center rounded-xl", interactionClasses.control)} aria-label="Next week">
                <ChevronRight className={iconClasses.button} />
              </button>
            </div>
          </div>
        </header>

        <div className={cn("grid min-h-0 flex-1 items-start gap-5", pageColumns)}>
          <div className="min-h-[620px]">
            <WeeklyGrid
              isDark={isDark}
              appColor={appColor}
              blocks={visibleBlocks}
              weekDays={weekDays}
              editMode={editMode}
              onAddCell={(dayInfo, hour) => setBlockModal({ day: dayInfo.weekday, date: dayInfo.dateKey, hour })}
              onRequestDelete={setDeleteTarget}
            />
          </div>
          <ScheduleAssistant
            isDark={isDark}
            appColor={appColor}
            blocks={blocks}
            selectedWeekStart={selectedWeekStart}
            startSignal={aiStartSignal}
            startContext={aiStartContext}
            chatVisible={chatVisible}
            onImportBlocks={importScheduleBlocks}
            onApplyCommand={applyScheduleCommand}
          />
        </div>
      </div>

      <AnimatePresence>
        {tutorialOpen && (
          <ScheduleTutorial
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
            onComplete={closeTutorial}
          />
        )}
        {blockModal && (
          <BlockModal
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
            weekDays={weekDays}
            initialDay={blockModal.day}
            initialDate={blockModal.date}
            initialStart={blockModal.hour}
            onClose={() => setBlockModal(null)}
            onSave={saveBlock}
          />
        )}
        {deleteTarget && (
          <DeleteActivityDialog
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
            activity={deleteTarget}
            onCancel={() => setDeleteTarget(null)}
            onDelete={deleteActivity}
          />
        )}
        {scheduleTypeOpen && (
          <ScheduleTypeDialog
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
            onClose={() => setScheduleTypeOpen(false)}
            onSelect={selectScheduleType}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

