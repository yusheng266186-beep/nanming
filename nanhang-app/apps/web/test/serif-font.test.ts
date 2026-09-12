// 全站一套字：宋体（负责人 2026-09-13 两轮要求）。
//
// 第一轮「把最小的那些字体改为宋体」把 ≤12px 的规则改完了；第二轮负责人指出聊天框、填分数的输入框
// 这些 13–14px 的地方还是原来的字，要求「这一类字体全部改为宋体，全覆盖，不要漏掉」。
// 于是基准字体（body）也换成 --song，并把 --sans 留成宋体别名——它只是历史名字，
// 以后有人手滑写 var(--sans) 也不会掉回无衬线。这条规则靠逐条规则声明，容易被后续改动漏掉，用测试钉住：
//   ① 样式表里不允许出现无衬线字体栈（--sans / sans-serif / PingFang / Segoe UI …）；
//   ② ≤12px 的规则（含 font: 简写）一律写明宋体或展示字体；
//   ③ 页面里不认 var() 的地方（SVG presentation attribute）写死同一串宋体栈。
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const chapterDir = resolve(import.meta.dirname, "../src/chapters");
const css = src("style.css");
const chapters = readdirSync(chapterDir).filter((name) => /\.tsx?$/.test(name))
  .sort().map((name) => readFileSync(resolve(chapterDir, name), "utf8")).join("\n");

const SMALL_PX = 12;
const SERIF_TOKENS = ["var(--song)", "var(--display)"];
const SANS_MARKERS = ["var(--sans)", "sans-serif", "PingFang", "Segoe UI", "-apple-system", "Microsoft YaHei"];

/** 把样式表切成最内层的声明块（跳过注释、@media 这类容器）。 */
function declarationBlocks(stylesheet: string): string[] {
  const blocks: string[] = [];
  const stack: number[] = [];
  let index = 0;
  while (index < stylesheet.length) {
    const char = stylesheet[index]!;
    if (char === "/" && stylesheet[index + 1] === "*") {
      const end = stylesheet.indexOf("*/", index + 2);
      index = end === -1 ? stylesheet.length : end + 2;
      continue;
    }
    if (char === '"' || char === "'") {
      const end = stylesheet.indexOf(char, index + 1);
      index = end === -1 ? stylesheet.length : end + 1;
      continue;
    }
    if (char === "{") stack.push(index + 1);
    else if (char === "}") {
      const start = stack.pop();
      if (start !== undefined) blocks.push(stylesheet.slice(start, index));
    }
    index += 1;
  }
  return blocks.filter((body) => !body.includes("{") && !body.includes("}"));
}

describe("全站宋体", () => {
  it("--song 里带着宋体回退，缺字体时也不会掉回无衬线", () => {
    expect(css).toContain("--song:'Noto Serif SC','Songti SC','STSong','SimSun',serif");
  });

  it("基准字体是宋体：聊天框、输入框、段落这些继承默认字体的地方都跟着变", () => {
    expect(css).toContain("body{margin:0;background:var(--paper);color:var(--ink);font:14px/1.75 var(--song);");
    // 表单控件靠 font:inherit 继承，不另外指定字体
    expect(css).toContain("button,input,textarea,select{font:inherit;color:inherit}");
  });

  it("--sans 只剩名字，值是宋体栈（历史别名，写错也不会掉回无衬线）", () => {
    expect(css).toContain("--sans:'Noto Serif SC','Songti SC','STSong','SimSun',serif;");
    // 注释里出现不算数：声明块里不能再有无衬线
    const live = declarationBlocks(css).join("\n");
    for (const marker of SANS_MARKERS.filter((m) => m !== "var(--sans)")) expect(live).not.toContain(marker);
    expect(/font(?:-family)?:[^;}]*var\(--sans\)/.test(live)).toBe(false);
  });

  it("≤12px 的规则没有一条落在无衬线上", () => {
    const offenders: string[] = [];
    for (const body of declarationBlocks(css)) {
      const size = /font-size:\s*([\d.]+)px/.exec(body);
      const shorthand = /font:\s*(?:italic\s+)?(?:\d+\s+)?([\d.]+)px\//.exec(body);
      const px = size ? Number(size[1]) : shorthand ? Number(shorthand[1]) : null;
      if (px === null || px > SMALL_PX) continue;
      const family = /font-family:\s*([^;}]+)/.exec(body)?.[1]
        ?? /font:\s*(?:italic\s+)?(?:\d+\s+)?[\d.]+px(?:\/[^ ]+)?\s+([^;}]+)/.exec(body)?.[1];
      if (!family || !SERIF_TOKENS.some((token) => family.includes(token))) {
        offenders.push(body.trim().slice(0, 90));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("SVG 里的小字写死了同一串宋体栈（presentation attribute 不认 var()）", () => {
    expect(chapters).toContain("const SONG_FAMILY = \"'Noto Serif SC','Songti SC','STSong','SimSun',serif\"");
    const strokes = chapters.match(/fontSize="(?:8|8\.5|9)"/g) ?? [];
    const withFamily = chapters.match(/fontSize="(?:8|8\.5|9)" fontFamily=\{SONG_FAMILY\}/g) ?? [];
    expect(strokes.length).toBeGreaterThanOrEqual(4);
    expect(withFamily.length).toBe(strokes.length);
  });
});
