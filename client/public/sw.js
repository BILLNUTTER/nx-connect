const CACHE_NAME = "nx-connect-v2";
const STATIC_ASSETS = ["/favicon.png", "/nx-icon.svg", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("/api/")) return;

  const url = new URL(e.request.url);

  if (url.pathname === "/" || url.pathname === "/index.html" || !url.pathname.includes(".")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => res)
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
