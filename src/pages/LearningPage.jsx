import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, School, Construction } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/BrandLogo";
import { iconClasses, interactionClasses, motionTokens, spacingClasses, typeClasses } from "@/lib/interactions";

const schools = [
  { id: "nordic", label: "Nordic School" },
  { id: "matteo", label: "Matteo Skolan" },
  { id: "vitra", label: "Vitra School" },
  { id: "stella", label: "Stella Academy" },
  { id: "aurora", label: "Aurora School" },
];

const grades = [
  { id: "5", label: "Grade 5" },
  { id: "6", label: "Grade 6" },
  { id: "7", label: "Grade 7" },
  { id: "8", label: "Grade 8" },
];

const subjects = [
  { id: "swedish", label: "Swedish" },
  { id: "english", label: "English" },
  { id: "arabic", label: "Arabic" },
  { id: "math", label: "Math" },
  { id: "science", label: "Science" },
  { id: "history", label: "History" },
  { id: "geography", label: "Geography" },
];

const books = [
  { id: "a", label: "Book A" },
  { id: "b", label: "Book B" },
  { id: "c", label: "Book C" },
];

const parts = [
  { id: "1", label: "Part 1" },
  { id: "2", label: "Part 2" },
  { id: "3", label: "Part 3" },
];

function StepIndicator({ current, total, isDark }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300 flex-1",
            i < current ? "bg-[var(--bm-primary)]" : (i === current ? "bg-[var(--bm-primary)]/50" : isDark ? "bg-white/[0.12]" : "bg-[var(--bm-border)]")
          )}
        />
      ))}
    </div>
  );
}

function OptionCard({ label, icon: Icon, isSelected, onClick, isDark }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border text-left transition-all duration-200 cursor-pointer",
        spacingClasses.card,
        interactionClasses.card,
        isSelected
          ? "border-[var(--bm-primary)] bg-[var(--bm-active-bg)]"
          : isDark
            ? "border-white/[0.10] bg-[var(--bm-bg-elevated)]"
            : "border-[var(--bm-border)] bg-white"
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", isSelected ? "bg-[var(--bm-primary)]" : isDark ? "bg-white/[0.08]" : "bg-[var(--bm-hover-bg)]")}>
            <Icon className={cn(iconClasses.card, isSelected ? "text-white" : "text-[var(--bm-icon-primary)]")} />
          </div>
        )}
        <p className={cn("font-medium", typeClasses.body, isSelected ? "text-[var(--bm-selected-text)]" : isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{label}</p>
      </div>
    </button>
  );
}

function SimpleOption({ label, isSelected, onClick, isDark }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border font-medium transition-all duration-200 cursor-pointer text-left",
        spacingClasses.card,
        typeClasses.body,
        interactionClasses.menuItem,
        isSelected
          ? "border-[var(--bm-primary)] bg-[var(--bm-selected-bg)] text-[var(--bm-selected-text)]"
          : isDark
            ? "border-white/[0.10] bg-[var(--bm-bg-elevated)] text-white"
            : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]"
      )}
    >
      {label}
    </button>
  );
}

export default function LearningPage({ mobile = false }) {
  const navigate = useNavigate();
  const { t, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({
    school: null,
    grade: null,
    subject: null,
    book: null,
    part: null,
  });
  const [showComingSoon, setShowComingSoon] = useState(false);

  const totalSteps = 5;
  const hubPath = mobile ? "/mobile/smart-hub" : "/dashboard";
  const chatPath = mobile ? "/mobile/chat" : "/chat";

  const handleSelect = (key, value) => {
    setSelections((prev) => ({ ...prev, [key]: value }));
    if (key === "part") {
      setShowComingSoon(true);
      setTimeout(() => navigate(chatPath), 2000);
      return;
    }
    setTimeout(() => setStep((s) => s + 1), 200);
  };

  const handleBack = () => {
    if (step === 0) { navigate(hubPath); return; }
    setStep((s) => s - 1);
  };

  const stepTitles = [
    t("chooseYourSchoolLevel"),
    t("grade"),
    t("subject"),
    t("book"),
    t("part"),
  ];

  const renderStep = () => {
    if (showComingSoon) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 sm:py-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#FEF3C7] flex items-center justify-center mx-auto mb-5">
            <Construction className="w-8 h-8 text-[#D97706]" />
          </div>
          <h3 className={cn("font-semibold mb-2", typeClasses.sectionTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("comingSoon")}</h3>
          <p className={cn(typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("redirectingToChat")}</p>
        </motion.div>
      );
    }

    switch (step) {
      case 0:
        return (
          <div className="space-y-3">
            {schools.map((school) => (
              <OptionCard
                key={school.id}
                label={school.label}
                icon={School}
                isSelected={selections.school === school.id}
                onClick={() => handleSelect("school", school.id)}
                isDark={isDark}
              />
            ))}
          </div>
        );
      case 1:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {grades.map((grade) => (
              <SimpleOption
                key={grade.id}
                label={grade.label}
                isSelected={selections.grade === grade.id}
                onClick={() => handleSelect("grade", grade.id)}
                isDark={isDark}
              />
            ))}
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3">
            {subjects.map((subject) => (
              <SimpleOption
                key={subject.id}
                label={subject.label}
                isSelected={selections.subject === subject.id}
                onClick={() => handleSelect("subject", subject.id)}
                isDark={isDark}
              />
            ))}
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            {books.map((book) => (
              <SimpleOption
                key={book.id}
                label={book.label}
                isSelected={selections.book === book.id}
                onClick={() => handleSelect("book", book.id)}
                isDark={isDark}
              />
            ))}
          </div>
        );
      case 4:
        return (
          <div className="space-y-3">
            {parts.map((part) => (
              <SimpleOption
                key={part.id}
                label={part.label}
                isSelected={selections.part === part.id}
                onClick={() => handleSelect("part", part.id)}
                isDark={isDark}
              />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("min-h-screen", mobile && "min-h-[100dvh]", isDark ? "bg-[var(--bm-bg-app)]" : "bg-[var(--bm-bg-app)]")} data-testid={mobile ? "mobile-learning-page" : "learning-page"}>
      {/* Header */}
      <header className={cn("sticky top-0 z-10 border-b", mobile && "pt-[env(safe-area-inset-top)]", isDark ? "bg-[var(--bm-bg-card)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]")}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex min-w-0 items-center gap-3">
          <button
            onClick={handleBack}
            className={cn("w-9 h-9 rounded-lg flex items-center justify-center", interactionClasses.iconButton, isDark ? "text-[var(--bm-text-muted)] hover:text-white" : "text-[var(--bm-text-secondary)] hover:text-[var(--bm-text-primary)]")}
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo
              logoClassName={iconClasses.sidebarLogo}
              textClassName={cn("hidden min-[390px]:inline", typeClasses.body, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}
            />
            <h1 className={cn("min-w-0 truncate font-semibold", typeClasses.pageTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("learning")}</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className={cn("max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8", mobile && "pb-[calc(28px+env(safe-area-inset-bottom))]")}>
        {!showComingSoon && (
          <>
            <StepIndicator current={step} total={totalSteps} isDark={isDark} />
            <p className={cn("mb-1", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{t("stepProgress", { current: step + 1, total: totalSteps })}</p>
            <h2 className={cn("font-semibold mb-6", typeClasses.sectionTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{stepTitles[step]}</h2>
          </>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={showComingSoon ? "done" : step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={motionTokens.transition}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
