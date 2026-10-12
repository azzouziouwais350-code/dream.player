const CACHE = 'dreamplayer-v8';
const FILES = ['./', './index.html', './dream.css', './icons.js', './diag.js', './script.js', './features.js', './premium.js', './extras.js', './more.js', './final.js', './settings.js', './polish.js',
  './manifest.json', './icon.svg', './icon-192.png', './icon-512.png',
  './fonts/poppins-latin-400-normal.woff2', './fonts/poppins-latin-500-normal.woff2', './fonts/poppins-latin-600-normal.woff2',
  './fonts/press-start-2p-latin-400-normal.woff2', './fonts/press-start-2p-latin-ext-400-normal.woff2', './fonts/vt323-latin-400-normal.woff2',
  './art/moon.svg', './art/blackmoon.svg', './art/island.svg', './art/cloud.svg', './art/bat.svg', './art/cd.svg', './art/hallway.svg', './art/ghost.svg', './art/cover.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('spotify') || url.protocol === 'blob:' || e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && url.origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
