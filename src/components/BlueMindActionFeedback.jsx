import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function BlueMindActionFeedback({
  state = "processing",
  className,
  dotClassName,
  checkClassName,
  label,
}) {
  const isSuccess = state === "success";
  const isError = state === "error";

  return (
    <span
      className={cn(
        "bm-action-feedback inline-flex h-5 min-w-5 items-center justify-center",
        isSuccess && "bm-action-feedback-success",
        isError && "bm-action-feedback-error",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label || (isSuccess ? "Completed" : isError ? "Failed" : "Processing")}
    >
      {isSuccess ? (
        <Check className={cn("bm-action-check h-4 w-4", checkClassName)} />
      ) : (
        <span className="bm-action-dots" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span key={index} className={cn("bm-action-dot", dotClassName)} style={{ "--bm-dot-index": index }} />
          ))}
        </span>
      )}
    </span>
  );
}

export function BlueMindLoadingDots(props) {
  return <BlueMindActionFeedback state="processing" {...props} />;
}

export default BlueMindActionFeedback;
