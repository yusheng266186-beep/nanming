import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ADDITIONAL_OPTIONS, RELEASE_LABELS, SYNTHETIC_NOTICE, withForm, type WebState } from "../model.js";
import { ArtSlot, Icon } from "../art.js";
import { prefersReducedMotion } from "../chat.js";
import { useScrollLock } from "../scroll-lock.js";
import { CHAPTERS, label, type LocateRoute, type PageId, type QualityState } from "./shared.js";

/** 六次靠岸各自的一句话介绍：标题说这站做什么，描述说它在新流程里的位置。 */
const STOP_INTRO: Record<string, { title: string; desc: string }> = {
  sail: { title: "登船点：定下选科与目标分", desc: "首选科目与两门再选科目决定「能报什么」；高考目标分给出起点。点「开始起航」选入口出发。" },
  locate: { title: "圈出你的探索区间", desc: "手填近几次考试，或用姓名+验证码接入学校数据——区间由数据自动生成，可微调。" },
  talk: { title: "先聊，再选专业", desc: "谈心必须由 AI 主持：两种聊法只从你的原话出发，聊完给出有据可依的方向建议。" },
  direction: { title: "两条来路都算数", desc: "AI 推荐线和你的自选线同摆：一致合并为一条，不一致分两条，不打分不排先后。" },
  axis: { title: "区间里有哪些学校", desc: "区间端点换算成历史位次，与院校录取位次取交集，筛出这段海面里可选的院校专业。" },
  chart: { title: "两条来路，一张图", desc: "双线分列院校与专业，可下载可打印——合成你的《南溟航线图》。" }
};

export interface SailProps {
  state: WebState;
  setState: Dispatch<SetStateAction<WebState>>;
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  quality: QualityState;
  setShowKun: Dispatch<SetStateAction<boolean>>;
  setToast: Dispatch<SetStateAction<string | null>>;
  toast: string | null;
  /** 当前走的是哪条路（定位章有两个变体），登船卡片按它标出已选项。 */
  route: LocateRoute;
  /** 选路并进入「定位」：选完就跳到对应的那个页面。 */
  chooseRoute: (route: LocateRoute) => void;
}

export function renderSail({ state, setState, page, setPage, quality, setShowKun, setToast, toast,
  route, chooseRoute }: SailProps) {
  // 海景的小巧思：孤帆远影、岸边双层浪是指针无关的环境动画；指针视差只在鼠标/笔上生效
  // （触屏拖页时跟着抖），点水涟漪给触屏一个落点反馈。prefers-reduced-motion 时全部停用。
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleSeq = useRef(0);
  // 登船方式不再平铺在页面上：按「开始起航」后以卡片弹出，作为通向定位/成绩的桥。
  const [boardOpen, setBoardOpen] = useState(false);
  // 六站航程收成一副抽屉卡：默认全部收起叠在一起，点哪一站展开哪一站（再点收起）。
  const [deckOpen, setDeckOpen] = useState<string | null>(null);
  // 登船卡片是浮层：开着的时候锁住整页滚动，手指滑不出卡片外面去。
  useScrollLock(boardOpen);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const artPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTilt({ x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: ((event.clientY - rect.top) / rect.height) * 2 - 1 });
  };
  const artLeave = () => setTilt(null);
  const artTap = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const id = ++rippleSeq.current;
    setRipples((current) => [...current.slice(-4), { id, x: event.clientX - rect.left, y: event.clientY - rect.top }]);
    window.setTimeout(() => setRipples((current) => current.filter((item) => item.id !== id)), 1300);
  };
  const tiltStyle = tilt ? { transform: `translate(${tilt.x * 8}px, ${tilt.y * 6}px) scale(1.06)` } : undefined;
  // 「先定下三件事」各自的备齐状态：01 首选科目与 02 再选两门是出发的前提，03 目标分是选填。
  // 状态只写在字段的印章上（铜色 = 备好），底部那句摘要同步再说一遍（aria-live），不另造第二份说明。
  const additionalFull = state.form.additional.length === 2;
  const readyToSail = state.form.primary !== null && additionalFull;
  const sailSummary = state.form.primary
    ? `当前：${label(state.form.primary)}类 · 再选 ${state.form.additional.length ? state.form.additional.map(label).join("、") : "未选"} · 高考目标分 ${state.form.score ?? "未填"}`
    : "还没有选首选科目，位次与资格都会显示为未知。";
  return <section id="page-sail" className={`view${page === "sail" ? " active" : ""}`} aria-label="起航">
    <div className="hero">
      <div className="hero-copy">
        <div className="hero-hi"><Icon name="wave" /><span>适千里者，三月聚粮</span></div>
        <h1 className="song">北冥有鱼，<br />今将<em>徙于南溟。</em></h1>
        <p className="hero-quote">这不是一张志愿名单，而是一张属于你的《高考航线图》。<br />先看清此刻的海面，再决定扬帆的方向。
          <span>Every far shore begins with today&apos;s provision.</span></p>
        <div className="hero-foot">南溟用真实数据与你自己保存的原话，拼出一张能落地的航线。</div>
      </div>
      <div className="hero-art" onPointerMove={artPointer} onPointerLeave={artLeave} onPointerDown={artTap}>
        <div className="slot-wrap" style={tiltStyle}>
          <ArtSlot name="sea" />
        </div>
        <div className="art-waves" aria-hidden="true">
          <svg className="wave w1" viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path d="M0 34Q60 18 120 34T240 34T360 34T480 34T600 34T720 34T840 34T960 34T1080 34T1200 34V60H0Z" />
          </svg>
          <svg className="wave w2" viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path d="M0 30Q80 14 160 30T320 30T480 30T640 30T800 30T960 30T1120 30T1280 30V60H0Z" />
          </svg>
        </div>
        {ripples.map((ripple) => <span key={ripple.id} className="art-ripple" aria-hidden="true"
          style={{ left: ripple.x, top: ripple.y }} />)}
        <button type="button" className="pole-star" aria-label="北辰" onClick={() => setShowKun(true)}><Icon name="star" /></button>
        <div className="art-tag" style={tilt ? { transform: `translate(${tilt.x * -6}px, ${tilt.y * -3}px)` } : undefined}>SET SAIL — 01</div>
        <div className="art-cap" style={tilt ? { transform: `translate(${tilt.x * -5}px, ${tilt.y * -3}px)` } : undefined}>
          <p>每一个远方，<br />都从今天开始准备。</p><span className="vert">南冥者，天池也</span></div>
      </div>
    </div>

    {/* 页面顺序（负责人定）：六章航程在前（先知道去哪），三件事居中（备好行装），登船方式收尾（选入口出发）。 */}
    <div className="section">
      <div className="sec-head"><div><span className="eyebrow">The Voyage · 六章航程</span><h2 style={{ marginTop: 12 }}>一条航线，六次靠岸</h2><p>起航之后的六站，每一站都算数：先圈出探索区间，再聊出方向；两条来路都保留，最后一站合成一张航线图。六站收成一叠抽屉卡，点哪一站展开哪一站。</p></div></div>
      {/* 抽屉式堆叠：收起时每站只露一行（章号 + 站名 + 这一站做什么），六张压边叠成一副，
          省下的是留白，不是内容——每站的整句说明一个字都没删，展开就能看到。 */}
      <div className="deck">
        {CHAPTERS.map((chapter) => {
          const intro = STOP_INTRO[chapter.id]!;
          const open = deckOpen === chapter.id;
          return <div className={`stop${open ? " open" : ""}`} key={chapter.id}>
            <button type="button" className="stop-head" aria-expanded={open} aria-controls={`stop-${chapter.id}`}
              onClick={() => setDeckOpen(open ? null : chapter.id)}>
              <span className="mk"><Icon name={chapter.icon} />{chapter.num} {chapter.k}</span>
              <h4>{intro.title}</h4>
              <span className="stop-cue" aria-hidden="true"><Icon name="chevron" /></span>
            </button>
            {/* 正文始终在 DOM 里：展开/收起动的是高度与透明度，读屏不会因为视觉收起而丢掉这段说明。 */}
            <div className="stop-body" id={`stop-${chapter.id}`}>
              <div className="stop-inner"><p>{intro.desc}</p></div>
            </div>
          </div>;
        })}
      </div>
    </div>

    <div className="section">
      <div className="sec-head"><div><span className="eyebrow">Chapter 01 · 起航 · 北冥有鱼</span><h2 style={{ marginTop: 12 }}>先定下三件事</h2><p>首选科目与再选科目决定「这个专业我能不能报」；高考目标分给出起点，探索区间决定先看哪些院校。</p></div></div>
      {/* 选科与情景分必须在这里能设置，否则「选择你的选科组合」只是文案：
          位次、资格与匹配都依赖首选科目，没有它整页只能显示未知。 */}
      <div className="panel sail-panel" data-ready={readyToSail ? "true" : "false"}>
        <div className="grid-2 sail-form">
          <div className="field" data-ready={state.form.primary !== null ? "true" : "false"}>
            <span className="flab"><i className="seal">01</i>首选科目</span>
            <div className="chips">
              {(["PHYSICS", "HISTORY"] as const).map((item) => <button type="button" key={item}
                className={`chip${state.form.primary === item ? " brass on" : ""}`}
                aria-pressed={state.form.primary === item}
                onClick={() => { setState((current) => withForm(current, { primary: current.form.primary === item ? null : item })); setToast(`首选科目：${label(item)}类`); }}>
                {label(item)}类
              </button>)}
            </div>
            <p className="fhint">2025 年起四川采用 3+1+2，物理类与历史类是两套独立的计划与位次。</p>
          </div>
          <div className="field" data-ready={additionalFull ? "true" : "false"}>
            <span className="flab"><i className="seal">02</i>再选科目（正好 2 门）
              <em className="flab-n">{state.form.additional.length}/2</em></span>
            <div className="chips" data-full={additionalFull ? "true" : "false"}>
              {ADDITIONAL_OPTIONS.map((item) => {
                const on = state.form.additional.includes(item);
                return <button type="button" key={item}
                  className={`chip${on ? " brass on" : ""}`} aria-pressed={on}
                  onClick={() => {
                    if (!on && additionalFull) { setToast("再选科目正好 2 门，先取消一门再选。"); return; }
                    setState((current) => withForm(current, {
                      additional: current.form.additional.includes(item)
                        ? current.form.additional.filter((value) => value !== item)
                        : [...current.form.additional, item],
                    }));
                  }}>{label(item)}</button>;
              })}
            </div>
            <p className="fhint">选满 2 门才能判断资格。不确定的要求会显示「待核对」，不会被当成满足。</p>
          </div>
        </div>
        <label className="field sail-score" data-ready={state.form.score !== null ? "true" : "false"}>
          <span className="flab"><i className="seal">03</i>高考目标分（可不填）</span>
          <input className="inp" type="number" min={0} max={750} inputMode="numeric"
            value={state.form.score ?? ""} placeholder="例如 600"
            onChange={(event) => setState((current) => withForm(current, { score: event.target.value ? Number(event.target.value) : null }))} />
        </label>
        {/* 行动入口放在表单之后：流程是「先定下三件事，再出发」。开始起航弹出登船卡片，
            两条入口作为通向定位/成绩的桥——不再平铺在页面上。 */}
        <div className="hero-act sail-act">
          {/* 负责人 2026-09-12：选科没齐时不许拉开登船卡，只提醒去选——没有选科，后面的位次、
              资格与匹配全是未知，先放人上船等于让他进去看一页「未知」。 */}
          <button type="button" className="btn brass"
            onClick={() => {
              if (state.form.primary === null || state.form.additional.length !== 2) {
                setToast(state.form.primary
                  ? "再选科目要正好 2 门——先在下面选满，再开始起航。"
                  : "先在下面选好首选科目与两门再选科目，再开始起航。");
                return;
              }
              setBoardOpen(true);
            }}>开始起航<Icon name="arrow" /></button>
          <button type="button" className="tbtn" onClick={() => setPage("axis")}>先看看分数轴<Icon name="axis" /></button>
        </div>
        <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 14 }}>
          {/* key 让摘要每次变化都重新播一遍淡入，改选科时眼睛能跟上；同一句话也读给读屏。 */}
          <span className="muted-note sail-live" aria-live="polite" key={sailSummary}>{sailSummary}</span>
        </div>
        {toast ? <p className="feedback" aria-live="polite">{toast}</p> : null}
      </div>
    </div>

    {/* 数据横幅只在异常时出现：数据正常载入或正在载入时它是运维信息，对学生只是噪音。
        但加载失败退回合成模式必须让学生知道，这是诚实性要求，不能静默降级。 */}
    {(state.releaseStatus === "idle" || state.releaseStatus === "failed") && <aside className="banner" data-mode={state.release ? "published" : "synthetic"}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <Icon name="shield" size="lg" />
        <div>
          <h3 className="song">{state.release ? `已载入发布数据 ${state.release.manifest.release_id}` : "当前为合成演示数据"}</h3>
          <p>{state.release
            ? "匹配使用已发布数据版本；历史年份的科类定义未逐行给出时，跨年比较按无法比较处理。"
            : SYNTHETIC_NOTICE}</p>
          <p className="muted-note">{RELEASE_LABELS[state.releaseStatus]}{state.releaseMessage ? ` ${state.releaseMessage}` : ""}</p>
        </div>
      </div>
    </aside>}

    {/* 登船卡片：按「开始起航」后弹出。两条入口就是定位章的两条路——选哪条就进哪个页面，
        Esc / 点背景关闭；开着的时候整页滚动是锁住的（见 useScrollLock）。 */}
    {boardOpen ? <div className="board-backdrop" role="presentation"
      onClick={(event) => { if (event.target === event.currentTarget) setBoardOpen(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") setBoardOpen(false); }}>
      <div className="board-card" role="dialog" aria-modal="true" aria-label="选择登船方式">
        <button type="button" className="board-close" aria-label="关闭登船卡片" autoFocus
          onClick={() => setBoardOpen(false)}><Icon name="close" /></button>
        <span className="eyebrow">Two Piers · 两条登船口</span>
        <h3 className="song" style={{ marginTop: 10 }}>两条入口，都通向同一片海</h3>
        <p className="psub">先去把成绩与探索区间定下来，后面的谈心与航线才有依据。荣县一中增强模式是「加分项」，不是使用前提。</p>
        <div className="entry-grid">
          <button type="button" className={`entry${route === "manual" ? " picked" : ""}`}
            onClick={() => { setBoardOpen(false); chooseRoute("manual"); }}>
            <span className="eidx">01</span>
            <span className="elab"><Icon name="compass" />全国通用模式</span>
            <h3>自选科 + 高考目标分</h3>
            <p>任何省份、任何层次的同学都能用。带着刚定下的选科与目标分进入「定位」，用近几次考试或目标分圈出探索区间。</p>
            <span className="efoot"><span>无需验证 · 去定位</span><i className="carrow"><Icon name="arrow" /></i></span>
          </button>
          <button type="button" className={`entry deep${route === "school" ? " picked" : ""}`}
            onClick={() => { setBoardOpen(false); chooseRoute("school"); }}>
            <span className="eidx">02</span>
            <span className="elab"><Icon name="shield" />荣县一中 · 增强模式</span>
            <h3>{quality.status === "ready" ? `已接入 · ${quality.shard?.person.classLabel ?? ""}` : "姓名 + 验证码接入质量慧析"}</h3>
            <p>{quality.status === "ready"
              ? "最近成绩、年级与班级位置、线差与知识点已读取，探索区间也按你的考试推导好了。你仍可修改任何一项，增强模式只提供依据，不替你决定方向。"
              : "去「定位」页输入姓名和班主任发放的 6 位验证码，服务端核对后自动填好考试行（只读）并推导探索区间。不显示任何同学的成绩。"}</p>
            <span className="efoot"><span>{quality.status === "ready" ? "增强能力 · 已启用" : "需要 姓名 + 6 位验证码"}</span><i className="carrow"><Icon name="arrow" /></i></span>
          </button>
        </div>
      </div>
    </div> : null}

    <div className="quote-strip"><p>鲲之大，不知其几千里也；化而为鸟，其名为鹏。</p><span>—— 《庄子 · 逍遥游》</span></div>
  </section>;
}
