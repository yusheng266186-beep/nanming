// 南溟 · 纸感版（备用前端）的守卫测试。
//
// 纸感版是第二套界面，与 apps/web 并列。它最容易出的问题不是样式，而是**悄悄分叉**：
// 自己算一遍位次、自己判断哪一年可比、或者把示意数据当成真实数据画出来。
// 这些测试盯住的就是这一类：两套前端必须读同一份发布包、用同一套规则，
// 并且纸感版不得再自带任何内嵌数据。
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appDir = resolve(import.meta.dirname, "..");
const read = (relative: string) => readFileSync(resolve(appDir, relative), "utf8");

const dataJs = read("src/data.js");
const appJs = read("src/app.js");
const html = read("index.html");
const viteConfig = read("vite.config.ts");
const pkg = JSON.parse(read("package.json")) as {
  dependencies?: Record<string, string>; scripts?: Record<string, string>;
};

describe("纸感版：与主前端共用同一套数据与规则", () => {
  it("depends on the shared packages instead of reimplementing them", () => {
    for (const dependency of ["@nanhang/release-loader", "@nanhang/match-input", "@nanhang/domain"]) {
      expect(pkg.dependencies?.[dependency], `missing dependency ${dependency}`).toBe("0.1.0");
    }
    // 页面层必须经由 data.js 使用共享包，而不是直接 import 各包各写一遍。
    expect(dataJs).toContain('from "@nanhang/release-loader"');
    expect(dataJs).toContain('from "@nanhang/match-input"');
    expect(dataJs).toContain('from "@nanhang/domain"');
    expect(dataJs).toContain("buildMatchResult");
  });

  it("does not carry its own copy of the matching rules", () => {
    // 这些是规则的实现细节。它们出现在纸感版里就说明有人在本地重算了一遍——
    // 那正是「两套前端给出不同结论」的来源。
    for (const forbidden of ["rankIntervalFor", "compareRankIntervals", "evaluateSubjectRule", "combineConditions", "locateRank"]) {
      expect(appJs, `app.js must not define ${forbidden}`).not.toContain(`function ${forbidden}`);
      expect(dataJs, `data.js must not define ${forbidden}`).not.toContain(`function ${forbidden}`);
    }
  });

  it("serves the same release tree as the main front end", () => {
    // 两套前端的 vite 配置指向同一个 data/releases，否则「切换前端」会顺带切换数据。
    const main = readFileSync(resolve(appDir, "../web/vite.config.ts"), "utf8");
    for (const config of [viteConfig, main]) {
      // 主前端把两个数据目录收敛进 serveDataDirectory 工厂，挂载路径与数据目录仍是
      // 写死的字面量，两套前端必须指向同一棵发布树。
      expect(config).toContain('"/data/releases"');
      expect(config).toContain('"../../data/releases"');
      // 目录穿越防护必须在两边都在。
      expect(config).toContain("target.startsWith(root + sep)");
    }
  });

  it("embeds no dataset of its own", () => {
    // 早期版本把 1.81 MB 的数据切片内嵌在 HTML 里。那会让两套前端的数字可能不一致。
    expect(html).not.toContain('id="payload"');
    expect(html).not.toContain("application/json");
    // 页面大小应回到「样式 + 模板 + 脚本」的量级，而不是几 MB。
    const bytes = Buffer.byteLength(html, "utf8");
    expect(bytes).toBeLessThan(200 * 1024);
    // index.html 必须把数据来源交给模块，而不是内联数组。
    expect(html).toContain('type="module"');
    expect(html).toContain("/src/app.js");
  });

  it("points at the release through the shared loader only", () => {
    // 加载发布包只有一条路径：data.js 里的 loadPublishedRelease。
    expect(dataJs).toContain("export async function loadPublishedRelease");
    expect(dataJs).toContain("loadRelease(");
    // app.js 不得自己 fetch 发布包。
    expect(appJs).not.toContain("fetch(");
    expect(appJs).not.toContain("/data/releases");
  });
});

describe("纸感版：启动失败必须自己说出来", () => {
  it("ships a boot reporter so a broken module is visible", () => {
    expect(html).toContain("/src/boot-report.js");
    const boot = read("src/boot-report.js");
    // 必须同时处理同步错误与未处理的 Promise 拒绝。
    expect(boot).toContain('addEventListener("error"');
    expect(boot).toContain('addEventListener("unhandledrejection"');
    // 并且要在主模块没能完成初始化时给出提示，而不是留下一个空壳页面。
    expect(boot).toContain("__paperBooted");
    expect(boot).toContain("setTimeout");
    // 提示条要有可访问角色。
    expect(boot).toContain('setAttribute("role", "alert")');
  });
});

describe("纸感版：不伪装数据", () => {
  it("keeps the caveats about what the data is not", () => {
    // 页面必须继续说明它不做预测、不给概率。
    expect(html).toContain("不预测录取");
    // 方向不参与排序这件事必须写在页面上（脚本渲染，落在 app.js 里）。
    expect(appJs).toContain("directionTags 为空");
    expect(appJs).toContain("不会");
    expect(appJs).toContain("适配度");
    // 方向不参与排序这件事必须仍然写着。
    expect(appJs).toContain("不会");
    expect(appJs).toContain("适配度");
  });

  it("shows unknown instead of zero when a value is missing", () => {
    // 学费与招生数缺失时必须显示「未知」，不能落到 0。
    expect(appJs).toContain('"未知"');
    // 位次缺失时不写 0，而是给出「未定位」之类明确措辞。
    expect(appJs).toContain("未定位");
  });

  it("does not compute a control line or a fit percentage", () => {
    // 发布包不含控制线；纸感版不得画一条示意线。
    for (const forbidden of ["本科线", "特控线", "clusterFit", "directionFit"]) {
      expect(appJs, `app.js must not mention ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe("纸感版：工作区配置", () => {
  it("exposes dev and build scripts so both front ends can run side by side", () => {
    expect(pkg.scripts?.dev).toBe("vite");
    expect(pkg.scripts?.build).toBe("vite build");
    const root = JSON.parse(readFileSync(resolve(appDir, "../../package.json"), "utf8")) as {
      scripts: Record<string, string>; workspaces: string[];
    };
    expect(root.scripts["paper:dev"]).toBe("npm --workspace @nanhang/web-paper run dev");
    expect(root.scripts["paper:build"]).toBe("npm --workspace @nanhang/web-paper run build");
    // 主前端的命令名保持不变：既有文档与脚本都指向 web:*。
    expect(root.scripts["web:dev"]).toBe("npm --workspace @nanhang/web run dev");
    expect(root.scripts["web:build"]).toBe("npm --workspace @nanhang/web run build");
    // 工作区必须覆盖 apps/*，新前端才会被 npm 管理。
    expect(root.workspaces).toContain("apps/*");
  });

  it("uses a distinct dev port so both can run at once", () => {
    expect(viteConfig).toContain("port: 5174");
    const main = readFileSync(resolve(appDir, "../web/vite.config.ts"), "utf8");
    expect(main).toContain("port: 5173");
  });
});

describe("纸感版的源码不外泄个人信息", () => {
  it("contains no student names in the shipped sources", () => {
    // 纸感版的源码会被构建进产物；这里确保它不携带任何学生姓名文本。
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "dist" || entry.name === "node_modules") continue;
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else files.push(full);
      }
    };
    walk(appDir);
    expect(files.length).toBeGreaterThan(0);
    // 姓名只可能来自「荣县一中」那条数据线；纸感版不得引用它。
    // 本测试文件自身会提到这两个词，因此跳过它。
    const self = resolve(import.meta.dirname, "paper-honesty.test.ts");
    for (const file of files) {
      if (file === self) continue;
      if (!/\.(js|ts|html|css|json)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      expect(text, `${file} must not reference the school release`).not.toContain("quality-huixi");
      expect(text, `${file} must not reference the school release`).not.toContain("荣县");
    }
    expect(existsSync(resolve(appDir, "src/data.js"))).toBe(true);
  });
});
