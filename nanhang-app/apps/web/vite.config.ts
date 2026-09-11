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
 * Serve the published data release from `data/releases` during development.
 *
 * The release is produced by `pipelines/task03/export_release.py` and lives outside the web root,
 * so the dev server exposes it read-only under `/data/releases`. Only files below that directory
 * are reachable, and the resolved path is re-checked after normalisation so a request cannot
 * climb out of it with `..`.
 */
const releaseData = (): Plugin => {
  const root = fileURLToPath(new URL("../../data/releases", import.meta.url));
  return {
    name: "release-data",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/data/releases", (req, res, next) => {
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

/**
 * Serve the 荣县一中 quality release from `data/quality-huixi` during development.
 *
 * Same shape and same containment rule as the admissions release above: only files under the
 * quality directory are reachable, and the resolved path is re-checked after normalisation. That
 * directory holds real student data, so it is never copied into the web root.
 */
const qualityData = (): Plugin => {
  const root = fileURLToPath(new URL("../../data/quality-huixi", import.meta.url));
  return {
    name: "quality-huixi-data",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/data/quality-huixi", (req, res, next) => {
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
  plugins: [excelDevelopmentView(), releaseData(), qualityData()],
  server: { port: 5173 }
});
