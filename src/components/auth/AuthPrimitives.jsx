import { ArrowLeft, Check, Eye, EyeOff, Mail, Lock } from "lucide-react";

export function GoogleIcon() {
  return (
    <img
      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
      alt=""
      aria-hidden="true"
      className="h-5 w-5"
    />
  );
}

export function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M16.18 12.62c-.03-2.75 2.25-4.08 2.35-4.14-1.29-1.88-3.28-2.14-3.97-2.17-1.67-.17-3.29 1-4.14 1-.87 0-2.18-.98-3.6-.95-1.83.03-3.54 1.09-4.48 2.74-1.94 3.36-.49 8.3 1.36 11.02.93 1.33 2.02 2.82 3.43 2.77 1.38-.06 1.9-.89 3.57-.89 1.65 0 2.14.89 3.59.86 1.49-.03 2.43-1.34 3.32-2.68 1.08-1.54 1.51-3.06 1.53-3.14-.03-.01-2.93-1.12-2.96-4.42ZM13.47 4.54c.74-.92 1.24-2.17 1.1-3.43-1.07.05-2.41.74-3.18 1.63-.69.79-1.31 2.09-1.15 3.31 1.21.09 2.46-.61 3.23-1.51Z" />
    </svg>
  );
}

export function AuthPage({ children, testId, mobile = false }) {
  return (
    <main
      className={`bg-black text-white ${mobile ? "fixed inset-0 overflow-y-auto" : "min-h-screen overflow-hidden"}`}
      data-testid={testId}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col items-center justify-center px-6 py-10">
        {children}
      </div>
    </main>
  );
}

export function AuthBackButton({ onClick, label = "Back" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="bm-mobile-glass-control fixed left-5 top-[calc(env(safe-area-inset-top)+20px)] z-20"
    >
      <ArrowLeft />
    </button>
  );
}

export function AuthHeader({ title, description }) {
  return (
    <header className="mb-8 text-center">
      <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.01em] text-white sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mx-auto mt-3 max-w-[330px] text-base font-medium leading-6 text-white/54">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function AuthButton({
  children,
  onClick,
  type = "button",
  variant = "glass",
  icon,
  disabled = false,
  testId,
}) {
  const isPrimary = variant === "primary";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`relative flex h-[58px] w-full items-center justify-center rounded-[29px] px-6 text-[17px] font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 ${
        isPrimary
          ? "border border-[#7db7ff]/[0.22] bg-[rgba(25,91,164,0.72)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_46px_rgba(25,91,164,0.30)] backdrop-blur-[24px] hover:bg-[rgba(31,111,199,0.78)]"
          : "border border-white/[0.075] bg-white/[0.09] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_42px_rgba(0,0,0,0.28)] backdrop-blur-[24px] hover:bg-white/[0.13]"
      }`}
    >
      {icon ? (
        <span className="absolute left-6 flex h-5 w-5 items-center justify-center text-white/88">
          {icon}
        </span>
      ) : null}
      <span className="px-8 text-center">{children}</span>
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="my-6 flex w-full items-center gap-4" aria-hidden="true">
      <div className="h-px flex-1 bg-white/[0.085]" />
      <span className="text-xs font-semibold tracking-[0.22em] text-white/42">OR</span>
      <div className="h-px flex-1 bg-white/[0.085]" />
    </div>
  );
}

export function AuthInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  testId,
  autoComplete,
  showPasswordToggle = false,
  passwordVisible = false,
  onTogglePassword,
}) {
  const Icon = type === "email" ? Mail : Lock;
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-white/74">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-white" />
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          data-testid={testId}
          className={`h-[58px] w-full rounded-[29px] border border-white/[0.075] bg-white/[0.09] pl-[60px] ${showPasswordToggle ? "pr-[60px]" : "pr-6"} text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_42px_rgba(0,0,0,0.20)] outline-none backdrop-blur-[24px] transition placeholder:text-white/34 focus:border-white/[0.16] focus:bg-white/[0.13] focus:ring-2 focus:ring-white/[0.06]`}
        />
        {showPasswordToggle ? (
          <button
            type="button"
            onClick={onTogglePassword}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            className="absolute right-5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white transition hover:bg-white/[0.08]"
          >
            {passwordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        ) : null}
      </span>
    </label>
  );
}

export function PasswordChecklist({ requirements }) {
  return (
    <div className="space-y-2">
      {requirements.map((requirement) => (
        <div key={requirement.label} className="flex items-center gap-3 text-sm font-medium">
          <span className={requirement.met ? "text-[var(--bm-primary)]" : "text-white/38"}>
            {requirement.met ? <Check className="h-4 w-4" /> : <span className="block h-3.5 w-3.5 rounded-full border border-current" />}
          </span>
          <span className={requirement.met ? "text-white/86" : "text-white/42"}>
            {requirement.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AuthError({ children, testId }) {
  if (!children) return null;
  return (
    <p className="text-sm font-semibold text-red-400" data-testid={testId}>
      {children}
    </p>
  );
}
