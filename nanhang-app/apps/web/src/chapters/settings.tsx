import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { THINKING_CHOICES, withTier, type AiPanelState } from "../ai-panel.js";
import { Icon } from "../art.js";
import type { LocateRoute } from "./shared.js";

/**
 * 设置卡片：思考深度、等待与动效两个开关、当前状态一览、本人数据。
 *
 * 结构与北辰的设置面板同类（一行一个开关或读数，来自其 index.html 的 `.stat-row` 排法）：
 * 开关管「怎么等、怎么看」，读数说明「现在是什么状态」，动数据的只有「清除本次探索」一处。
 *
 * 关于「思考低语」：北辰那一项显示的是**模型真实思考的尾部**，南溟当初刻意没有搬——
 * 思考内容属于草稿、不过安全扫描，万一模型在思考里写「可以考虑冲一冲」，那句话就到了学生眼前
 * （见 docs/AI_QIANFAN_SETUP.md「没有搬的，以及原因」）。这里的低语是南溟自己的阶段提示，
 * 只说明「溟在读你说的话」，不含任何模型思考，卡片上也如实这么写。
 */
export interface SettingsProps {
  open: boolean;
  onClose: () => void;
  ai: AiPanelState;
  setAi: Dispatch<SetStateAction<AiPanelState>>;
  /** 清除本次探索：原先在「航线图」页，现在只留在这里一处。 */
  clear: () => void;
  /** 当前走的是哪条定位路（只读展示）。 */
  route: LocateRoute;
  /** 已载入的发布数据版本；未载入时如实显示。 */
  releaseId: string | null;
  /** 等待回答时是否显示那一行低语。 */
  whisperOn: boolean;
  setWhisperOn: Dispatch<SetStateAction<boolean>>;
  /** 是否停用界面动效（与系统「减少动态效果」同一套处理）。 */
  motionOff: boolean;
  setMotionOff: Dispatch<SetStateAction<boolean>>;
}

export function renderSettings({ open, onClose, ai, setAi, clear, route, releaseId,
  whisperOn, setWhisperOn, motionOff, setMotionOff }: SettingsProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const tierLabel = THINKING_CHOICES.find((choice) => choice.value === ai.tier)?.label ?? ai.tier;
  const onOff = (value: boolean, set: Dispatch<SetStateAction<boolean>>, label: string) =>
    <span className="chips">
      <button type="button" className={`chip${value ? " brass on" : ""}`} aria-pressed={value}
        onClick={() => set(true)}>开</button>
      <button type="button" className={`chip${value ? "" : " brass on"}`} aria-pressed={!value}
        onClick={() => set(false)}>关</button>
      <span className="vh">{label}当前{value ? "开" : "关"}</span>
    </span>;

  return <div className="board-backdrop" role="presentation" data-settings="open"
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="board-card" role="dialog" aria-modal="true" aria-label="设置">
      <button type="button" className="board-close" aria-label="关闭设置" autoFocus
        onClick={onClose}><Icon name="close" /></button>
      <span className="eyebrow">Settings · 设置</span>
      <h3 className="song" style={{ marginTop: 10 }}>自己的节奏，自己定</h3>
      <p className="psub">谈心用的思考深度、等待与动效两个开关、当前状态一览，都在这一张卡片里。
        改完直接关掉，已经聊过的内容和拿到的回复都不受影响。</p>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3><Icon name="layers" />思考深度</h3>
        <p className="psub">每一档标出一次回答的大致等待时间，按自己的节奏挑。换档从下一句开始生效，
          不用重新开一次谈心。</p>
        <div className="tier-pick">
          {/* 每档标出一次回答的预估等待时间，学生按自己节奏选；切换下一轮生效。 */}
          {THINKING_CHOICES.map((choice) => <button key={choice.value} type="button"
            className={`tier-card${ai.tier === choice.value ? " on" : ""}`}
            aria-pressed={ai.tier === choice.value} title={choice.hint}
            onClick={() => setAi(withTier(ai, choice.value))}>
            <span className="tc-name">{choice.label}</span>
            <span className="tc-eta">{choice.eta}</span>
            <span className="tc-hint">{choice.hint}</span>
          </button>)}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3><Icon name="spark" />等待与动效</h3>
        <p className="psub">等回答的那几秒里显示什么、界面动不动，各有一个开关。两项都只影响这台设备上的显示。</p>
        <dl className="set-rows">
          <div className="set-row">
            <dt>思考低语</dt>
            <dd>{onOff(whisperOn, setWhisperOn, "思考低语")}</dd>
          </div>
          <div className="set-row">
            <dt>界面动效</dt>
            <dd>{onOff(!motionOff, (next) => setMotionOff(!next), "界面动效")}</dd>
          </div>
        </dl>
        <p className="fhint">低语显示的是南溟自己的阶段提示（「溟在读你刚写的那句」这类），
          <b>不是模型的内部思考</b>——思考内容属于草稿，不出现在学生端。动效关掉后，与系统「减少动态效果」
          走同一套处理：所有过渡与入场一律停用。</p>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3><Icon name="compass" />现在的样子</h3>
        <p className="psub">只读一览：这些就是此刻生效的设置与数据，不在这张卡片里改的项，请到对应章节改。</p>
        <dl className="set-rows">
          <div className="set-row">
            <dt>定位路线</dt>
            <dd>{route === "school" ? "荣县一中 · 增强模式" : "全国通用模式"}</dd>
          </div>
          <div className="set-row">
            <dt>发布数据</dt>
            <dd>{releaseId ?? "尚未载入"}</dd>
          </div>
          <div className="set-row">
            <dt>谈心</dt>
            <dd>{ai.connected ? "已连接" : "未连接"} · {tierLabel}</dd>
          </div>
          <div className="set-row">
            <dt>思考低语 / 界面动效</dt>
            <dd>{whisperOn ? "开" : "关"} / {motionOff ? "关" : "开"}</dd>
          </div>
        </dl>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3><Icon name="doc" />本人数据</h3>
        <p className="psub">探索内容默认只留在当前内存，刷新页面即清空；只有主动下载时才会写入你的设备。
          上面那两个开关同样不写盘：刷新后回到默认（低语开、动效跟随系统）。
          清除之后要从「起航」重新来一遍；已下载到设备上的文件不归这里管，需要你自己删除。</p>
        <div className="chart-actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="btn sm ghost" onClick={() => { clear(); onClose(); }}>清除本次探索</button>
          <small className="muted-note">清除的是本次探索的选科、成绩、区间与自选方向，发布数据本身不动。</small>
        </div>
      </div>
    </div>
  </div>;
}
