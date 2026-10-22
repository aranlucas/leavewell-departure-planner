import { cacheNames, setCacheNameDetails } from "workbox-core";
import { matchPrecache, precache } from "workbox-precaching";
import type { PrecacheEntry } from "workbox-precaching";

interface PrecacheWorker extends ServiceWorkerGlobalScope {
  __WB_MANIFEST: PrecacheEntry[];
}

declare let self: PrecacheWorker;

setCacheNameDetails({ prefix: "leavewell-shell" });

// oxlint-disable-next-line eslint/no-underscore-dangle -- Workbox owns this build-time manifest injection point.
precache(self.__WB_MANIFEST);

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("leavewell-shell-") && name !== cacheNames.precache) {
          // oxlint-disable-next-line eslint/no-await-in-loop -- Finish legacy shell-cache cleanup before claiming clients.
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
          (await matchPrecache("/index.html")) ??
          new Response("Open Leavewell online once to make it available offline.", { status: 503 })
        );
      })(),
    );
  } else {
    event.respondWith(
      (async () => (await matchPrecache(event.request.url)) ?? fetch(event.request))(),
    );
  }
});
