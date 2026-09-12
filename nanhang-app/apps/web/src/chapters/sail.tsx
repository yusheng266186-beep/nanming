import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ADDITIONAL_OPTIONS, RELEASE_LABELS, SYNTHETIC_NOTICE, withForm, type WebState } from "../model.js";
import { ArtSlot, Icon } from "../art.js";
import { prefersReducedMotion } from "../chat.js";
import { label, type PageId, type QualityState } from "./shared.js";

export interface SailProps {
  state: WebState;
  setState: Dispatch<SetStateAction<WebState>>;
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  quality: QualityState;
  setShowKun: Dispatch<SetStateAction<boolean>>;
  setToast: Dispatch<SetStateAction<string | null>>;
  toast: string | null;
}

export function renderSail({ state, setState, page, setPage, quality, setShowKun, setToast, toast }: SailProps) {
  // 海景的小巧思：孤帆远影、岸边双层浪是指针无关的环境动画；指针视差只在鼠标/笔上生效
  // （触屏拖页时跟着抖），点水涟漪给触屏一个落点反馈。prefers-reduced-motion 时全部停用。
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleSeq = useRef(0);
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
        <div className="art-drift" aria-hidden="true"><svg className="drift-boat"><use href="#i-sail" /></svg></div>
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

    <div className="section">
      <div className="sec-head"><div><span className="eyebrow">Chapter 01 · 起航 · 北冥有鱼</span><h2 style={{ marginTop: 12 }}>选择你的登船方式</h2><p>两条入口，都通向同一片海。荣县一中增强模式是「加分项」，不是使用前提。</p></div></div>
      <div className="entry-grid">
        <button type="button" className={`entry${state.form.primary ? " picked" : ""}`} onClick={() => setPage("locate")}>
          <span className="eidx">01</span>
          <span className="elab"><Icon name="compass" />全国通用模式</span>
          <h3>自选科 + 自填情景分</h3>
          <p>任何省份、任何层次的同学都能用。选择你的选科组合，填入目标情景分，南溟按发布数据与合成演示为你定位。</p>
          <span className="efoot"><span>无需验证 · 立即开始</span><i className="carrow"><Icon name="arrow" /></i></span>
        </button>
        <button type="button" className={`entry deep${quality.status === "ready" ? " picked" : ""}`}
          onClick={() => setPage("quality")}>
          <span className="eidx">02</span>
          <span className="elab"><Icon name="shield" />荣县一中 · 增强模式</span>
          <h3>{quality.status === "ready" ? `已接入 · ${quality.shard?.person.classLabel ?? ""}` : "姓名 + 验证码接入质量慧析"}</h3>
          <p>{quality.status === "ready"
            ? "最近成绩、年级与班级位置、线差与知识点已读取，探索区间也按你的考试推导好了。你仍可修改任何一项，增强模式只提供依据，不替你决定方向。"
            : "输入姓名和班主任发放的 6 位验证码，服务端核对后读取你自己的成绩记录，自动带入最近考试并推导探索区间。不显示任何同学的成绩。"}</p>
          <span className="efoot"><span>{quality.status === "ready" ? "增强能力 · 已启用" : "需要 姓名 + 6 位验证码"}</span><i className="carrow"><Icon name="arrow" /></i></span>
        </button>
      </div>

      {/* 选科与情景分必须在这里能设置，否则「选择你的选科组合」只是文案：
          位次、资格与匹配都依赖首选科目，没有它整页只能显示未知。 */}
      <div className="panel" style={{ marginTop: 22 }}>
        <h3><Icon name="compass" />先定下三件事</h3>
        <p className="psub">首选科目与再选科目决定「这个专业我能不能报」；情景分决定位次。两者都填好，后面的定位与匹配才有依据。</p>
        <div className="grid-2" style={{ marginTop: 18, gap: 22 }}>
          <div className="field">
            <span className="flab">首选科目</span>
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
          <div className="field">
            <span className="flab">再选科目（正好 2 门）</span>
            <div className="chips">
              {ADDITIONAL_OPTIONS.map((item) => {
                const on = state.form.additional.includes(item);
                const full = state.form.additional.length >= 2;
                return <button type="button" key={item}
                  className={`chip${on ? " brass on" : ""}`} aria-pressed={on}
                  onClick={() => {
                    if (!on && full) { setToast("再选科目正好 2 门，先取消一门再选。"); return; }
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
        <label className="field" style={{ marginTop: 20, maxWidth: 320 }}>
          <span className="flab">目标情景分（可不填）</span>
          <input className="inp" type="number" min={0} max={750} inputMode="numeric"
            value={state.form.score ?? ""} placeholder="例如 600"
            onChange={(event) => setState((current) => withForm(current, { score: event.target.value ? Number(event.target.value) : null }))} />
        </label>
        {/* 行动入口放在表单之后：流程是「先定下三件事，再出发」，而不是一进门就催起航。
            「开始起航」与原先的「定好了，去定位」同为进入定位页，只保留一个入口。 */}
        <div className="hero-act" style={{ marginTop: 22 }}>
          <button type="button" className="btn brass" onClick={() => setPage("locate")}>开始起航<Icon name="arrow" /></button>
          <button type="button" className="tbtn" onClick={() => setPage("axis")}>先看看分数轴<Icon name="axis" /></button>
        </div>
        <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 14 }}>
          <span className="muted-note">
            {state.form.primary
              ? `当前：${label(state.form.primary)}类 · 再选 ${state.form.additional.length ? state.form.additional.map(label).join("、") : "未选"} · 情景分 ${state.form.score ?? "未填"}`
              : "还没有选首选科目，位次与资格都会显示为未知。"}
          </span>
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

    <div className="section">
      <div className="sec-head"><div><span className="eyebrow">The Voyage · 六章航程</span><h2 style={{ marginTop: 12 }}>一条航线，六次靠岸</h2><p>从看清水平，到聊出方向，再拖动分数看着候选一批批变化。</p></div></div>
      <div className="trio">
        <div className="mini"><span className="mk"><Icon name="compass" />02 定位</span><h4>圈出你的探索区间</h4><p>近几次考试按各自切线换算，或围绕目标分 ±10——得到一段区间，用它去匹配院校，而不是一个孤零零的分数。</p></div>
        <div className="mini"><span className="mk"><Icon name="chat" />04 谈心</span><h4>先聊，再选专业</h4><p>两种聊法由 AI 主持，只从你的原话出发；聊完它会给出有据可依的方向建议，然后你再亲自选一次专业。</p></div>
        <div className="mini"><span className="mk"><Icon name="route" />07 航线图</span><h4>两条来路，一张图</h4><p>AI 的建议和你的自选各是一条线：一致合成一条，不一致分两条并列——区间内的院校专业按线分开给你。</p></div>
      </div>
    </div>

    <div className="quote-strip"><p>鲲之大，不知其几千里也；化而为鸟，其名为鹏。</p><span>—— 《庄子 · 逍遥游》</span></div>
  </section>;
}
