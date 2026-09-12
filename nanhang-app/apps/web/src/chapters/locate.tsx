import type { Dispatch, SetStateAction } from "react";
import { QUESTIONS, axisMarks, scorePosition, type WebState } from "../model.js";
import { Provenance, Uncharted } from "../theme.js";
import { Icon } from "../art.js";
import { REFERENCE_YEAR, clamp, label, type PageId } from "./shared.js";

export interface LocateProps {
  state: WebState;
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  score: number | null;
  trackLabel: string;
}

export function renderLocate({ state, page, setPage, score, trackLabel }: LocateProps) {
  const history = state.form.history;
  const stability = history.length >= 2
    ? Math.sqrt(history.reduce((sum, item) => sum + (item - history.reduce((a, b) => a + b, 0) / history.length) ** 2, 0) / history.length)
    : null;
  const trend = history.length >= 2 ? history[history.length - 1]! - history[history.length - 2]! : null;
  // 位次与百分位来自官方分段表；没有表或分数不在公布范围时保持 null，页面显示未知。
  const position = scorePosition(state.release, state.form.primary, score);
  const marks = axisMarks(state.release, state.form.primary, score);
  // 公布范围条：把学生的情景分画在「官方公布的最低分 → 最高分」这条真实区间上。
  const bandRange = position ? Math.max(1, position.publishedMaxScore - position.publishedMinScore) : 0;
  const bandLeft = position ? (position.score - position.publishedMinScore) / bandRange * 100 : 0;
  return <section id="page-locate" className={`view${page === "locate" ? " active" : ""}`} aria-label="定位">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 02 · 定位 · 测深</span>
        <h1 className="song">先看清，<em>我在哪片海域。</em></h1>
        <p className="lede">不给虚假精确的单点数字。成绩、位次、稳定性与趋势共同围出一段「真实水平区间」——这才是能站得住脚的起点。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>知止而后有定，<br />定而后能静，静而后能安。</p></div>
    </div>
    <div className="locate">
      <div>
        <div className="gauge">
          <div className="gauge-top">
            <div><span className="eyebrow plain">目标情景分 · 裸分</span>
              <div className="bignum num" style={{ marginTop: 12 }}>{score === null ? <span className="absent">—</span> : score}<small>分</small></div></div>
            <div style={{ textAlign: "right" }}><span className="eyebrow plain">全省位次 · 参考年</span>
              <div className="bignum num" style={{ marginTop: 12, fontSize: 40 }}>
                {position ? position.rank.toLocaleString("zh-CN") : <span className="absent">—</span>}</div>
              {!position && <div style={{ marginTop: 4 }}>
                <Uncharted>{score === null ? "还没填情景分" : "该分数官方未列出"}</Uncharted>
              </div>}</div>
          </div>
          <div style={{ marginTop: 26 }}>
            <div className="bandbar">
              {position
                ? <>
                  <div className="bandfill" style={{ left: `${clamp(bandLeft, 0, 100)}%`, width: "2px" }} />
                  <div className="bandmark" style={{ left: `${clamp(bandLeft, 0, 100)}%` }} />
                  <span className="bandtick" style={{ left: "2%" }}>{position.publishedMinScore}</span>
                  <span className="bandtick line" style={{ left: `${clamp(bandLeft, 6, 94)}%` }}>你 {position.score}</span>
                  <span className="bandtick" style={{ left: "98%" }}>{position.publishedMaxScore}</span>
                </>
                : <div className="band-empty">
                  {state.release
                    ? "该科类没有可用的官方分段表，或情景分不在公布范围内 · 不插值、不外推"
                    : "尚未载入发布数据 · 位次与范围保持未知"}
                </div>}
            </div>
            <div className="slider-foot" style={{ color: "var(--mut)", marginTop: 9 }}>
              <span>{position ? `官方公布最低 ${position.publishedMinScore} 分` : "官方公布最低分"}</span>
              <span>{position ? `${position.tableYear} 年分段表 · 共 ${position.total.toLocaleString("zh-CN")} 人` : "分段表"}</span>
              <span>{position ? `官方公布最高 ${position.publishedMaxScore} 分` : "官方公布最高分"}</span>
            </div>
            <Provenance icon="ruler">
              这条区间是官方分段表实际公布的分数范围，不是本科线或特控线——发布包未提供控制线，因此不做线差计算。
            </Provenance>
          </div>
          <div className="stats">
            <div className="stat"><span className="sk"><Icon name="pin" />全省位次</span>
              <div className="sv num">{position ? position.rank.toLocaleString("zh-CN") : <span className="absent">—</span>}</div>
              <div className="sd">{position
                ? `${position.tableYear} 年官方分段表 · 同分 ${position.count} 人`
                : "该分数未在分段表中列出，或尚未载入发布数据"}</div></div>
            <div className="stat"><span className="sk"><Icon name="layers" />全省百分位</span>
              <div className="sv num">{position ? `前 ${position.percentile < 1 ? position.percentile.toFixed(2) : position.percentile.toFixed(1)}%` : "—"}</div>
              <div className="sd">{position
                ? `同科类约 ${position.total.toLocaleString("zh-CN")} 人中的位置`
                : "缺少分段表时不估算百分位"}</div></div>
            <div className="stat"><span className="sk"><Icon name="wave" />近五次稳定性</span>
              <div className="sv num">{stability === null ? "—" : `±${stability.toFixed(1)}`}</div>
              <div className="sd">{stability === null ? "尚未填写近五次成绩" : "波动越小，定位越可信"}</div></div>
            <div className="stat"><span className="sk"><Icon name="up" />近期趋势</span>
              <div className="sv num">{trend === null ? "—" : `${trend >= 0 ? "+" : ""}${trend}`}</div>
              <div className="sd">{trend === null ? "尚未填写近五次成绩" : "相对上一次的变化"}</div></div>
          </div>
        </div>
        <div className="verdict">
          <span className="eyebrow">Your True Range · 真实水平区间</span>
          <h3 className="song">把你的分数，翻译成一段可以站稳的区间。</h3>
          <div className="vlist">
            <span className="vpill">目标年份 <b>{state.form.targetYear}</b></span>
            <span className="vpill">科类 <b>{trackLabel}</b></span>
            <span className="vpill">再选 <b>{state.form.additional.length ? state.form.additional.map(label).join("、") : "未选择"}</b></span>
            <span className="vpill">情景分 <b>{score ?? "未填写"}</b></span>
            <span className="vpill">位次表年份 <b>{position ? position.tableYear : "未知"}</b></span>
            <span className="vpill">参考年 <b>{REFERENCE_YEAR}</b></span>
          </div>
          <p className="small">位次与百分位全部由官方分段表换算；分数不在公布范围时保留为未知，不插值也不外推。</p>
          {marks.length ? <div className="chips" style={{ marginTop: 14 }}>
            {marks.map((mark) => <span className="vpill" key={`${mark.score}-${mark.label}`}>
              {mark.label} <b>{mark.score}</b></span>)}
          </div> : null}
        </div>
      </div>
      <aside>
        <div className="sidecard">
          <span className="eyebrow plain">Stability · 近五次</span>
          <h3 className="song" style={{ marginTop: 10 }}>你的成绩曲线</h3>
          <div className="trend">
            {history.length >= 2
              ? history.map((value, index) => {
                const max = Math.max(...history, 1);
                return <div className={`tbar${index === history.length - 1 ? " now" : ""}`} key={index}>
                  <span className="col" style={{ height: `${Math.round(value / max * 100)}%` }} />
                  <span className="tl">{index + 1}</span>
                </div>;
              })
              : <div className="empty-inline">尚未填写近五次成绩；此页不生成趋势结论。</div>}
          </div>
          <p className="fhint">曲线越平，说明当前定位越可信；起伏大时，我们用区间而非单点来表达。</p>
        </div>
        <div className="sidecard" style={{ marginTop: 22 }}>
          <span className="eyebrow plain">Evidence · 证据链</span>
          <h3 className="song" style={{ marginTop: 10 }}>每个数字都有依据</h3>
          <div className="evi">
            {state.answers.length === 0
              ? <p className="muted-note">还没有保存的本人表达。去「谈心」写下一句话，它才会进入证据链。</p>
              : state.answers.map((answer) => <div className="evi-row" key={answer.evidenceId}>
                <Icon name="doc" /><span><b>{QUESTIONS.find((item) => item.questionId === answer.questionId)?.text ?? answer.questionId}</b><br />{answer.text}</span>
              </div>)}
          </div>
        </div>
      </aside>
    </div>
    <div className="banner">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="chat" size="lg" />
        <div><h3 className="song">看清位置之后，聊聊你想去哪</h3><p>分数决定「能到哪」，兴趣决定「想去哪」。下一步，我们用六到八个问题聊出你的专业方向。</p></div></div>
      <button type="button" className="btn sm" style={{ flexShrink: 0 }} onClick={() => setPage("talk")}>去谈心<Icon name="arrow" /></button>
    </div>
  </section>;
}
