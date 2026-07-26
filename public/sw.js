const CACHE_NAME = "bluemind-ai-shell-v1";
const APP_SHELL = ["/", "/manifest.json", "/bluemind-logo-black.png", "/bluemind-logo-white.png"];
const DEFAULT_NOTIFICATION_URL = "/mobile/chat";

function normalizeNotificationPayload(event) {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      body: event.data ? event.data.text() : ""
    };
  }

  const data = payload.data || {};

  return {
    title: payload.title || payload.notification?.title || data.title || "BlueMind AI",
    body: payload.body || payload.notification?.body || data.body || "BlueMind has an update for you.",
    icon: payload.icon || data.icon || "/bluemind-logo-black.png",
    badge: payload.badge || data.badge || "/bluemind-logo-black.png",
    tag: payload.tag || data.tag || `bluemind-${Date.now()}`,
    requireInteraction: Boolean(payload.requireInteraction || data.requireInteraction),
    data: {
      ...data,
      url: payload.url || data.url || data.deepLink || data.click_action || DEFAULT_NOTIFICATION_URL,
    },
    actions: payload.actions || [
      {
        action: "open",
        title: "Open",
      },
    ],
  };
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
  );
});

self.addEventListener("push", (event) => {
  const notification = normalizeNotificationPayload(event);

  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      tag: notification.tag,
      requireInteraction: notification.requireInteraction,
      data: notification.data,
      actions: notification.actions,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || DEFAULT_NOTIFICATION_URL;
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const sameOriginClient = clients.find((client) => client.url.startsWith(self.location.origin));

      if (sameOriginClient) {
        sameOriginClient.focus();
        return sameOriginClient.navigate(targetUrl);
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
