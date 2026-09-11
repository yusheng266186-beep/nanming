import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/**
 * 把已发布的招生数据以只读方式提供给纸感版前端。
 *
 * 与 apps/web 的 vite.config.ts 是同一份逻辑、同一个 data/releases 目录：两套前端必须读到
 * 同一个发布版本，否则「切换前端」会顺带切换数据，而那不是这套界面要测的东西。
 *
 * 只暴露该目录之下的文件，并在规范化之后重新核对解析结果，避免用 `..` 爬出去。
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
 * 纸感版前端（备用方案）。
 *
 * 与 apps/web 是并列的第二套界面：同样只读发布数据、同样调用共享规则包，但视觉与交互
 * 走「纸感 / 编辑式」路线，且是原生 ES 模块（无 React）。开发端口固定 5174，便于两套
 * 前端同时开着对比。
 */
export default defineConfig({
  plugins: [releaseData()],
  server: { port: 5174 },
  build: { outDir: "dist", emptyOutDir: true }
});
