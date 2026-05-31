self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/reminders";
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
      body: notification.body || data.body || "You have a reminder now.",
      icon: data.icon || "/bluemind-logo-black.png",
      badge: data.badge || "/bluemind-logo-black.png",
      tag: data.tag || `reminder-${data.reminderId || Date.now()}`,
      requireInteraction: data.priority === "high" || data.priority === "urgent",
      data: {
        url: data.url || data.click_action || "/reminders",
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
