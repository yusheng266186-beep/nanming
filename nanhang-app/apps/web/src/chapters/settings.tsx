import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { THINKING_CHOICES, withTier, type AiPanelState } from "../ai-panel.js";
import { Icon } from "../art.js";
import { Overlay } from "../overlay.js";
import type { LocateRoute } from "./shared.js";

/**
 * 设置卡片：思考深度、等待与动效两个开关、当前状态一览、本人数据。
 *
 * 结构与北辰的设置面板同类（一行一个开关或读数，来自其 index.html 的 `.stat-row` 排法）：
 * 开关管「怎么等、怎么看」，读数说明「现在是什么状态」，动数据的只有「清除本次探索」一处。
 *
 * 低语开关控制南溟自己的阶段提示；谈心页的思考过程另按安全显示规则处理。
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
    <span className="chips" role="group" aria-label={label}>
      <button type="button" className={`chip${value ? " brass on" : ""}`} aria-pressed={value}
        onClick={() => set(true)}>开</button>
      <button type="button" className={`chip${value ? "" : " brass on"}`} aria-pressed={!value}
        onClick={() => set(false)}>关</button>
      <span className="vh">{label}当前{value ? "开" : "关"}</span>
    </span>;

  // 走 Overlay（portal 到 body）：设置卡从任何页面都能打开，而章节的入场动画带 transform，
  // 挂在章节里会让背板以章节为参照（手机档两边留白条、卡片被推出视口）。
  return <Overlay role="presentation" data-settings="open"
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="board-card settings-card" role="dialog" aria-modal="true" aria-label="设置">
      <button type="button" className="board-close" aria-label="关闭设置" autoFocus
        onClick={onClose}><Icon name="close" /></button>
      <span className="eyebrow">Settings · 设置</span>
      <h3 className="song" style={{ marginTop: 10 }}>自己的节奏，自己定</h3>
      <p className="psub">调整谈心和阅读的节奏。设置即时生效，思考深度从下一句开始。</p>

      <div className="settings-section">
        <h3><Icon name="layers" />思考深度</h3>
        <div className="tier-pick" role="group" aria-label="思考深度">
          {/* 每档标出一次回答的预估等待时间，学生按自己节奏选；切换下一轮生效。 */}
          {THINKING_CHOICES.map((choice) => <button key={choice.value} type="button"
            className={`tier-card${ai.tier === choice.value ? " on" : ""}`}
            aria-pressed={ai.tier === choice.value} title={choice.hint}
            onClick={() => setAi(withTier(ai, choice.value))}>
            <span className="tc-name">{choice.label}</span>
            <span className="tc-eta">{choice.eta}</span>
          </button>)}
        </div>
        <p className="fhint tier-description" aria-live="polite">{THINKING_CHOICES.find((choice) => choice.value === ai.tier)?.hint} 等待时间为预估。</p>
      </div>

      <div className="settings-section">
        <h3><Icon name="spark" />等待与动效</h3>
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
        <p className="fhint">低语显示的是南溟自己的实时进度。谈心页的思考过程会按安全规则显示。
          关闭动效后，潮汐、抽屉和翻页立即静止；系统的减少动态效果设置始终优先。</p>
      </div>

      <div className="settings-section">
        <h3><Icon name="compass" />现在的样子</h3>
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
        </dl>
      </div>

      <div className="settings-section settings-data">
        <h3><Icon name="doc" />本人数据</h3>
        <p className="psub">探索内容和本页开关只在本次会话生效，刷新后恢复默认。
          清除后将回到「起航」，已下载的文件保留在你的设备上。</p>
        <div className="chart-actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="btn sm ghost" onClick={() => { clear(); onClose(); }}>清除本次探索</button>
          <small className="muted-note">清除的是本次探索的选科、成绩、区间与自选方向，发布数据本身不动。</small>
        </div>
      </div>
    </div>
  </Overlay>;
}
