import { MAJOR_FACT_CARDS, explorationCards } from "@nanhang/exploration";
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
