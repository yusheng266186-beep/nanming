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
  readyGroups: 2
} as const;

/**
 * 「素材够不够」：**纯前端判**（负责人 2026-09-12：不必让模型自评，也不必去改网关提示词）。
 *
 * 判据只用学生自己控制得了、而且看得出「说过具体的事」的量——答了几轮、一共写了多少字；
 * 方向覆盖（上面的 readyClasses/readyGroups）只是顺带到量时的加速条件。数字取整数档，
 * 是为了对学生解释得清楚：聊够六轮、自己写了 240 字以上，就默认素材够写一份结果了。
 */
export const MATERIAL_READY = {
  minTurns: 6,
  minChars: 240,
  /** 再聊也不会多出什么时的兜底：到这里一律收尾，不让学生无限聊下去。 */
  hardTurns: 12
} as const;

/** 素材够不够：六轮起、累计 240 字起（按去掉空白后的字数算）；满 12 轮一律算够。 */
export function materialEnough(studentTurns: readonly string[]): boolean {
  if (studentTurns.length >= MATERIAL_READY.hardTurns) return true;
  const chars = studentTurns.join("").replace(/\s+/g, "").length;
  return studentTurns.length >= MATERIAL_READY.minTurns && chars >= MATERIAL_READY.minChars;
}

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
 * 这一轮谈心是否已经聊够（该收尾了）。
 *
 * 两条路：方向覆盖到量（主力判据），或轮数兜底。**兜底不要求「已经有建议」**——
 * 北辰那一版是「满十五轮仍未点亮则固定给出」；南溟原来那版把兜底也挂在「建议数 > 0」上，
 * 于是「聊够了但一条可落地建议都没有」会永远不成立，界面既不给结论也不给出口
 * （负责人实测 14 轮什么都没有，就是这条）。
 */
export function directionTalkSettled(
  studentTurns: readonly string[], suggestions: readonly DirectionSuggestion[], groups: readonly CatalogGroup[]
): boolean {
  const enoughClasses = suggestions.length >= DIRECTION_QUOTA.readyClasses;
  const enoughGroups = coveredGroups(suggestions, groups).length >= DIRECTION_QUOTA.readyGroups;
  if (enoughClasses && enoughGroups) return true;
  return materialEnough(studentTurns);
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
 * `frozen` 由调用方给：**收尾轮（报告轮）落定之后**才冻结——那时方向集合就此冻住，
 * 学生可以接着聊，但后面 AI 再提什么都不会改这张表（北辰：星图生成后画像不再变）。
 * 收尾轮之前一直照常并入并裁到上限，否则收尾轮自己算出来的那套也会被冻掉的旧集合挡住。
 */
export function mergeSuggestions<T extends DirectionSuggestion>(
  previous: readonly T[], incoming: readonly T[], groups: readonly CatalogGroup[], frozen: boolean
): T[] {
  if (frozen) return [...previous];
  const merged = [...previous];
  for (const item of incoming) {
    if (!merged.some((kept) => kept.directionId === item.directionId)) merged.push(item);
  }
  return trimSuggestions(merged, groups);
}

/**
 * 收尾轮要不要发起、以及发起时给学生看的那句话。
 *
 * 借北辰的「报告轮」：聊天时只收集素材，最后**由界面发起一次专门的生成请求**，
 * 只把学生自己的原话当素材（不重复发 AI 正文），并要求一次拿到完整结果。
 * 这条指令不是学生说的话，所以不进转写、也不进可引用证据。
 */
export const FINAL_TURN_INSTRUCTION = [
  "【收尾】谈心到这里。",
  "请综合我前面说过的原话，给出这一轮的最终结果，不要再向我提问：",
  "一、方向建议：最多 3 个大类，每个大类下列出专业类（小类）；每条写一句「为什么」（要引用我说过的具体细节）和一句「以后主要做什么工作」。",
  "二、行动：两件我两周内能做完的小事。",
  "三、选项：留空（这一轮不需要可点答案）。"
].join("\n");
