import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: false,
      manifest: false,
      workbox: {
        cacheId: "leavewell-shell",
        globPatterns: ["index.html", "assets/**/*.{js,css}", "icon.svg", "manifest.webmanifest"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
