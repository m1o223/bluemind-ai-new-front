import { useEffect } from "react";

function isActionTarget(target) {
  return Boolean(target?.closest?.(
    "button:not(:disabled):not([aria-disabled='true']), a[href], [role='button']:not([aria-disabled='true']), [role='menuitem']:not([aria-disabled='true'])",
  ));
}

export default function BlueMindInteractionProvider() {
  useEffect(() => {
    function handlePointerDown(event) {
      if (event.pointerType !== "touch" || !isActionTarget(event.target)) return;
      navigator.vibrate?.(8);
    }

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return null;
}
