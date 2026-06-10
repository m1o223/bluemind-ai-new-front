import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

export const APP_NAME = "BlueMind AI";
export const LOGO_BLACK = "/bluemind-logo-black.png";
export const LOGO_WHITE = "/bluemind-logo-white.png";
export const LOGO_BLACK_SMALL = "/bluemind-logo-black-small.png";
export const LOGO_WHITE_SMALL = "/bluemind-logo-white-small.png";

export default function BrandLogo({
  showName = true,
  forceTheme,
  small = false,
  className,
  logoClassName,
  textClassName,
  alt = APP_NAME,
}) {
  const { resolvedTheme } = useApp();
  const theme = forceTheme || resolvedTheme;
  const logo = theme === "dark"
    ? small ? LOGO_WHITE_SMALL : LOGO_WHITE
    : small ? LOGO_BLACK_SMALL : LOGO_BLACK;

  return (
    <span className={cn("inline-flex items-center justify-center gap-2 min-w-0", className)}>
      <img
        src={logo}
        alt={alt}
        className={cn(
          "object-contain flex-shrink-0 select-none",
          small && "scale-[1.06] contrast-125",
          logoClassName
        )}
        draggable={false}
        decoding="async"
        style={{
          background: "transparent",
          imageRendering: "auto",
          filter: small && theme === "dark" ? "drop-shadow(0 0 0.35px rgba(255,255,255,0.85))" : undefined
        }}
      />
      {showName && (
        <span className={cn("font-semibold whitespace-nowrap", textClassName)}>
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
