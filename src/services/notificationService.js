import api, { unwrapApiResponse } from "./api";

const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};
const WEB_PUSH_PUBLIC_KEY = process.env.REACT_APP_WEB_PUSH_PUBLIC_KEY || process.env.REACT_APP_FIREBASE_VAPID_KEY;

function hasFirebaseConfig() {
  return Object.values(FIREBASE_CONFIG).every(Boolean);
}

function hasWindowObject() {
  return typeof window !== "undefined";
}

function hasNavigatorObject() {
  return typeof navigator !== "undefined";
}

function getUserAgent() {
  return hasNavigatorObject() ? navigator.userAgent || "" : "";
}

function getNotificationApi() {
  if (!hasWindowObject()) return null;
  return typeof window.Notification !== "undefined" ? window.Notification : null;
}

function getNotificationPermission() {
  return getNotificationApi()?.permission || "unsupported";
}

function getCapabilityDiagnostics() {
  const hasWindow = hasWindowObject();
  const hasNavigator = hasNavigatorObject();
  const userAgent = getUserAgent();
  const hasNotification = Boolean(getNotificationApi());
  const hasServiceWorker = Boolean(hasNavigator && "serviceWorker" in navigator);
  const hasPushManager = Boolean(hasWindow && "PushManager" in window);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isStandalone = Boolean(
    hasWindow
      && (window.navigator?.standalone === true || window.matchMedia?.("(display-mode: standalone)")?.matches)
  );

  return {
    isIOS,
    isStandalone,
    hasWindow,
    hasNotification,
    hasServiceWorker,
    hasPushManager,
    userAgent,
  };
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function getBrowserPlatform() {
  const ua = getUserAgent();

  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "web";
}

function isStandaloneAppleWebApp() {
  return getCapabilityDiagnostics().isStandalone;
}

export function getNotificationDebugSnapshot(extra = {}) {
  const diagnostics = getCapabilityDiagnostics();
  const serviceWorkerRegistered = Boolean(
    diagnostics.hasServiceWorker
      && (navigator.serviceWorker?.controller || extra.serviceWorkerRegistered)
  );

  return {
    permission: getNotificationPermission(),
    serviceWorkerRegistered,
    pushSupported: diagnostics.hasPushManager,
    subscriptionExists: Boolean(extra.subscriptionExists),
    ...diagnostics,
    ...extra,
  };
}

export async function inspectNotificationSetup() {
  const snapshot = getNotificationDebugSnapshot();

  if (!snapshot.hasServiceWorker) {
    return {
      ...snapshot,
      serviceWorkerRegistered: false,
      serviceWorkerError: "service_worker_not_supported",
    };
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const subscription = registration.pushManager
      ? await registration.pushManager.getSubscription()
      : null;

    return getNotificationDebugSnapshot({
      serviceWorkerRegistered: true,
      pushSupported: Boolean(snapshot.hasPushManager && registration.pushManager),
      subscriptionExists: Boolean(subscription),
      endpoint: subscription?.endpoint,
    });
  } catch (error) {
    console.error("Service worker registration failed", error);

    return {
      ...snapshot,
      serviceWorkerRegistered: false,
      serviceWorkerError: error.message,
    };
  }
}

export async function registerDeviceToken(token, metadata = {}) {
  const response = await api.post("/reminders/register-device", {
    token,
    platform: getBrowserPlatform(),
    browser: getUserAgent().slice(0, 80),
    metadata,
  });

  return unwrapApiResponse(response)?.device;
}

export async function registerWebPushSubscription(subscription, metadata = {}) {
  const response = await api.post("/reminders/register-device", {
    subscription: subscription.toJSON(),
    platform: getBrowserPlatform(),
    browser: getUserAgent().slice(0, 80),
    metadata: {
      ...metadata,
      provider: "web-push",
      displayMode: isStandaloneAppleWebApp() ? "standalone" : "browser",
    },
  });

  return unwrapApiResponse(response)?.device;
}

export async function getNotificationStatus() {
  const response = await api.get("/reminders/notification-status");
  return unwrapApiResponse(response);
}

export async function sendTestNotification(payload = {}) {
  const response = await api.post("/reminders/test-notification", payload);
  return unwrapApiResponse(response);
}

export async function setupReminderNotifications() {
  const diagnostics = getCapabilityDiagnostics();
  const NotificationApi = getNotificationApi();

  if (!diagnostics.hasNotification || !NotificationApi) {
    return {
      ready: false,
      reason: "notifications_not_supported",
      diagnostics,
      permission: "unsupported",
    };
  }

  if (!diagnostics.hasServiceWorker) {
    return {
      ready: false,
      reason: "service_worker_not_supported",
      diagnostics,
      permission: NotificationApi.permission,
    };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  if (!diagnostics.hasPushManager || !registration.pushManager) {
    return {
      ready: false,
      registration,
      diagnostics,
      permission: NotificationApi.permission,
      reason: getBrowserPlatform() === "ios" && !isStandaloneAppleWebApp()
        ? "ios_requires_home_screen_install"
        : "push_manager_not_supported",
    };
  }

  const permission = NotificationApi.permission === "granted"
    ? "granted"
    : await NotificationApi.requestPermission();

  if (permission !== "granted") {
    return { ready: false, registration, diagnostics, permission, reason: "permission_denied" };
  }

  if (!WEB_PUSH_PUBLIC_KEY) {
    return {
      ready: true,
      registration,
      webPush: false,
      diagnostics,
      permission,
      reason: "web_push_public_key_missing",
    };
  }

  try {
    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription = existingSubscription || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(WEB_PUSH_PUBLIC_KEY),
    });
    const device = await registerWebPushSubscription(subscription);

    return {
      ready: true,
      webPush: true,
      device,
      registration,
      diagnostics,
      permission,
    };
  } catch (error) {
    if (!hasFirebaseConfig() || !process.env.REACT_APP_FIREBASE_VAPID_KEY) {
      return {
        ready: true,
        webPush: false,
        registration,
        diagnostics,
        permission,
        reason: error.message,
      };
    }
  }

  if (!hasFirebaseConfig() || !process.env.REACT_APP_FIREBASE_VAPID_KEY) {
    return {
      ready: true,
      registration,
      fcm: false,
      diagnostics,
      permission,
      reason: "firebase_web_config_missing",
    };
  }

  try {
    const [{ initializeApp }, { getMessaging, getToken }] = await Promise.all([
      import(/* webpackIgnore: true */ "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import(/* webpackIgnore: true */ "https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging.js"),
    ]);

    const app = initializeApp(FIREBASE_CONFIG);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      const device = await registerDeviceToken(token, { provider: "firebase" });
      return { ready: true, fcm: true, device };
    }
  } catch (error) {
    return { ready: true, fcm: false, reason: error.message };
  }

  return { ready: true, fcm: false, reason: "token_unavailable" };
}
