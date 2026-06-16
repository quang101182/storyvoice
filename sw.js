/* StoryVoice — Service Worker (PWA app shell)
 * Règle d'or : on ne met en cache QUE l'app shell same-origin (index.html, manifest, icônes).
 * On ne TOUCHE JAMAIS aux appels cross-origin (api-gateway.quang101182.workers.dev : LLM, TTS, fal.ai)
 * ni aux requêtes non-GET → sinon on casserait la génération / le streaming audio.
 * Données utilisateur (livres, audio, images) = IndexedDB, hors périmètre du SW.
 */
const VERSION = "sv-1.10.1";
const SHELL_CACHE = "storyvoice-shell-" + VERSION;
const SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-192.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      // addAll échoue si UN fichier manque → on tolère les absences (icône optionnelle) avec un add individuel best-effort.
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("storyvoice-shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // 1) Jamais toucher au non-GET (POST gateway, etc.)
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 2) Cross-origin (gateway LLM/TTS/fal, n'importe quel domaine externe) → laisser passer au réseau natif.
  if (url.origin !== self.location.origin) return;

  // 3) Navigation (chargement de la page) → network-first : voir les MAJ, fallback cache offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put("index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("index.html") || caches.match("./")))
    );
    return;
  }

  // 4) Assets same-origin (icônes, manifest, sw) → stale-while-revalidate.
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// Permet à la page de forcer l'activation d'une nouvelle version (optionnel).
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});
