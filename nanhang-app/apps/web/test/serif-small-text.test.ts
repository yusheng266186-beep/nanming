// 小字一律宋体（负责人 2026-09-13：「把前端中最小的那些字体改为宋体……整页全面替换，不要漏掉」）。
//
// 背景：这一版界面的正文与小标签一直走 --sans（系统无衬线），只有标题走 --song（宋体）。
// 负责人看下来觉得 12px 及以下的小字用无衬线跟整体不和谐——小字是「批注」的语气，应该跟标题同一副字。
// 这条规则靠 style.css 里逐条规则声明，容易在后续改动里漏掉，所以用测试钉住：
//   ① 凡是 font-size ≤ 12px 的规则，必须写明宋体（--song）或原本就是衬线的展示字体（--display）；
//   ② font: 简写里的小字号同样算；
//   ③ 页面里那些不认 var() 的地方（SVG 的 presentation attribute）要写死同一串宋体栈。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const css = src("style.css");
const locate = src("chapters/locate.tsx");

/** 最小的那些字号都算「小字」；12px 是这条界线（13px 起是正文）。 */
const SMALL_PX = 12;

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

const SERIF_TOKENS = ["var(--song)", "var(--display)"];

describe("小字宋体", () => {
  it("--song 里带着宋体回退，缺字体时也不会掉回无衬线", () => {
    expect(css).toContain("--song:'Noto Serif SC','Songti SC','STSong','SimSun',serif");
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
    expect(locate).toContain("const SONG_FAMILY = \"'Noto Serif SC','Songti SC','STSong','SimSun',serif\"");
    // 轨迹图里的四条小字：纵向刻度、两条切线标签、柱顶分数、柱下考试名
    const strokes = locate.match(/fontSize="(?:8|8\.5|9)"/g) ?? [];
    const withFamily = locate.match(/fontSize="(?:8|8\.5|9)" fontFamily=\{SONG_FAMILY\}/g) ?? [];
    expect(strokes.length).toBeGreaterThanOrEqual(4);
    expect(withFamily.length).toBe(strokes.length);
  });
});
