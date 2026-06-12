import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Play, Bell, UserPlus, LayoutGrid, Sparkles, ArrowRight, Send, CheckCircle, Menu, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/BrandLogo";

function useScrollFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("landing-visible");
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useApp();

  return (
    <nav className="w-full px-4 sm:px-6 md:px-12 lg:px-20 py-4 sm:py-5 flex items-center justify-between relative" data-testid="landing-navbar">
      <div className="flex items-center gap-2 min-w-0">
        <BrandLogo
          forceTheme="light"
          logoClassName="w-12 h-12 sm:w-[52px] sm:h-[52px] -my-1"
          textClassName="text-lg sm:text-xl text-[var(--bm-text-primary)]"
        />
      </div>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-[var(--bm-text-secondary)] hover:text-[var(--bm-text-primary)] transition-colors text-sm font-medium">{t("features")}</a>
      </div>

      {/* Desktop CTA */}
      <button
        onClick={() => navigate("/auth/register")}
        className="hidden md:block bg-[var(--bm-primary)] text-white px-7 py-3 rounded-lg text-sm font-medium hover:bg-[var(--bm-primary-hover)] transition-all duration-200 hover:scale-[1.02]"
        data-testid="nav-get-started"
      >
        {t("start")}
      </button>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)] transition-colors flex-shrink-0"
        data-testid="mobile-menu-toggle"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-[var(--bm-border)] shadow-lg z-50 p-5 flex flex-col gap-4 md:hidden" data-testid="mobile-menu">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[var(--bm-text-secondary)] hover:text-[var(--bm-text-primary)] transition-colors text-base font-medium py-2"
          >
            {t("features")}
          </a>
          <button
            onClick={() => { navigate("/auth/register"); setMobileMenuOpen(false); }}
            className="bg-[var(--bm-primary)] text-white px-7 py-3 rounded-lg text-base font-medium hover:bg-[var(--bm-primary-hover)] transition-all duration-200 w-full"
            data-testid="mobile-get-started"
          >
            {t("start")}
          </button>
        </div>
      )}
    </nav>
  );
}

function HeroMockUI() {
  const { t } = useApp();

  return (
    <div className="bg-white border border-[var(--bm-border)] rounded-2xl shadow-xl shadow-[var(--bm-primary)]/8 overflow-hidden w-full" data-testid="hero-mock-ui">
      <div className="flex flex-col sm:flex-row">
        {/* Sidebar icons - horizontal on very small, vertical on sm+ */}
        <div className="hidden sm:flex w-16 md:w-[72px] border-r border-[var(--bm-border)] flex-col items-center py-5 md:py-6 gap-4 md:gap-6 bg-[var(--bm-bg-elevated)]">
          <BrandLogo forceTheme="light" showName={false} logoClassName="w-10 h-10 md:w-11 md:h-11" />
          <MessageSquare className="w-5 h-5 md:w-[22px] md:h-[22px] text-[var(--bm-text-secondary)]" />
          <Sparkles className="w-5 h-5 md:w-[22px] md:h-[22px] text-[var(--bm-text-secondary)]" />
          <Bell className="w-5 h-5 md:w-[22px] md:h-[22px] text-[var(--bm-text-secondary)]" />
          <Play className="w-5 h-5 md:w-[22px] md:h-[22px] text-[var(--bm-text-secondary)]" />
        </div>

        {/* Main content */}
        <div className="flex-1 p-5 sm:p-6 md:p-8">
          <p className="text-[var(--bm-text-primary)] font-medium mb-4 sm:mb-5 md:mb-6 text-base md:text-lg break-words overflow-wrap-anywhere">
            {t("helloHowCanIHelp")}
          </p>

          {/* Input */}
          <div className="flex items-center gap-2 sm:gap-3 border border-[var(--bm-border)] rounded-full px-4 sm:px-5 py-3 md:py-3.5 mb-5 sm:mb-6 md:mb-7">
            <span className="text-[var(--bm-text-muted)] text-sm md:text-base flex-1 truncate">{t("askAnything")}</span>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bm-primary)] flex items-center justify-center flex-shrink-0">
              <Send className="w-4 h-4 md:w-[18px] md:h-[18px] text-white" />
            </div>
          </div>

          {/* Mini feature cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <div className="bg-[var(--bm-hover-bg)] border border-[var(--bm-border)] rounded-xl p-2.5 sm:p-3 md:p-4 text-center">
              <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg bg-white border border-[var(--bm-border)] flex items-center justify-center mx-auto mb-2 md:mb-3">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 md:w-[22px] md:h-[22px] text-[var(--bm-primary)]" />
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-[var(--bm-text-primary)] break-words">{t("aiChat")}</p>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-[var(--bm-text-secondary)] mt-0.5 sm:mt-1 break-words">{t("aiChatShort")}</p>
            </div>
            <div className="bg-[var(--bm-hover-bg)] border border-[var(--bm-border)] rounded-xl p-2.5 sm:p-3 md:p-4 text-center">
              <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg bg-white border border-[var(--bm-border)] flex items-center justify-center mx-auto mb-2 md:mb-3">
                <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-[22px] md:h-[22px] text-[var(--bm-primary)]" />
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-[var(--bm-text-primary)] break-words">{t("aiLearning")}</p>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-[var(--bm-text-secondary)] mt-0.5 sm:mt-1 break-words">{t("aiLearningShort")}</p>
            </div>
            <div className="bg-[var(--bm-hover-bg)] border border-[var(--bm-border)] rounded-xl p-2.5 sm:p-3 md:p-4 text-center">
              <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg bg-white border border-[var(--bm-border)] flex items-center justify-center mx-auto mb-2 md:mb-3">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 md:w-[22px] md:h-[22px] text-[var(--bm-primary)]" />
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-[var(--bm-text-primary)] break-words">{t("reminders")}</p>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-[var(--bm-text-secondary)] mt-0.5 sm:mt-1 break-words">{t("smartRemindersShort")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  const navigate = useNavigate();
  const ref = useScrollFadeIn();
  const { t } = useApp();

  return (
    <section ref={ref} className="landing-section px-4 sm:px-6 md:px-12 lg:px-20 py-12 sm:py-16 md:py-20 lg:py-28" data-testid="hero-section">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10 sm:gap-12 md:gap-16 lg:gap-24">
        {/* Left */}
        <div className="flex-1 max-w-lg w-full">
          <span className="inline-block bg-[var(--bm-active-bg)] text-[var(--bm-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-5 sm:mb-7 tracking-wide uppercase">
            {t("heroEyebrow")}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--bm-text-primary)] leading-tight mb-5 sm:mb-7 break-words">
            {t("heroTitle")}
          </h1>
          <p className="text-[var(--bm-text-secondary)] text-base sm:text-lg leading-relaxed mb-7 sm:mb-9 break-words">
            {t("heroSubtitle")}
          </p>
          <div className="mb-4 sm:mb-5">
            <button
              onClick={() => navigate("/auth/register")}
              className="bg-[var(--bm-primary)] text-white px-8 sm:px-9 py-3.5 sm:py-4 rounded-xl font-medium text-base hover:bg-[var(--bm-primary-hover)] transition-all duration-200 hover:scale-[1.02]"
              data-testid="hero-get-started"
            >
              {t("start")}
            </button>
          </div>
          <div className="flex items-center gap-2 text-[var(--bm-text-secondary)] text-sm">
            <CheckCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[var(--bm-primary)] flex-shrink-0" />
            <span>{t("noCreditCard")}</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex-1 w-full max-w-xl">
          <HeroMockUI />
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const ref = useScrollFadeIn();
  const { t } = useApp();
  const features = [
    {
      icon: MessageSquare,
      title: t("aiChat"),
      description: t("aiChatDescription"),
    },
    {
      icon: Play,
      title: t("aiLearning"),
      description: t("aiLearningDescription"),
    },
    {
      icon: Bell,
      title: t("smartReminders"),
      description: t("smartRemindersDescription"),
    },
  ];

  return (
    <section ref={ref} id="features" className="landing-section px-4 sm:px-6 md:px-12 lg:px-20 py-16 sm:py-20 md:py-24 bg-white" data-testid="features-section">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--bm-text-primary)] mb-3 sm:mb-4 break-words">{t("featuresTitle")}</h2>
          <p className="text-[var(--bm-text-secondary)] text-base sm:text-lg break-words">{t("featuresSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 md:gap-7">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-[var(--bm-hover-bg)] border border-[var(--bm-border)] rounded-2xl p-6 sm:p-7 md:p-9 hover:-translate-y-1 transition-all duration-200"
              data-testid={`feature-card-${feature.title.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white border border-[var(--bm-border)] flex items-center justify-center mb-4 sm:mb-5">
                <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--bm-primary)]" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-[var(--bm-text-primary)] mb-2 sm:mb-3 break-words">{feature.title}</h3>
              <p className="text-[var(--bm-text-secondary)] text-sm sm:text-[15px] leading-relaxed break-words">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const ref = useScrollFadeIn();
  const { t } = useApp();
  const steps = [
    { num: 1, icon: UserPlus, title: t("signUp"), description: t("signUpDescription") },
    { num: 2, icon: LayoutGrid, title: t("chooseFeature"), description: t("chooseFeatureDescription") },
    { num: 3, icon: Sparkles, title: t("startUsingAi"), description: t("startUsingAiDescription") },
  ];

  return (
    <section ref={ref} id="how-it-works" className="landing-section px-4 sm:px-6 md:px-12 lg:px-20 py-16 sm:py-20 md:py-24 bg-[var(--bm-bg-elevated)]" data-testid="how-it-works-section">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--bm-text-primary)] mb-3 sm:mb-4 break-words">{t("howItWorks")}</h2>
          <p className="text-[var(--bm-text-secondary)] text-base sm:text-lg">{t("howItWorksSubtitle")}</p>
        </div>

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-center gap-10 md:gap-0">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-8 left-1/2 -translate-x-1/2 w-[55%] h-px bg-[var(--bm-border)]" />

          {steps.map((step) => (
            <div key={step.num} className="flex-1 flex flex-col items-center text-center relative z-10 w-full">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[var(--bm-active-bg)] border-2 border-[var(--bm-primary)] flex items-center justify-center mb-4 sm:mb-5">
                <span className="text-[var(--bm-primary)] font-bold text-sm">{step.num}</span>
              </div>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white border border-[var(--bm-border)] flex items-center justify-center mb-4 sm:mb-5">
                <step.icon className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--bm-primary)]" />
              </div>
              <h3 className="font-semibold text-[var(--bm-text-primary)] text-base mb-1.5 break-words">{step.title}</h3>
              <p className="text-sm text-[var(--bm-text-secondary)] max-w-[220px] leading-relaxed break-words">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCTA() {
  const navigate = useNavigate();
  const ref = useScrollFadeIn();
  const { t } = useApp();

  return (
    <section ref={ref} className="landing-section px-4 sm:px-6 md:px-12 lg:px-20 py-14 sm:py-16 md:py-20" data-testid="bottom-cta-section">
      <div className="max-w-6xl mx-auto">
        <div className="bg-[var(--bm-hover-bg)] border border-[var(--bm-border)] rounded-2xl px-6 sm:px-8 md:px-14 py-8 sm:py-10 md:py-12 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-5 text-center sm:text-left">
            <BrandLogo forceTheme="light" showName={false} logoClassName="w-14 h-14 sm:w-16 sm:h-16" />
            <div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--bm-text-primary)] break-words">{t("bottomCtaTitle")}</h3>
              <p className="text-[var(--bm-text-secondary)] text-sm mt-1.5 break-words">{t("bottomCtaSubtitle")}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/auth/register")}
            className="bg-[var(--bm-primary)] text-white px-8 sm:px-9 py-3.5 sm:py-4 rounded-xl font-medium hover:bg-[var(--bm-primary-hover)] transition-all duration-200 hover:scale-[1.02] flex items-center gap-2 whitespace-nowrap"
            data-testid="cta-get-started"
          >
            {t("startNow")}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden" data-testid="landing-page">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <BottomCTA />
    </div>
  );
}
