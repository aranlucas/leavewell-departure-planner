/* Versioned offline shell. No scenario inputs leave the browser. */
const CACHE = "leavewell-shell-v1";

self.addEventListener("install", (event) => {
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
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("leavewell-shell-") && name !== CACHE) {
          await caches.delete(name);
        }
      }

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
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
          (await caches.match("/")) ||
          new Response("Open Leavewell online once to make it available offline.", { status: 503 })
        );
      })(),
    );
  } else {
    event.respondWith((async () => (await caches.match(event.request)) || fetch(event.request))());
  }
});
