import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const host = "0.0.0.0";
const port = Number(process.argv[2] || 5173);

const mimeTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
};

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(root, requestedPath));

  if (!filePath.startsWith(root + sep) && filePath !== root) {
    response.writeHead(403, noCacheHeaders("text/plain; charset=utf-8"));
    response.end("Forbidden");
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, noCacheHeaders("text/plain; charset=utf-8"));
    response.end("Not found");
    return;
  }

  response.writeHead(200, noCacheHeaders(mimeTypes[extname(filePath)] || "application/octet-stream"));
  createReadStream(filePath).pipe(response);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the old preview server, or run: npm run dev -- 5174`);
    process.exit(1);
  }

  throw error;
});

server.listen(port, host, () => {
  console.log(`Preview server running at http://${host}:${port}/`);
  console.log(`LAN preview: http://<本机IP>:${port}/`);
  console.log(`Serving ${root}`);
});

function noCacheHeaders(contentType) {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Content-Type": contentType,
    Expires: "0",
    Pragma: "no-cache",
  };
}
