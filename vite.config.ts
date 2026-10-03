import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "version-offline-shell",
      apply: "build",
      closeBundle() {
        const hash = createHash("sha256")
          .update(readFileSync("dist/index.html"))
          .digest("hex")
          .slice(0, 12);

        const source = readFileSync("public/sw.js", "utf8").replace(
          "leavewell-shell-v1",
          `leavewell-shell-${hash}`,
        );

        writeFileSync("dist/sw.js", source);
      },
    },
  ],
});
