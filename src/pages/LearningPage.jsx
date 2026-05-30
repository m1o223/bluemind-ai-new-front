import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, School, Construction } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/BrandLogo";

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

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300 flex-1",
            i < current ? "bg-[#193B68]" : (i === current ? "bg-[#193B68]/50" : "bg-[#E5E7EB]")
          )}
        />
      ))}
    </div>
  );
}

function OptionCard({ label, icon: Icon, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 sm:p-5 rounded-xl border text-left transition-all duration-200 cursor-pointer",
        isSelected
          ? "border-[#193B68] bg-[#EEF2FF]"
          : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:shadow-sm"
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", isSelected ? "bg-[#193B68]" : "bg-[#F3F4F6]")}>
            <Icon className={cn("w-5 h-5", isSelected ? "text-white" : "text-[#6B7280]")} />
          </div>
        )}
        <p className={cn("font-medium text-sm sm:text-base", isSelected ? "text-[#193B68]" : "text-[#111827]")}>{label}</p>
      </div>
    </button>
  );
}

function SimpleOption({ label, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full py-3.5 sm:py-4 px-4 sm:px-5 rounded-xl border text-sm sm:text-base font-medium transition-all duration-200 cursor-pointer text-left",
        isSelected
          ? "border-[#193B68] bg-[#EEF2FF] text-[#193B68]"
          : "border-[#E5E7EB] bg-white text-[#111827] hover:border-[#D1D5DB] hover:shadow-sm"
      )}
    >
      {label}
    </button>
  );
}

export default function LearningPage() {
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

  const handleSelect = (key, value) => {
    setSelections((prev) => ({ ...prev, [key]: value }));
    if (key === "part") {
      setShowComingSoon(true);
      setTimeout(() => navigate("/dashboard"), 2000);
      return;
    }
    setTimeout(() => setStep((s) => s + 1), 200);
  };

  const handleBack = () => {
    if (step === 0) { navigate("/dashboard"); return; }
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
          <h3 className={cn("text-xl sm:text-2xl font-semibold mb-2", isDark ? "text-white" : "text-[#111827]")}>{t("comingSoon")}</h3>
          <p className={cn("text-sm", isDark ? "text-[#888]" : "text-[#6B7280]")}>{t("redirectingToChat")}</p>
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
              />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#1a1a1a]" : "bg-[#FAFBFC]")} data-testid="learning-page">
      {/* Header */}
      <header className={cn("sticky top-0 z-10 border-b", isDark ? "bg-[#222] border-[#333]" : "bg-white border-[#E5E7EB]")}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex min-w-0 items-center gap-3">
          <button
            onClick={handleBack}
            className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer", isDark ? "text-[#999] hover:text-white hover:bg-[#333]" : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]")}
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo
              logoClassName="w-8 h-8"
              textClassName={cn("hidden min-[390px]:inline text-sm sm:text-base", isDark ? "text-white" : "text-[#111827]")}
            />
            <h1 className={cn("min-w-0 truncate text-lg font-semibold", isDark ? "text-white" : "text-[#111827]")}>{t("learning")}</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!showComingSoon && (
          <>
            <StepIndicator current={step} total={totalSteps} />
            <p className={cn("text-xs mb-1", isDark ? "text-[#888]" : "text-[#9CA3AF]")}>{t("stepProgress", { current: step + 1, total: totalSteps })}</p>
            <h2 className={cn("text-xl sm:text-2xl font-semibold mb-6", isDark ? "text-white" : "text-[#111827]")}>{stepTitles[step]}</h2>
          </>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={showComingSoon ? "done" : step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
