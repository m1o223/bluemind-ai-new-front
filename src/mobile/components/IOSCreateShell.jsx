import { useState } from "react";
import { ArrowLeft, Clock3, Image, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import IOSNativeGlassButton from "@/mobile/components/IOSNativeGlassButton";
import IOSStudioSegmentedControl from "@/mobile/components/IOSStudioSegmentedControl";
import IOSStudioComposer from "@/mobile/components/IOSStudioComposer";
import IOSStudioImageGallery from "@/mobile/components/IOSStudioImageGallery";
import { presentNativeIOSStudioCustomize } from "@/mobile/nativeGlassBridge";
import { BLUE_MIND_COLORS } from "@/theme/colors";

const IMAGE_GROUPS = [
  { id: "aspectRatio", title: "Aspect Ratio", options: ["1:1", "4:5", "9:16", "16:9"] },
  { id: "quality", title: "Quality", options: ["Standard", "High", "Ultra"] },
  { id: "count", title: "Number of Images", options: ["1", "2", "4"] },
  { id: "style", title: "Style", options: ["Auto", "Realistic", "Cinematic", "Anime", "Character", "Illustration"] },
];
// Placeholder-only option arrays; backend capabilities can replace them later.
const VIDEO_GROUPS = [
  { id: "aspectRatio", title: "Aspect Ratio", options: ["16:9", "9:16", "1:1"] },
  { id: "duration", title: "Duration", options: ["Default"] },
  { id: "quality", title: "Quality", options: ["Standard"] },
  { id: "count", title: "Number of Videos", options: ["1"] },
  { id: "style", title: "Style / Preset", options: ["Auto", "Cinematic", "Story", "Social", "Product"] },
];
const INITIAL_IMAGE = { aspectRatio: "1:1", quality: "Standard", count: "1", style: "Auto" };
const INITIAL_VIDEO = { aspectRatio: "16:9", duration: "Default", quality: "Standard", count: "1", style: "Auto" };
const HISTORY_FILTERS = [
  { id: "all", label: "All" },
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
];

function CreationPanel({ kind, prompt, setPrompt, settings, setSettings, groups }) {
  const customize = async (focusSetting) => {
    const result = await presentNativeIOSStudioCustomize({ kind, groups, values: settings, focusSetting, primaryColor: BLUE_MIND_COLORS.primary });
    if (result?.confirmed && result.values) setSettings((current) => ({ ...current, ...result.values }));
  };
  const ModeIcon = kind === "image" ? Image : Video;

  return (
    <section className="absolute inset-0 flex min-h-0 flex-col" aria-label={`Create ${kind}`}>
      <div className={`flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] ${kind === "image" ? "pt-[calc(112px+env(safe-area-inset-top))] pb-[calc(104px+env(safe-area-inset-bottom))]" : "pt-[calc(136px+env(safe-area-inset-top))] pb-[calc(104px+env(safe-area-inset-bottom))]"}`}>
        {kind === "video" && (
          <div className="mx-auto flex max-w-[520px] flex-col items-center px-1 text-center">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-[19px] border border-white/[0.09] bg-white/[0.055] text-white/90 backdrop-blur-2xl"><ModeIcon className="h-6 w-6" aria-hidden="true" /></span>
            <h1 id="studio-video-title" className="text-[25px] font-bold tracking-[-0.025em] text-white">Create a video</h1>
            <p className="mt-2 max-w-[310px] text-[14px] leading-5 text-white/48">Describe your idea, then adjust only the details you care about.</p>
          </div>
        )}
        {kind === "image" && <IOSStudioImageGallery />}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[540px]">
        <IOSStudioComposer value={prompt} onChange={setPrompt} placeholder={`Describe the ${kind} you want to create...`} onCustomize={() => customize()} primaryColor={BLUE_MIND_COLORS.primary} />
      </div>
    </section>
  );
}

function HistoryPanel() {
  const [filter, setFilter] = useState("all");
  return <section className="absolute inset-0 flex min-h-0 flex-col pt-[calc(128px+env(safe-area-inset-top))]" aria-labelledby="studio-history-title"><div className="mx-auto w-full max-w-[540px]"><h1 id="studio-history-title" className="text-[25px] font-bold tracking-[-0.025em] text-white">History</h1><div className="mt-5"><IOSStudioSegmentedControl controlID="studio-history-filters" items={HISTORY_FILTERS} value={filter} onChange={setFilter} primaryColor={BLUE_MIND_COLORS.primary} ariaLabel="History filters" /></div><div className="mt-16 text-center"><Clock3 className="mx-auto h-8 w-8 text-white/30" aria-hidden="true" /><p className="mt-4 text-[16px] font-semibold text-white/75">No Studio history yet</p><p className="mx-auto mt-1 max-w-[280px] text-[13px] leading-5 text-white/38">Generated {filter === "all" ? "images and videos" : filter} will appear here after generation is connected.</p></div></div></section>;
}

export default function IOSCreateShell() {
  const navigate = useNavigate();
  const [section, setSection] = useState("image");
  const [imagePrompt, setImagePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [imageSettings, setImageSettings] = useState(INITIAL_IMAGE);
  const [videoSettings, setVideoSettings] = useState(INITIAL_VIDEO);
  return (
    <div className="relative h-full min-h-0 overflow-hidden" data-testid="ios-create-shell">
      {section === "image" && <CreationPanel kind="image" prompt={imagePrompt} setPrompt={setImagePrompt} settings={imageSettings} setSettings={setImageSettings} groups={IMAGE_GROUPS} />}
      {section === "video" && <CreationPanel kind="video" prompt={videoPrompt} setPrompt={setVideoPrompt} settings={videoSettings} setSettings={setVideoSettings} groups={VIDEO_GROUPS} />}
      {section === "history" && <HistoryPanel />}
      <div className="absolute inset-x-0 top-0 z-20 pt-[calc(8px+env(safe-area-inset-top))]">
        <header className="relative flex min-h-[48px] items-center justify-center"><IOSNativeGlassButton id="studio-back" symbol="chevron.left" label="Back" onClick={() => navigate(-1)} className="absolute left-0 grid h-11 w-11 place-items-center rounded-full text-white active:bg-white/[0.08]"><ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" /></IOSNativeGlassButton><span className="text-[17px] font-semibold tracking-[-0.01em] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.72)]">BlueMind Studio</span></header>
        <div className="mx-auto mt-2 w-full max-w-[540px]"><IOSStudioSegmentedControl value={section} onChange={setSection} primaryColor={BLUE_MIND_COLORS.primary} /></div>
      </div>
    </div>
  );
}
