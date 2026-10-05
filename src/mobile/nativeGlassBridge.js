import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeGlass = registerPlugin("BlueMindNativeGlass");
export const NATIVE_GLASS_AUDIT_BUILD = "BM-AUDIT-20260827-1600-5d0271b-dirty";

export async function prepareNativeGlassExperiment() {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    const result = await NativeGlass.isSupported();
    console.info("[BlueMindNativeGlass][Bridge] supported", NATIVE_GLASS_AUDIT_BUILD, result?.supported === true, result?.auditBuild || "missing-native-build");
    return result?.supported === true;
  } catch {
    return false;
  }
}

export async function showNativeIOSGlobalToast({ type = "info", message, duration } = {}) {
  if (Capacitor.getPlatform() !== "ios" || !message) return false;
  try {
    await NativeGlass.showGlobalToast({
      type,
      message: String(message),
      duration: Number.isFinite(duration) ? duration : undefined,
    });
    return true;
  } catch {
    return false;
  }
}

export async function setNativeGlassVisible(visible) {
  try {
    await NativeGlass.setVisible({ visible });
    document.documentElement.classList.toggle("bm-native-glass-active", visible);
  } catch {
    document.documentElement.classList.remove("bm-native-glass-active");
  }
}

export async function setNativeAuthBackVisible(visible, { owner, isDark, isRTL } = {}) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    await NativeGlass.setAuthBackVisible({
      visible,
      owner: String(owner || ""),
      isDark: isDark !== false,
      isRTL: isRTL === true,
    });
    document.documentElement.classList.toggle("bm-native-auth-back-active", visible);
    return true;
  } catch {
    document.documentElement.classList.remove("bm-native-auth-back-active");
    return false;
  }
}

export async function setNativeSettingsCloseVisible(visible, { isDark } = {}) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    await NativeGlass.setSettingsCloseVisible({ visible, isDark: isDark !== false });
    return true;
  } catch {
    return false;
  }
}

export async function setNativeSettingsPresentation({ visible, isDark, offsetY = 0 }) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    await NativeGlass.setSettingsPresentation({
      visible,
      isDark: isDark !== false,
      offsetY: Number.isFinite(offsetY) ? offsetY : 0,
    });
    return true;
  } catch {
    return false;
  }
}

export async function setNativeSettingsBackVisible(visible, { isDark } = {}) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    const result = await NativeGlass.setSettingsBackVisible({ visible, isDark: isDark !== false });
    return result?.visible === visible;
  } catch {
    return false;
  }
}

export async function setNativeRemindersHeaderVisible(visible, { isDark } = {}) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    const result = await NativeGlass.setRemindersHeaderVisible({ visible, isDark: isDark !== false });
    return result?.visible === visible;
  } catch {
    return false;
  }
}

export async function setNativeReminderFormCloseVisible(visible, { isDark } = {}) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    const result = await NativeGlass.setReminderFormCloseVisible({ visible, isDark: isDark !== false });
    return result?.visible === visible;
  } catch {
    return false;
  }
}

export async function setNativeScheduleHeaderVisible(visible, { isDark } = {}) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    const result = await NativeGlass.setScheduleHeaderVisible({ visible, isDark: isDark !== false });
    return result?.visible === visible;
  } catch {
    return false;
  }
}

export async function setNativeActionControls(controls, { isDark } = {}) {
  if (Capacitor.getPlatform() !== "ios") return false;
  try {
    await NativeGlass.setNativeActionControls({ controls, isDark: isDark !== false });
    return true;
  } catch {
    return false;
  }
}

export async function setNativeIOSStudioSegmentedControl({ visible, controlID, items, selectedIndex, frame, primaryColor, ariaLabel } = {}) {
  if (Capacitor.getPlatform() !== "ios") return false;
  try {
    const result = await NativeGlass.setStudioSegmentedControl({ visible, controlID, items, selectedIndex, frame, primaryColor, ariaLabel });
    return result?.visible === visible;
  } catch {
    return false;
  }
}

export async function setNativeIOSStudioComposer({ visible, text, placeholder, canGenerate, primaryColor } = {}) {
  if (Capacitor.getPlatform() !== "ios") return false;
  try {
    const result = await NativeGlass.setStudioComposer({ visible, text, placeholder, canGenerate, primaryColor });
    return result?.visible === visible;
  } catch {
    return false;
  }
}

export async function presentNativeIOSAllSchedules({ schedules, requestId, isDark } = {}) {
  if (Capacitor.getPlatform() !== "ios") return false;
  try {
    await NativeGlass.presentAllSchedules({ schedules, requestId, isDark: isDark !== false });
    return true;
  } catch {
    return false;
  }
}

export async function presentNativeIOSChatEntrySheet({ kind, privateChats = [], requestId, isDark } = {}) {
  if (Capacitor.getPlatform() !== "ios") return false;
  try {
    await NativeGlass.presentChatEntrySheet({ kind, privateChats, requestId, isDark: isDark !== false });
    return true;
  } catch (error) {
    console.warn("Could not present the native iOS chat entry sheet", error);
    return false;
  }
}

export async function setNativeGlassScreen(screen) {
  if (Capacitor.getPlatform() !== "ios") return;

  try {
    await NativeGlass.setScreen({ screen });
  } catch {
    // Native Glass is optional and unavailable outside the iOS experiment.
  }
}

export async function openNativeIOSAppSettings() {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    await NativeGlass.openAppSettings();
    return true;
  } catch (error) {
    console.warn("Could not open the native iOS app Settings page", error);
    return false;
  }
}

export async function getNativeIOSAppLanguage() {
  if (Capacitor.getPlatform() !== "ios") return null;

  try {
    const result = await NativeGlass.getAppLanguage();
    return String(result?.language || "").trim() || null;
  } catch {
    return null;
  }
}

export async function getNativeIOSNotificationStatus() {
  if (Capacitor.getPlatform() !== "ios") return null;
  try {
    return await NativeGlass.notificationAuthorizationStatus();
  } catch {
    return null;
  }
}

export async function requestNativeIOSNotificationAuthorization() {
  if (Capacitor.getPlatform() !== "ios") return null;
  try {
    return await NativeGlass.requestNotificationAuthorization();
  } catch (error) {
    console.warn("Could not request native iOS notification authorization", error);
    throw error;
  }
}

export async function presentNativeIOSSelection({ title, options, selectedValue, requestId, anchorRect }) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    await NativeGlass.presentSelection({ title, options, selectedValue, requestId, anchorRect });
    return true;
  } catch (error) {
    console.warn("Could not present the native iOS selection menu", error);
    return false;
  }
}

export async function presentNativeIOSStudioCustomize({ kind, groups, values, focusSetting, primaryColor } = {}) {
  if (Capacitor.getPlatform() !== "ios") return null;
  try {
    return await NativeGlass.presentStudioCustomize({ kind, groups, values, focusSetting, primaryColor });
  } catch (error) {
    console.warn("Could not present the native iOS Studio customization sheet", error);
    return null;
  }
}

export async function presentNativeIOSConfirmation({ title, message, confirmTitle, cancelTitle = "Cancel", destructive = false, requestId }) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    await NativeGlass.presentConfirmation({ title, message, confirmTitle, cancelTitle, destructive, requestId });
    return true;
  } catch (error) {
    console.warn("Could not present the native iOS confirmation", error);
    return false;
  }
}

export async function presentNativeIOSSecurePrompt({ title, message, placeholder, confirmTitle, cancelTitle = "Cancel", destructive = false, requestId }) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    await NativeGlass.presentSecurePrompt({ title, message, placeholder, confirmTitle, cancelTitle, destructive, requestId });
    return true;
  } catch (error) {
    console.warn("Could not present the native iOS secure prompt", error);
    return false;
  }
}

export async function presentNativeIOSTextPrompt({ title, message, placeholder, value = "", confirmTitle, cancelTitle = "Cancel", requestId }) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    await NativeGlass.presentSecurePrompt({ title, message, placeholder, value, confirmTitle, cancelTitle, destructive: false, secure: false, requestId });
    return true;
  } catch (error) {
    console.warn("Could not present the native iOS text prompt", error);
    return false;
  }
}

export async function presentNativeIOSWritingAttachmentPicker(source) {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    await NativeGlass.presentWritingAttachmentPicker({ source });
    return true;
  } catch (error) {
    console.warn("Could not present the native iOS writing attachment picker", error);
    return false;
  }
}

export async function presentNativeIOSChatAttachmentSheet() {
  if (Capacitor.getPlatform() !== "ios") return false;

  try {
    const result = await NativeGlass.presentChatAttachmentSheet();
    return result?.presented === true;
  } catch (error) {
    console.warn("Could not present the native iOS chat attachment sheet", error);
    return false;
  }
}

export async function updateNativeGlassState(state) {
  try {
    await NativeGlass.updateState(state);
  } catch {
    // Native Glass is optional and unavailable on web, Android, and iOS below 26.
  }
}

export async function updateNativeGlassAudioLevels(levels) {
  try {
    await NativeGlass.updateAudioLevels({ levels });
  } catch {
    // Audio visualization is optional outside the iOS 26 experiment.
  }
}

const attachmentPreviewCache = new WeakMap();
const attachmentOriginalCache = new WeakMap();

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function createAttachmentThumbnail(file) {
  if (!file) return "";
  if (attachmentPreviewCache.has(file)) return attachmentPreviewCache.get(file);

  const thumbnailPromise = (async () => {
    try {
      const bitmap = await createImageBitmap(file);
      const maximumSide = 640;
      const scale = Math.min(1, maximumSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();
      return canvas.toDataURL("image/jpeg", 0.82);
    } catch {
      return readFileAsDataUrl(file);
    }
  })();

  attachmentPreviewCache.set(file, thumbnailPromise);
  return thumbnailPromise;
}

async function readAttachmentOriginal(file) {
  if (!file) return "";
  if (attachmentOriginalCache.has(file)) return attachmentOriginalCache.get(file);
  const originalPromise = readFileAsDataUrl(file).catch(() => "");
  attachmentOriginalCache.set(file, originalPromise);
  return originalPromise;
}

export async function prepareNativeGlassAttachments(attachments) {
  return Promise.all((attachments || []).map(async (attachment) => {
    const mimeType = String(attachment.file?.type || attachment.mimeType || "");
    const isImage = attachment.type === "image" || mimeType.startsWith("image/");
    const previewData = isImage
      ? (String(attachment.previewData || "")
        || (String(attachment.previewUrl || "").startsWith("data:") ? String(attachment.previewUrl) : "")
        || await createAttachmentThumbnail(attachment.file))
      : "";
    return {
      // Native preview identity must remain stable while an optimistic attachment's
      // server-facing id is replaced after upload.
      id: String(attachment.clientId || attachment.id || ""),
      name: String(attachment.name || "Image"),
      type: String(attachment.type || (isImage ? "image" : "document")),
      mimeType,
      size: Number(attachment.size || attachment.file?.size || 0),
      previewData,
      originalData: isImage
        ? (String(attachment.originalData || "") || await readAttachmentOriginal(attachment.file) || previewData)
        : "",
      assetIdentifier: String(attachment.assetIdentifier || ""),
      uploadState: String(attachment.uploadState || "uploaded"),
    };
  }));
}

export async function addNativeGlassActionListener(listener) {
  let lastEventId = 0;

  return NativeGlass.addListener("action", (event) => {
    const eventId = Number(event?.eventId || 0);
    if (eventId && eventId <= lastEventId) return;
    if (eventId) lastEventId = eventId;
    console.info("[BlueMindNativeGlass][Bridge] forward", event?.action || "missing-action", event?.eventId || "missing-event-id", event?.nativeBuild || "missing-native-build");
    listener(event);
  });
}
