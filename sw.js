// Service worker.
// LEÇON (2026-06-25) : l'ancienne stratégie « cache d'abord » précachait index.html
// et le servait indéfiniment → après un déploiement, le HTML périmé pointait vers un
// nom d'asset hashé supprimé → 404 → app bloquée sur « Chargement… ». Comme sw.js était
// identique à chaque build, le navigateur ne voyait jamais de nouveau SW → blocage permanent.
//
// Correctif : RÉSEAU D'ABORD pour le document HTML (on a donc toujours le dernier index,
// avec les bons hash d'assets) ; cache pour les assets hashés (immuables) → hors-ligne.
// Cache versionné + purge des anciens à l'activation ; skipWaiting + claim.
const CACHE = "patrimoine-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Données / auth Google : réseau direct, jamais de cache.
  if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("google.com")) return;

  // Navigations (document HTML) : réseau d'abord → toujours le dernier index ; repli cache hors-ligne.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html"))),
    );
    return;
  }

  // Autres GET (assets hashés, wasm, vendor) : cache d'abord, sinon réseau + mise en cache.
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }),
    ),
  );
});
