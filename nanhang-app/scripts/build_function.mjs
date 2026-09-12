// 把 apps/api 打成一个自包含的 app.js，供 SCF Web 函数使用。
//
// 为什么需要打包：云函数运行时是纯 Node（没有 TypeScript 类型擦除），
// 而本地开发用的是 `node --experimental-strip-types`。所以线上这份必须是编译后的 JS。
// 打包产物零运行时依赖（工作区包都是纯 TS 源码），压缩包很小。
//
// 用法：node scripts/build_function.mjs
import { build } from "esbuild";
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(repo, "apps", "api", "dist-scf");
const outFile = join(outDir, "app.js");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const result = await build({
  entryPoints: [join(repo, "apps", "api", "src", "main.ts")],
  outfile: outFile,
  bundle: true,
  platform: "node",
  target: "node20",
  // CJS 最省事：运行时不需要 package.json 里的 "type": "module"，也不受 ESM 解析规则影响。
  format: "cjs",
  sourcemap: false,
  legalComments: "none",
  banner: { js: "// 南溟 API · SCF Web 函数入口。由 nanhang-app/scripts/build_function.mjs 生成，不要手改。" },
  logLevel: "warning"
});

if (result.errors.length > 0) {
  console.error("打包失败");
  process.exit(1);
}

// 打包产物是 CJS，但工作区包声明了 "type": "module"；同目录放一份 package.json 把类型钉死，
// 否则 Node 会把 app.js 当 ESM 解析，启动时报 "require is not defined"。
writeFileSync(join(outDir, "package.json"), JSON.stringify({ type: "commonjs", private: true }, null, 2) + "\n",
  "utf8");

// 身份索引（880 条「姓名+验证码摘要 → 分片名」的哈希，不含姓名与验证码）随包发上去。
// 它需要和函数同版本：换了验证码/重建成绩库后重新导出，这里自然跟着更新。
const identity = join(repo, "..", "private", "quality-identity.json");
if (existsSync(identity)) {
  copyFileSync(identity, join(outDir, "quality-identity.json"));
  console.log("已附带 private/quality-identity.json（不含姓名与验证码，只有摘要）");
} else {
  console.log("没有 private/quality-identity.json：学校增强模式在云端会保持关闭");
}

const size = statSync(outFile).size;
console.log(`已生成 ${outFile}`);
console.log(`大小：${(size / 1024).toFixed(0)} KB`);
