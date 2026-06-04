import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ImagePlus, Trash2 } from "lucide-react";

import { getApiErrorMessage } from "@/services/api";
import { getProfile, updateProfile } from "@/services/profileService";
import { readStoredUser } from "@/services/storageKeys";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "#193B68",
  "#2563EB",
  "#059669",
  "#EA580C",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#BE123C",
];

function getInitial(user) {
  const source = user?.name || user?.email || "B";
  return source.trim().charAt(0).toUpperCase() || "B";
}

function getAvatarColor(user) {
  const source = `${user?.name || ""}${user?.email || ""}` || "BlueMind";
  const hash = Array.from(source).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function createAvatarDataUrl(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    const sourceSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const sourceX = ((image.naturalWidth || image.width) - sourceSize) / 2;
    const sourceY = ((image.naturalHeight || image.height) - sourceSize) / 2;

    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function ProfileSettingsSection({ mobile = false, isDark = false }) {
  const choosePhotoRef = useRef(null);
  const takePhotoRef = useRef(null);
  const [user, setUser] = useState(() => readStoredUser());
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [error, setError] = useState("");

  const displayName = user?.name || "BlueMind User";
  const email = user?.email || "";
  const avatarUrl = user?.avatarUrl || "";
  const birthday = user?.birthday || "";
  const memberSince = formatDate(user?.createdAt);
  const avatarColor = useMemo(() => getAvatarColor(user), [user]);

  useEffect(() => {
    let cancelled = false;

    getProfile()
      .then((profile) => {
        if (!cancelled && profile) {
          setUser(profile);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Could not load profile."));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfilePatch = async (patch) => {
    const next = await updateProfile(patch);

    if (next) {
      setUser(next);
    }

    return next;
  };

  const handleAvatarFile = async (file) => {
    if (!file) return;

    const previousUser = user;
    setSavingAvatar(true);
    setAvatarMenuOpen(false);

    try {
      const avatarDataUrl = await createAvatarDataUrl(file);
      setUser((current) => ({ ...current, avatarUrl: avatarDataUrl }));
      await saveProfilePatch({ avatarUrl: avatarDataUrl });
      toast.success("Profile picture updated");
    } catch (err) {
      setUser(previousUser);
      toast.error(getApiErrorMessage(err, err.message || "Could not update profile picture."));
    } finally {
      setSavingAvatar(false);
      if (choosePhotoRef.current) choosePhotoRef.current.value = "";
      if (takePhotoRef.current) takePhotoRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setSavingAvatar(true);
    setAvatarMenuOpen(false);

    try {
      await saveProfilePatch({ avatarUrl: "" });
      toast.success("Profile picture removed");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not remove profile picture."));
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleBirthdayChange = async (event) => {
    const nextBirthday = event.target.value;
    const previousUser = user;
    setSavingBirthday(true);
    setUser((current) => ({ ...current, birthday: nextBirthday }));

    try {
      await saveProfilePatch({ birthday: nextBirthday });
      toast.success("Birthday saved");
    } catch (err) {
      setUser(previousUser);
      toast.error(getApiErrorMessage(err, "Could not save birthday."));
    } finally {
      setSavingBirthday(false);
    }
  };

  const pageText = isDark ? "text-white" : "text-[#111827]";
  const mutedText = isDark ? "text-[#A7A7A7]" : "text-[#64748B]";
  const rowBorder = isDark ? "border-white/[0.08]" : "border-[#E5E7EB]";
  const fieldBg = isDark ? "bg-white/[0.05]" : "bg-white";

  return (
    <section className={cn("mx-auto w-full", mobile ? "max-w-[430px]" : "max-w-xl")} data-testid="profile-settings-section">
      <div className="flex flex-col items-center pt-2 text-center">
        <button
          type="button"
          onClick={() => setAvatarMenuOpen(true)}
          className={cn(
            "group relative flex items-center justify-center overflow-hidden rounded-full shadow-sm ring-1 ring-black/5 transition-transform active:scale-95",
            mobile ? "h-24 w-24" : "h-28 w-28",
          )}
          style={avatarUrl ? undefined : { backgroundColor: avatarColor }}
          aria-label="Change profile picture"
          data-testid="profile-avatar-button"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className={cn("font-extrabold text-white", mobile ? "text-4xl" : "text-5xl")}>
              {getInitial(user)}
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/45 py-2 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Change
          </span>
        </button>

        <h2 className={cn("mt-5 text-2xl font-extrabold tracking-tight", pageText)}>{displayName}</h2>
        {email && <p className={cn("mt-1 text-sm font-semibold", mutedText)}>{email}</p>}
        {error && <p className="mt-4 text-sm font-semibold text-red-500">{error}</p>}
      </div>

      <div className={cn("mt-9 overflow-hidden rounded-[22px] border", rowBorder, fieldBg)}>
        <label className={cn("flex min-h-[72px] items-center justify-between gap-4 border-b px-4", rowBorder)}>
          <span className="text-left">
            <span className={cn("block text-sm font-extrabold", pageText)}>Birthday</span>
            <span className={cn("mt-1 block text-sm font-semibold", mutedText)}>
              {birthday ? formatDate(birthday) : "Add Birthday >"}
            </span>
          </span>
          <input
            type="date"
            value={birthday}
            onChange={handleBirthdayChange}
            disabled={savingBirthday}
            className={cn(
              "min-h-11 rounded-xl border px-3 text-sm font-bold outline-none transition-colors",
              isDark
                ? "border-white/[0.12] bg-[#1f1f1f] text-white focus:border-white/30"
                : "border-[#CBD5E1] bg-[#F8FAFC] text-[#111827] focus:border-[#193B68]",
            )}
            data-testid="profile-birthday-input"
          />
        </label>

        <div className="flex min-h-[72px] items-center justify-between gap-4 px-4">
          <span className="text-left">
            <span className={cn("block text-sm font-extrabold", pageText)}>Member Since</span>
            <span className={cn("mt-1 block text-sm font-semibold", mutedText)}>
              {memberSince || "Account creation date unavailable"}
            </span>
          </span>
        </div>
      </div>

      {avatarMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4" onClick={() => setAvatarMenuOpen(false)}>
          <div
            className={cn(
              "w-full max-w-sm rounded-[26px] border p-4 shadow-2xl",
              isDark ? "border-white/[0.10] bg-[#202020] text-white" : "border-[#E5E7EB] bg-white text-[#111827]",
            )}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Change Profile Picture"
          >
            <p className="mb-3 text-center text-base font-extrabold">Change Profile Picture</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => takePhotoRef.current?.click()}
                disabled={savingAvatar}
                className={cn("flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-bold transition-colors", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[#F1F5F9]")}
              >
                <Camera className="h-5 w-5" />
                Take Photo
              </button>
              <button
                type="button"
                onClick={() => choosePhotoRef.current?.click()}
                disabled={savingAvatar}
                className={cn("flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-bold transition-colors", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[#F1F5F9]")}
              >
                <ImagePlus className="h-5 w-5" />
                Choose Photo
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={savingAvatar}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-5 w-5" />
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={takePhotoRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(event) => handleAvatarFile(event.target.files?.[0])}
      />
      <input
        ref={choosePhotoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleAvatarFile(event.target.files?.[0])}
      />
    </section>
  );
}
