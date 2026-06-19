/* Service worker: makes the site installable and fast.
   IMPORTANT: we cache only the app's own shell files. We NEVER cache the Oyez API
   responses or the audio — audio must always stream live (requirement), and case
   data should stay fresh. */

const SHELL = "oyez-shell-v3";
const SHELL_FILES = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "data/terms.json",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never intercept Oyez API or audio (S3). Let the browser stream/fetch directly.
  if (url.hostname.endsWith("oyez.org") || url.hostname.includes("amazonaws.com")) return;

  // Same-origin shell: cache-first, fall back to network, then to cached index for navigations.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit ||
        fetch(e.request).then(resp => {
          // keep the cache warm for our own files (but not data/*.json which we want fresh-ish)
          if (resp.ok && e.request.method === "GET" && !url.pathname.includes("/data/")) {
            const copy = resp.clone();
            caches.open(SHELL).then(c => c.put(e.request, copy));
          }
          return resp;
        }).catch(() => e.request.mode === "navigate" ? caches.match("index.html") : Response.error())
      )
    );
  }
});
