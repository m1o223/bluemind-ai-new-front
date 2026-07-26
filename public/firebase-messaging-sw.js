self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || event.notification?.data?.deepLink || "/mobile/chat";
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const openClient = clients.find((client) => client.url.includes(self.location.origin));

      if (openClient) {
        openClient.focus();
        return openClient.navigate(targetUrl);
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() || {};
  const notification = payload.notification || {};
  const data = payload.data || {};

  event.waitUntil(
    self.registration.showNotification(notification.title || "BlueMind Reminder", {
      body: notification.body || data.body || "BlueMind has an update for you.",
      icon: data.icon || "/bluemind-logo-black.png",
      badge: data.badge || "/bluemind-logo-black.png",
      tag: data.tag || `reminder-${data.reminderId || Date.now()}`,
      requireInteraction: data.priority === "high" || data.priority === "urgent",
      data: {
        url: data.url || data.deepLink || data.click_action || "/mobile/chat",
        ...data,
      },
      actions: [
        {
          action: "open",
          title: "Open",
        },
      ],
    }),
  );
});
