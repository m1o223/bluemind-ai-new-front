import { cn } from "@/lib/utils";

export default function BlueMindAnimatedBackground({ className }) {
  return (
    <div className={cn("bm-ai-flow-bg", className)} aria-hidden="true">
      <div className="bm-ai-flow-layer bm-ai-flow-white" />
      <div className="bm-ai-flow-layer bm-ai-flow-blue-top" />
      <div className="bm-ai-flow-layer bm-ai-flow-blue-bottom" />
      <div className="bm-ai-flow-layer bm-ai-flow-soft-ridge" />
    </div>
  );
}
