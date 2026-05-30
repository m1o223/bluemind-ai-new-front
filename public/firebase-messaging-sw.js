self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/reminders";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const openClient = clients.find((client) => client.url.includes(self.location.origin));

      if (openClient) {
        openClient.focus();
        return openClient.navigate(url);
      }

      return self.clients.openWindow(url);
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
      data: {
        url: data.url || data.click_action || "/reminders",
        ...data,
      },
    }),
  );
});
