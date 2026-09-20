// 章节门禁：一步一步来，但随时可以回看。
//
// 规则（负责人 2026-09-12 的要求：「没完成上一个环节就不能打开下一个页面，要一步一步完成，
// 完成之后可以回看之前的东西，不允许随意乱跳」）：
//   1. 章节按**流程**分成几段，段内有并列入口（定位与成绩都是「拿到分数」的入口，谁先谁后都行）；
//   2. 只有「前面每一段都完成」的那一段可以进入；再往后的章节锁住，点击只会得到一句提示；
//   3. 往回看永远允许——已经走过的章节不会被锁；
//   4. 解锁是单调的：本段解锁之后不会因为回去改数据而重新锁上（避免学生在两页之间被弹来弹去）；
//      但「完成」标记始终按当前状态实时计算，改坏了数据就会如实变回未完成。
//
// 这里只做纯函数，界面负责把状态喂进来、把提示显示出来。
import type { WebState } from "./model.js";
import type { PageId } from "./chapters/shared.js";

/**
 * 流程分段。段与段之间是硬顺序，段内是并列入口。
 *
 * 「起航」这一段包含两件事：定下选科，**并且在「开始起航」的登船卡片里明确选一条入口**
 * （通用模式手填 / 荣县一中接入）。负责人 2026-09-13：只要点了「开始起航」就放行定位是不对的——
 * 学生没有选入口、也没有任何成绩，进去就是一页空的；定位必须在选了入口之后才进。
 *
 * 顺序与导航编号一致（负责人 2026-09-12 定）：先在「方向」定下两条线，再去「分数轴」
 * 匹配院校与专业——分数轴不再回指方向，匹配的结果直接进「航线图」。
 */
export const STAGES: readonly (readonly PageId[])[] = [
  ["sail"],      // 先选科：没有选科，位次与资格都无从谈起
  ["locate"],    // 拿到成绩（手填或荣县一中接入，都在这一页）并生成探索区间
  ["talk"],      // 定位的下一步是谈心：先聊想去哪
  ["direction"], // 聊完先定两条线：AI 建议线 + 学生的自选线
  ["axis"],      // 再用探索区间匹配院校与专业
  ["chart"]      // 最后合成航线图
];

export interface ProgressInput {
  readonly state: WebState;
  /** 探索区间是否已经生成（定位页的产出）。 */
  readonly rangeKnown: boolean;
  /** 院校池是否已经跑出来（分数轴页的产出）。 */
  readonly poolReady: boolean;
  /** 自选专业数量。 */
  readonly picks: number;
  /** AI 建议条数。 */
  readonly suggestionCount: number;
  /** 是否已经聊过（AI 转录里有发言）。 */
  readonly chatted: boolean;
  /**
   * 是否已经在登船卡片里选过入口（通用模式或荣县一中）。
   * 这是「起航」段的一部分：没选入口就进定位，页面上既没有考试行也没有接入表单的依据。
   */
  readonly entryChosen: boolean;
}

export function stageOf(id: PageId): number {
  const index = STAGES.findIndex((stage) => stage.includes(id));
  return index === -1 ? STAGES.length : index;
}

/** 每段是否完成。段内并列入口：任一个完成即算这一段完成。 */
export function stageDone(stage: number, input: ProgressInput): boolean {
  return (STAGES[stage] ?? []).some((id) => chapterDone(id, input));
}

/**
 * 某个章节自己是否完成。全部取自既有状态或学生按下的按钮，不新增需要记忆的标记
 * （唯一例外是「先用通用模式」，它是个显式选择，由界面记着）。
 */
export function chapterDone(id: PageId, input: ProgressInput): boolean {
  switch (id) {
    case "sail":
      // 选科齐了、并且选过登船口（两条入口都在登船卡片上）才算起航完成。
      return input.state.form.primary !== null && input.state.form.additional.length === 2
        && input.entryChosen;
    case "locate":
      return input.rangeKnown;
    case "axis":
      return input.poolReady;
    case "talk":
      return input.chatted;
    case "direction":
      return input.picks > 0 || input.suggestionCount > 0;
    case "chart":
      // 终点章节：把前面每一段都做完（航线图的输入齐了），它才显示为已完成。
      // 注意不要去调 unlockedStage——那会绕回 chapterDone 自己。
      return STAGES.slice(0, STAGES.length - 1).every((_, stage) => stageDone(stage, input));
    default:
      return false;
  }
}

/** 前面每一段都完成之后，当前段才解锁；返回当前允许进入的最大段号。 */
export function unlockedStage(input: ProgressInput): number {
  let stage = 0;
  while (stage < STAGES.length && stageDone(stage, input)) stage += 1;
  return stage;
}

/**
 * 能不能打开这一页。
 * `maxStage` 是本会话已经解锁到的最大段（由界面记住并取单调最大值）：一旦解锁就不再收回，
 * 这样「回看」不会因为中途改了数据而突然进不去。
 */
export function canOpen(id: PageId, input: ProgressInput, maxStage: number): boolean {
  return stageOf(id) <= Math.max(maxStage, unlockedStage(input));
}

/**
 * 同一次点击里「刚选下登船口」的那一步怎么判门禁。
 *
 * 起因（2026-09-20 实测）：登船卡片上的「全国通用模式／荣县一中」是**先记下选过入口、再进定位**
 * 这一个动作，但 `goTo` 里用来判门禁的 `progress` 还是这次渲染的那一份（`entryChosen` 仍是 false），
 * 于是第一次点只弹出一句「先完成起航（选好选科，再点开始起航选一条登船口）」——入口其实已经选好了，
 * 提示与事实相反，学生只能再点一次导航条才进得去。这里把「这一次点击已经选过入口」显式传进门禁，
 * 选完入口当次就放行；除此之外的一切判断仍由 `canOpen` + `lockHint` 决定，调试模式也不旁路。
 */
export function entryChosenGate(id: PageId, input: ProgressInput, maxStage: number): boolean {
  return canOpen(id, { ...input, entryChosen: true }, maxStage);
}

/** 这一步完成了吗（给导航条打勾用，始终按当前状态算）。 */
export function isDone(id: PageId, input: ProgressInput): boolean {
  return chapterDone(id, input);
}

/** 每一步「怎样才算完成」的人话说明。 */
export const DONE_HINT: Record<PageId, string> = {
  sail: "选好首选科目与两门再选科目，再点「开始起航」选一条登船口（通用模式或荣县一中）",
  locate: "生成探索区间（手填考试或接入学校数据）",
  axis: "运行一次区间匹配",
  talk: "在对话里聊几句",
  direction: "选 2–3 个大类，再勾 5–10 个专业类，或采用 AI 建议",
  chart: "完成上面的步骤"
};

export const PAGE_LABEL: Record<PageId, string> = {
  sail: "起航", locate: "定位", talk: "谈心",
  direction: "方向", axis: "分数轴", chart: "航线图"
};

/**
 * 被锁住时给学生的提示：指名**第一个还没完成的那一步**，而不是笼统说「请按顺序」。
 * 找不到（理论上不该发生）就退回一句通用提示。
 */
export function lockHint(id: PageId, input: ProgressInput): string {
  const target = stageOf(id);
  for (let stage = 0; stage < target; stage += 1) {
    if (stageDone(stage, input)) continue;
    const missing = (STAGES[stage] ?? []).find((candidate) => !chapterDone(candidate, input));
    if (!missing) continue;
    const alternatives = STAGES[stage]!.length > 1;
    const names = STAGES[stage]!.map((candidate) => `「${PAGE_LABEL[candidate]}」`).join("或");
    return alternatives
      ? `先完成${names}其中一项（${DONE_HINT[missing]}），再进入「${PAGE_LABEL[id]}」。`
      : `先完成「${PAGE_LABEL[missing]}」（${DONE_HINT[missing]}），再进入「${PAGE_LABEL[id]}」。`;
  }
  return `请按顺序完成前面的步骤，再进入「${PAGE_LABEL[id]}」。`;
}
