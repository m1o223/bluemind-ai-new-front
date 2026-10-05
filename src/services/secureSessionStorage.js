import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  hydrateAuthSessionSecrets,
  readStoredAccessToken,
  readStoredRefreshSession,
} from "./storageKeys";

const BlueMindSecureSession = registerPlugin("BlueMindSecureSession");
let faceIDUnlockedForProcess = false;

function isNativeIOS() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function persistSecureAuthSession(token, refreshSession) {
  if (!isNativeIOS() || !token) return;
  await BlueMindSecureSession.save({
    token,
    refreshSession: refreshSession ? JSON.stringify(refreshSession) : "",
  });
  const status = await BlueMindSecureSession.faceIDStatus();
  if (status?.enabled) faceIDUnlockedForProcess = true;
}

export async function hydrateSecureAuthSession() {
  if (!isNativeIOS()) return false;

  const status = await BlueMindSecureSession.faceIDStatus();
  if (status?.enabled) return false;

  const result = await BlueMindSecureSession.load();
  const secureSession = result?.session;
  if (secureSession?.token) {
    let refreshSession = null;
    try {
      refreshSession = JSON.parse(secureSession.refreshSession || "null");
    } catch {
      refreshSession = null;
    }
    hydrateAuthSessionSecrets(secureSession.token, refreshSession);
    return true;
  }

  const existingToken = readStoredAccessToken();
  if (!existingToken) return false;

  const refreshSession = readStoredRefreshSession();
  await persistSecureAuthSession(existingToken, refreshSession);
  return true;
}

export async function clearSecureAuthSession() {
  if (!isNativeIOS()) return;
  await BlueMindSecureSession.clear();
}

function hydrateNativeSession(session) {
  if (!session?.token) return false;
  let refreshSession = null;
  try {
    refreshSession = JSON.parse(session.refreshSession || "null");
  } catch {
    refreshSession = null;
  }
  hydrateAuthSessionSecrets(session.token, refreshSession);
  return true;
}

export async function getFaceIDStatus() {
  if (!isNativeIOS()) {
    return { available: false, enabled: false, hasProtectedSession: false };
  }
  return BlueMindSecureSession.faceIDStatus();
}

export async function setNativePrivacyShield(visible) {
  if (!isNativeIOS()) return;
  await BlueMindSecureSession.setPrivacyShield({ visible: Boolean(visible) });
}

export async function unlockSecureAuthSessionWithFaceID() {
  if (!isNativeIOS()) return false;
  const result = await BlueMindSecureSession.unlockWithFaceID();
  const hydrated = hydrateNativeSession(result?.session);
  if (!hydrated) {
    const error = new Error("The Face ID protected session is no longer available. Use Login.");
    error.code = "FACE_ID_SESSION_INVALID";
    throw error;
  }
  faceIDUnlockedForProcess = hydrated;
  return hydrated;
}

export async function enableFaceIDLock() {
  if (!isNativeIOS()) return { enabled: false };
  const result = await BlueMindSecureSession.enableFaceID();
  faceIDUnlockedForProcess = result?.enabled === true;
  return result;
}

export async function disableFaceIDLock() {
  if (!isNativeIOS()) return { enabled: false };
  const result = await BlueMindSecureSession.disableFaceID();
  faceIDUnlockedForProcess = false;
  return result;
}

export async function prepareSecureAuthSessionForRestore() {
  if (!isNativeIOS()) return true;
  const status = await getFaceIDStatus();
  if (status.enabled) {
    if (faceIDUnlockedForProcess) return true;
    return unlockSecureAuthSessionWithFaceID();
  }
  await hydrateSecureAuthSession();
  return true;
}

export function lockFaceIDSessionForBackground() {
  faceIDUnlockedForProcess = false;
}

export function isFaceIDUnlockedForProcess() {
  return faceIDUnlockedForProcess;
}
