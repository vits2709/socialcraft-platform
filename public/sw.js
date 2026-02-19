// Service Worker — SocialCraft Push Notifications
// Versione: 1.0

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "SocialCraft",
    body: "Hai una nuova notifica!",
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    url: "/",
  };

  try {
    if (event.data) {
      const data = event.data.json();
      payload = { ...payload, ...data };
    }
  } catch {}

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    data: { url: payload.url },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
