import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, School, PlayCircle, Sparkles } from "lucide-react";
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

const lessonVideos = [
  { id: "video-1", title: "Video 1", duration: "1-3 min", description: "Quick overview of the selected chapter." },
  { id: "video-2", title: "Video 2", duration: "1-3 min", description: "Key ideas explained in smaller steps." },
  { id: "video-3", title: "Video 3", duration: "1-3 min", description: "Practice and recap for easier learning." },
];

function StepIndicator({ current, total, isDark }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300 flex-1",
            i < current ? "bg-[#193B68]" : (i === current ? "bg-[#193B68]/50" : isDark ? "bg-white/[0.12]" : "bg-[#E5E7EB]")
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
        "w-full p-4 sm:p-5 rounded-xl border text-left transition-all duration-200 cursor-pointer",
        isSelected
          ? "border-[#193B68] bg-[#EEF2FF]"
          : isDark
            ? "border-white/[0.10] bg-[#252525] hover:border-white/[0.18] hover:bg-[#2b2b2b] hover:shadow-sm"
            : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:shadow-sm"
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", isSelected ? "bg-[#193B68]" : isDark ? "bg-white/[0.08]" : "bg-[#F3F4F6]")}>
            <Icon className={cn("w-5 h-5", isSelected ? "text-white" : isDark ? "text-[#CFCFCF]" : "text-[#6B7280]")} />
          </div>
        )}
        <p className={cn("font-medium text-sm sm:text-base", isSelected ? "text-[#193B68]" : isDark ? "text-white" : "text-[#111827]")}>{label}</p>
      </div>
    </button>
  );
}

function SimpleOption({ label, isSelected, onClick, isDark }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full py-3.5 sm:py-4 px-4 sm:px-5 rounded-xl border text-sm sm:text-base font-medium transition-all duration-200 cursor-pointer text-left",
        isSelected
          ? "border-[#193B68] bg-[#EEF2FF] text-[#193B68]"
          : isDark
            ? "border-white/[0.10] bg-[#252525] text-white hover:border-white/[0.18] hover:bg-[#2b2b2b] hover:shadow-sm"
            : "border-[#E5E7EB] bg-white text-[#111827] hover:border-[#D1D5DB] hover:shadow-sm"
      )}
    >
      {label}
    </button>
  );
}

function LearningContent({ selections, isDark }) {
  const selectedPath = [
    schools.find((item) => item.id === selections.school)?.label,
    grades.find((item) => item.id === selections.grade)?.label,
    subjects.find((item) => item.id === selections.subject)?.label,
    books.find((item) => item.id === selections.book)?.label,
    parts.find((item) => item.id === selections.part)?.label,
  ].filter(Boolean).join(" / ");

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className={cn("rounded-2xl border p-5 sm:p-6", isDark ? "border-white/[0.10] bg-[#252525]" : "border-[#E5E7EB] bg-white")}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#193B68] text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className={cn("text-lg font-semibold sm:text-xl", isDark ? "text-white" : "text-[#111827]")}>AI learning content</h3>
            <p className={cn("mt-1 text-sm", isDark ? "text-[#aaa]" : "text-[#6B7280]")}>{selectedPath}</p>
          </div>
        </div>
        <p className={cn("text-sm leading-6", isDark ? "text-[#CFCFCF]" : "text-[#4B5563]")}>
          BlueMind will turn this chapter into short learning videos divided into easy parts, so students can learn without one long lesson.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {lessonVideos.map((video) => (
          <button
            key={video.id}
            type="button"
            className={cn("rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm", isDark ? "border-white/[0.10] bg-[#252525] hover:bg-[#2b2b2b]" : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]")}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#193B68] text-white">
              <PlayCircle className="h-5 w-5" />
            </div>
            <h4 className={cn("font-semibold", isDark ? "text-white" : "text-[#111827]")}>{video.title}</h4>
            <p className={cn("mt-1 text-xs font-medium", isDark ? "text-[#999]" : "text-[#6B7280]")}>{video.duration}</p>
            <p className={cn("mt-3 text-sm leading-6", isDark ? "text-[#B8B8B8]" : "text-[#4B5563]")}>{video.description}</p>
          </button>
        ))}
      </div>
    </motion.div>
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
  const [showLearningContent, setShowLearningContent] = useState(false);

  const totalSteps = 5;
  const hubPath = mobile ? "/mobile/smart-hub" : "/dashboard";

  const handleSelect = (key, value) => {
    setSelections((prev) => ({ ...prev, [key]: value }));
    if (key === "part") {
      setShowLearningContent(true);
      return;
    }
    setTimeout(() => setStep((s) => s + 1), 200);
  };

  const handleBack = () => {
    if (showLearningContent) {
      setShowLearningContent(false);
      setStep(4);
      setSelections((prev) => ({ ...prev, part: null }));
      return;
    }
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
    if (showLearningContent) {
      return <LearningContent selections={selections} isDark={isDark} />;
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
    <div className={cn("min-h-screen", mobile && "min-h-[100dvh]", isDark ? "bg-[#1a1a1a]" : "bg-[#FAFBFC]")} data-testid={mobile ? "mobile-learning-page" : "learning-page"}>
      {/* Header */}
      <header className={cn("sticky top-0 z-10 border-b", mobile && "pt-[env(safe-area-inset-top)]", isDark ? "bg-[#222] border-[#333]" : "bg-white border-[#E5E7EB]")}>
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
      <div className={cn("max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8", mobile && "pb-[calc(28px+env(safe-area-inset-bottom))]")}>
        {!showLearningContent && (
          <>
            <StepIndicator current={step} total={totalSteps} isDark={isDark} />
            <p className={cn("text-xs mb-1", isDark ? "text-[#888]" : "text-[#9CA3AF]")}>{t("stepProgress", { current: step + 1, total: totalSteps })}</p>
            <h2 className={cn("text-xl sm:text-2xl font-semibold mb-6", isDark ? "text-white" : "text-[#111827]")}>{stepTitles[step]}</h2>
          </>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={showLearningContent ? "content" : step}
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
