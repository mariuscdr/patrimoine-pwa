const CACHE = "patrimoine-shell-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Ne jamais mettre en cache les appels Google (données/auth) — réseau direct.
  if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("google.com")) return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
