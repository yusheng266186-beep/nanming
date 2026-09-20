// 成绩轨迹：几何算得对、且只呈现手填数据真的能支撑的东西。
//
// 负责人 2026-09-20：手填五次考试后「这些图表没有像荣县一中一样详细」，并且曲线没有标出本科线与特控线。
// 手填的考试只有三格（总分、特控线、本科线），所以这里钉住两件事：
//   ① 参考线按**每场考试自己的切线**画，跨场不平均、不拉平；
//   ② 缺线/缺分时保持 null，不插值、不补 0（项目硬规矩：缺失显示未知）。
import { describe, expect, it } from "vitest";
import { buildTrajectory, scorePercent, spanReading } from "../src/exam-trajectory.js";

const exam = (total: number | null, topTotal: number | null, undergraduateTotal: number | null, label = "") =>
  ({ label, total, rank: null, topTotal, undergraduateTotal });

describe("轨迹几何", () => {
  it("逐场算距线差：正数在线上、负数还差多少", () => {
    const geometry = buildTrajectory([
      exam(560, 580, 495),
      exam(499, 510, 450),
      exam(580, 560, 500)
    ]);
    expect(geometry.count).toBe(3);
    expect(geometry.points.map((point) => point.topGap)).toEqual([-20, -11, 20]);
    expect(geometry.points.map((point) => point.undergraduateGap)).toEqual([65, 49, 80]);
    expect(geometry.aboveTop).toBe(1);
    expect(geometry.aboveUndergraduate).toBe(3);
    expect(geometry.withLines).toBe(3);
  });

  it("参考线各自独立：某场没填线就断开，不拿别场的线替补", () => {
    const geometry = buildTrajectory([exam(560, 580, 495), exam(570, null, null)]);
    expect(geometry.points[1]!.topLine).toBeNull();
    expect(geometry.points[1]!.topGap).toBeNull();
    expect(geometry.points[1]!.undergraduateGap).toBeNull();
    // 有切线的场次只算 1 次，所以「几次在线上」这类结论不会被没填线的场次污染。
    expect(geometry.withLines).toBe(1);
  });

  it("没有总分的行不进入轨迹（0 分与缺考都不算成绩）", () => {
    const geometry = buildTrajectory([exam(null, 580, 495), exam(560, 580, 495)]);
    expect(geometry.count).toBe(1);
    expect(geometry.lastDelta).toBeNull();
    expect(geometry.span).toBeNull();
  });

  it("分数轴把参考线一起框进来，端点留白避免贴边", () => {
    const geometry = buildTrajectory([exam(560, 580, 495), exam(499, 510, 450)]);
    // 最低的线是 450，最高的是总分 560 → 轴范围必须覆盖它们
    expect(geometry.min).toBeLessThanOrEqual(450);
    expect(geometry.max).toBeGreaterThanOrEqual(560);
    expect(scorePercent(450, geometry)).toBeGreaterThanOrEqual(0);
    expect(scorePercent(560, geometry)).toBeLessThanOrEqual(100);
  });

  it("变化量与跨度只在两次以上才给，避免单次就下结论", () => {
    const one = buildTrajectory([exam(560, 580, 495)]);
    expect(one.lastDelta).toBeNull();
    expect(one.span).toBeNull();
    const three = buildTrajectory([exam(560, 580, 495), exam(570, 580, 495), exam(540, 580, 495)]);
    expect(three.lastDelta).toBe(-30);
    expect(three.span).toBe(30);
  });
});

describe("稳定性解读只说起伏，不给录取判断", () => {
  it("按跨度分档说话，且不出现概率/冲稳保字样", () => {
    const lines = [spanReading(6), spanReading(18), spanReading(40), spanReading(null)];
    expect(lines[0]).toContain("起伏很小");
    expect(lines[1]).toContain("常见波动");
    expect(lines[2]).toContain("起伏偏大");
    expect(lines[3]).toContain("录入两次以上");
    for (const line of lines) expect(line).not.toMatch(/概率|冲稳保|录取/);
  });
});
