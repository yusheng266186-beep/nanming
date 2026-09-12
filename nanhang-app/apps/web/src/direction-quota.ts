import type { CatalogGroup } from "./journey-model.js";

/**
 * 谈心的「方向收口」判定与冻结规则。
 *
 * 借北辰的做法（github.com/yusheng266186-beep/beichen，固定提交 f02c70b5）：
 *   1. 聊到量就该停——北辰是「夜航第 5 轮起评估、满 15 轮固定给出；领航满十轮自动点亮星图」；
 *      南溟换成按**方向覆盖**算量：小类满 5 个、且分属 2 个以上大类，就算收齐（负责人 2026-09-12 的原话：
 *      「获取了三到两个大类专业和 5 至 6 个小类专业之后，这轮对话就应该停止」）。
 *   2. 收口之后仍然可以接着聊——北辰是「星图生成后仍可继续聊」；南溟是「可以继续聊，但不再新增专业类」，
 *      所以这里给出 `mergeSuggestions`：已收口就整体冻结（连顺序都不动），没收口才并入并裁到上限。
 *
 * 判定全部是纯函数：不读时间、不读 DOM、不看网络，界面只负责把目录与建议喂进来。
 */

/** 上限与收口线。上限用于「不再新增专业」——超出的小类/大类一律不进结果。 */
export const DIRECTION_QUOTA = {
  /** 小类（专业类）上限。 */
  maxClasses: 6,
  /** 大类（学科门类）上限。 */
  maxGroups: 3,
  /** 收到这么多小类、并且分属下面的组数，就算这一轮聊够了。 */
  readyClasses: 5,
  readyGroups: 2,
  /** 兜底：聊到这么多轮还没有收齐时，只要已经有建议就收口，不让学生一直等下去。 */
  readyTurns: 8
} as const;

/** 只用到专业类 id；与 ai-panel 的 AiSuggestion 结构兼容（结构化字段多几个也无妨）。 */
export interface DirectionSuggestion {
  readonly directionId: string;
}

/** 某个专业类属于哪个大类；目录里找不到就返回 null（不猜、不归类到「未分类」以外的东西）。 */
export function groupIdOf(classId: string, groups: readonly CatalogGroup[]): string | null {
  for (const group of groups) {
    if (group.classes.some((cls) => cls.id === classId)) return group.id;
  }
  return null;
}

/** 这批建议覆盖了哪些大类（按目录里的先后顺序）。 */
export function coveredGroups(suggestions: readonly DirectionSuggestion[], groups: readonly CatalogGroup[]): string[] {
  const seen = new Set<string>();
  for (const group of groups) {
    if (suggestions.some((item) => group.classes.some((cls) => cls.id === item.directionId))) seen.add(group.id);
  }
  return [...seen];
}

/**
 * 这一轮谈心是否已经聊够。
 *
 * 两条路：方向覆盖到量（主力判据），或轮数兜底（已有建议且学生答满 `readyTurns` 轮）。
 * 兜底这一条借自北辰「满十五轮仍未点亮则固定给出」——不让聊天无限进行下去。
 */
export function directionTalkSettled(
  suggestions: readonly DirectionSuggestion[], groups: readonly CatalogGroup[], studentTurns: number
): boolean {
  if (suggestions.length === 0) return false;
  const enoughClasses = suggestions.length >= DIRECTION_QUOTA.readyClasses;
  const enoughGroups = coveredGroups(suggestions, groups).length >= DIRECTION_QUOTA.readyGroups;
  if (enoughClasses && enoughGroups) return true;
  return studentTurns >= DIRECTION_QUOTA.readyTurns;
}

/** 裁到上限：先按目录顺序保大类（最多 3 个），再保这些大类下的小类（最多 6 个），原顺序不变。 */
export function trimSuggestions<T extends DirectionSuggestion>(items: readonly T[], groups: readonly CatalogGroup[]): T[] {
  const keptGroups = new Set<string>();
  const outer: T[] = [];
  for (const group of groups) {
    if (keptGroups.size >= DIRECTION_QUOTA.maxGroups) break;
    const inGroup = items.filter((item) => group.classes.some((cls) => cls.id === item.directionId));
    if (inGroup.length === 0) continue;
    keptGroups.add(group.id);
    outer.push(...inGroup);
  }
  // 目录里找不到的小类（理论上不会出现，落库时已按目录过滤过）按原顺序接在后面，仍然受总数上限约束。
  const orphan = items.filter((item) => groupIdOf(item.directionId, groups) === null);
  return [...outer, ...orphan].slice(0, DIRECTION_QUOTA.maxClasses);
}

/**
 * 合并一轮新建议。
 *
 * - 已经收口：原样返回上一轮的结果（**不再新增**，连顺序都不动）——学生可以接着聊，
 *   但方向集合就此冻住，后面 AI 再提什么都不会改这张表。
 * - 还没收口：把新建议并进来（同一专业类只留一条），再裁到上限。
 */
export function mergeSuggestions<T extends DirectionSuggestion>(
  previous: readonly T[], incoming: readonly T[], groups: readonly CatalogGroup[], studentTurns: number
): T[] {
  if (directionTalkSettled(previous, groups, studentTurns)) return [...previous];
  const merged = [...previous];
  for (const item of incoming) {
    if (!merged.some((kept) => kept.directionId === item.directionId)) merged.push(item);
  }
  return trimSuggestions(merged, groups);
}
