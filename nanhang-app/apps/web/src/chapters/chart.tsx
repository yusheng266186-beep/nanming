import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { makeBranches, type SchoolPool } from "../journey-model.js";
import type { ScoreRange } from "../journey-model.js";
import type { WebState } from "../model.js";
import { Icon } from "../art.js";
import {
  REFERENCE_YEAR, RELATION_CLASSES, formatRankInterval, label, levelLabel, svgStringToPng, type PageId
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
  brassLine: "#dcc79c", foam: "#93aca8", safe: "#7d9a86",
  song: "'Noto Serif SC', serif", display: "'Cormorant Garamond', serif",
  /** 版框：海图的外框，也在四角刻线、图签、底部说明里复用。 */
  frame: { x: 24, y: 22, w: 952, h: 276 }
} as const;

/**
 * 图内文字的排版约束（viewBox 0 0 1000 320，导出 PNG 用同一坐标系）。
 *
 * 三条关系线在 y=78/158/238，每条的波形只在自己 ±14 上下浮动；因此
 * 「线间空档」是 165–229。航线小结放在这段空档里，才不会与中间那条线相交。
 * 右端留出一条标签栏：线画到 LABEL_COLUMN_X 之前就停，标签右对齐到 992 再向左生长，
 * 这样计数涨到五位数也不会溢出画布被裁掉（导出 PNG 与屏幕用的是同一个画布）。
 */
const ROUTE_LINE_END_X = 812;
const ROUTE_LINE_CTRL_X = 640;
const LABEL_COLUMN_X = 992;
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

  const copyText = async () => {
    const lines = [
      `南溟航线图 · ${contextLabel}`,
      `探索区间：${rangeLabel}（参考年 ${REFERENCE_YEAR}）`,
      ...routes.map((route) => `${route.title}：${route.majors.length} 个专业 · ${route.rows.length} 条专业×院校`),
      ...routes.flatMap((route) => route.rows.slice(0, 20)
        .map((row) => `  [${route.title}] ${row.label.institutionName} · ${row.label.majorName}`)),
      ...RELATION_CLASSES.map((relation) => `历史参考：${relation.label} —— ${relationGroups.find((group) => group.key === relation.key)!.items.length} 项`)
    ];
    try {
      if (!navigator.clipboard) throw new Error("CLIPBOARD_UNAVAILABLE");
      await navigator.clipboard.writeText(lines.join("\n"));
      notify("已复制文字版航线图");
    } catch {
      notify("复制失败：浏览器未提供剪贴板权限，请手动选中页面文字复制。");
    }
  };
  // Save the drawn route chart as a real raster PNG. The on-screen SVG is serialized (so it
  // carries the current relations and labels), given an explicit size, then drawn to a canvas.
  // PNG export needs no dialog; when the browser refuses the blob we fall back to the text copy
  // (打印入口已按负责人要求下线，这里不再引导去打印）。
  const savePng = async () => {
    const node = chartSvgRef.current;
    if (!node) { notify("当前浏览器无法导出图片，请改用「复制文字版」。"); return; }
    const clone = node.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", "1000");
    clone.setAttribute("height", "320");
    const svg = new XMLSerializer().serializeToString(clone);
    const ok = await svgStringToPng(svg, 1000, 320, `南溟航线图-${state.form.targetYear}-${rangeLabel}.png`);
    notify(ok ? "已保存 PNG 航线图" : "图片生成失败：浏览器拒绝导出，请改用「复制文字版」。");
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
          <svg ref={chartSvgRef} viewBox="0 0 1000 320" xmlns="http://www.w3.org/2000/svg" role="img"
            aria-label="三条历史参考关系航线示意图">
            <rect width="1000" height="320" fill={CHART.paper} />
            {/* 版框与经纬细线：不标数值，只做海图底纹，避免暗示这是一条分数轴。 */}
            <rect x={CHART.frame.x} y={CHART.frame.y} width={CHART.frame.w} height={CHART.frame.h}
              fill="none" stroke={CHART.line2} strokeWidth={1} />
            <g stroke={CHART.line} strokeWidth={0.5} opacity={0.5}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <path key={`v${i}`} d={`M${24 + i * 95.2} 22V298`} />)}
              {[1, 2, 3, 4, 5].map((i) => <path key={`h${i}`} d={`M24 ${22 + i * 46}H976`} />)}
            </g>
            {/* 四角刻线：铜色小角标，海图版框的常见收口。 */}
            <g stroke={CHART.brass} strokeWidth={1.4} opacity={0.75} fill="none">
              <path d="M24 34v-12h12M976 34v-12h-12M24 286v12h12M976 286v12h-12" />
            </g>
            {drawable ? <>
              {relationGroups.map((group) => <g key={group.key}>
                {/* 光晕 + 主线：同一条航路画两遍，让线有厚度而不是一根生硬的细线。 */}
                <path d={`M140 ${group.y}C300 ${group.y - 24} ${ROUTE_LINE_CTRL_X} ${group.y + 20} ${ROUTE_LINE_END_X} ${group.y}`}
                  stroke={group.route} strokeWidth={group.width + 5} opacity={0.12} fill="none" strokeLinecap="round" />
                <path d={`M140 ${group.y}C300 ${group.y - 24} ${ROUTE_LINE_CTRL_X} ${group.y + 20} ${ROUTE_LINE_END_X} ${group.y}`}
                  stroke={group.route} strokeWidth={group.width} strokeDasharray={group.dash || undefined}
                  fill="none" strokeLinecap="round" />
                <circle cx={140} cy={group.y} r={3.4} fill={CHART.paper} stroke={group.route} strokeWidth={1.2} />
                <circle cx={ROUTE_LINE_END_X} cy={group.y} r={2.6} fill={group.route} />
                <path d={`M${ROUTE_LINE_END_X + 10} ${group.y}H900`} stroke={group.route} strokeWidth={0.7}
                  opacity={0.45} strokeDasharray="1 3" />
                <text x={LABEL_COLUMN_X} y={group.y - 3} textAnchor="end" fontFamily={CHART.song}
                  fontSize={11.5} letterSpacing={0.6} fill={CHART.ink2}>{group.label}</text>
                <text x={LABEL_COLUMN_X} y={group.y + 17} textAnchor="end" fontFamily={CHART.display}
                  fontSize={19} fontWeight={600} fill={group.route}>{group.items.length.toLocaleString("zh-CN")}</text>
              </g>)}
              {/* 起航点：一枚小帆船，金铜色船身与帆，压在中线上方。 */}
              <g transform={`translate(84,158) scale(1.25)`} stroke="none">
                <path d="M-14 0h28l-5 9h-18Z" fill={CHART.ink} opacity={0.9} />
                <path d="M0 0v-19" stroke={CHART.ink} strokeWidth={1.1} />
                <path d="M0-18 12-2H0Z" fill={CHART.brass2} />
                <path d="M-1-15 -9-3h8Z" fill={CHART.safe} opacity={0.85} />
                <path d="M-20 4c9 4 31 4 40 0" stroke={CHART.foam} strokeWidth={0.9} strokeLinecap="round" opacity={0.6} />
              </g>
              {/* 区间图签：左下角双框小匾，写明这段航线按哪个区间、哪一年的历史位次绘制。 */}
              <g>
                <rect x={40} y={248} width={252} height={46} fill={CHART.card} stroke={CHART.brassLine} />
                <rect x={44.5} y={252.5} width={243} height={37} fill="none" stroke={CHART.brassLine} strokeWidth={0.6} opacity={0.7} />
                <text x={56} y={265} fontFamily={CHART.display} fontStyle="italic" fontSize={9} letterSpacing={1.5}
                  fill={CHART.brass}>EXPLORATION RANGE</text>
                <text x={56} y={284} fontFamily={CHART.song} fontSize={15} fill={CHART.ink}>{rangeLabel} 分</text>
                <text x={276} y={284} textAnchor="end" fontFamily={CHART.display} fontSize={11} fill={CHART.mut}>
                  参考年 {pool?.referenceYear ?? REFERENCE_YEAR}
                </text>
              </g>
              {/* 航线小结：底部一行，右侧补一句它到底在说什么。 */}
              {routes.slice(0, 3).map((route, index) =>
                <text key={route.kind} x={320} y={ROUTE_TITLE_TOP_Y + index * ROUTE_TITLE_LINE_H}
                  fontFamily={CHART.song} fontSize={12} fill={CHART.ink2}>
                  {route.title} · {route.rows.length} 条专业 × 院校
                </text>)}
              <text x={LABEL_COLUMN_X} y={288} textAnchor="end" fontFamily={CHART.display} fontStyle="italic"
                fontSize={10.5} letterSpacing={0.8} fill={CHART.mut}>按历史位置参考绘制 · 不构成录取判断</text>
            </> : <g>
              <text x={500} y={158} textAnchor="middle" fontFamily={CHART.song} fontSize={15} fill={CHART.ink2}>
                {withRange ? "还没有可绘制的结果" : "尚未生成探索区间"}
              </text>
              <text x={500} y={184} textAnchor="middle" fontFamily={CHART.display} fontStyle="italic" fontSize={11}
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
          <h3><Icon name="route" />两条线都还空着</h3>
          <p className="psub">AI 建议和自选都还没有内容：回「谈心」聊出建议，或在「方向」自选几个专业，两条线就会在这里分开亮起。</p>
          <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
            <button type="button" className="btn sm" onClick={() => setPage("talk")}>去谈心</button>
            <button type="button" className="btn sm ghost" onClick={() => setPage("direction")}>去方向自选</button>
          </div>
        </div>
        : routes.map((route) => {
          const meta = ROUTE_META.find((item) => item.kind === route.kind)!;
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
              ? <p className="muted-note">这些专业在院校池里，但当前区间、选科和批次没有命中院校专业。这条选择会保留，不自动扩大范围去凑结果。</p>
              : <div className="schools" style={{ marginTop: 0 }}>
                {route.rows.slice(0, 24).map((row) => {
                  const reference = row.reference === "major" ? row.candidate.major_reference : row.candidate.group_reference;
                  const interval = reference.reference_rank_interval ?? [];
                  // 分层标签直接用发布包里的历史位置关系（需更好位置 / 同分或边界重叠 / 位置较有余量）。
                  // 项目边界不提供「冲稳保」预测，所以标签说明的是「相对历史记录的位置」，不是录取结论。
                  const relation = RELATION_CLASSES.find((item) => item.key === reference.relation) ?? null;
                  const institutionTags = (row.label.institutionTags ?? "").split("/")
                    .map((tag) => tag.trim()).filter(Boolean).slice(0, 3);
                  const passed = row.candidate.eligibility.status === "PASS";
                  return <article className={`scard${relation ? ` rel-${relation.cls}` : ""}`} key={`${route.kind}-${row.label.offeringId}`}>
                    <div className="scard-top">
                      <span className="sc-loc"><Icon name="pin" />{row.label.institutionName}{row.label.institutionCity ? ` · ${row.label.institutionCity}` : ""}</span>
                      <h3 className="song">{row.label.majorName}</h3>
                      <div className="sc-chips">
                        {relation
                          ? <span className={`sc-rel ${relation.cls}`}><i />{relation.label}</span>
                          : <span className="sc-rel none">暂无比较依据</span>}
                        {row.label.level ? <span className="sc-lv">{levelLabel(row.label.level)}</span> : null}
                        <span>{row.label.batch}</span>
                        {row.label.categoryClass ? <span>{row.label.categoryClass}</span> : null}
                        {passed ? <span className="sc-ok"><Icon name="check" />资格符合</span>
                          : <span className="sc-warn">{label(row.candidate.eligibility.status)}</span>}
                      </div>
                      {institutionTags.length ? <div className="sc-tags">
                        {institutionTags.map((tag) => <span key={tag}>{tag}</span>)}
                      </div> : null}
                    </div>
                    <div className="ranks">
                      <div className="rank"><div className="ry">参考 {reference.source_year ?? REFERENCE_YEAR} 位次</div>
                        <div className="rv num">{formatRankInterval(interval)}</div></div>
                      <div className="rank"><div className="ry">招生数</div><div className="rv num">{row.label.planCount ?? "—"}</div></div>
                      <div className="rank"><div className="ry">学费</div>
                        <div className="rv num">{row.label.tuition == null ? "未知" : `${row.label.tuition} 元/年`}</div></div>
                    </div>
                    {row.reference === "group" ? <p className="fhint" style={{ margin: "10px 20px 14px" }}>只有专业组依据，具体专业门槛未知。</p> : null}
                  </article>;
                })}
              </div>}
            {route.rows.length > 24 ? <p className="fhint" style={{ marginTop: 10 }}>已展示前 24 条，其余 {route.rows.length - 24} 条未逐条展开（复制文字版含每路前 20 条的院校与专业名）。</p> : null}
          </div>;
        })}

    </>}

    <div className="blessing">
      <span className="eyebrow">A Word For You · 写给你</span>
      <p className="song">愿你既有仰望星空的方向，也有脚踏实地的航线。远方很远，但每一次起航，都从今天这一分开始。</p>
      <div className="sign">—— 南 溟</div>
    </div>
    {/* 导出与返回（负责人 2026-09-12 定）：删掉那块个人资料面板与打印入口后，
        只剩三枚按钮——导出 PNG 独占一行当主操作，复制与返回并排当次要操作，窄屏不会挤成一团。
        清除本次探索已随该面板一起下线，改由顶栏「溟」→ 设置提供。 */}
    <div className="chart-actions chart-export">
      <button type="button" className="btn brass" disabled={!drawable} onClick={() => { void savePng(); }}><Icon name="down" />保存为 PNG 图片</button>
      <div className="export-row">
        <button type="button" className="btn ghost" onClick={copyText}><Icon name="layers" />复制文字版</button>
        <button type="button" className="btn ghost" onClick={() => setPage("axis")}><Icon name="axis" />回去调区间</button>
      </div>
    </div>
  </section>;
}
