import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const workbook = fileURLToPath(
  new URL("../../data/task03/workbooks/workbook-samples.json", import.meta.url)
);

const excelDevelopmentView = (): Plugin => ({
  name: "excel-development-view",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/dev/workbook-samples.json", (req, res) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.statusCode = 405;
        res.end();
        return;
      }
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.end(req.method === "HEAD" ? undefined : readFileSync(workbook));
    });
  }
});

/**
 * Serve a pipeline-produced data directory from `data/` during development.
 *
 * Both the admissions release (`pipelines/task03/export_release.py`) and the 荣县一中 quality
 * release live outside the web root, so the dev server exposes them read-only under their mount
 * paths. Only files below the served directory are reachable, and the resolved path is re-checked
 * after normalisation so a request cannot climb out of it with `..`. The quality directory holds
 * real student data, so it is never copied into the web root.
 */
const serveDataDirectory = (name: string, mountPath: string, directory: string): Plugin => {
  const root = fileURLToPath(new URL(directory, import.meta.url));
  return {
    name,
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(mountPath, (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
        const target = resolve(join(root, normalize(relative)));
        if (!target.startsWith(root + sep) || !existsSync(target) || !statSync(target).isFile()) {
          next();
          return;
        }
        res.setHeader("content-type", extname(target) === ".json"
          ? "application/json; charset=utf-8"
          : "application/octet-stream");
        res.setHeader("cache-control", "no-store");
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        createReadStream(target).pipe(res);
      });
    }
  };
};

export default defineConfig({
  plugins: [
    excelDevelopmentView(),
    serveDataDirectory("release-data", "/data/releases", "../../data/releases"),
    // Student shards are served only by POST /v1/school/identify.
  ],
  server: { port: 5173 }
});
