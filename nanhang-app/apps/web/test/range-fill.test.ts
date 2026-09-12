// 「区间标尺」：探索区间与分数轴的上下限输入（负责人要求两页同步重新设计）。
//
// 上下限属于同一个值——一段区间。原来两页各摊两只一模一样的输入框，读不出它们是一段，
// 也没有单位，更没有和轴上的金带对上。这些断言钉住四件事：
// ① 两页共用同一个模块（改一处两处一起变）；② 两页各自的端点兜底与 aria-label 一字未动；
// ③ 标尺的样子（纸面填空 / 带端头的细线 / 单位只出现一次）与深海底那一版；
// ④ 旧结构下线（四只框、失效的 `.axis-hero .inp`）。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const module_ = src("range-fill.tsx");
const locate = src("chapters/locate.tsx");
const axis = src("chapters/axis.tsx");
const css = src("style.css");

describe("区间标尺：两页共用一支标尺", () => {
  it("两页都从同一个模块取，页内不再各写一套上下限输入", () => {
    expect(locate).toContain('import { RangeFill } from "../range-fill.js"');
    expect(axis).toContain('import { RangeFill } from "../range-fill.js"');
    expect(locate).toContain("<RangeFill lowLabel=\"微调下限\" highLabel=\"微调上限\"");
    expect(axis).toContain("<RangeFill lowLabel=\"区间下限\" highLabel=\"区间上限\"");
    // 页内不再有自己的上下限输入（aria-label 与 old `.inp` 写法都由模块承担）。
    for (const page of [locate, axis]) {
      expect(page).not.toContain('aria-label="探索区间下限"');
      expect(page).not.toContain('aria-label="探索区间上限"');
      expect(page).not.toContain('className="grid-2" style={{ marginTop: 14, gap: 14, maxWidth: 420 }}');
    }
    expect(module_).toContain('aria-label={aria}');
    expect(module_).toContain('type="number" min={0} max={750} inputMode="numeric"');
  });

  it("端点语义留在各页自己手里：谁补谁、basis 怎么写都没变", () => {
    // 定位：改下限时上限兜 750，改上限时下限兜 0；basis 说的是「微调过，下次数据变化重新生成」。
    expect(locate).toContain('({ low: value, high: current?.high ?? 750,');
    expect(locate).toContain('({ low: current?.low ?? 0, high: value,');
    expect(locate).toContain('basis: "手动微调过的探索区间；下一次数据变化会重新生成。"');
    // 分数轴：还没有区间时以「另一个端点先等于这个值」起步（不补 750/0 造出巨区间）。
    expect(axis).toContain('({ low: value, high: current?.high ?? value,');
    expect(axis).toContain('({ low: current?.low ?? value, high: value,');
    expect(axis).toContain('basis: "手动填写的探索区间（不来自考试数据）；可随时修改。"');
    // 空串仍然是「这个端点还没填」。
    expect(module_).toContain('const toEndpoint = (raw: string) => (raw === "" ? Number.NaN : Number(raw));');
  });

  it("标尺的样子：纸面填空 + 铜色底线 + 带端头的细线 + 单位只出现一次", () => {
    expect(module_).toContain('<span className="rf-cap">{label}</span>');
    expect(module_).toContain('<span className="rf-dash" aria-hidden="true" />');
    expect(module_).toContain('<span className="rf-unit" aria-hidden="true">分</span>');
    expect(module_.match(/rf-unit/g)?.length).toBe(1);
    // 无框 + 下方一条细底线；聚焦时底线点亮并浮一层柔光。
    expect(css).toMatch(/\.rf-inp\{[^}]*border:0;border-bottom:1\.5px solid var\(--brass-line\)/);
    expect(css).toMatch(/\.rf-inp\{[^}]*background:transparent/);
    expect(css).toMatch(/\.rf-inp:focus\{[^}]*border-bottom-color:var\(--brass\)/);
    expect(css).toMatch(/\.rf-inp:focus\{[^}]*box-shadow:0 8px 0 -6px rgba\(169,123,52/);
    // 数字用显示衬线 + 等宽数位，两支标尺的宽度恒定（改数字时框不抖）。
    expect(css).toMatch(/\.rf-inp\{[^}]*font-family:var\(--display\)/);
    expect(css).toMatch(/\.rf-inp\{[^}]*font-variant-numeric:tabular-nums/);
    // 中间那根线两端各一道短竖头——与分数轴金带上的端头同一支记号笔。
    expect(css).toMatch(/\.rf-dash\{[^}]*background:var\(--brass-line\)/);
    expect(css).toMatch(/\.rf-dash::before,\.rf-dash::after\{[^}]*background:var\(--brass\)/);
    expect(css).toMatch(/\.rf-dash::before\{left:0\}/);
    expect(css).toMatch(/\.rf-dash::after\{right:0\}/);
    // 原生步进箭头吞掉（否则「填空」上会挂两只小三角）。
    expect(css).toMatch(/\.rf-inp\{-moz-appearance:textfield;appearance:textfield\}/);
    expect(css).toMatch(/\.rf-inp::-webkit-outer-spin-button,\.rf-inp::-webkit-inner-spin-button\{-webkit-appearance:none/);
  });

  it("深海底上换深海玻璃底：只有颜色变，标尺本身不另造一套", () => {
    expect(css).toMatch(/#page-axis \.range-fill\{background:rgba\(9,38,44,\.55\)/);
    expect(css).toMatch(/#page-axis \.rf-inp\{color:#f2f6f3/);
    expect(css).toMatch(/#page-axis \.rf-dash::before,#page-axis \.rf-dash::after\{background:var\(--brass-2\)\}/);
    expect(css).toMatch(/#page-axis \.rf-inp:-webkit-autofill\{-webkit-box-shadow:0 0 0 1000px rgba\(9,38,44,\.55\) inset/);
    // 标尺里没有页面作用域的重复定义：浅色那一版不带 #page- 前缀，两页共用。
    expect(css).toMatch(/^\.range-fill\{/m);
  });

  it("旧结构下线：四只框与失效的 .axis-hero .inp 都不在了", () => {
    expect(css).not.toContain(".axis-hero .inp{");
    expect(css).not.toContain(".axis-hero .inp:");
    // 定位页原来那对 .field + .flab 的上下限框也随之消失（这一页仍用 .field 的是别的表单）。
    expect(locate).not.toContain('<span className="flab">微调下限</span>');
    expect(axis).not.toContain('<span className="flab">区间下限</span>');
    expect(axis).not.toContain('<span className="flab">区间上限</span>');
  });

  it("窄屏收一圈：数字、中间那根线与内边距同步缩，仍是一支标尺", () => {
    // 取最后那个 ≤560px 块（标尺的窄屏规则就写在文件末尾那一个里），不依赖换行符。
    const narrow = css.slice(css.lastIndexOf("@media(max-width:560px)"));
    expect(narrow).toContain(".range-fill{gap:12px;padding:10px 16px 12px;border-radius:12px}");
    expect(narrow).toContain(".rf-inp{font-size:25px;width:4.4ch}");
    expect(narrow).toContain(".rf-dash{width:18px;margin-bottom:19px}");
  });
});
