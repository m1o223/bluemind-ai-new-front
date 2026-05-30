import api, { unwrapApiResponse } from "./api";

const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

function hasFirebaseConfig() {
  return Object.values(FIREBASE_CONFIG).every(Boolean);
}

export async function registerDeviceToken(token, metadata = {}) {
  const response = await api.post("/reminders/register-device", {
    token,
    platform: "web",
    browser: navigator.userAgent.slice(0, 80),
    metadata,
  });

  return unwrapApiResponse(response)?.device;
}

export async function setupReminderNotifications() {
  if (!("Notification" in window)) {
    return { ready: false, reason: "notifications_not_supported" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ready: false, reason: "permission_denied" };
  }

  if (!("serviceWorker" in navigator)) {
    return { ready: false, reason: "service_worker_not_supported" };
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

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
      const device = await registerDeviceToken(token);
      return { ready: true, fcm: true, device };
    }
  } catch (error) {
    return { ready: true, fcm: false, reason: error.message };
  }

  return { ready: true, fcm: false, reason: "token_unavailable" };
}
