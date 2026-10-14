// Becoming's service worker — on the phone only (registered by lib/remote.ts
// when the app is reached through the door; removed on the Mac's own window).
//
// Its one job: the APP opens with no connection. Data is not its business —
// reading falls back to the last copy in lib/api.ts, and writing goes to the
// pocket (lib/pocket.ts) — so /api is never touched here.
//
//   pages       network first; with no network, the last copy of the app page
//   /assets/*   hashed file names never change, so the kept copy is always right
//   the rest    (icons, the manifest) kept copy first, refreshed behind it
const SHELL = 'becoming-shell-v2';

// Keep the whole app at once — every built file, from the build's own list —
// not just what the first visit happened to load.
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    try {
      const list = await (await fetch('/asset-manifest.json', { cache: 'no-store' })).json();
      const files = new Set(['/']);
      for (const entry of Object.values(list)) {
        for (const f of [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])]) if (f) files.add('/' + f);
      }
      await cache.addAll([...files]);
    } catch { /* kept piece by piece as it is used, below */ }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('becoming-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/vision-assets/') || url.pathname.startsWith('/project-assets/') || url.pathname.startsWith('/idea-assets/')) return;

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(SHELL)).put('/', res.clone());
        return res;
      } catch {
        return (await caches.match('/', { ignoreVary: true })) ?? Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(SHELL);
    // ignoreVary: a host that answers "Vary: Origin" (Vite's preview does)
    // would otherwise never match a module script's request, which carries an
    // Origin the kept copy did not — and the app would not open offline
    // (found testing the Home Screen app, 2026-10-06).
    const kept = await cache.match(req, { ignoreVary: true });
    if (kept) {
      // A hashed file never changes; anything else is refreshed behind the kept copy.
      if (!url.pathname.startsWith('/assets/')) fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); }).catch(() => {});
      return kept;
    }
    return fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; });
  })());
});
