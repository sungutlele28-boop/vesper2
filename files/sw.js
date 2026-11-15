/* Vesper service worker – app shell, offline-first. Save next to the HTML as sw.js */
const V = 'vesper-v1';
const EXT = ['https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => Promise.all([
        c.add('./').catch(() => {}),
        ...EXT.map(u => c.add(new Request(u, { mode: 'no-cors' })).catch(() => {}))
      ]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin && u.hostname !== 'cdnjs.cloudflare.com') return;

  // pages: network first, fall back to the cached copy when offline
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; })
        .catch(() => caches.match(r).then(m => m || caches.match('./')))
    );
    return;
  }
  // everything else: cache first, refresh in the background
  e.respondWith(
    caches.match(r).then(hit => {
      const net = fetch(r)
        .then(res => {
          if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
