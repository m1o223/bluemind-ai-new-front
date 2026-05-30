import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

export const APP_NAME = "BlueMind AI";
export const LOGO_BLACK = "/bluemind-logo-black.png";
export const LOGO_WHITE = "/bluemind-logo-white.png";

export default function BrandLogo({
  showName = true,
  forceTheme,
  className,
  logoClassName,
  textClassName,
  alt = APP_NAME,
}) {
  const { resolvedTheme } = useApp();
  const theme = forceTheme || resolvedTheme;
  const logo = theme === "dark" ? LOGO_WHITE : LOGO_BLACK;

  return (
    <span className={cn("inline-flex items-center justify-center gap-2 min-w-0", className)}>
      <img
        src={logo}
        alt={alt}
        className={cn("object-contain flex-shrink-0 select-none", logoClassName)}
        draggable={false}
        style={{ background: "transparent" }}
      />
      {showName && (
        <span className={cn("font-semibold whitespace-nowrap", textClassName)}>
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
