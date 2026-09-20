import { useEffect, useState } from "react";
import { useReducedMotion } from "../motion.js";
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

/**
 * 窄屏判定（默认 ≤720px）。手机端用抽屉式分组，宽屏用平铺；导出海报一律平铺。
 * 放在 shared 里是因为分数轴与航线图两页都要用同一套阈值。
 */
export function useNarrow(query = "(max-width: 720px)"): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const onChange = () => setNarrow(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}

/**
 * 纸张堆叠（窄屏的推荐卡）：一个专业类的卡片叠成一摞，滚动就是一次翻页。
 *
 * 每张卡占一个 `.stack-slot`，钉在 `--deck-top + i × --deck-peek` 这条线上（CSS 用 sticky 钉住），
 * 所以后一张压在前一张上、前一张只露出抬头那一条——像抽屉里码着的一摞纸。
 *
 * 翻页的翘起由**弹簧**驱动：每帧按几何算出「离线上还有多远」作为目标值（1 = 已经贴线，0 = 还差一屏行程），
 * 再用一个欠阻尼弹簧去追它，追到的连续量写成 `--ap`，CSS 只用它算 rotateX / 位移 / 缩放。
 * 为什么不是直接等于手指位置：一是直接跟手就变成纯线性、没有重量感（负责人 2026-09-13：
 * 「感觉是假流畅，不是有阻尼感的那种」）；二是手指停下时弹簧还能自己收尾，落纸那一下是「压下去、回一丝」，
 * 而不是硬停。簧停住后循环自动停下，不空转。
 * 另有 is-current / is-covered 两个 class 管阴影与描边这类离散效果；布局尺寸一律不动。
 */
export function useDeckStack(
  rootRef: { current: HTMLElement | null }, depsKey: string
): void {
  const calm = useReducedMotion();
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // 「线」「纸边」「行程」都从 CSS 变量读，保证 JS 的判断与 sticky 的落点是同一组数字。
    const clamp01 = (value: number) => value < 0 ? 0 : value > 1 ? 1 : value;
    // 弹簧：ωn ≈ 12 rad/s，阻尼比 ≈ 0.67——欠阻尼，手指停下后自己把最后那点翘起收干净，
    // 落地时过冲约 7%（`--ap` 到 1.07，纸上抬 1px、反向 0.5°）再落平：这就是那口「阻尼」。
    // 阻尼比再往下就要抖，往上就变成硬停；这组数是按「慢速跟得准、快滑有重量」折出来的。
    const STIFFNESS = 145;
    const DAMPING = 16;
    const springs = new Map<HTMLElement, { value: number; velocity: number }>();
    // 整摞的「滞重感」：滑动越快，纸堆越晚一点跟上（最多 7px），手一停就弹回去。
    // 这是让整页看起来有重量、而不是「内容像贴在手指上滑动」的那一点点差别。
    const lag = { value: 0, velocity: 0 };
    let stacks: HTMLElement[] = [];
    let frame = 0;
    let lastTime = 0;
    let lastScrollY = window.scrollY;

    /**
     * 重新找一遍这一页里的纸堆。抽屉是点开才把卡片放进 DOM 的，匹配结果也可能整块换掉，
     * 所以不能在挂载时找一次了事——找不到就白挂（这正是 2026-09-13 实测踩到的：抽屉点开后
     * 一直没有 --ap，因为挂载时那一页还没有卡片）。用 MutationObserver 跟着 DOM 变。
     */
    const refresh = () => {
      const next = Array.from(root.querySelectorAll<HTMLElement>(".card-stack"));
      if (next.length !== stacks.length || next.some((stack, index) => stack !== stacks[index])) stacks = next;
      return stacks;
    };

    /**
     * 一帧：量几何 → 定目标 → 弹一次弹簧 → 写 `--ap` 与两个 class。
     * 目标值只跟滚动位置有关（真的滚动量），弹簧负责「跟上去的过程」；两者分开，
     * 所以手停住之后弹簧还能把最后一点收干净，而不是直接冻结在手指离开的位置。
     */
    const tick = (now: number) => {
      frame = 0;
      const dt = lastTime ? Math.max(0.001, Math.min(1 / 30, (now - lastTime) / 1000)) : 1 / 60;
      lastTime = now;
      const vh = window.innerHeight;
      if (!stacks.length) refresh();
      let unsettled = 0;
      // 整摞的滞后量：只跟滚动速度有关，滑动停下后自己回到 0。
      const speed = (window.scrollY - lastScrollY) / dt;
      lastScrollY = window.scrollY;
      const lagTarget = calm ? 0 : Math.max(-5, Math.min(5, speed * 0.008));
      if (calm) { lag.value = 0; lag.velocity = 0; }
      else {
        // 整摞的滞后也用一根欠阻尼弹簧（ωn ≈ 16、ζ ≈ 0.7）：快滑时整摞往后沉一点，
        // 手一停就带一点点回弹地归位——这是「跟手但不粘手」的那层重量。
        lag.velocity += (260 * (lagTarget - lag.value) - 22 * lag.velocity) * dt;
        lag.value += lag.velocity * dt;
      }
      if (Math.abs(lagTarget - lag.value) + Math.abs(lag.velocity) * 0.1 > 0.002) unsettled += 1;
      root.style.setProperty("--pile-lag", `${lag.value.toFixed(2)}px`);
      for (const stack of stacks) {
        const slots = Array.from(stack.children).filter(
          (node): node is HTMLElement => node instanceof HTMLElement && node.classList.contains("stack-slot"));
        if (!slots.length) continue;
        // 视野之外的一摞整摞跳过：不读它的布局，也就不会每帧拖一次 layout。
        // 顺手把它的弹簧清掉——回来时从目标值重新开始，不会带着一个过期的量跳一下。
        const box = stack.getBoundingClientRect();
        if (box.height === 0 || stack.closest('[aria-hidden="true"]') || box.bottom < -vh * 0.35 || box.top > vh * 1.35) {
          for (const slot of slots) springs.delete(slot);
          continue;
        }
        const rects = slots.map((slot) => slot.getBoundingClientRect());
        // 读取每张卡实际解析后的 sticky top；变量定义在 stack 上，不能从外层 root 读 calc()。
        const lines = slots.map((slot) => Number.parseFloat(getComputedStyle(slot).top) || 0);
        const travel = Number.parseFloat(getComputedStyle(stack).getPropertyValue("--deck-travel")) || 240;
        let current = -1;
        rects.forEach((rect, index) => {
          const line = lines[index]!;
          if (rect.bottom <= line) return;              // 整张已经翻到线上方，不再算在这一摞里
          if (rect.top <= line + 0.5) current = index;  // 已经钉在它自己的那条线上
        });
        rects.forEach((rect, index) => {
          const slot = slots[index]!;
          const line = lines[index]!;
          // 还差多少才贴线：卡片在线下方时 top > line，目标 ap < 1（翘着）；贴上或越过线目标 = 1（摊平）。
          const target = clamp01(1 - (rect.top - line) / travel);
          let spring = springs.get(slot);
          if (!spring) { spring = { value: target, velocity: 0 }; springs.set(slot, spring); }
          if (calm) {
            spring.value = target;
            spring.velocity = 0;
          } else {
            spring.velocity += (STIFFNESS * (target - spring.value) - DAMPING * spring.velocity) * dt;
            spring.value += spring.velocity * dt;
          }
          const drift = Math.abs(target - spring.value) + Math.abs(spring.velocity) * 0.1;
          if (drift > 0.0015) unsettled += 1;
          // 允许一点点过冲（落到线上时压过头再回一丝，就是那口「阻尼」）；上限 1.12 是防失控。
          const shown = spring.value < 0 ? 0 : spring.value > 1.12 ? 1.12 : spring.value;
          const previous = slot.style.getPropertyValue("--ap");
          if (previous === "" || Math.abs(Number(previous) - shown) > 0.004) slot.style.setProperty("--ap", shown.toFixed(3));
          const isCurrent = index === current;
          const isCovered = current > index;
          if (slot.classList.contains("is-current") !== isCurrent) slot.classList.toggle("is-current", isCurrent);
          if (slot.classList.contains("is-covered") !== isCovered) slot.classList.toggle("is-covered", isCovered);
        });
      }
      // 弹簧都停住了就不再排帧；下一次滚动（或 DOM 变化）会重新把它叫醒。
      if (unsettled > 0) frame = requestAnimationFrame(tick);
      else lastTime = 0;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(tick); };
    const observer = new MutationObserver(() => { refresh(); schedule(); });
    observer.observe(root, { childList: true, subtree: true });
    refresh();
    tick(performance.now());
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    root.addEventListener("transitionend", schedule);
    return () => {
      observer.disconnect();
      springs.clear();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      root.removeEventListener("transitionend", schedule);
      root.style.removeProperty("--pile-lag");
      if (frame) cancelAnimationFrame(frame);
    };
  }, [rootRef, depsKey, calm]);
}

/** 一条线的记录按「大类（学科门类）→ 小类（专业类）」分组后的形状。 */
export interface GroupedClass<T> { name: string; total: number; rows: T[] }
export interface GroupedCategory<T> { name: string; total: number; classes: GroupedClass<T>[] }

/**
 * 把一条线的院校记录按大类 → 小类分组（负责人 2026-09-12：卡片要按大类与小类专业组分类、
 * 有层次，不要一股脑全堆出来）。分组只按发布包里的原文分类字段，不发明门类；
 * 大类与小类都按条数从多到少排，条数相同按名字排，保证两次渲染顺序一致。
 */
export function groupRouteRows<
  T extends { label: { category: string | null; categoryClass: string | null; majorName: string } }
>(rows: readonly T[]): GroupedCategory<T>[] {
  const byCategory = new Map<string, Map<string, T[]>>();
  for (const row of rows) {
    const category = row.label.category?.trim() || "未分类";
    const className = row.label.categoryClass?.trim() || row.label.majorName.trim();
    const classes = byCategory.get(category) ?? new Map<string, T[]>();
    classes.set(className, [...(classes.get(className) ?? []), row]);
    byCategory.set(category, classes);
  }
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "zh-CN");
  return [...byCategory.entries()]
    .map(([name, classes]) => ({
      name,
      total: [...classes.values()].reduce((sum, list) => sum + list.length, 0),
      classes: [...classes.entries()]
        .map(([className, list]) => ({ name: className, total: list.length, rows: list }))
        .sort((a, b) => b.total - a.total || byName(a, b)),
    }))
    .sort((a, b) => b.total - a.total || byName(a, b));
}

/** 一条线在「每小类取几张、总共取几张」的规则下挑出来的卡片（页面与海报共用同一份挑选）。 */
export function pickGroupedCards<T>(groups: readonly GroupedCategory<T>[], perClass: number, cap: number):
{ category: GroupedCategory<T>; classes: { name: string; total: number; rows: T[] }[] }[] {
  const picked = groups.map((category) => ({ category, classes: [] as { name: string; total: number; rows: T[] }[] }));
  let taken = 0;
  for (let round = 0; round < perClass && taken < cap; round += 1) {
    for (const entry of picked) {
      for (const cls of entry.category.classes) {
        if (taken >= cap) break;
        const row = cls.rows[round];
        if (!row) continue;
        let target = entry.classes.find((item) => item.name === cls.name);
        if (!target) { target = { name: cls.name, total: cls.total, rows: [] }; entry.classes.push(target); }
        target.rows.push(row);
        taken += 1;
      }
    }
  }
  return picked.filter((entry) => entry.classes.length > 0);
}

/** 海报里的一张推荐卡：和手机端卡片同一套字段。 */
export interface PosterCard {
  institution: string;
  city: string | null;
  /** 历史位置关系（着色与页面上那条细线一致）。 */
  relation: { label: string; color: string } | null;
  major: string;
  level: string | null;
  /** 批次 · 专业类 ·（资格不符时追加） */
  sub: string;
  /** 参考年最低分（「未知」表示该分数不在公布范围内）。 */
  score: string;
  rank: string;
  plan: string;
  fee: string;
  tags: readonly string[];
}

export interface PosterClass {
  name: string;
  /** 这个小类总共多少条（卡片只列前若干张）。 */
  total: number;
  cards: readonly PosterCard[];
}
export interface PosterGroup {
  name: string;
  total: number;
  classes: readonly PosterClass[];
}
export interface PosterRoute {
  title: string;
  /** 这一条线总共有多少条（卡片只列前若干张，其余照实写在海报里）。 */
  total: number;
  groups: readonly PosterGroup[];
  more: number;
}

/**
 * 整页海报（导出 PNG）：与手机端同一套东西——航线图 + 两条线的推荐卡 + 末尾「写给你」。
 *
 * 负责人 2026-09-12：「导出的图片要和手机端的显示一致，也就是长的矩形卡片，而不是把院校
 * 集中在一坨看起来密密麻麻的。」所以这里是**竖版卡片式**：宽度按手机版心放大一倍（720），
 * 图用竖版那张版心，每条线一张张卡片往下排（与页面上卡片几乎同构），不是紧凑的文字行。
 * 文本与颜色一律写元素属性（序列化后 CSS 拿不到），且不引用任何 id。
 */
export function buildRoutePoster(input: {
  /** 竖版航线图序列化后的内容（不含外层 <svg>）。 */
  chartBody: string;
  chartWidth: number;
  chartHeight: number;
  contextLabel: string;
  rangeLabel: string;
  referenceYear: number;
  routes: readonly PosterRoute[];
  blessing: { text: string; sign: string };
  note: string;
  /** 图下面的一行小字：解释这张图的统计口径（导出后看不到页面上的说明，所以要跟着图走）。 */
  chartNote?: string;
}): string {
  const W = 720;
  const pad = 24;
  const cardW = W - pad * 2;
  const song = "'Noto Serif SC', serif";
  const display = "'Cormorant Garamond', serif";
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const chartH = Math.round(input.chartHeight * cardW / input.chartWidth);
  const parts: string[] = [];
  let y = 118;
  parts.push(`<svg x="${pad}" y="${y}" width="${cardW}" height="${chartH}" viewBox="0 0 ${input.chartWidth} ${input.chartHeight}">${input.chartBody}</svg>`);
  y += chartH + 18;
  if (input.chartNote) {
    parts.push(`<text x="${pad}" y="${y}" font-family="${song}" font-size="10.5" fill="#6d7f83">${escape(input.chartNote)}</text>`);
    y += 20;
  } else {
    y += 16;
  }
  for (const route of input.routes) {
    parts.push(`<text x="${pad}" y="${y}" font-family="${song}" font-size="18" fill="#0f262e">${escape(route.title)} · ${route.total} 条专业 × 院校</text>`);
    y += 10;
    parts.push(`<path d="M${pad} ${y}H${W - pad}" stroke="#a97b34" stroke-width="1" opacity="0.5"/>`);
    y += 20;
    for (const group of route.groups) {
      parts.push(`<text x="${pad}" y="${y + 10}" font-family="${song}" font-size="15" fill="#0f262e">${escape(group.name)}</text>`);
      parts.push(`<text x="${W - pad}" y="${y + 10}" text-anchor="end" font-family="${song}" font-size="11" fill="#6d7f83">${group.total} 条 · ${group.classes.length} 个专业类</text>`);
      y += 18;
      parts.push(`<path d="M${pad} ${y}H${W - pad}" stroke="#dcd6c6" stroke-width="0.8"/>`);
      y += 16;
      for (const cls of group.classes) {
        parts.push(`<text x="${pad + 4}" y="${y + 8}" font-family="${song}" font-size="12" fill="#8a6326">${escape(cls.name)}</text>`);
        parts.push(`<text x="${W - pad}" y="${y + 8}" text-anchor="end" font-family="${song}" font-size="10.5" fill="#6d7f83">${cls.total} 条${cls.total > cls.cards.length ? `（列前 ${cls.cards.length} 条）` : ""}</text>`);
        y += 18;
        for (const card of cls.cards) {
          const h = card.tags.length ? 136 : 116;
          parts.push(`<rect x="${pad}" y="${y}" width="${cardW}" height="${h}" rx="14" fill="#fbf9f2" stroke="#dcd6c6"/>`);
          if (card.relation) {
            parts.push(`<rect x="${pad + 14}" y="${y + 1}" width="${cardW - 28}" height="3" rx="2" fill="${card.relation.color}" opacity="0.85"/>`);
          }
          parts.push(`<text x="${pad + 16}" y="${y + 28}" font-family="${song}" font-size="11" fill="#6d7f83">${escape(`${card.institution}${card.city ? ` · ${card.city}` : ""}`)}</text>`);
          if (card.relation) {
            parts.push(`<circle cx="${W - pad - 16 - Math.round(card.relation.label.length * 10.5) - 12}" cy="${y + 24}" r="3" fill="${card.relation.color}"/>`);
            parts.push(`<text x="${W - pad - 16}" y="${y + 28}" text-anchor="end" font-family="${song}" font-size="10.5" fill="${card.relation.color}">${escape(card.relation.label)}</text>`);
          }
          parts.push(`<text x="${pad + 16}" y="${y + 56}" font-family="${song}" font-size="16.5" fill="#0f262e">${escape(card.major)}${card.level ? `<tspan font-family="${song}" font-size="10" fill="#8a6326">　${escape(card.level)}</tspan>` : ""}</text>`);
          parts.push(`<text x="${pad + 16}" y="${y + 76}" font-family="${song}" font-size="11" fill="#6d7f83">${escape(card.sub)}</text>`);
          parts.push(`<path d="M${pad} ${y + 88}H${W - pad}" stroke="#dcd6c6" stroke-width="0.8"/>`);
          parts.push(`<text x="${pad + 16}" y="${y + 108}" font-family="${song}" font-size="11.5" fill="#6d7f83">${input.referenceYear} 最低 <tspan font-family="${display}" font-size="17" font-weight="600" fill="#8a6326">${escape(card.score)}</tspan> 分</text>`);
          parts.push(`<text x="${W - pad - 16}" y="${y + 108}" text-anchor="end" font-family="${song}" font-size="11" fill="#2c444c">位次 ${escape(card.rank)} · 招 ${escape(card.plan)} 人 · ${escape(card.fee)}</text>`);
          if (card.tags.length) {
            parts.push(`<text x="${pad + 16}" y="${y + 127}" font-family="${song}" font-size="10" fill="#8a6326">${escape(card.tags.join(" · "))}</text>`);
          }
          y += h + 10;
        }
        y += 6;
      }
      y += 14;
    }
    if (route.more > 0) {
      parts.push(`<text x="${pad}" y="${y + 6}" font-family="${song}" font-size="11" fill="#6d7f83">另有 ${route.more} 条未逐条列出：页面与海报按同一规则挑选（每个专业类取前几张，合计 ${route.total - route.more} 张）。</text>`);
      y += 24;
    }
    y += 26;
  }
  const blessTop = Math.round(y);
  const blessH = 196;
  const total = blessTop + blessH + 76;
  const head = `<rect width="${W}" height="${total}" fill="#f7f5ee"/>
  <text x="${pad}" y="46" font-family="${display}" font-style="italic" font-size="12.5" letter-spacing="2" fill="#a97b34">CHART OF THE SOUTHERN DEEP</text>
  <text x="${pad}" y="86" font-family="${song}" font-size="27" fill="#0f262e">南溟航线图</text>
  <text x="${W - pad}" y="52" text-anchor="end" font-family="${song}" font-size="12.5" fill="#2c444c">${escape(input.contextLabel)}</text>
  <text x="${W - pad}" y="76" text-anchor="end" font-family="${song}" font-size="12.5" fill="#2c444c">探索区间 ${escape(input.rangeLabel)} 分 · 参考年 ${input.referenceYear}</text>
  <path d="M${pad} 104H${W - pad}" stroke="#a97b34" stroke-width="1" opacity="0.6"/>`;
  const bless = `<rect x="${pad}" y="${blessTop}" width="${cardW}" height="${blessH}" rx="16" fill="#12454f"/>
  <text x="${W / 2}" y="${blessTop + 62}" text-anchor="middle" font-family="${display}" font-style="italic" font-size="13" letter-spacing="2" fill="#c89b52">A WORD FOR YOU · 写给你</text>
  <text x="${W / 2}" y="${blessTop + 112}" text-anchor="middle" font-family="${song}" font-size="17" fill="#eef4f1">${escape(input.blessing.text)}</text>
  <text x="${W / 2}" y="${blessTop + 158}" text-anchor="middle" font-family="${display}" font-size="14" fill="#9fbdb6">${escape(input.blessing.sign)}</text>
  <text x="${W / 2}" y="${total - 30}" text-anchor="middle" font-family="${display}" font-style="italic" font-size="10.5" fill="#6d7f83">${escape(input.note)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${total}" viewBox="0 0 ${W} ${total}">
  ${head}
  ${parts.join("\n  ")}
  ${bless}
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
