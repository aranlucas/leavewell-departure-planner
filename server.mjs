import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve("dist");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

http
  .createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();

      return;
    }

    const pathname = new URL(req.url, "http://localhost").pathname;

    if (pathname === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");

      return;
    }

    let path;

    try {
      path = resolve(root, "." + decodeURIComponent(pathname));
    } catch {
      res.writeHead(400);
      res.end();

      return;
    }

    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();

      return;
    }

    try {
      let info;

      try {
        info = await stat(path);
      } catch {
        if (extname(path)) {
          res.writeHead(404);
          res.end("Not found");

          return;
        }

        path = resolve(root, "index.html");
        info = await stat(path);
      }

      if (info.isDirectory()) {
        path = resolve(path, "index.html");
        info = await stat(path);
      }

      res.writeHead(200, {
        "Content-Type": types[extname(path)] || "application/octet-stream",
        "Content-Length": info.size,
        "Cache-Control": pathname.startsWith("/assets/")
          ? "public,max-age=31536000,immutable"
          : "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; worker-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
      });

      if (req.method === "HEAD") {res.end();}
      else {createReadStream(path).pipe(res);}
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(
    Number(process.env.PORT) || 4310,
    process.env.HOST || "127.0.0.1",
    () => console.log("Leavewell is ready."),
  );
