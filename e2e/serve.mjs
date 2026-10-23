// Static server over dist/ for end-to-end tests. Usage: node e2e/serve.mjs [port]
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = join(import.meta.dirname, "..", "dist");
const port = Number(process.argv[2] ?? 4322);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".zip": "application/zip", ".txt": "text/plain",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!path.startsWith(root)) return res.writeHead(403).end();
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path)) return res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
  createReadStream(path).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`serving dist on http://127.0.0.1:${port}`));
