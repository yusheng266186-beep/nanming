import { useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { makeBranches, type PoolRow, type RouteBranch, type SchoolPool } from "../journey-model.js";
import type { ScoreRange } from "../journey-model.js";
import type { WebState } from "../model.js";
import { Icon } from "../art.js";
import {
  REFERENCE_YEAR, RELATION_CLASSES, buildRoutePoster, formatRankInterval, groupRouteRows, label,
  levelLabel, pickGroupedCards, scoreRangeForRanks, svgStringToPng, type PageId
} from "./shared.js";

export interface ChartProps {
  state: WebState;
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  pool: SchoolPool | null;
  poolStale: boolean;
  aiDirectionIds: readonly string[];
  picks: readonly string[];
  range: ScoreRange | null;
  contextLabel: string;
  notify: (message: string) => void;
  chartSvgRef: MutableRefObject<SVGSVGElement | null>;
}

/** 末页那段「写给你」：页面与导出海报共用同一份文本，避免两处各写一遍。 */
const BLESSING = {
  text: "愿你既有仰望星空的方向，也有脚踏实地的航线。远方很远，但每一次起航，都从今天这一分开始。",
  sign: "—— 南 溟"
} as const;


/**
 * 窄屏判定。手机端用「抽屉式堆叠卡」按大类收起（负责人 2026-09-12：不要一股脑全堆出来，
 * 借首页起航六站那套），宽屏仍是平铺的分组列表；导出海报一律平铺。
 */
function useNarrowChart(query = "(max-width: 720px)"): boolean {
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

/** 每个专业类在页面上取几张、每条线一共取几张（页面与海报用同一组数字）。 */
const CARDS_PER_CLASS = 4;
const CARDS_PER_ROUTE = 24;

/** 导出倍率：整图按这个倍数光栅化（长度很长的图放大看时，1 倍会糊）。 */
const PNG_SCALE = 2;

const ROUTE_META = [
  { kind: "shared" as const, title: "共同方向", sub: "两条路在这里相遇——AI 的建议和你的选择都包含这些专业。" },
  { kind: "ai" as const, title: "AI 建议探索", sub: "从对话中发现——只出现在 AI 建议里的专业。" },
  { kind: "self" as const, title: "我的自主选择", sub: "为自己的想法留一条路——只出现在你自选里的专业。" }
];


/**
 * 图内用色与字体。导出 PNG 时这张 SVG 会被序列化后重新绘制，CSS 变量与类都拿不到，
 * 所以颜色和字体只能写成元素属性——这里集中一份，取值与 style.css 的令牌一致。
 */
const CHART = {
  paper: "#f7f5ee", card: "#fbf9f2", ink: "#0f262e", ink2: "#2c444c", mut: "#6d7f83",
  line: "#dcd6c6", line2: "#cbc4b0", brass: "#a97b34", brass2: "#c89b52",
  brassLine: "#dcc79c", foam: "#93aca8", safe: "#7d9a86", sea: "#12454f",
  song: "'Noto Serif SC', serif", display: "'Cormorant Garamond', serif"
} as const;

/**
 * 版心与三条航路的落位。版心左右各内缩 20（44–956），保证任何文字都不越出版框；
 * 三条线在 y=92/158/224，中间 172–210 那段空档留给航线小结，224 以下留给图签与说明。
 */
const PLATE = {
  x0: 44,
  x1: 956,
  lineX1: 700,
  lineY: (index: number) => 92 + index * 66
} as const;


/** 航线小结的行距与首行基线（写在中间两条航路之间的空档里）。 */
const ROUTE_TITLE_TOP_Y = 186;
const ROUTE_TITLE_LINE_H = 17;

export function renderChart({ state, page, setPage, pool, poolStale, aiDirectionIds, picks, range,
  contextLabel, notify, chartSvgRef }: ChartProps) {
  const routes = pool ? makeBranches(pool, aiDirectionIds, [...picks]) : [];
  const candidates = pool?.rows.map((row) => row.candidate) ?? [];
  const withRange = range !== null;

  // 三条航线仍按历史参考关系分组画线——它们描述位次与参考年记录的关系，不是录取预测。
  const relationGroups = RELATION_CLASSES.map((relation) => ({
    ...relation,
    items: candidates.filter((candidate) => candidate.group_reference.relation === relation.key)
  }));
  const drawable = relationGroups.some((group) => group.items.length > 0);
  const rangeLabel = range ? `${range.low}–${range.high}` : "未生成";
  /** 三种关系的记录总数，用来算各自占比（两个版式共用）。 */
  const narrowChart = useNarrowChart();
  /** 抽屉当前展开的大类（键是「线:大类名」）；一次只开一个，和首页六站一个脾气。 */
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const relationTotal = relationGroups.reduce((sum, group) => sum + group.items.length, 0);
  /** 学生这一次真正选了方向没有（自选专业类 + AI 建议），空结果要据此分开解释。 */
  const chosenDirections = picks.length + aiDirectionIds.length;
  /** 选了、但当前院校池里一条记录都没有的专业类名——名字从 id 里取回，池子派生目录里没有它们。 */
  const missingNames = [...picks, ...aiDirectionIds]
    .filter((id) => !pool?.majors.some((major) => major.directionId === id))
    .map((id) => id.replace(/^catalog:/, ""))
    .slice(0, 4);

  /**
   * 导出整页海报（负责人 2026-09-12：导出要和手机端显示一致——竖版长图、一条条卡片，
   * 不是把院校压成一堆文字行）。素材取竖版那张航线图（它在 DOM 里始终存在，窄屏可见），
   * 卡片按页面的顺序与字段逐张排出，末尾接上「写给你」。
   */
  const savePng = async () => {
    const node = chartSvgRef.current;
    if (!node) { notify("当前浏览器无法导出图片，请稍后重试。"); return; }
    const box = node.viewBox?.baseVal;
    const chartWidth = Math.round(box?.width || 360);
    const chartHeight = Math.round(box?.height || 344);
    const poster = buildRoutePoster({
      chartBody: node.innerHTML,
      chartWidth,
      chartHeight,
      contextLabel,
      rangeLabel,
      referenceYear: pool?.referenceYear ?? REFERENCE_YEAR,
      // 海报与页面同款：按大类 → 小类分层，卡片挑选规则也一致（每类几张、每线合计上限）。
      routes: routes.map((route) => {
        const picked = pickGroupedCards(groupRouteRows(route.rows), CARDS_PER_CLASS, CARDS_PER_ROUTE);
        const shown = picked.reduce(
          (sum, entry) => sum + entry.classes.reduce((n, cls) => n + cls.rows.length, 0), 0);
        return {
          title: route.title,
          total: route.rows.length,
          more: Math.max(0, route.rows.length - shown),
          groups: picked.map((entry) => ({
            name: entry.category.name,
            total: entry.category.total,
            classes: entry.classes.map((cls) => ({
              name: cls.name,
              total: cls.total,
              cards: cls.rows.map((row) => {
                const reference = row.reference === "major" ? row.candidate.major_reference : row.candidate.group_reference;
                const interval = reference.reference_rank_interval ?? [];
                const year = reference.source_year ?? pool?.referenceYear ?? REFERENCE_YEAR;
                const scores = scoreRangeForRanks(state.release, state.form.primary, year, interval);
                const relation = RELATION_CLASSES.find((item) => item.key === reference.relation) ?? null;
                const passed = row.candidate.eligibility.status === "PASS";
                return {
                  institution: row.label.institutionName,
                  city: row.label.institutionCity,
                  relation: relation ? { label: relation.label, color: relation.route } : null,
                  major: row.label.majorName,
                  level: row.label.level ? levelLabel(row.label.level) : null,
                  sub: [row.label.batch, row.label.categoryClass,
                    passed ? null : label(row.candidate.eligibility.status)].filter(Boolean).join(" · "),
                  score: scores ? (scores.min === scores.max ? `${scores.min}` : `${scores.min}–${scores.max}`) : "未知",
                  rank: formatRankInterval(interval),
                  plan: row.label.planCount === null || row.label.planCount === undefined ? "未知" : `${row.label.planCount}`,
                  fee: row.label.tuition === null || row.label.tuition === undefined ? "学费未知" : `学费 ${row.label.tuition}`,
                  tags: (row.label.institutionTags ?? "").split("/").map((tag) => tag.trim()).filter(Boolean).slice(0, 3),
                };
              }),
            })),
          })),
        };
      }),
      blessing: BLESSING,
      note: `按历史位置参考绘制 · 参考年 ${pool?.referenceYear ?? REFERENCE_YEAR} · 不构成录取判断 · 正式填报以本省考试院政策与高校招生章程为准`
    });
    const posterWidth = 720;
    const posterHeight = Number((poster.match(/viewBox="0 0 720 (\d+)"/) ?? [])[1] ?? 2400);
    // 长图放大看时字会糊，所以按 2 倍像素密度光栅化（SVG 是矢量，放大不损失清晰度）。
    const ok = await svgStringToPng(poster, posterWidth * PNG_SCALE, posterHeight * PNG_SCALE,
      `南溟航线图-${state.form.targetYear}-${rangeLabel}.png`);
    notify(ok ? "已保存高清 PNG 航线图（与页面同款，含院校卡片与寄语）" : "图片生成失败：浏览器拒绝导出，请稍后重试。");
  };
  /** 一张院校推荐卡（航线图与分数轴同款；这里抽出来给平铺与抽屉两版共用）。 */
  const renderCard = (row: PoolRow, routeKind: string) => {
    const reference = row.reference === "major" ? row.candidate.major_reference : row.candidate.group_reference;
    const interval = reference.reference_rank_interval ?? [];
    const sourceYear = reference.source_year ?? pool?.referenceYear ?? REFERENCE_YEAR;
    // 分层标签直接用发布包里的历史位置关系（需更好位置 / 同分或边界重叠 / 位置较有余量）。
    // 项目边界不提供「冲稳保」预测，所以标签说明的是「相对历史记录的位置」，不是录取结论。
    const relation = RELATION_CLASSES.find((item) => item.key === reference.relation) ?? null;
    const institutionTags = (row.label.institutionTags ?? "").split("/")
      .map((tag) => tag.trim()).filter(Boolean).slice(0, 3);
    const passed = row.candidate.eligibility.status === "PASS";
    // 参考年最低分由位次区间反查同年的分段表得到（合约只带位次），查不到写「未知」。
    const scores = scoreRangeForRanks(state.release, state.form.primary, sourceYear, interval);
    const scoreText = scores
      ? (scores.min === scores.max ? `${scores.min}` : `${scores.min}–${scores.max}`)
      : "未知";
return <article className={`scard${relation ? ` rel-${relation.cls}` : ""}`} key={`${routeKind}-${row.label.offeringId}`}>
  <div className="scard-top">
    <div className="sc-head">
      <span className="sc-loc"><Icon name="pin" />{row.label.institutionName}{row.label.institutionCity ? ` · ${row.label.institutionCity}` : ""}</span>
      {relation
        ? <span className={`sc-rel ${relation.cls}`}><i />{relation.label}</span>
        : <span className="sc-rel none">暂无比较依据</span>}
    </div>
    <h3 className="song">{row.label.majorName}
      {row.label.level ? <em className="sc-lv">{levelLabel(row.label.level)}</em> : null}</h3>
    <p className="sc-sub">
      {row.label.batch}{row.label.categoryClass ? ` · ${row.label.categoryClass}` : ""}
      {passed ? null : ` · ${label(row.candidate.eligibility.status)}`}
    </p>
  </div>
  {/* 一行数据条：最低分打头（学生最先想知道的），位次/招生数/学费跟在后面。
      旧版三格方块把卡片撑到 236px 高，滚动很费劲；这里压成一条。 */}
  <div className="sc-foot">
    <span className="sc-score">{sourceYear} 最低 <b>{scoreText}</b> 分</span>
    <span>位次 {formatRankInterval(interval)}</span>
    <span>招 {row.label.planCount ?? "—"} 人</span>
    <span className="sc-fee">{row.label.tuition == null ? "学费未知" : `学费 ${row.label.tuition}`}</span>
  </div>
  {institutionTags.length ? <p className="sc-tagline">{institutionTags.join(" · ")}</p> : null}
  {row.reference === "group" ? <p className="fhint" style={{ margin: "0 16px 10px" }}>只有专业组依据，具体专业门槛未知。</p> : null}
</article>;
  };

  return <section id="page-chart" className={`view${page === "chart" ? " active" : ""}`} aria-label="航线图">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 06 · 航线图 · 抟扶摇</span>
        <h1 className="song">两条来路，<em>一张航线图。</em></h1>
        <p className="lede">AI 建议和你的自选各是一条线：一致合成一条，不一致分两条并列列出。所有院校专业都来自区间匹配的院校池，系统不打分、不排先后。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>水击三千里，<br />抟扶摇而上者九万里。</p></div>
    </div>

    {!pool ? <div className="panel">
      <h3><Icon name="axis" />还没有院校池</h3>
      <p className="psub">双线结果从区间匹配的院校池里来：先在「定位」生成探索区间，再去「分数轴」匹配院校，最后回「方向」定两条线。</p>
      <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
        <button type="button" className="btn brass" onClick={() => setPage("axis")}>去分数轴匹配<Icon name="arrow" /></button>
      </div>
    </div> : <>
      {poolStale ? <p className="feedback">选科、批次或区间已改变，下面的结果按上一次匹配的院校池计算；建议回「分数轴」重新匹配。</p> : null}
      <div className="chart-stage">
        <div className="chart-head">
          <span className="eyebrow">Chart of the Southern Deep</span>
          <h2 className="song">{withRange ? `从 ${rangeLabel} 分的海面，到你想去的那片。` : "先生成探索区间，航线才会亮起。"}</h2>
          <p className="sub">图中三条线仍按历史参考关系分组：只反映院校池里的记录与参考年位次的关系，不是录取预测，也不代表三种分数情景。</p>
          <div className="seal"><span className="song">南溟<br />航线</span></div>
        </div>
        {/* 航线图：按「海图版画」重画（2026-09-12 负责人指出旧图太廉价、与整站主题不符）。
            三条位置关系线是主图；左侧一枚帆船标出起航点，右下角是区间图签，底部一行航线小结。
            约束：导出 PNG 会把这张 SVG 序列化后重新绘制，样式必须全部写成元素属性
            （CSS 类在导出时丢失），且不引用任何 id 渐变或滤镜——旧图那块渐变底在序列化后不生效，
            导出结果会露出画布的深色垫底，正是负责人截图里那张「黑底草稿」。 */}
        <div className="routes">
          {/* 窄屏竖排版心：一条关系一行（名字 → 计数与占比 → 一条带波纹的航路），
              字号按 1.0 倍左右渲染，手机上读得清；数据、配色与横版完全同源。
              横版 1000×320 缩到 390 宽时字号只剩 4–5px，那是负责人指出的「根本看不清」。 */}
          <svg className="rt-narrow" ref={chartSvgRef} viewBox="0 0 360 344" xmlns="http://www.w3.org/2000/svg"
            role="img" aria-label="三条历史参考关系航线示意图（竖排）">
            {/* 无底板、无版框：图直接落在页面的卡片上（此前那块纸色底比卡片略深，
                看上去像贴了一张图）。导出 PNG 时由画布垫纸色，静态图依然完整。 */}
            {drawable ? <>
              <text x={2} y={16} fontFamily={CHART.song} fontSize={12.5} fill={CHART.ink}>航线关系图</text>
              <text x={358} y={16} textAnchor="end" fontFamily={CHART.song} fontSize={10} fill={CHART.mut}>
                {pool?.schoolCount ?? 0} 所院校 · {(pool?.rows.length ?? 0).toLocaleString("zh-CN")} 条
              </text>
              {relationGroups.map((group, index) => {
                const share = relationTotal > 0 ? group.items.length / relationTotal * 100 : 0;
                const top = 40 + index * 84;
                const lineY = top + 46;
                return <g className="rt-row" key={group.key}>
                  {/* 悬停时浮出的淡色底：不描边，只用 5% 的深海色，读起来像纸上一块阴影。 */}
                  <rect className="rt-band" x={0} y={top - 10} width={360} height={76} rx={14} fill={CHART.sea} />
                  <circle cx={4} cy={top + 8} r={3.2} fill="none" stroke={group.route} strokeWidth={1.4} />
                  <text className="rt-name" x={18} y={top + 12} fontFamily={CHART.song} fontSize={13.5}
                    fill={CHART.ink2}>{group.label}</text>
                  <text className="rt-count" x={358} y={top + 14} textAnchor="end" fontFamily={CHART.display}
                    fontSize={23} fontWeight={600} fill={group.route}>{group.items.length.toLocaleString("zh-CN")}</text>
                  <text className="rt-share" x={358} y={top + 30} textAnchor="end" fontFamily={CHART.display}
                    fontStyle="italic" fontSize={10} fill={CHART.mut}>占 {share.toFixed(1)}%</text>
                  <path className="rt-glow" d={`M0 ${lineY}C96 ${lineY - 9} 226 ${lineY + 9} 358 ${lineY}`}
                    stroke={group.route} strokeWidth={group.width + 6} opacity={0.1} fill="none" strokeLinecap="round" />
                  <path className="rt-line" d={`M0 ${lineY}C96 ${lineY - 9} 226 ${lineY + 9} 358 ${lineY}`}
                    stroke={group.route} strokeWidth={group.width + 0.6} strokeDasharray={group.dash || undefined}
                    fill="none" strokeLinecap="round" />
                  <circle className="rt-node" cx={0} cy={lineY} r={3.4} fill={CHART.paper} stroke={group.route}
                    strokeWidth={1.2} />
                  {index === 1 ? <g className="rt-boat">
                    <g transform={`translate(34,${lineY}) scale(1.15)`} stroke="none">
                      <path d="M-14 0h28l-5 9h-18Z" fill={CHART.ink} opacity={0.9} />
                      <path d="M0 0v-19" stroke={CHART.ink} strokeWidth={1.1} />
                      <path d="M0-18 12-2H0Z" fill={CHART.brass2} />
                      <path d="M-1-15 -9-3h8Z" fill={CHART.safe} opacity={0.85} />
                    </g>
                  </g> : null}
                </g>;
              })}
              <path d="M0 292H358" stroke={CHART.line2} strokeWidth={0.8} opacity={0.7} />
              <text x={0} y={310} fontFamily={CHART.song} fontSize={10.5} fill={CHART.ink2}>
                {routes.length
                  ? routes.map((route) => `${route.title} ${route.rows.length}`).join(" · ") + " 条"
                  : "两条线还没有内容"}
              </text>
              <text x={358} y={310} textAnchor="end" fontFamily={CHART.song} fontSize={12} fill={CHART.ink}>
                {rangeLabel} 分
              </text>
              <text x={358} y={330} textAnchor="end" fontFamily={CHART.display} fontStyle="italic" fontSize={9.5}
                fill={CHART.mut}>参考年 {pool?.referenceYear ?? REFERENCE_YEAR} · 按历史位置参考绘制 · 不构成录取判断</text>
            </> : <g>
              <text x={180} y={156} textAnchor="middle" fontFamily={CHART.song} fontSize={14} fill={CHART.ink2}>
                {withRange ? "还没有可绘制的结果" : "尚未生成探索区间"}
              </text>
              <text x={180} y={180} textAnchor="middle" fontFamily={CHART.display} fontStyle="italic" fontSize={10.5}
                fill={CHART.mut}>{withRange ? "回「分数轴」重新匹配院校" : "先在「定位」生成探索区间"}</text>
            </g>}
          </svg>
          <svg className="rt-wide" viewBox="0 0 1000 320" xmlns="http://www.w3.org/2000/svg" role="img"
            aria-label="三条历史参考关系航线示意图">
            {/* 无底板、无版框：图直接落在页面的卡片上（此前那块纸色底比卡片略深，看着像贴了一张图）。
                版心仍按 PLATE 常量收口（44–956），三条航路 200→700，右侧 866–956 是数据栏。 */}
            <g stroke={CHART.line2} strokeWidth={0.8} opacity={0.4}>
              <path d="M200 84v140M700 84v140" />
            </g>
            {drawable ? <>
              <text x={PLATE.x0} y={46} fontFamily={CHART.display} fontStyle="italic" fontSize={10.5}
                letterSpacing={1.8} fill={CHART.brass}>ROUTE RELATIONS · 航线关系图</text>
              <text x={PLATE.x1} y={46} textAnchor="end" fontFamily={CHART.song} fontSize={11.5} fill={CHART.ink2}>
                区间内匹配 {pool?.schoolCount ?? 0} 所院校 · {(pool?.rows.length ?? 0).toLocaleString("zh-CN")} 条专业 × 院校
              </text>
              {relationGroups.map((group, index) => {
                const total = relationGroups.reduce((sum, item) => sum + item.items.length, 0);
                const y = PLATE.lineY(index);
                const share = total > 0 ? group.items.length / total * 100 : 0;
                return <g className="rt-row" key={group.key}>
                  {/* 悬停时浮出的淡色底：不描边，只用 4% 的深海色，读起来像纸上一块阴影。 */}
                  <rect className="rt-band" x={PLATE.x0 - 16} y={y - 30} width={PLATE.x1 - PLATE.x0 + 32}
                    height={60} rx={14} fill={CHART.sea} />
                  {/* 左侧关系名 + 色点：名字在这一侧，右侧只留数字，两端都有落点。 */}
                  <circle cx={PLATE.x0 + 3} cy={y - 4} r={3.2} fill="none" stroke={group.route} strokeWidth={1.4} />
                  <text className="rt-name" x={PLATE.x0 + 14} y={y} fontFamily={CHART.song} fontSize={13}
                    fill={CHART.ink2}>{group.label}</text>
                  {/* 光晕 + 主线：同一条航路画两遍，让线有厚度而不是一根生硬的细线。 */}
                  <path className="rt-glow" d={`M200 ${y}C320 ${y - 22} ${PLATE.lineX1 - 120} ${y + 18} ${PLATE.lineX1} ${y}`}
                    stroke={group.route} strokeWidth={group.width + 6} opacity={0.1} fill="none" strokeLinecap="round" />
                  <path className="rt-line" d={`M200 ${y}C320 ${y - 22} ${PLATE.lineX1 - 120} ${y + 18} ${PLATE.lineX1} ${y}`}
                    stroke={group.route} strokeWidth={group.width + 0.6} strokeDasharray={group.dash || undefined}
                    fill="none" strokeLinecap="round" />
                  <circle className="rt-node" cx={200} cy={y} r={3.6} fill={CHART.paper} stroke={group.route}
                    strokeWidth={1.3} />
                  <path d={`M${PLATE.lineX1 + 6} ${y}H856`} stroke={group.route} strokeWidth={0.7}
                    opacity={0.4} strokeDasharray="1 3" />
                  {/* 数据栏：浅底胶囊里的计数 + 下方占比——比一串裸数字更有落点。 */}
                  <rect className="rt-pill" x={866} y={y - 15} width={90} height={30} rx={9} fill={group.route} opacity={0.1} />
                  <text className="rt-count" x={911} y={y + 6} textAnchor="middle" fontFamily={CHART.display} fontSize={20}
                    fontWeight={600} fill={group.route}>{group.items.length.toLocaleString("zh-CN")}</text>
                  <text className="rt-share" x={PLATE.x1} y={y + 27} textAnchor="end" fontFamily={CHART.display}
                    fontStyle="italic" fontSize={10} letterSpacing={0.6} fill={CHART.mut}>占 {share.toFixed(1)}%</text>
                </g>;
              })}
              {/* 起航点：一枚小帆船压在中间那条航路的起点上（外层 g 不带 transform，
                  交给 CSS 做轻微起伏，避免 CSS 变换覆盖掉内层的坐标变换）。 */}
              <g className="rt-boat">
                <g transform="translate(232,158) scale(1.3)" stroke="none">
                  <path d="M-14 0h28l-5 9h-18Z" fill={CHART.ink} opacity={0.9} />
                  <path d="M0 0v-19" stroke={CHART.ink} strokeWidth={1.1} />
                  <path d="M0-18 12-2H0Z" fill={CHART.brass2} />
                  <path d="M-1-15 -9-3h8Z" fill={CHART.safe} opacity={0.85} />
                  <path d="M-20 4c9 4 31 4 40 0" stroke={CHART.foam} strokeWidth={0.9} strokeLinecap="round" opacity={0.6} />
                </g>
              </g>
              {/* 航线小结写在中间两条线的空档里（172–210），不压线。 */}
              {routes.slice(0, 3).map((route, index) =>
                <text key={route.kind} x={200} y={ROUTE_TITLE_TOP_Y + 18 + index * ROUTE_TITLE_LINE_H}
                  fontFamily={CHART.song} fontSize={12.5} fill={CHART.ink2}>
                  {route.title} · {route.rows.length} 条专业 × 院校
                </text>)}
              {/* 底部一行说明：区间、参考年与免责，用一条细线收口，不再套方框（负责人：不要边框）。 */}
              <path d={`M${PLATE.x0} 264H${PLATE.x1}`} stroke={CHART.line2} strokeWidth={0.8} opacity={0.7} />
              <text x={PLATE.x0} y={288} fontFamily={CHART.display} fontStyle="italic" fontSize={8.5}
                letterSpacing={1.4} fill={CHART.brass}>EXPLORATION RANGE</text>
              <text x={PLATE.x0 + 150} y={289} fontFamily={CHART.song} fontSize={13} fill={CHART.ink}>
                {rangeLabel} 分
              </text>
              <text x={PLATE.x0 + 250} y={288} fontFamily={CHART.display} fontSize={10.5}
                fill={CHART.mut}>参考年 {pool?.referenceYear ?? REFERENCE_YEAR}</text>
              {/* 右下角：这张图到底在说什么。 */}
              <text x={PLATE.x1} y={278} textAnchor="end" fontFamily={CHART.display} fontStyle="italic"
                fontSize={10.5} letterSpacing={0.8} fill={CHART.mut}>按历史位置参考绘制</text>
              <text x={PLATE.x1} y={294} textAnchor="end" fontFamily={CHART.display} fontStyle="italic"
                fontSize={10.5} letterSpacing={0.8} fill={CHART.mut}>不构成录取判断</text>
            </> : <g>
              <text x={500} y={152} textAnchor="middle" fontFamily={CHART.song} fontSize={15} fill={CHART.ink2}>
                {withRange ? "还没有可绘制的结果" : "尚未生成探索区间"}
              </text>
              <text x={500} y={178} textAnchor="middle" fontFamily={CHART.display} fontStyle="italic" fontSize={11}
                letterSpacing={0.8} fill={CHART.mut}>
                {withRange ? "回「分数轴」重新匹配院校，航线才会亮起" : "先在「定位」生成探索区间"}
              </text>
            </g>}
          </svg>
        </div>
        <div className="route-legend">
          {RELATION_CLASSES.map((relation) => <span className={`rl ${relation.cls}`} key={relation.key}>
            <span className="swatch" />{relation.label} · 历史参考
          </span>)}
        </div>
      </div>

      {/* 双线结果：每个方向类一条路，样式对等；重叠的专业×院校在两条线里都出现，不去重。 */}
      {routes.length === 0
        ? <div className="panel">
          <h3><Icon name="route" />{chosenDirections === 0 ? "两条线都还空着" : "选的方向在这个区间里没有院校记录"}</h3>
          {/* 两种空要分开说：没选方向，和「选了，但院校池里没有这些专业类」。
              后者以前也显示「两条线都还空着」，学生会以为自己的选择丢了——2026-09-12 负责人
              就是这么撞上的。池子按住区间、选科与批次筛出来，池里没有的类就没有卡片。 */}
          {chosenDirections === 0
            ? <p className="psub">AI 建议和自选都还没有内容：回「谈心」聊出建议，或在「方向」自选几个专业，两条线就会在这里分开亮起。</p>
            : <p className="psub">
              你选了 {picks.length} 个专业类、AI 建议 {aiDirectionIds.length} 个，但当前院校池里没有它们的记录
              {missingNames.length ? `（${missingNames.join("、")}）` : ""}。
              院校池是按你的探索区间、选科与批次筛出来的，池子里有的专业类才会出卡片。
            </p>}
          <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
            {chosenDirections === 0 ? <>
              <button type="button" className="btn sm" onClick={() => setPage("talk")}>去谈心</button>
              <button type="button" className="btn sm ghost" onClick={() => setPage("direction")}>去方向自选</button>
            </> : <>
              <button type="button" className="btn sm" onClick={() => setPage("axis")}>回分数轴放宽区间</button>
              <button type="button" className="btn sm ghost" onClick={() => setPage("direction")}>换个方向</button>
            </>}
          </div>
        </div>
        : routes.map((route) => {
          const meta = ROUTE_META.find((item) => item.kind === route.kind)!;
          // 按大类 → 小类分组（负责人 2026-09-12：不要一股脑全堆出来，要有层次）；
          // 每小类取前几张、每条线合计上限若干张——页面两版与导出海报用同一份挑选。
          const grouped = groupRouteRows(route.rows);
          const picked = pickGroupedCards(grouped, CARDS_PER_CLASS, CARDS_PER_ROUTE);
          const shown = picked.reduce(
            (sum, entry) => sum + entry.classes.reduce((n, cls) => n + cls.rows.length, 0), 0);
          return <div className="panel" style={{ marginBottom: 22 }} key={route.kind}>
            <div className="res-bar" style={{ marginBottom: 14 }}>
              <div className="res-count">{meta.title} · <b>{route.rows.length}</b> 条专业 × 院校</div>
              <span className="muted-note">{meta.sub}</span>
            </div>
            <div className="dmajors" style={{ marginBottom: 14 }}>
              {route.majors.slice(0, 12).map((major) => <span key={major.id}>{major.name}</span>)}
              {route.majors.length > 12 ? <span>另 {route.majors.length - 12} 个</span> : null}
            </div>
            {route.rows.length === 0
              // 旧文案写「这些专业在院校池里」是错的：它们只在发布库目录里，院校池是按住区间、
              // 选科与批次筛出来的那一部分（负责人 2026-09-12 就是被这句话绕住的）。
              // 现在说实话，并给出可操作的下一步。
              ? <p className="muted-note">这些专业类在你这次的院校池里一条记录都没有（池子共 {pool?.rows.length ?? 0} 条 · {pool?.schoolCount ?? 0} 所院校）。院校池是按你的探索区间、选科与批次筛出来的；可以把区间放宽一点、把高职（专科）批一并勾上，或换个方向。这条选择会保留，不自动扩大范围去凑结果。</p>
              : narrowChart
                // 手机端：大类收成抽屉（借首页起航六站那套堆叠卡），点开才展开它的小类与卡片。
                ? <div className="deck">
                  {grouped.map((category) => {
                    const key = `${route.kind}:${category.name}`;
                    const open = openCategory === key;
                    const entry = picked.find((item) => item.category.name === category.name);
                    return <div className={`stop${open ? " open" : ""}`} key={key}>
                      <button type="button" className="stop-head" aria-expanded={open}
                        onClick={() => setOpenCategory(open ? null : key)}>
                        <span className="mk">{category.classes.length} 个专业类</span>
                        <h4>{category.name}</h4>
                        <span className="sc-cat-count">{category.total} 条</span>
                        <span className="stop-cue"><Icon name="chevron" /></span>
                      </button>
                      {open ? <div className="stop-body">
                        {entry ? entry.classes.map((cls) => <div className="sc-class" key={cls.name}>
                          <div className="sc-class-head">
                            <span>{cls.name}</span>
                            <span>{cls.total} 条{cls.total > cls.rows.length ? ` · 列前 ${cls.rows.length}` : ""}</span>
                          </div>
                          <div className="schools" style={{ marginTop: 0 }}>
                            {cls.rows.map((row) => renderCard(row, route.kind))}
                          </div>
                        </div>) : <p className="muted-note">这个大类在这次挑选里没有展开的卡片（每个专业类取前 {CARDS_PER_CLASS} 张，每条线合计上限 {CARDS_PER_ROUTE} 张）。</p>}
                      </div> : null}
                    </div>;
                  })}
                </div>
                // 宽屏与导出：平铺的分组列表——大类标题 → 小类标题 → 卡片。
                : <>{picked.map((entry) => <section className="sc-cat" key={entry.category.name}>
                  <div className="sc-cat-head">
                    <h4 className="song">{entry.category.name}</h4>
                    <span>{entry.category.total} 条 · {entry.category.classes.length} 个专业类</span>
                  </div>
                  {entry.classes.map((cls) => <div className="sc-class" key={cls.name}>
                    <div className="sc-class-head">
                      <span>{cls.name}</span>
                      <span>{cls.total} 条{cls.total > cls.rows.length ? ` · 列前 ${cls.rows.length}` : ""}</span>
                    </div>
                    <div className="schools" style={{ marginTop: 0 }}>
                      {cls.rows.map((row) => renderCard(row, route.kind))}
                    </div>
                  </div>)}
                </section>)}</>}
            {shown > 0 && shown < route.rows.length
              ? <p className="fhint" style={{ marginTop: 12 }}>已按大类与专业类分层展开 {shown} 张卡片，其余 {route.rows.length - shown} 条未逐条展开（导出的图片与这一屏同款）。</p>
              : null}
          </div>;
        })}
    </>}

    <div className="blessing">
      <span className="eyebrow">A Word For You · 写给你</span>
      <p className="song">{BLESSING.text}</p>
      <div className="sign">{BLESSING.sign}</div>
    </div>
    {/* 导出与返回（负责人 2026-09-12 定）：删掉那块个人资料面板与打印入口后，
        只剩三枚按钮——导出 PNG 独占一行当主操作，复制与返回并排当次要操作，窄屏不会挤成一团。
        清除本次探索已随该面板一起下线，改由顶栏「溟」→ 设置提供。 */}
    <div className="chart-actions chart-export">
      <button type="button" className="btn brass" disabled={!drawable} onClick={() => { void savePng(); }}><Icon name="down" />保存为 PNG 图片</button>
      <div className="export-row">
        <button type="button" className="btn ghost" onClick={() => setPage("axis")}><Icon name="axis" />回去调区间</button>
      </div>
    </div>
  </section>;
}
