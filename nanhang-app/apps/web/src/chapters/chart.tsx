import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { routeMap, type WebState } from "../model.js";
import { Provenance } from "../theme.js";
import { Icon } from "../art.js";
import { REFERENCE_YEAR, RELATION_CLASSES, label, svgStringToPng, type PageId } from "./shared.js";

export interface ChartProps {
  state: WebState;
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  map: ReturnType<typeof routeMap> | null;
  score: number | null;
  contextLabel: string;
  notify: (message: string) => void;
  chartSvgRef: MutableRefObject<SVGSVGElement | null>;
  download: () => void;
  clear: () => void;
}

export function renderChart({ state, page, setPage, map, score, contextLabel, notify, chartSvgRef,
  download, clear }: ChartProps) {
  const confirmed = map?.confirmed ?? [];
  const candidates = map?.candidates ?? [];
  const actions = map?.actions ?? [];
  const withScore = score !== null;

  // The three routes are not score scenarios. Each one buckets the matcher's real candidates by
  // their group record's historical reference relation, so a line reports where the student's
  // rank stands against last year's record — never an admission prediction.
  const relationGroups = RELATION_CLASSES.map((relation) => ({
    ...relation,
    items: candidates.filter((candidate) => candidate.group_reference.relation === relation.key)
  }));
  const drawable = relationGroups.some((group) => group.items.length > 0);

  const copyText = async () => {
    const lines = [
      `南溟航线图 · ${contextLabel}`,
      `情景分：${score ?? "未填写"}（参考年 ${REFERENCE_YEAR}）`,
      `已确认方向：${confirmed.map((item) => item.title).join("、") || "暂无"}`,
      `候选：${candidates.length ? `${candidates.length} 项` : "尚不能比较或结果已失效"}`,
      ...relationGroups.map((group) => `历史参考：${group.label} —— ${group.items.length} 项`),
      ...actions.map((action) => `行动：${action.title} —— ${action.detail}`)
    ];
    try {
      if (!navigator.clipboard) throw new Error("CLIPBOARD_UNAVAILABLE");
      await navigator.clipboard.writeText(lines.join("\n"));
      notify("已复制文字版航线图");
    } catch {
      notify("复制失败：浏览器未提供剪贴板权限，请改用「打印 / 另存为 PDF」。");
    }
  };
  // Save the drawn route chart as a real raster PNG. The on-screen SVG is serialized (so it
  // carries the current relations and labels), given an explicit size, then drawn to a canvas.
  // PNG export needs no print dialog; when the browser refuses the blob we fall back to printing.
  const savePng = async () => {
    const node = chartSvgRef.current;
    if (!node) { notify("当前浏览器无法导出图片，请改用「打印 / 另存为 PDF」。"); return; }
    const clone = node.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", "1000");
    clone.setAttribute("height", "320");
    const svg = new XMLSerializer().serializeToString(clone);
    const ok = await svgStringToPng(svg, 1000, 320, `南溟航线图-${state.form.targetYear}-${score ?? "未填分"}.png`);
    notify(ok ? "已保存 PNG 航线图" : "图片生成失败：浏览器拒绝导出，请改用「打印 / 另存为 PDF」。");
  };
  return <section id="page-chart" className={`view${page === "chart" ? " active" : ""}`} aria-label="航线图">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 07 · 航线图 · 抟扶摇</span>
        <h1 className="song">你的<em>《南溟航线图》</em></h1>
        <p className="lede">已确认方向、候选与两周行动。这不是导出一个表格，而是一次有仪式感的启程。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>水击三千里，<br />抟扶摇而上者九万里。</p></div>
    </div>
    <div className="chart-stage">
      <div className="chart-head">
        <span className="eyebrow">Chart of the Southern Deep</span>
        <h2 className="song">{withScore ? `从 ${score} 分的海面，到你想去的那片。` : "先填写目标情景分，航线才会亮起。"}</h2>
        <p className="sub">三条航线来自匹配结果中的历史参考关系分组，只反映你的位次与参考年记录的关系，不是录取预测，也不代表三种分数情景。</p>
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
              d={`M96 ${group.y}C276 ${group.y - 26} 664 ${group.y + 22} 884 ${group.y}`}
              stroke={group.route} strokeWidth={group.width} strokeDasharray={group.dash || undefined} fill="none" strokeLinecap="round" />)}
            <g transform="translate(96,238)"><path d="M-16 0h32l-6 11h-20Z" fill="#0f262e" /><path d="M0 0V-26" stroke="#0f262e" strokeWidth={2} /><path d="M0-24 15-3H0Z" fill="#a97b34" /></g>
            <text x="90" y="272" fontSize="11" fill="#6d7f83" textAnchor="middle" fontFamily="sans-serif">现在 · {score} 分</text>
            {relationGroups.map((group) => <text key={group.key} x="898" y={group.y + 4} fontSize="13" fill={group.route} fontFamily="'Cormorant Garamond',serif" fontWeight={600}>{group.label} {group.items.length}</text>)}
            {confirmed.slice(0, 3).map((item, index) =>
              <text key={item.directionId} x={296} y={148 + index * 17} fontSize="12.5" fill="#2c444c" fontFamily="'Noto Serif SC',serif">{item.title}</text>)}
          </> : <text x="500" y="170" fontSize="14" fill="#6d7f83" textAnchor="middle" fontFamily="sans-serif">{withScore ? "还没有可绘制的结果，先运行一次匹配" : "尚未填写目标情景分"}</text>}
        </svg>
      </div>
      <div className="route-legend">
        {RELATION_CLASSES.map((relation) => <span className={`rl ${relation.cls}`} key={relation.key}>
          <span className="swatch" />{relation.label} · 历史参考
        </span>)}
      </div>
      <Provenance icon="chartmap">
        三条航线按<b>历史参考关系</b>分组：每条候选的位次与参考年记录逐条比较后再归类，
        不是按分数段人为划分。参考年记录来自发布包，未建立可比关系的年份不参与比较。
      </Provenance>
    </div>
    <div className="chart-cols">
      <div className="panel">
        <h3><Icon name="lighthouse" />专业灯塔</h3>
        <p className="psub">已确认方向，以及它们在你这个层次能到达的院校。</p>
        {confirmed.length === 0
          ? <p className="muted-note">还没有已确认方向。去「方向」确认后，灯塔才会亮起。</p>
          : confirmed.map((item) => <div className="beacon" key={item.directionId}>
            <span className="bi"><Icon name="lighthouse" /></span>
            <div><h4 className="song">{item.title}</h4>
              <p>方向标签缺失：暂无描述、专业清单与适配度。</p>
              <div className="bschools">方向与具体专业、院校的对应关系未随发布包提供，南溟不按列表顺序推断「可达」结论。</div>
            </div>
          </div>)}
      </div>
      <div className="panel">
        <h3><Icon name="up" />这 N 分，从哪几科拿回来</h3>
        <p className="psub">把「再努力一点」变成具体到每一科的分数目标。</p>
        <p className="muted-note">单科分数尚未接入：学校增强模式未开放，南溟不会凭空拆分各科提分空间。开放后，此处会按你的实际短板重算。</p>
        <p className="gain-note">这是提分优先级建议，不是承诺。</p>
      </div>
    </div>
    <div className="panel" style={{ marginBottom: 22 }}>
      <h3><Icon name="shield" />保底路线 · 每条路都能通向远方</h3>
      <p className="psub">班里不止十几个人与自己有关。梦想院校 → 冲刺本科 → 普通本科 → 职业本科 → 优质高职 → 专升本，全链条都在图上。</p>
      <div className="safety">
        {[
          { icon: "up", k: "冲刺本科", t: "在当前层次之上，保留少量冲一冲的选择。" },
          { icon: "book", k: "普通本科", t: "与情景分匹配的主力区间。" },
          { icon: "shield", k: "职业本科", t: "与普通本科同等层次、同等学历学位，侧重产教融合与就业。" },
          { icon: "anchor", k: "订单/定向培养", t: "部分高职有企业订单班、公费师范、定向医学生，入学即锁定就业方向。" },
          { icon: "spark", k: "复读的取舍", t: "是否复读需结合稳定性与心理承受力，南溟不给出轻率建议。" }
        ].map((row) => <div className="srow" key={row.k}>
          <span className="sicon"><Icon name={row.icon} /></span>
          <div><h4 className="song">{row.k}</h4><p>{row.t}</p></div>
        </div>)}
      </div>
    </div>
    <div className="panel" style={{ marginBottom: 22 }}>
      <h3><Icon name="route" />两周行动</h3>
      <p className="psub">航线图不是终点，而是可以立刻开始的几步。</p>
      {actions.length === 0
        ? <p className="muted-note">还没有可执行的行动；先保存一句你自己的表达并确认方向。</p>
        : <div className="safety">{actions.map((action) => <div className="srow" key={action.actionId}>
          <span className="sicon"><Icon name="arrow" /></span>
          <div><h4 className="song">{action.title}</h4><p>{action.detail}</p>
            <p className="muted-note">{action.horizonDays} 天内 · {action.reviewTrigger}</p></div>
        </div>)}</div>}
    </div>
    <div className="blessing">
      <span className="eyebrow">A Word For You · 写给你</span>
      <p className="song">愿你既有仰望星空的方向，也有脚踏实地的航线。远方很远，但每一次起航，都从今天这一分开始。</p>
      <div className="sign">—— 南 溟</div>
    </div>
    <div className="panel" style={{ marginTop: 22 }}>
      <h3><Icon name="doc" />本人数据</h3>
      <p className="psub">默认只留在当前内存；刷新页面即清空。只有主动下载时才会写入你的设备。</p>
      <div className="chart-actions" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="btn sm" onClick={download}>下载本人 JSON</button>
        <button type="button" className="btn sm ghost" onClick={clear}>清除本次探索</button>
      </div>
    </div>
    <div className="chart-actions">
      <button type="button" className="btn brass" disabled={!drawable} onClick={() => { void savePng(); }}><Icon name="down" />保存为 PNG 图片</button>
      <button type="button" className="btn ghost" onClick={() => window.print()}><Icon name="doc" />打印 / 另存为 PDF</button>
      <button type="button" className="btn ghost" onClick={copyText}><Icon name="layers" />复制文字版</button>
      <button type="button" className="btn ghost" onClick={() => setPage("axis")}><Icon name="axis" />回去调分数</button>
    </div>
  </section>;
}
