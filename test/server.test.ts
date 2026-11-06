import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it, vi } from "vitest";

const health = () => fetch("http://127.0.0.1:4311/healthz");

it("keeps serving after a static asset stream fails to read", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "leavewell-server-"));
  // A directory at the resolved index path passes stat but fails when read as a file.
  await mkdir(join(cwd, "dist", "broken", "index.html"), { recursive: true });

  const child = spawn(process.execPath, [resolve("server.mjs")], {
    cwd,
    env: { ...process.env, HOST: "127.0.0.1", PORT: "4311" },
    stdio: "ignore",
  });

  const closed = new Promise<void>((_resolve) => {
    child.once("close", () => _resolve());
  });

  try {
    await vi.waitFor(async () => expect(await (await health()).text()).toBe("ok"), {
      timeout: 5000,
    });
    await expect(fetch("http://127.0.0.1:4311/broken").then((r) => r.text())).rejects.toThrow(
      /fetch failed|terminated/,
    );
    expect(await (await health()).text()).toBe("ok");
  } finally {
    child.kill();
    await closed;
    await rm(cwd, { recursive: true, force: true });
  }
});
