const CACHE_NAME = "moje-vaha-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "https://img40.rajce.idnes.cz/d4003/19/19517/19517492_984d6887838eae80a8eb677199393188/images/ChatGPTImage6.4.202519_47_20.jpg?ver=0",
  "/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
