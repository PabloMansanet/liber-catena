// Keeps the whole book on the phone, so it opens without a connection.
// `book_converter player-app` fills in the edition and the files: each
// edition gets its own cache, and installing one drops the ones before it.
const EDITION = '974d593a7a316572';
const FILES = ["./","book.json","fonts/NodestoCapsCondensed.otf","fonts/NodestoCapsCondensedBold.otf","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","img/body.png","img/book.png","img/deserts_icon.png","img/mind.png","img/mountains_icon.png","img/oceans_icon.png","img/paper.jpg","img/plains_icon.png","img/soul.png","img/towns_icon.png","img/woodlands_icon.png","index.html","js/book.js","js/main.js","manifest.webmanifest","pages/angry_roc.webp","pages/black_mare.webp","pages/landslide.webp","pages/merc.webp","style.css"];
const CACHE = `liber-catena-${EDITION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const key = request.mode === 'navigate' ? './' : request;
      return (await cache.match(key, { ignoreSearch: true })) ?? fetch(request);
    }),
  );
});
