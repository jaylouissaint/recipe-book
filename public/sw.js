// Offline support (docs/DESIGN.md "Offline"): pages you've opened, their pictures and the site's
// own files are kept in the browser, so they still open with no signal (in a store, say).
// Registered by src/components/Offline.tsx, in production only.
//
// - Pages: from the network when there is one (and saved for later), else the saved copy.
// - The site's files (/_next/static, fonts, icons): saved once; their names change with each deploy.
// - Recipe pictures (Supabase Storage): shown from the saved copy and refreshed in the background.
// - Writes and the app's own data requests always go to the network; when that fails, Next.js
//   loads the page instead, which comes from the saved copy.

const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const FILES = `files-${VERSION}`;
const PICTURES = `pictures-${VERSION}`;
const MAX_PICTURES = 300;
const NETWORK_WAIT = 5000; // after this long, a weak signal counts as none

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGES, FILES, PICTURES];
      for (const name of await caches.keys()) if (!keep.includes(name)) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), ms))]);
}

async function page(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await withTimeout(fetch(request), NETWORK_WAIT);
    if (response.ok && response.type === "basic") cache.put(request, response.clone());
    return response;
  } catch {
    const url = new URL(request.url);
    const saved = (await cache.match(request)) ?? (await cache.match(url.pathname, { ignoreSearch: true }));
    if (saved) return saved;
    return new Response(OFFLINE_PAGE, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function file(request) {
  const cache = await caches.open(FILES);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function picture(event) {
  const cache = await caches.open(PICTURES);
  const saved = await cache.match(event.request.url);
  // Fetched with CORS (Supabase allows it): an image tag's own request would come back opaque,
  // and opaque copies count heavily against the browser's storage allowance.
  const fresh = fetch(event.request.url, { mode: "cors", credentials: "omit" })
    .then(async (response) => {
      if (response.ok) {
        await cache.put(event.request.url, response.clone());
        const keys = await cache.keys();
        for (const old of keys.slice(0, Math.max(0, keys.length - MAX_PICTURES))) await cache.delete(old);
      }
      return response;
    })
    .catch(() => saved ?? Response.error());
  if (saved) {
    event.waitUntil(fresh);
    return saved;
  }
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    // The app's own data requests (page data, prefetches) go straight to the network.
    if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;
    if (request.mode === "navigate") return event.respondWith(page(request));
    if (url.pathname.startsWith("/_next/static/") || /\.(?:png|svg|ico|woff2?|webmanifest)$/.test(url.pathname)) {
      return event.respondWith(file(request));
    }
    return;
  }

  // Recipe photos, originals and handwritten pages
  if (url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/storage/v1/object/public/")) {
    event.respondWith(picture(event));
  }
});

const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline · Ramiya’s Recipes</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fbf8f2;color:#1c1b19;font:16px -apple-system,system-ui,sans-serif;text-align:center;padding:24px}
h1{font:400 34px Georgia,serif;margin:0 0 12px}p{color:#77736c;max-width:28rem;line-height:1.5}a{color:#1f4d3d;font-weight:600}</style></head>
<body><div><h1>You’re offline</h1><p>This page hasn’t been opened on this device yet, so there’s no saved copy. Pages you’ve opened before still work.</p><p><a href="/">Go to Home</a> · <a href="/groceries">Groceries</a></p></div></body></html>`;
