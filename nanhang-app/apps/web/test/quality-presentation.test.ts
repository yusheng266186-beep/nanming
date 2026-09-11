// 荣县一中成绩页的表现层不变量。
//
// 与 TASK-09 的表现检查同一套做法：对源文件做静态断言，把「必须一直成立」的界面约定钉住，
// 这样后续改样式或改文案时，不会悄悄丢掉标签、作用域或增强模式的边界说明。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = readFileSync(resolve(import.meta.dirname, "../src/App.tsx"), "utf8");
const loader = readFileSync(resolve(import.meta.dirname, "../src/quality-huixi.ts"), "utf8");
const types = readFileSync(resolve(import.meta.dirname, "../src/quality-types.ts"), "utf8");
const css = readFileSync(resolve(import.meta.dirname, "../src/style.css"), "utf8");
const vite = readFileSync(resolve(import.meta.dirname, "../vite.config.ts"), "utf8");

describe("成绩页的界面约定", () => {
  it("入口卡片不再是禁用状态，并说明需要验证码", () => {
    expect(app).not.toMatch(/className="entry deep" disabled/);
    expect(app).toContain("需要 6 位验证码");
    expect(app).toContain("不按姓名查询，也不显示任何同学的成绩");
  });

  it("明确写出验证码不是安全边界，正式上线需服务端校验", () => {
    expect(app).toContain("可被穷举");
    expect(app).toContain("必须改为服务器校验并加限流");
    expect(loader).toContain("MAX_CODE_ATTEMPTS");
    // 限流只是挡住误触，不能写成安全措施。
    expect(loader).toContain("不构成安全边界");
  });

  it("成绩页不给出录取结论，并区分「已发生」与「未预测」", () => {
    expect(app).toContain("不预测录取");
    expect(app).not.toMatch(/录取概率为?\s*\d/);
    expect(app).not.toMatch(/录取把握|稳上|保底校/);
  });

  it("表格与输入都带可访问名称与作用域", () => {
    const headers = app.match(/<th scope="col">/g) ?? [];
    const rows = app.match(/<th scope="row">/g) ?? [];
    expect(headers.length).toBeGreaterThanOrEqual(20);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(app).toContain('aria-label="成绩"');
    expect(app).toContain('aria-describedby="quality-hint"');
    expect(app).toContain('id="quality-hint"');
    expect(app).toContain('autoComplete="off"');
    expect(app).toContain('inputMode="numeric"');
  });

  it("数据缺失显示为「—」，不显示 0，也不用空字符串", () => {
    expect(loader).toContain('return value === null ? "—"');
    expect(loader).toMatch(/if \(value === null\) return "—"/);
    expect(app).not.toMatch(/formatScore\([^)]*\)\s*\?\?\s*0/);
  });

  it("跨科类考试在页面上有单独说明", () => {
    expect(app).toContain("trackDiffersFromHome");
    expect(types).toContain("trackDiffersFromHome");
    expect(app).toContain("位次、分数线与班级均分都取自这一场自己的口径");
  });

  it("成绩表在宽表时横向可滚动，数字列右对齐", () => {
    expect(css).toContain(".table-wrap{overflow-x:auto");
    expect(css).toContain(".table .num{");
    expect(css).toContain("font-variant-numeric:tabular-nums");
  });

  it("开发服务器只暴露数据目录，且路径做了越界复检", () => {
    expect(vite).toContain('name: "quality-huixi-data"');
    expect(vite).toContain("target.startsWith(root + sep)");
    expect(vite).toContain('server.middlewares.use("/data/quality-huixi"');
  });

  it("读取层不把验证码写进地址栏或本地存储", () => {
    expect(loader).not.toContain("localStorage");
    expect(loader).not.toContain("sessionStorage");
    expect(loader).not.toContain("location.search");
    expect(loader).not.toContain("history.pushState");
  });

  it("分片请求只用摘要名，不含明文验证码", () => {
    expect(loader).toContain("sha256Hex(normalized)).slice(0, 40)");
    expect(loader).toContain("/release/shards/");
    expect(loader).not.toMatch(/shards\/\$\{normalized\}/);
  });
});
