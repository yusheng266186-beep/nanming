// 推荐卡的分层标签：来源与边界的守卫。
//
// 负责人 2026-09-12 要求：把「哪些是冲刺、哪些是保底、哪些是本科、哪些是职业院校」直接做进
// 推荐院校卡片，而不是在页面底部另写一段「保底路线」说明。项目边界（FRONTENDS.md）不提供
// 「冲稳保」预测，所以卡片上的分层用的是**发布包里的历史位置关系**（需更好位置 / 同分或边界重叠
// / 历史位置较有余量），办学层次则取发布包的 level（本科 / 职业本科 / 专科）。这些断言钉住：
// ① 底部那段说明不再回来；② 两张卡的标签来自同一套定义；③ 位次不再写成「247189–247189」。
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatRankInterval, levelLabel } from "../src/chapters/shared.js";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const chapterDir = resolve(import.meta.dirname, "../src/chapters");
const app = [
  src("App.tsx"),
  ...readdirSync(chapterDir).filter((name) => /\.tsx?$/.test(name))
    .sort().map((name) => readFileSync(resolve(chapterDir, name), "utf8")),
].join("\n");
const chart = src("chapters/chart.tsx");
const axis = src("chapters/axis.tsx");

describe("推荐卡：分层标签", () => {
  it("页底的「保底路线」说明段与它的卡片样式不再回来", () => {
    expect(app).not.toContain("保底路线");
    expect(app).not.toContain("srow");
    expect(app).not.toContain("safety");
  });

  it("航线图与分数轴的推荐卡用同一套标签（位置关系 + 办学层次 + 资格）", () => {
    for (const page of [chart, axis]) {
      expect(page).toContain("sc-rel");
      expect(page).toContain("RELATION_CLASSES.find");
      expect(page).toContain("levelLabel(");
      expect(page).toContain("formatRankInterval(");
      // 顶角徽章 + 底部「资格」格子各写一遍「符合已检查条件」的旧排法不再出现。
      expect(page).not.toContain('className="rbadge');
    }
  });

  it("办学层次取发布包的 level：专科写成「高职（专科）」，其余原样", () => {
    expect(levelLabel("专科")).toBe("高职（专科）");
    expect(levelLabel("本科")).toBe("本科");
    expect(levelLabel("职业本科")).toBe("职业本科");
  });

  it("位次相等时只写一个数并加千分位，不等时写成区间", () => {
    expect(formatRankInterval([247189, 247189])).toBe("247,189");
    expect(formatRankInterval([200565, 204300])).toBe("200,565–204,300");
    expect(formatRankInterval([])).toBe("—");
  });
});
