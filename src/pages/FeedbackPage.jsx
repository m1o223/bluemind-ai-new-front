import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Star, MessageCircleHeart, ThumbsUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { waitForActionFeedback } from "@/lib/actionFeedback";
import { useApp } from "@/context/AppContext";

const feedbackTypes = [
  { id: "suggestion", labelKey: "suggestion", icon: Sparkles },
  { id: "bug", labelKey: "bugReport", icon: MessageCircleHeart },
  { id: "praise", labelKey: "praise", icon: ThumbsUp },
];

export default function FeedbackPage() {
  const { t } = useApp();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionState, setActionState] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) { toast.error(t("pleaseEnterFeedback")); return; }
    setIsSubmitting(true);
    setActionState("processing");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success(t("thankFeedback"));
    setActionState("success");
    await waitForActionFeedback();
    setRating(0);
    setFeedbackType("suggestion");
    setFormData({ name: "", email: "", message: "" });
    setIsSubmitting(false);
    setActionState("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[var(--bm-bg-app)] p-6 flex items-center justify-center"
      data-testid="feedback-page"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-xl bg-[var(--bm-primary)] flex items-center justify-center mx-auto mb-5">
            <MessageCircleHeart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold">{t("shareFeedback")}</h1>
          <p className="text-[var(--bm-text-secondary)] text-sm mt-2">{t("feedbackSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--bm-bg-card)] border border-[var(--bm-border-strong)] rounded-2xl p-8" data-testid="feedback-form">
          <div className="mb-6">
            <label className="text-sm text-[var(--bm-text-secondary)] mb-2 block">{t("rateExperience")}</label>
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoveredRating(star)} onMouseLeave={() => setHoveredRating(0)} className="p-1 transition-transform hover:scale-110" data-testid={`rating-star-${star}`}>
                  <Star className={cn("w-7 h-7", (hoveredRating || rating) >= star ? "fill-yellow-400 text-yellow-400" : "text-[var(--bm-border-strong)]")} />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-[var(--bm-text-secondary)] mb-2 block">{t("feedbackType")}</label>
            <div className="flex gap-2">
              {feedbackTypes.map((type) => (
                <button key={type.id} type="button" onClick={() => setFeedbackType(type.id)} className={cn("flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors", feedbackType === type.id ? "bg-[var(--bm-primary)] text-white" : "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)] hover:bg-[var(--bm-border-strong)]")} data-testid={`feedback-type-${type.id}`}>
                  <type.icon className="w-4 h-4" /><span className="hidden sm:inline">{t(type.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-[var(--bm-text-secondary)] mb-1 block">{t("nameOptional")}</label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t("yourName")} className="bg-[var(--bm-bg-elevated)] border-[var(--bm-border-strong)] text-white rounded-lg" data-testid="feedback-name-input" />
          </div>

          <div className="mb-4">
            <label className="text-sm text-[var(--bm-text-secondary)] mb-1 block">{t("emailOptional")}</label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder={t("yourEmail")} className="bg-[var(--bm-bg-elevated)] border-[var(--bm-border-strong)] text-white rounded-lg" data-testid="feedback-email-input" />
          </div>

          <div className="mb-6">
            <label className="text-sm text-[var(--bm-text-secondary)] mb-1 block">{t("yourFeedback")}</label>
            <Textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder={t("feedbackPlaceholder")} rows={4} className="bg-[var(--bm-bg-elevated)] border-[var(--bm-border-strong)] text-white rounded-lg resize-none" data-testid="feedback-message-input" />
          </div>

          <Button type="submit" disabled={isSubmitting || !formData.message.trim()} actionState={actionState} className="w-full py-6 text-base bg-[var(--bm-primary)] hover:bg-[var(--bm-primary-hover)] text-white rounded-xl disabled:opacity-50 transition-all duration-200 hover:scale-[1.01]" data-testid="feedback-submit-button">
            {isSubmitting ? t("sending") : <span className="flex items-center gap-2"><Send className="w-4 h-4" />{t("submitFeedback")}</span>}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
