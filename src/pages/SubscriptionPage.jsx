import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  RotateCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { inputClasses, typeClasses } from "@/lib/interactions";

const SAVED_METHODS_KEY = "bluemind_mock_payment_methods";

const PLANS = [
  {
    id: "starter",
    name: "BlueMind Plus",
    badge: "Popular",
    features: ["Advanced AI chat", "Writing and research tools", "Priority creative tools", "Saved workspaces"],
  },
  {
    id: "pro",
    name: "BlueMind Pro",
    badge: "Recommended",
    features: ["Everything in Plus", "Larger file workflows", "AI plans and schedule support", "Premium productivity tools"],
  },
  {
    id: "studio",
    name: "BlueMind Studio",
    badge: "Creative",
    features: ["Everything in Pro", "Studio image workflows", "Creative inspiration gallery", "Priority generation experience"],
  },
];

const PAYMENT_METHODS = [
  { id: "visa", label: "Visa", description: "Pay with a Visa debit or credit card.", tone: "from-[#0D3F9E] via-[#1762D0] to-[#74A7FF]", kind: "card" },
  { id: "mastercard", label: "Mastercard", description: "Pay with a Mastercard debit or credit card.", tone: "from-[#101010] via-[#242424] to-[#525252]", kind: "card" },
  { id: "apple-pay", label: "Apple Pay", description: "Use Apple Pay for a fast premium checkout.", tone: "from-[#111111] via-[#2D2D2D] to-[#777777]", kind: "wallet" },
  { id: "google-pay", label: "Google Pay", description: "Use Google Pay with a saved wallet method.", tone: "from-[#F7F9FC] via-[#EAF1FF] to-[#CFE0FF]", kind: "wallet", darkText: true },
  { id: "klarna", label: "Klarna", description: "Use Klarna with a clean checkout experience.", tone: "from-[#FFB8D2] via-[#FFA7C7] to-[#FFDFEA]", kind: "wallet", darkText: true },
];

function readSavedMethods() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_METHODS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedMethod(method) {
  const current = readSavedMethods();
  const next = [method, ...current.filter((item) => item.id !== method.id)].slice(0, 6);
  localStorage.setItem(SAVED_METHODS_KEY, JSON.stringify(next));
}

function formatCardNumber(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function detectCardBrand(methodId, cardNumber) {
  if (methodId === "mastercard") return "Mastercard";
  if (methodId === "visa") return "Visa";
  const digits = String(cardNumber || "").replace(/\D/g, "");
  if (/^5[1-5]/.test(digits)) return "Mastercard";
  return "Visa";
}

function methodById(id) {
  return PAYMENT_METHODS.find((method) => method.id === id) || PAYMENT_METHODS[0];
}

function getBasePath(pathname) {
  return pathname.startsWith("/mobile") ? "/mobile/subscription" : "/subscription";
}

function SubscriptionShell({ title, subtitle, children, right, compact = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const backPath = location.pathname.startsWith("/mobile") ? "/mobile/chat" : "/chat";

  return (
    <main className={cn("min-h-[100dvh] bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]", isDark && "text-white")} data-testid="subscription-flow-page">
      <div className={cn("mx-auto flex min-h-[100dvh] w-full flex-col px-4 pb-8 pt-[max(18px,env(safe-area-inset-top))]", location.pathname.startsWith("/mobile") ? "max-w-[520px]" : "max-w-6xl px-6")}>
        <header className="mb-6 flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigate(-1)} className="bm-mobile-glass-control" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className={cn("text-xs font-bold uppercase tracking-[0.18em]", isDark ? "text-white/45" : "text-[var(--bm-text-muted)]")}>BlueMind AI</p>
            <h1 className={cn("mt-1 font-bold tracking-tight", compact ? "text-[22px]" : "text-[26px] sm:text-[32px]")}>{title}</h1>
            {subtitle && <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--bm-text-secondary)]">{subtitle}</p>}
          </div>
          <div className="flex h-11 w-11 items-center justify-center">{right || <span />}</div>
        </header>

        <div className="min-h-0 flex-1">{children}</div>

        <button type="button" onClick={() => navigate(backPath)} className="sr-only">
          Exit subscription flow
        </button>
      </div>
    </main>
  );
}

function GlassCard({ children, className, onClick, testId }) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "rounded-[28px] border border-[var(--bm-border)] bg-[var(--bm-bg-card)] text-left shadow-sm backdrop-blur-[24px]",
        onClick && "transition active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </Component>
  );
}

function PrimaryAction({ children, onClick, disabled, className, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-[54px] w-full items-center justify-center rounded-full border border-white/15 bg-[var(--bm-primary)] px-5 text-base font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_16px_38px_rgba(25,59,104,0.22)] transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.985]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function SubscriptionHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = getBasePath(location.pathname);

  return (
    <SubscriptionShell
      title="Subscription"
      subtitle="Choose the BlueMind experience that fits how you learn, create and organize."
      right={<Sparkles className="h-5 w-5 text-[var(--bm-primary)]" />}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <GlassCard key={plan.id} className="flex min-h-[360px] flex-col p-5 sm:p-6" testId={`subscription-plan-${plan.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-bold tracking-tight">{plan.name}</p>
                {plan.badge && (
                  <span className="mt-3 inline-flex rounded-full border border-[var(--bm-border)] bg-[var(--bm-hover-bg)] px-3 py-1 text-xs font-bold text-[var(--bm-text-primary)]">
                    {plan.badge}
                  </span>
                )}
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bm-hover-bg)]">
                <BadgeCheck className="h-5 w-5 text-[var(--bm-primary)]" />
              </span>
            </div>

            <div className="mt-7 space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--bm-text-secondary)]">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--bm-hover-bg)]">
                    <Check className="h-3.5 w-3.5 text-[var(--bm-primary)]" />
                  </span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-7">
              <PrimaryAction onClick={() => navigate(`${base}/payment-method`, { state: { planId: plan.id, planName: plan.name } })}>
                Subscribe
              </PrimaryAction>
            </div>
          </GlassCard>
        ))}
      </div>
    </SubscriptionShell>
  );
}

function PaymentBrandMark({ method, compact = false }) {
  if (method.id === "visa") return <span className={cn(compact ? "text-sm" : "text-2xl", "font-black italic tracking-[-0.08em]")}>VISA</span>;
  if (method.id === "mastercard") {
    return (
      <span className={cn("relative flex items-center", compact ? "h-7 w-10" : "h-9 w-14")}>
        <span className={cn("absolute rounded-full bg-[#EB001B]", compact ? "left-1 h-6 w-6" : "left-1 h-8 w-8")} />
        <span className={cn("absolute rounded-full bg-[#F79E1B] mix-blend-screen", compact ? "right-1 h-6 w-6" : "right-1 h-8 w-8")} />
      </span>
    );
  }
  if (method.id === "apple-pay") return <span className={cn(compact ? "text-[10px]" : "text-xl", "font-black tracking-tight")}>Apple Pay</span>;
  if (method.id === "google-pay") return <span className={cn(compact ? "text-xs" : "text-xl", "font-black tracking-tight")}><span className="text-[#4285F4]">G</span> Pay</span>;
  return <span className={cn(compact ? "text-xs" : "text-xl", "font-black tracking-tight")}>Klarna.</span>;
}

function SavedMethodCard({ method }) {
  const payment = methodById(method.methodId || method.id);
  return (
    <div className={cn("min-w-[220px] rounded-[24px] bg-gradient-to-br p-4 shadow-sm", payment.tone, payment.darkText ? "text-[#111111]" : "text-white")}>
      <div className="flex items-center justify-between">
        <PaymentBrandMark method={payment} />
        <ShieldCheck className="h-5 w-5 opacity-80" />
      </div>
      <p className="mt-8 text-xs font-bold uppercase opacity-70">Saved method</p>
      <p className="mt-1 text-sm font-black">{method.label || payment.label}{method.last4 ? ` **** ${method.last4}` : ""}</p>
    </div>
  );
}

function PaymentMethodIcon({ method }) {
  return (
    <span className={cn(
      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--bm-border)] shadow-sm",
      method.id === "google-pay" || method.id === "klarna"
        ? "bg-white/80 text-[#111111]"
        : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]",
    )}>
      <PaymentBrandMark method={method} compact />
    </span>
  );
}

function PaymentMethodPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = getBasePath(location.pathname);
  const [savedMethods, setSavedMethods] = useState(() => readSavedMethods());

  useEffect(() => {
    setSavedMethods(readSavedMethods());
  }, [location.key]);

  const chooseMethod = (method) => {
    navigate(`${base}/payment-method/${method.id}`, {
      state: { planId: location.state?.planId, planName: location.state?.planName, methodId: method.id },
    });
  };

  return (
    <SubscriptionShell title="Choose Payment Method" subtitle="Select a payment method to continue. Payment processing will be connected later.">
      {savedMethods.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-sm font-bold text-[var(--bm-text-secondary)]">Saved Payment Methods</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {savedMethods.map((method) => <SavedMethodCard key={method.id} method={method} />)}
          </div>
        </section>
      )}

      <div className="mx-auto grid w-full max-w-2xl gap-3">
        {PAYMENT_METHODS.map((method) => (
          <GlassCard
            key={method.id}
            onClick={() => chooseMethod(method)}
            className="flex min-h-[76px] items-center gap-4 px-4 py-3"
            testId={`payment-method-${method.id}`}
          >
            <PaymentMethodIcon method={method} />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold tracking-tight text-[var(--bm-text-primary)]">{method.label}</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-[var(--bm-text-secondary)]">{method.description}</p>
            </div>
            {method.kind === "card" ? <CreditCard className="h-5 w-5 shrink-0 text-[var(--bm-text-secondary)]" /> : <Smartphone className="h-5 w-5 shrink-0 text-[var(--bm-text-secondary)]" />}
          </GlassCard>
        ))}
      </div>
    </SubscriptionShell>
  );
}

const cardFaceStyle = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

function CardChip() {
  return (
    <div className="h-9 w-12 rounded-[10px] border border-white/25 bg-gradient-to-br from-[#F8E7A1] via-[#D6A844] to-[#8B6A2B] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      <div className="mt-3 h-px w-full bg-black/20" />
      <div className="mx-auto mt-2 h-px w-8 bg-black/20" />
    </div>
  );
}

function CardRotateButton({ onClick, darkText = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Rotate payment card"
      className={cn(
        "absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-[24px] transition active:scale-95",
        darkText
          ? "border-black/10 bg-white/40 text-[#111111] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_24px_rgba(0,0,0,0.12)]"
          : "border-white/15 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_10px_24px_rgba(0,0,0,0.20)]",
      )}
    >
      <RotateCw className="h-4 w-4" />
    </button>
  );
}

function CardLighting({ darkText = false }) {
  return (
    <>
      <div className={cn("absolute inset-x-0 top-0 h-px", darkText ? "bg-black/10" : "bg-white/25")} />
      <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute -bottom-20 left-8 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
      <div className={cn("absolute inset-0 bg-[linear-gradient(130deg,rgba(255,255,255,0.22),transparent_32%,transparent_62%,rgba(255,255,255,0.09))]", darkText && "opacity-60")} />
    </>
  );
}

function PremiumPaymentCard({ method, form, flipped, onToggle, methodId }) {
  const hasForm = Boolean(form);
  const brand = form ? detectCardBrand(methodId, form.number) : method.label;
  const visualMethod = form ? methodById(brand.toLowerCase() === "mastercard" ? "mastercard" : "visa") : method;
  const visibleNumber = form?.number || "**** **** **** ****";
  const holder = form?.name || "CARD HOLDER";
  const expiry = form?.expiry || "MM/YY";
  const cvv = form?.cvv || "CVV";
  const darkText = Boolean(visualMethod.darkText);

  return (
    <div className="mx-auto w-full max-w-[390px]" style={{ perspective: "1200px" }}>
      <motion.div
        initial={{ y: 12, opacity: 0, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1, rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        className="relative aspect-[1.586/1] w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className={cn(
            "absolute inset-0 overflow-hidden rounded-[22px] bg-gradient-to-br p-6 shadow-[0_28px_75px_rgba(15,23,42,0.22)] ring-1",
            visualMethod.tone,
            darkText ? "text-[#111111] ring-black/10" : "text-white ring-white/10",
          )}
          style={cardFaceStyle}
        >
          <CardLighting darkText={darkText} />
          <CardRotateButton onClick={onToggle} darkText={darkText} />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-4 pr-12">
              <CardChip />
              <PaymentBrandMark method={visualMethod} />
            </div>
            <div className="flex items-end justify-between gap-4">
              <div className={cn("h-8 w-16 rounded-full border", darkText ? "border-black/10 bg-black/5" : "border-white/10 bg-white/10")} />
              <div className={cn("h-8 w-8 rounded-full border", darkText ? "border-black/10 bg-black/5" : "border-white/10 bg-white/10")} />
            </div>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-hidden rounded-[22px] bg-gradient-to-br p-5 shadow-[0_28px_75px_rgba(15,23,42,0.22)] ring-1",
            visualMethod.tone,
            darkText ? "text-[#111111] ring-black/10" : "text-white ring-white/10",
          )}
          style={{ ...cardFaceStyle, transform: "rotateY(180deg)" }}
        >
          <CardLighting darkText={darkText} />
          <CardRotateButton onClick={onToggle} darkText={darkText} />
          <div className="relative mt-11 h-10 rounded-sm bg-[#070707] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]" />
          {hasForm ? (
            <>
              <div className={cn("relative mt-5 rounded-xl px-4 py-3 font-mono text-base font-semibold tracking-[0.08em]", darkText ? "bg-white/38 text-black" : "bg-white/14 text-white")}>
                {visibleNumber}
              </div>
              <div className="relative mt-5 grid grid-cols-[1fr_auto_auto] gap-3">
                <div className="min-w-0">
                  <p className={cn("text-[9px] font-black uppercase tracking-[0.18em]", darkText ? "text-black/50" : "text-white/55")}>Card Holder</p>
                  <p className="mt-1 truncate text-xs font-black uppercase tracking-[0.08em]">{holder}</p>
                </div>
                <div>
                  <p className={cn("text-[9px] font-black uppercase tracking-[0.18em]", darkText ? "text-black/50" : "text-white/55")}>Exp</p>
                  <p className="mt-1 text-xs font-black">{expiry}</p>
                </div>
                <div>
                  <p className={cn("text-[9px] font-black uppercase tracking-[0.18em]", darkText ? "text-black/50" : "text-white/55")}>CVV</p>
                  <p className="mt-1 text-xs font-black">{cvv}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="relative mt-6">
              <p className={cn("text-[10px] font-black uppercase tracking-[0.18em]", darkText ? "text-black/50" : "text-white/55")}>Selected Method</p>
              <p className="mt-2 text-2xl font-black tracking-tight">{visualMethod.label}</p>
              <p className={cn("mt-3 max-w-[260px] text-sm font-bold leading-6", darkText ? "text-black/60" : "text-white/65")}>{visualMethod.description}</p>
            </div>
          )}
          <div className="relative mt-5 flex items-center justify-between">
            <PaymentBrandMark method={visualMethod} />
            <p className={cn("text-[10px] font-black uppercase tracking-[0.16em]", darkText ? "text-black/45" : "text-white/50")}>Secure preview</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function WalletPaymentDetails({ method, onPay }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <PremiumPaymentCard method={method} flipped={flipped} onToggle={() => setFlipped((current) => !current)} />
      <GlassCard className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--bm-hover-bg)]">
            <ShieldCheck className="h-5 w-5 text-[var(--bm-primary)]" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{method.label}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--bm-text-secondary)]">
              This is a frontend-only checkout preview. No payment provider is contacted yet.
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-3xl border border-[var(--bm-border)] bg-[var(--bm-hover-bg)] px-4 py-4 text-sm font-semibold text-[var(--bm-text-secondary)]">
          Review your selected method, then continue to the mock processing step.
        </div>
        <PrimaryAction className="mt-6" onClick={onPay}>Pay</PrimaryAction>
      </GlassCard>
    </div>
  );
}

function PaymentDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const base = getBasePath(location.pathname);
  const methodId = params.methodId || location.state?.methodId || "visa";
  const method = methodById(methodId);
  const [form, setForm] = useState({ name: "", number: "", expiry: "", cvv: "" });
  const [flipped, setFlipped] = useState(false);
  const [autoFlipped, setAutoFlipped] = useState(false);
  const ready = form.name.trim().length > 2 && form.number.replace(/\D/g, "").length >= 12 && form.expiry.length === 5 && form.cvv.length >= 3;

  const update = (key, value) => {
    if (!autoFlipped && String(value || "").length > 0) {
      setFlipped(true);
      setAutoFlipped(true);
    }

    setForm((current) => ({
      ...current,
      [key]: key === "number" ? formatCardNumber(value) : key === "expiry" ? formatExpiry(value) : key === "cvv" ? value.replace(/\D/g, "").slice(0, 4) : value,
    }));
  };

  const payWithWallet = () => {
    navigate(`${base}/processing`, {
      state: {
        ...location.state,
        methodId: method.id,
        mockPaymentMethod: {
          id: `${method.id}-${Date.now()}`,
          methodId: method.id,
          label: method.label,
        },
      },
    });
  };

  const submit = (event) => {
    event.preventDefault();
    if (!ready) return;
    const brand = detectCardBrand(methodId, form.number);
    navigate(`${base}/processing`, {
      state: {
        ...location.state,
        mockPaymentMethod: {
          id: `${brand.toLowerCase()}-${Date.now()}`,
          methodId: brand.toLowerCase() === "mastercard" ? "mastercard" : "visa",
          label: brand,
          holder: form.name.trim(),
          last4: form.number.replace(/\D/g, "").slice(-4),
          expiry: form.expiry,
        },
      },
    });
  };

  if (method.kind !== "card") {
    return (
      <SubscriptionShell title={method.label} subtitle="Review your selected payment method before continuing." compact>
        <WalletPaymentDetails method={method} onPay={payWithWallet} />
      </SubscriptionShell>
    );
  }

  return (
    <SubscriptionShell title={method.label} subtitle="Enter payment details. The card preview updates live while typing." compact>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <PremiumPaymentCard form={form} method={method} methodId={methodId} flipped={flipped} onToggle={() => setFlipped((current) => !current)} />
        <GlassCard className="p-5 sm:p-6">
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--bm-text-secondary)]">Card Holder Name</span>
              <input className={cn(inputClasses.field, typeClasses.body, "font-semibold uppercase")} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Alex Morgan" autoComplete="cc-name" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--bm-text-secondary)]">Card Number</span>
              <input className={cn(inputClasses.field, typeClasses.body, "font-mono font-semibold tracking-[0.08em]")} value={form.number} onChange={(event) => update("number", event.target.value)} placeholder="4242 4242 4242 4242" inputMode="numeric" autoComplete="cc-number" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--bm-text-secondary)]">Expiry Date</span>
                <input className={cn(inputClasses.field, typeClasses.body, "font-semibold")} value={form.expiry} onChange={(event) => update("expiry", event.target.value)} placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--bm-text-secondary)]">CVV</span>
                <input className={cn(inputClasses.field, typeClasses.body, "font-semibold")} value={form.cvv} onChange={(event) => update("cvv", event.target.value)} placeholder="123" inputMode="numeric" autoComplete="cc-csc" />
              </label>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-[var(--bm-hover-bg)] px-4 py-3 text-xs font-semibold text-[var(--bm-text-secondary)]">
              <Lock className="h-4 w-4 shrink-0" />
              <span>No payment is processed. This is only the frontend checkout flow.</span>
            </div>
            <PrimaryAction type="submit" disabled={!ready}>Pay</PrimaryAction>
          </form>
        </GlassCard>
      </div>
    </SubscriptionShell>
  );
}

function AddCardPage() {
  return <PaymentDetailsPage />;
}

function ProcessingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = getBasePath(location.pathname);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (location.state?.mockPaymentMethod) {
        writeSavedMethod(location.state.mockPaymentMethod);
      }
      navigate(`${base}/success`, { replace: true, state: location.state });
    }, 1700);

    return () => window.clearTimeout(timer);
  }, [base, location.state, navigate]);

  return (
    <SubscriptionShell title="Processing" compact>
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--bm-border)] bg-[var(--bm-bg-card)] shadow-sm backdrop-blur-[24px]">
          <Loader2 className="h-11 w-11 animate-spin text-[var(--bm-primary)]" />
        </div>
        <p className="mt-7 text-xl font-bold">Processing your payment...</p>
      </div>
    </SubscriptionShell>
  );
}

function SuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = getBasePath(location.pathname);

  return (
    <SubscriptionShell title="Success" compact>
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_20px_54px_rgba(16,185,129,0.20)]"
        >
          <CheckCircle2 className="h-16 w-16" />
        </motion.div>
        <h2 className="mt-8 text-3xl font-bold tracking-tight">Payment Successful</h2>
        <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-[var(--bm-text-secondary)]">Your subscription has been activated.</p>
        <PrimaryAction className="mt-8 max-w-sm" onClick={() => navigate(`${base}/payment-method`, { replace: true })}>
          Continue
        </PrimaryAction>
      </div>
    </SubscriptionShell>
  );
}

export default function SubscriptionPage({ step = "plans" }) {
  if (step === "payment-method") return <PaymentMethodPage />;
  if (step === "payment-details") return <PaymentDetailsPage />;
  if (step === "add-card") return <AddCardPage />;
  if (step === "processing") return <ProcessingPage />;
  if (step === "success") return <SuccessPage />;
  return <SubscriptionHome />;
}
