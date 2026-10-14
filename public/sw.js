/* Versioned offline shell. No scenario inputs leave the browser. */
// This classic-script entry point runs only in the service worker global.
const worker = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const CACHE = "leavewell-shell-v1";

worker.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch("/", { cache: "reload" });

      if (!response.ok) {
        throw new Error("Shell unavailable");
      }

      const html = await response.clone().text();

      const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+)"/g)].map(
        (match) => match[1],
      );

      await cache.put("/", response);
      await cache.addAll([...new Set([...assets, "/icon.svg", "/manifest.webmanifest"])]);
      await worker.skipWaiting();
    })(),
  );
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("leavewell-shell-") && name !== CACHE) {
          // oxlint-disable-next-line eslint/no-await-in-loop -- Bound cache deletion I/O and finish old-cache cleanup before claiming clients.
          await caches.delete(name);
        }
      }

      await worker.clients.claim();
    })(),
  );
});

worker.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.origin !== worker.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);

          if (response.ok) {
            return response;
          }
        } catch {
          /* Fall back to the last complete shell. */
        }

        return (
          (await caches.match("/")) ??
          new Response("Open Leavewell online once to make it available offline.", { status: 503 })
        );
      })(),
    );
  } else {
    event.respondWith((async () => (await caches.match(event.request)) ?? fetch(event.request))());
  }
});
