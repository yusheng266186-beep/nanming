import { MAJOR_FACT_CARDS, explorationCards } from "@nanhang/exploration";
import type { LoadedRelease } from "@nanhang/release-loader";
import type { ArtName } from "../art.js";
import { initialQualityAttempts, type LoadedQuality, type QualityAttempts } from "../quality-huixi.js";

/**
 * The displayed reference year.
 *
 * The release chooses its own reference year from the history actually present; when a candidate
 * carries no source year we fall back to this constant rather than guessing a different one.
 */
export const REFERENCE_YEAR = 2025;

const labels: Record<string, string> = {
  PHYSICS: "物理", HISTORY: "历史", CHEMISTRY: "化学", BIOLOGY: "生物", POLITICS: "政治", GEOGRAPHY: "地理",
  "本科批B段": "本科批B段", "高职(专科)批": "高职（专科）批",
  PASS: "符合已检查条件", UNKNOWN: "待核对", CONFIRMED: "已确认", DENIED: "已否认", PENDING: "待探索",
  AHEAD_OF_REFERENCE: "历史位置较有余量", BEHIND_REFERENCE: "需要更好位置", OVERLAPS_REFERENCE: "同分或边界重叠",
  NOT_COMPARABLE: "暂无比较依据", DATASET_WITHDRAWN: "数据版本已撤回，不能继续使用", TARGET_YEAR_PLAN_MISSING: "目标年度计划尚未发布",
  "syn-offer-cs": "计算机方向（合成）", "syn-offer-mech": "机械方向（合成）", "syn-offer-trade": "经贸方向（合成）"
};
export const label = (value: unknown) => labels[String(value)] ?? String(value);

export const CHAPTERS = [
  { id: "sail", num: "01", k: "起航", icon: "sail", art: "sea" },
  { id: "locate", num: "02", k: "定位", icon: "compass", art: "sea" },
  { id: "talk", num: "03", k: "谈心", icon: "chat", art: "harbor" },
  { id: "direction", num: "04", k: "方向", icon: "layers", art: "compass" },
  { id: "axis", num: "05", k: "分数轴", icon: "axis", art: "lighthouse" },
  { id: "chart", num: "06", k: "航线图", icon: "route", art: "sea" }
] as const;
export type PageId = (typeof CHAPTERS)[number]["id"];

/**
 * 「定位」章的两条路（负责人 2026-09-12 定）。
 *
 * 定位不再是「一页里混着两种录入口」，而是并行的两条路：`manual` 手填几次考试、
 * `school` 荣县一中接入学校数据。两条路产出同一个东西——探索区间——然后同时进入
 * 「谈心」。所以它不新增章节，航程条仍然是六站，只是同一章下有两个页面变体。
 */
export type LocateRoute = "manual" | "school";

/**
 * 荣县一中增强模式在本页的状态。
 *
 * `index` 与 `shard` 分开存放：年级/班级汇总是所有人共享的一份，学生本人的分片只有验证
 * 通过后才取回。验证失败只累计次数，不保留任何已取到的数据。
 */
export interface QualityState {
  status: "idle" | "loading" | "ready" | "failed";
  index: LoadedQuality["index"] | null;
  shard: LoadedQuality["shard"] | null;
  attempts: QualityAttempts;
  message: string | null;
}
export const initialQualityState: QualityState = { status: "idle", index: null, shard: null,
  attempts: initialQualityAttempts, message: null };

export const DIRECTION_ARTS: ArtName[] = ["compass", "harbor", "lighthouse", "sea"];
export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** 办学层次标签：发布包里的 level 原样用，「专科」在页面上写全称（与批次名同一口径）。 */
export const levelLabel = (level: string): string => level === "专科" ? "高职（专科）" : level;

/**
 * 参考位次写法：发布库里同一个位次的上下界经常相等（一个专业只招一两人时区间退化成点），
 * 直接 join("–") 会显示「247189–247189」，看着像脏数据。相等只写一个数，统一加千分位。
 */
export const formatRankInterval = (interval: readonly number[]): string => {
  if (!interval.length) return "—";
  const format = (value: number) => value.toLocaleString("zh-CN");
  return interval[0] === interval[1]
    ? format(interval[0]!)
    : `${format(interval[0]!)}–${format(interval[1]!)}`;
};

/**
 * 位次 → 参考年分数：用发布包里同一年的那一分一段表反查。
 *
 * 合约里的候选只带位次区间（`reference_rank_interval`），没有分数；而学生看卡片时最需要
 * 「这个学校这个专业去年最低多少分」。两者是同一张表的正反两面，所以按官方口径反查：
 * 表里每一行是一个分数，它的位次带是 [cumulative − count + 1, cumulative]；位次落在哪一行，
 * 分数就是那行的分数。查不到（位次超出公布范围）就返回 null，不插值不外推。
 */
export function scoreRangeForRanks(
  release: LoadedRelease | null,
  track: "PHYSICS" | "HISTORY" | null,
  year: number,
  interval: readonly number[] | null | undefined,
): { min: number; max: number } | null {
  if (!release || !track || !interval || interval.length !== 2) return null;
  const table = release.distributions.find((item) => item.track === track && item.year === year);
  if (!table) return null;
  const scoreAt = (rank: number): number | null => {
    for (const row of table.rows) {
      if (row.count === null || row.cumulative === null) continue;
      if (rank >= row.cumulative - row.count + 1 && rank <= row.cumulative) return row.score;
    }
    return null;
  };
  // 区间两端：位次小的那头分数高，位次大的那头就是「最低分」。
  const best = scoreAt(Math.min(...interval));
  const worst = scoreAt(Math.max(...interval));
  return best === null || worst === null ? null : { min: worst, max: best };
}

export interface PosterRoute {
  title: string;
  rows: readonly {
    institution: string;
    city: string | null;
    major: string;
    level: string | null;
    /** 参考年最低分（没有就写「未知」）。 */
    score: string;
    rank: string;
    plan: string;
  }[];
  /** 页面只展示了前 N 条时，把「还有多少条」照实写进海报。 */
  more: number;
}

/**
 * 整页海报（导出 PNG 用）：航线图 + 两条线的院校专业清单 + 末尾那段「写给你」。
 *
 * 页面上的三样东西各自成块，导出时拼成一张竖版长图——学生要发给家长或自己留档的是整张，
 * 不是中间那块小图。文本一律用元素属性（与图内一致：序列化后 CSS 拿不到），
 * 也不引用任何 id。图片由 svgStringToPng 光栅化，尺寸由这里的 viewBox 决定。
 */
export function buildRoutePoster(input: {
  /** 页面上那张航线图序列化后的内容（不含外层 <svg>）。 */
  chartBody: string;
  chartWidth: number;
  chartHeight: number;
  contextLabel: string;
  rangeLabel: string;
  referenceYear: number;
  routes: readonly PosterRoute[];
  blessing: { text: string; sign: string };
  note: string;
}): string {
  const W = 1000;
  const pad = 64;
  const headerH = 116;
  const rowH = 22;
  const chartTop = headerH;
  let y = chartTop + input.chartHeight + 34;
  const blocks: string[] = [];
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const song = "'Noto Serif SC', serif";
  const display = "'Cormorant Garamond', serif";
  for (const route of input.routes) {
    blocks.push(`<text x="${pad}" y="${y}" font-family="${song}" font-size="19" fill="#0f262e">${escape(route.title)} · ${route.rows.length + route.more} 条专业 × 院校</text>`);
    y += 12;
    blocks.push(`<path d="M${pad} ${y}H${W - pad}" stroke="#cbc4b0" stroke-width="0.8" opacity="0.7"/>`);
    y += rowH;
    for (const row of route.rows) {
      const left = escape(`${row.institution}${row.city ? ` · ${row.city}` : ""} · ${row.major}${row.level ? `（${row.level}）` : ""}`);
      blocks.push(`<text x="${pad}" y="${y}" font-family="${song}" font-size="12.5" fill="#2c444c">${left}</text>`);
      blocks.push(`<text x="${W - pad}" y="${y}" text-anchor="end" font-family="${display}" font-size="13" fill="#12454f">${escape(`最低 ${row.score} 分 · 位次 ${row.rank} · 招 ${row.plan}`)}</text>`);
      y += rowH;
    }
    if (route.more > 0) {
      blocks.push(`<text x="${pad}" y="${y}" font-family="${song}" font-size="11" fill="#6d7f83">另有 ${route.more} 条未逐条列出（页面与海报都只展开前 ${route.rows.length} 条）。</text>`);
      y += rowH;
    }
    y += 22;
  }
  const blessTop = y + 8;
  const blessH = 168;
  const total = Math.round(blessTop + blessH + 64);
  const chartTopTag = `<svg x="0" y="${chartTop}" width="${input.chartWidth}" height="${input.chartHeight}" viewBox="0 0 ${input.chartWidth} ${input.chartHeight}">${input.chartBody}</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${total}" viewBox="0 0 ${W} ${total}">
  <rect width="${W}" height="${total}" fill="#f7f5ee"/>
  <text x="${pad}" y="70" font-family="${display}" font-style="italic" font-size="15" letter-spacing="2" fill="#a97b34">CHART OF THE SOUTHERN DEEP</text>
  <text x="${pad}" y="102" font-family="${song}" font-size="26" fill="#0f262e">南溟航线图</text>
  <text x="${W - pad}" y="78" text-anchor="end" font-family="${song}" font-size="13" fill="#2c444c">${escape(input.contextLabel)}</text>
  <text x="${W - pad}" y="102" text-anchor="end" font-family="${song}" font-size="13" fill="#2c444c">探索区间 ${escape(input.rangeLabel)} 分 · 参考年 ${input.referenceYear}</text>
  <path d="M${pad} 116H${W - pad}" stroke="#a97b34" stroke-width="1" opacity="0.6"/>
  ${chartTopTag}
  ${blocks.join("\n  ")}
  <rect x="${pad}" y="${blessTop}" width="${W - pad * 2}" height="${blessH}" fill="#12454f"/>
  <text x="${W / 2}" y="${blessTop + 62}" text-anchor="middle" font-family="${display}" font-style="italic" font-size="13" letter-spacing="2" fill="#c89b52">A WORD FOR YOU · 写给你</text>
  <text x="${W / 2}" y="${blessTop + 104}" text-anchor="middle" font-family="${song}" font-size="18" fill="#eef4f1">${escape(input.blessing.text)}</text>
  <text x="${W / 2}" y="${blessTop + 140}" text-anchor="middle" font-family="${display}" font-size="14" fill="#9fbdb6">${escape(input.blessing.sign)}</text>
  <text x="${W / 2}" y="${total - 26}" text-anchor="middle" font-family="${display}" font-style="italic" font-size="11" fill="#6d7f83">${escape(input.note)}</text>
</svg>`;
}

/** The exploration experience card for a direction, and its linked professional fact card. */
const DIRECTION_CARDS = explorationCards();
export const experienceCardFor = (directionId: string) =>
  DIRECTION_CARDS.find((card) => card.directionId === directionId) ?? null;
export const majorCardFor = (directionId: string) => {
  const card = experienceCardFor(directionId);
  return card ? MAJOR_FACT_CARDS.find((major) => major.relatedExperienceId === card.cardId) ?? null : null;
};

/**
 * The historical position relations a match can report, and how they are drawn.
 *
 * These are the real relation categories of a candidate against its reference-year record, so the
 * route chart classifies what the matcher actually returned instead of asserting fixed score
 * scenarios. `route` colours sit on the light chart, `poster` colours on the dark export.
 */
export const RELATION_CLASSES = [
  { key: "BEHIND_REFERENCE", label: "需更好位置", route: "#a97b34", poster: "#c89b52", dash: "6 10", width: 2, y: 78, cls: "far" },
  { key: "OVERLAPS_REFERENCE", label: "同分或边界重叠", route: "#12454f", poster: "#8fd0c0", dash: "", width: 2.6, y: 158, cls: "main" },
  { key: "AHEAD_OF_REFERENCE", label: "历史位置较有余量", route: "#7d9a86", poster: "#9fbdb6", dash: "2 7", width: 2, y: 238, cls: "safe" }
] as const;

/** Turn a self-contained SVG poster into a PNG download. Resolves false when the browser refuses. */
export function svgStringToPng(svg: string, width: number, height: number, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!context) { resolve(false); return; }
      // 垫底色用纸色而不是深海色：SVG 自带满幅底，垫色只在它没铺满时露出来——
      // 旧图那块渐变底在序列化后不生效，导出的 PNG 就变成了深色底草稿。
      context.fillStyle = "#f7f5ee";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((png) => {
        if (!png) { resolve(false); return; }
        const out = URL.createObjectURL(png);
        const anchor = document.createElement("a");
        anchor.href = out;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(() => { URL.revokeObjectURL(out); anchor.remove(); }, 1500);
        resolve(true);
      }, "image/png");
    };
    image.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
    image.src = url;
  });
}
