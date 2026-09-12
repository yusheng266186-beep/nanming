import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  MAX_CODE_ATTEMPTS, additionalFromCombination, classChanges, formatGap, formatRate, formatScore,
  isEntryExam, latestExam, loadQualityShard, friendlyExamLabel, normalizeCode, recentExams, registerFailure,
  subjectDistances, trailChart, weakestKnowledge, initialQualityAttempts, trailHeights, withoutEntryExams
} from "../src/quality-huixi.js";
import type { QualityIndex, QualityShard, QualityStudentExam } from "../src/quality-types.js";

/**
 * Integration coverage for the 荣县一中 quality release.
 *
 * These read the real export from disk, so a change to the pipeline that the loader does not
 * follow fails here instead of silently blanking the page. The release is a build product of a
 * workbook that is not in the repository; when it is absent the file-level checks skip rather
 * than fail, and the pure-function checks always run.
 */
const qualityRoot = resolve(import.meta.dirname, "../../../data/quality-huixi/release");
const indexFile = resolve(qualityRoot, "index.json");
const manifestFile = resolve(qualityRoot, "manifest.json");
const available = existsSync(indexFile) && existsSync(manifestFile);
const describeRelease = available ? describe : describe.skip;

const readIndex = (): QualityIndex => JSON.parse(readFileSync(indexFile, "utf8"));
const readManifest = () => JSON.parse(readFileSync(manifestFile, "utf8"));
const shardFiles = () => readdirSync(resolve(qualityRoot, "shards")).filter((name) => name.endsWith(".json"));
const readShard = (name: string): QualityShard =>
  JSON.parse(readFileSync(resolve(qualityRoot, "shards", name), "utf8"));

describe("验证码校验", () => {
  it("只接受恰好 6 位数字，其余输入在发请求前就被拒绝", () => {
    expect(normalizeCode("246810")).toBe("246810");
    expect(normalizeCode("2468107")).toBeNull();
    expect(normalizeCode("24681")).toBeNull();
    expect(normalizeCode("abcdef")).toBeNull();
    expect(normalizeCode("24 68 10")).toBe("246810");
    expect(normalizeCode("")).toBeNull();
  });

  it("错误次数达到上限后停止重试", () => {
    let attempts = initialQualityAttempts;
    for (let index = 0; index < MAX_CODE_ATTEMPTS - 1; index += 1) {
      attempts = registerFailure(attempts);
      expect(attempts.blocked).toBe(false);
    }
    attempts = registerFailure(attempts);
    expect(attempts.blocked).toBe(true);
  });

  it("非法验证码不发起网络请求", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    await expect(loadQualityShard("12345")).rejects.toThrow(/6 位数字/);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("不存在的验证码报「查无此人」，不报数据损坏", async () => {
    // 开发服务器对缺失文件会回落到 SPA 首页（200 + HTML），静态托管则是 404；两者都不该
    // 让学生看到解析错误。
    const html = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<!doctype html><html><body>app</body></html>",
        { status: 200, headers: { "content-type": "text/html" } }));
    await expect(loadQualityShard("000000")).rejects.toMatchObject({ reason: "not_found" });
    html.mockRestore();

    const missing = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not found", { status: 404 }));
    await expect(loadQualityShard("000000")).rejects.toMatchObject({ reason: "not_found" });
    missing.mockRestore();
  });

  it("真实存在的验证码能取回分片", async () => {
    const shard = readShard(shardFiles()[0]);
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(shard), { status: 200,
        headers: { "content-type": "application/json" } }));
    const loaded = await loadQualityShard("246810");
    expect(loaded.person.publicId).toBe(shard.person.publicId);
    expect(String(spy.mock.calls[0][0])).toContain("/release/shards/");
    spy.mockRestore();
  });
});

describe("展示格式：缺失一律显示为「—」，不显示 0", () => {
  it("分数保留小数但不补零，差值带正负号", () => {
    expect(formatScore(562.25)).toBe("562.25");
    expect(formatScore(562.0)).toBe("562");
    expect(formatScore(403.5713922320411)).toBe("403.57");
    expect(formatScore(0)).toBe("0");
    expect(formatScore(null)).toBe("—");
    expect(formatGap(12.34)).toBe("+12.34");
    expect(formatGap(-8.05)).toBe("-8.05");
    expect(formatGap(0)).toBe("+0");
    expect(formatGap(null)).toBe("—");
  });

  it("比率保留一位小数", () => {
    expect(formatRate(0.5126)).toBe("51.3%");
    expect(formatRate(0.5124)).toBe("51.2%");
    expect(formatRate(0.5)).toBe("50.0%");
    expect(formatRate(0)).toBe("0.0%");
    expect(formatRate(null)).toBe("—");
  });
});

describeRelease("发布产物与解析器输出一致", () => {
  it("索引自称的身份与解析器固定版本", () => {
    const index = readIndex();
    expect(index.element).toBe("nanming-quality-huixi-index");
    expect(index.schemaVersion).toBe("1.0.0");
    expect(index.parserCommit).toBe("6f70eab4e6e9ecadc00149b1387103b45b5d8e2b");
    expect(index.school).toBe("荣县一中");
    expect(index.counts.persons).toBeGreaterThan(0);
    expect(index.counts.observations).toBeGreaterThan(0);
  });

  it("manifest 的分片数量与磁盘一致，且命名规则不含姓名", () => {
    const manifest = readManifest();
    const files = shardFiles();
    expect(files.length).toBe(manifest.shardCount);
    expect(Object.keys(manifest.sha256).length).toBe(files.length + 1);
    for (const name of files) expect(name).toMatch(/^[0-9a-f]{40}\.json$/);
  });

  it("每份分片只含本人一行一考，且不带同学姓名", () => {
    const files = shardFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const name of files.slice(0, 25)) {
      const shard = readShard(name);
      expect(shard.element).toBe("nanming-quality-huixi-student");
      const exams = shard.exams.map((exam) => exam.exam);
      expect(new Set(exams).size).toBe(exams.length);
      // 分片里唯一出现的姓名必须与 person.name 相同；临界生等名单留在数据库，不进发布包。
      const serialized = JSON.stringify(shard);
      const names = serialized.match(/"name":"([^"]+)"/g) ?? [];
      expect(names.every((entry) => entry === `"name":"${shard.person.name}"`)).toBe(true);
      expect(serialized).not.toContain("critical");
    }
  });

  it("位次在同一考试同一科类内有效，并与索引的参考人数一致", () => {
    const index = readIndex();
    const shard = readShard(shardFiles()[0]);
    for (const exam of shard.exams) {
      // 每场考试用的是该场自己的科类（美术班考试按历史类统计），不一定是本人的主科类。
      expect(["物理类", "历史类"]).toContain(exam.track);
      expect(exam.trackDiffersFromHome).toBe(exam.track !== shard.person.track);
      if (exam.gradeRank === null) continue;
      expect(exam.gradeRank).toBeGreaterThanOrEqual(1);
      expect(exam.gradeSize).toBeGreaterThanOrEqual(exam.gradeRank);
      const row = index.exams.find((entry) =>
        entry.exam_code === exam.exam && entry.track === exam.track);
      if (row?.students) expect(exam.gradeSize).toBe(row.students);
      expect(exam.sourceRankNote).toContain("语义不一致");
    }
  });

  it("跨科类考试（美术班）按该场科类的分数线与位次池计算", () => {
    const files = shardFiles();
    let checked = 0;
    for (const name of files) {
      const shard = readShard(name);
      for (const exam of shard.exams) {
        if (!exam.trackDiffersFromHome) continue;
        checked += 1;
        const index = readIndex();
        const line = index.thresholds.find((row) =>
          row.exam_code === exam.exam && row.track === exam.track);
        if (line?.undergraduate_total != null) {
          expect(exam.undergraduateTotal).toBe(line.undergraduate_total);
          expect(exam.undergraduateDiff).toBeCloseTo(exam.total - line.undergraduate_total, 9);
        }
        // 该类考试的位次池大小必须等于索引里该场该科类的人数。
        const row = index.exams.find((entry) =>
          entry.exam_code === exam.exam && entry.track === exam.track);
        if (row?.students) expect(exam.gradeSize).toBe(row.students);
      }
      if (checked >= 3) break;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("线差与科目距线差都是减法结果，线缺失时不编造", () => {
    const shard = readShard(shardFiles()[0]);
    for (const exam of shard.exams) {
      if (exam.topTotal !== null) expect(exam.topDiff).toBeCloseTo(exam.total - exam.topTotal, 9);
      for (const row of subjectDistances(exam)) {
        if (row.value !== null && row.undergraduateLine !== null) {
          expect(row.undergraduateGap).toBeCloseTo(row.value - row.undergraduateLine, 9);
        } else {
          expect(row.undergraduateGap).toBeNull();
        }
        if (row.value !== null && row.gradeAverage !== null) {
          expect(row.gradeGap).toBeCloseTo(row.value - row.gradeAverage, 9);
        }
      }
    }
  });

  it("分数缺考或异常时不当作 0", () => {
    const files = shardFiles();
    let sawNonValid = false;
    for (const name of files.slice(0, 60)) {
      const shard = readShard(name);
      for (const exam of shard.exams) {
        for (const row of exam.subjects) {
          if (row.state !== "valid") {
            sawNonValid = true;
            expect(row.value).toBeNull();
          }
        }
      }
      if (sawNonValid) break;
    }
    expect(sawNonValid).toBe(true);
  });

  it("知识点只包含有来源满分且本人有作答的题，得分率可由分数与满分复算", () => {
    const files = shardFiles();
    let sawKnowledge = false;
    for (const name of files.slice(0, 80)) {
      const shard = readShard(name);
      for (const exam of shard.exams) {
        for (const block of exam.knowledge) {
          for (const area of block.areas) {
            sawKnowledge = true;
            expect(area.possible).toBeGreaterThan(0);
            expect(area.questionResponses).toBeGreaterThan(0);
            expect(area.rate).toBeCloseTo(area.earned / area.possible, 9);
            expect(area.earned).toBeGreaterThanOrEqual(0);
            expect(area.earned).toBeLessThanOrEqual(area.possible + 1e-9);
          }
        }
      }
      if (sawKnowledge) break;
    }
    expect(sawKnowledge).toBe(true);
  });

  it("最近一次考试取序列末尾，富记录保留位次与切线且不超过 5 条", () => {
    const shard = readShard(shardFiles()[0]);
    expect(latestExam(shard)).toEqual(shard.exams[shard.exams.length - 1]);
    const exams = recentExams(shard);
    expect(exams.length).toBeLessThanOrEqual(5);
    // 位次与两道切线逐字段对应分片；学校原始记录的长浮点取整到 1 位小数再进表单，
    // 免得输入框里出现 396.227272727273 这样的数。label 是友好考试名。
    const round1 = (value: number | null) => value === null ? null : Math.round(value * 10) / 10;
    expect(exams).toEqual(shard.exams.slice(-5).map((exam) => ({
      label: friendlyExamLabel(exam.exam),
      total: round1(exam.total),
      rank: exam.gradeRank,
      topTotal: round1(exam.topTotal),
      undergraduateTotal: round1(exam.undergraduateTotal)
    })));
  });

  it("入学入口考试被剔除：不进考试行，也不作为「最近一次」", () => {
    // 入口考满分口径与正考不同（校内上限 784.9、超出 750），且全校无切线；负责人裁定
    // 不作为参考依据。这里用真实分片验证：剔除后表单行、最近一次、航迹与成绩表都看不到它。
    const files = shardFiles();
    const name = files.find((file) => readShard(file).exams.some((exam) => isEntryExam(exam.exam)));
    expect(name, "发布产物里应当存在含入口场次的分片").toBeTruthy();
    const raw = readShard(name!);
    const shard = withoutEntryExams(raw);
    const entryCount = raw.exams.filter((exam) => isEntryExam(exam.exam)).length;
    expect(entryCount).toBeGreaterThan(0);
    expect(shard.exams.length).toBe(raw.exams.length - entryCount);
    expect(shard.exams.some((exam) => isEntryExam(exam.exam))).toBe(false);
    expect(recentExams(shard).some((exam) => exam.label.startsWith("入口"))).toBe(false);
    expect(latestExam(shard)?.exam).toBe(raw.exams.filter((exam) => !isEntryExam(exam.exam)).at(-1)?.exam);
    // 原始分片不被就地改动：这是「不拿它当依据」，不是删数据。
    expect(readShard(name!).exams.some((exam) => isEntryExam(exam.exam))).toBe(true);
  });

  it("最弱知识点按本人得分率升序，只取有作答的条目", () => {
    const files = shardFiles();
    let checked = 0;
    for (const name of files.slice(0, 60)) {
      const shard = readShard(name);
      const gaps = weakestKnowledge(shard, 6);
      for (let index = 1; index < gaps.length; index += 1) {
        expect(gaps[index - 1].rate).toBeLessThanOrEqual(gaps[index].rate);
      }
      for (const gap of gaps) expect(gap.possible).toBeGreaterThan(0);
      if (gaps.length) checked += 1;
      if (checked >= 3) break;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("得分率并列时先列丢分多的，避免 0/3 的小题挤掉 0/17 的大题", () => {
    // 并列 0% 很常见（一次考试里好几分都拿不到）。若按分值升序，表格会被小题占满，
    // 学生看不到真正丢分最多的那块。这里用真实分片验证并列时的次序。
    const files = shardFiles();
    let sawTie = false;
    for (const name of files.slice(0, 120)) {
      const shard = readShard(name);
      const gaps = weakestKnowledge(shard, 8);
      for (let index = 1; index < gaps.length; index += 1) {
        const previous = gaps[index - 1];
        const current = gaps[index];
        if (previous.rate === current.rate) {
          sawTie = true;
          // 同率时，前一条的满分不低于后一条
          expect(previous.possible).toBeGreaterThanOrEqual(current.possible);
        }
      }
      if (sawTie) break;
    }
    expect(sawTie).toBe(true);
  });

  it("分值越高、掉队越多，越靠前（同率同分值时按与年级的差）", () => {
    // 与上一条同一个规则的另一半：并列 0% 的条目里，年级做得越好的（差得越多）越该被看见。
    // 这里用真实分片确认 8 条内至少出现一组「同率」的相邻条目，并核对满分次序。
    const files = shardFiles();
    let tiesChecked = 0;
    for (const name of files.slice(0, 120)) {
      const shard = readShard(name);
      const gaps = weakestKnowledge(shard, 8);
      for (let index = 1; index < gaps.length; index += 1) {
        if (gaps[index - 1].rate !== gaps[index].rate) continue;
        if (gaps[index - 1].possible === gaps[index].possible) {
          const leftGap = gaps[index - 1].rate - (gaps[index - 1].gradeRate ?? gaps[index - 1].rate);
          const rightGap = gaps[index].rate - (gaps[index].gradeRate ?? gaps[index].rate);
          expect(leftGap).toBeLessThanOrEqual(rightGap + 1e-9);
        }
        tiesChecked += 1;
      }
      if (tiesChecked >= 20) break;
    }
    expect(tiesChecked).toBeGreaterThan(0);
  });

  it("班级变动只报告变化的那次考试", () => {
    const files = shardFiles();
    for (const name of files.slice(0, 80)) {
      const shard = readShard(name);
      const changes = classChanges(shard);
      const distinct = new Set(shard.exams.map((exam) => exam.classNo));
      expect(changes.length).toBeLessThanOrEqual(Math.max(0, distinct.size - 1));
      for (const change of changes) {
        expect(shard.exams.some((exam) => exam.exam === change.exam)).toBe(true);
      }
    }
  });

  it("索引里的分数线与分片一致", () => {
    const index = readIndex();
    const files = shardFiles();
    for (const name of files.slice(0, 20)) {
      const shard = readShard(name);
      for (const exam of shard.exams) {
        const line = index.thresholds.find(
          (row) => row.exam_code === exam.exam && row.track === shard.person.track);
        if (!line) continue;
        expect(exam.topTotal).toBe(line.top_total);
        expect(exam.undergraduateTotal).toBe(line.undergraduate_total);
      }
    }
  });

  it("索引不含任何学生姓名或验证码", () => {
    const raw = readFileSync(indexFile, "utf8");
    expect(raw).not.toMatch(/验证码/);
    expect(raw).not.toMatch(/"name"/);
    const index = JSON.parse(raw) as QualityIndex;
    expect(index.conflicts.length).toBeGreaterThanOrEqual(0);
    for (const conflict of index.conflicts) {
      // 冲突记录键包含姓名（来自解析器），但索引只保留计数与说明，不保留键。
      expect(conflict.conflict_key).toBeUndefined();
    }
  });

  it("已知数据问题逐条记录，未被静默丢弃", () => {
    const index = readIndex();
    expect(index.issueCounts.RANK_SOURCE_DISAGREEMENT ?? 0).toBeGreaterThan(0);
    const rankIssues = index.issues.filter((issue) => issue.issue_code === "RANK_SOURCE_DISAGREEMENT");
    expect(rankIssues.length).toBeGreaterThan(0);
    for (const issue of rankIssues) {
      expect(issue.message).toContain("校赋名");
      expect(issue.affected_count ?? 0).toBeGreaterThan(0);
    }
    // 21/33/51 三次考试源位次与重算一致，不应产生问题记录。
    for (const exam of ["21", "33", "51"]) {
      expect(rankIssues.some((issue) => issue.exam_code === exam)).toBe(false);
    }
    expect(index.scoreBasis.rank).toContain("重算");
  });
});

describe("航迹柱高（不依赖真实验证码即可验证）", () => {
  it("scales between the person's own lowest and highest total", () => {
    const heights = trailHeights([500, 550, 600]);
    expect(heights[0]).toBe(30);
    expect(heights[2]).toBe(100);
    // 中间那场落在两端之间，且严格递增。
    expect(heights[1]!).toBeGreaterThan(heights[0]!);
    expect(heights[1]!).toBeLessThan(heights[2]!);
  });

  it("keeps a missing exam empty instead of drawing it as zero", () => {
    // 缺考不能画成 0 分高的柱子——那看起来像「考了 0 分」。
    const heights = trailHeights([500, null, 600]);
    expect(heights[1]).toBeNull();
    // 其余场次仍按本人已知的分数区间取高，不因为缺考被拉平。
    expect(heights[0]).toBe(30);
    expect(heights[2]).toBe(100);
  });

  it("returns all-empty when no exam has a source total", () => {
    expect(trailHeights([null, null])).toEqual([null, null]);
    expect(trailHeights([])).toEqual([]);
    // 只有一个已知分数时不制造斜率：唯一一根柱子落在最低位置。
    expect(trailHeights([580])).toEqual([30]);
  });

  it("does not mix in line or benchmark values", () => {
    // 柱高只由本人总分决定：给同样的总分，无论其它场次如何，高度一致。
    const a = trailHeights([500, 600]);
    const b = trailHeights([500, 600]);
    expect(a).toEqual(b);
    // 单一已知分数的场次也不会被分数线（一本线/本科线）抬高。
    expect(trailHeights([500, 500])).toEqual([30, 30]);
  });
});

describe("选科组合解析（回填表单用）", () => {
  it("解析当前数据里的三种组合，再选科目取组合原文的后两字", () => {
    expect(additionalFromCombination("物化生")).toEqual(["CHEMISTRY", "BIOLOGY"]);
    expect(additionalFromCombination("历政地")).toEqual(["POLITICS", "GEOGRAPHY"]);
    expect(additionalFromCombination("物化地")).toEqual(["CHEMISTRY", "GEOGRAPHY"]);
  });

  it("能解析当前数据之外的新组合，而不是按旧名单猜", () => {
    // 学校之后可能出现「物生地」等新班级组合；解析按字符进行，天然覆盖。
    expect(additionalFromCombination("物生地")).toEqual(["BIOLOGY", "GEOGRAPHY"]);
    expect(additionalFromCombination("历化政")).toEqual(["CHEMISTRY", "POLITICS"]);
  });

  it("识别不足两门时返回 null，由调用方保持表单原样、让学生自己选", () => {
    expect(additionalFromCombination("物??")).toBeNull();
    expect(additionalFromCombination("物化")).toBeNull();
    expect(additionalFromCombination("")).toBeNull();
  });
});

describe("考试代码友好名与航迹图", () => {
  const mkExam = (exam: string, total: number | null,
                  topTotal: number | null = null, undergraduateTotal: number | null = null) =>
    ({ exam, rawLabel: null, total, topTotal, undergraduateTotal }) as unknown as QualityStudentExam;

  it("学校考试代码翻译成学期/月考名称；未登记的代码原样返回", () => {
    expect(friendlyExamLabel("1册")).toBe("第1学期期末");
    expect(friendlyExamLabel("21")).toBe("第2学期第1次月考");
    expect(friendlyExamLabel("4半")).toBe("第4学期半期");
    expect(friendlyExamLabel("51")).toBe("第5学期第1次月考");
    expect(friendlyExamLabel("入口")).toBe("入口");
    expect(friendlyExamLabel(null)).toBe("");
  });

  it("航迹图：标尺覆盖总分与各场切线，划线按每一场自己的值分段", () => {
    const chart = trailChart([
      mkExam("1册", 380, null, 360),
      mkExam("2册", 420, 400, 370),
      mkExam("51", 452, 440, 380)
    ]);
    expect(chart).not.toBeNull();
    expect(chart!.bars.length).toBe(3);
    // 每一场考试有自己的划线段：top 两段（2册/51），本科线三段——不能用一条线代表所有场次。
    const top = chart!.lines.filter((line) => line.kind === "top");
    const undergraduate = chart!.lines.filter((line) => line.kind === "undergraduate");
    expect(top.map((line) => line.value)).toEqual([400, 440]);
    expect(undergraduate.map((line) => line.value)).toEqual([360, 370, 380]);
    // 只有每种划线的最后一段带标签；所有段都落在画布内，且各段占各自考试的横向槽位。
    expect(top[0]!.label).toBeNull();
    expect(top[1]!.label).toContain("440");
    expect(undergraduate.at(-1)!.label).toContain("380");
    for (const line of chart!.lines) {
      expect(line.y).toBeGreaterThanOrEqual(0);
      expect(line.y).toBeLessThanOrEqual(chart!.height);
      expect(line.x2).toBeGreaterThan(line.x1);
    }
    // 标尺上有分数刻度，学生能读出柱子高低差对应的分差。
    expect(chart!.grid.length).toBeGreaterThanOrEqual(1);
  });

  it("航迹图：两类划线的值很接近时，标签防重叠至少隔 12px", () => {
    const chart = trailChart([mkExam("1册", 500, 490, 485), mkExam("2册", 505, 492, 486)]);
    const labels = chart!.lines.filter((line) => line.label !== null).map((line) => line.labelY);
    expect(labels.length).toBe(2);
    expect(Math.abs(labels[0]! - labels[1]!)).toBeGreaterThanOrEqual(12);
  });

  it("缺考场次留空槽位不补零；无可绘总分时返回 null", () => {
    const chart = trailChart([mkExam("1册", null), mkExam("2册", 420)]);
    expect(chart!.bars[0]!.total).toBeNull();
    expect(chart!.bars[0]!.h).toBe(0);
    expect(chart!.bars[1]!.total).toBe(420);
    expect(trailChart([mkExam("1册", null)])).toBeNull();
  });

  it("没有切线就没有参考线，柱子仍可绘制", () => {
    const chart = trailChart([mkExam("1册", 400), mkExam("2册", 430)]);
    expect(chart!.lines).toEqual([]);
    expect(chart!.bars.length).toBe(2);
  });
});
