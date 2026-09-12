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
        <div className="routes">
          <svg ref={chartSvgRef} viewBox="0 0 1000 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="三条历史参考关系航线示意图">
            <defs><linearGradient id="rtSea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#eef0e6" /><stop offset="1" stopColor="#dfe6dd" /></linearGradient></defs>
            <rect width="1000" height="320" fill="url(#rtSea)" />
            <g stroke="#cbc4b0" strokeWidth={0.6} opacity={0.5}><path d="M0 300h1000M0 40h1000" /></g>
            {drawable ? <>
              {relationGroups.map((group) => <path key={group.key}
                d={`M96 ${group.y}C276 ${group.y - 26} ${ROUTE_LINE_CTRL_X} ${group.y + 22} ${ROUTE_LINE_END_X} ${group.y}`}
                stroke={group.route} strokeWidth={group.width} strokeDasharray={group.dash || undefined} fill="none" strokeLinecap="round" />)}
              <g transform="translate(96,238)"><path d="M-16 0h32l-6 11h-20Z" fill="#0f262e" /><path d="M0 0V-26" stroke="#0f262e" strokeWidth={2} /><path d="M0-24 15-3H0Z" fill="#a97b34" /></g>
              <text x="90" y="272" fontSize="11" fill="#2c444c" textAnchor="middle" fontFamily="sans-serif">区间 · {rangeLabel} 分</text>
              {relationGroups.map((group) => <text key={group.key} x={LABEL_COLUMN_X} y={group.y + 4} fontSize="13" fill="#2c444c" textAnchor="end" fontFamily="'Cormorant Garamond',serif" fontWeight={600}>{group.label} {group.items.length}</text>)}
              {/* 航线小结写在两条线之间的空档（165–229）里：原先贴在 y=148–182，正好横穿中间那条线。 */}
              {routes.slice(0, 3).map((route, index) =>
                <text key={route.kind} x={296} y={ROUTE_TITLE_TOP_Y + index * ROUTE_TITLE_LINE_H} fontSize="12.5" fill="#2c444c" fontFamily="'Noto Serif SC',serif">{route.title} · {route.rows.length} 条</text>)}
            </> : <text x="500" y="170" fontSize="14" fill="#2c444c" textAnchor="middle" fontFamily="sans-serif">{withRange ? "还没有可绘制的结果，先回「分数轴」重新匹配" : "尚未生成探索区间"}</text>}
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
