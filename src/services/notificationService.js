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
  const ua = navigator.userAgent || "";

  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "web";
}

function isStandaloneAppleWebApp() {
  return window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)")?.matches;
}

export async function registerDeviceToken(token, metadata = {}) {
  const response = await api.post("/reminders/register-device", {
    token,
    platform: getBrowserPlatform(),
    browser: navigator.userAgent.slice(0, 80),
    metadata,
  });

  return unwrapApiResponse(response)?.device;
}

export async function registerWebPushSubscription(subscription, metadata = {}) {
  const response = await api.post("/reminders/register-device", {
    subscription: subscription.toJSON(),
    platform: getBrowserPlatform(),
    browser: navigator.userAgent.slice(0, 80),
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
  if (!("Notification" in window)) {
    return { ready: false, reason: "notifications_not_supported" };
  }

  if (!("serviceWorker" in navigator)) {
    return { ready: false, reason: "service_worker_not_supported" };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  if (!("PushManager" in window) || !registration.pushManager) {
    return {
      ready: false,
      registration,
      reason: getBrowserPlatform() === "ios" && !isStandaloneAppleWebApp()
        ? "ios_requires_home_screen_install"
        : "push_manager_not_supported",
    };
  }

  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();

  if (permission !== "granted") {
    return { ready: false, registration, reason: "permission_denied" };
  }

  if (!WEB_PUSH_PUBLIC_KEY) {
    return {
      ready: true,
      registration,
      webPush: false,
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
      permission,
    };
  } catch (error) {
    if (!hasFirebaseConfig() || !process.env.REACT_APP_FIREBASE_VAPID_KEY) {
      return {
        ready: true,
        webPush: false,
        registration,
        reason: error.message,
      };
    }
  }

  if (!hasFirebaseConfig() || !process.env.REACT_APP_FIREBASE_VAPID_KEY) {
    return {
      ready: true,
      registration,
      fcm: false,
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
