import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { THINKING_CHOICES, withTier, type AiPanelState } from "../ai-panel.js";
import { Icon } from "../art.js";

/**
 * 设置：谈心的思考深度与本人数据的清除，集中在一张卡片里。
 *
 * 这两项原先分散在两章：「思考深度」在谈心页的聊法面板与对话底栏各一份，「清除本次探索」
 * 在航线图页的数据面板里。同一件事出现在两个章节，学生要回头找。挂到顶栏右上角的「溟」
 * 上之后，任何一页都能打开。卡片沿用登船卡片（.board-backdrop / .board-card）的样式，
 * 关闭方式也一致：Esc、点背景、右上角的关闭按钮。
 */
export interface SettingsProps {
  open: boolean;
  onClose: () => void;
  ai: AiPanelState;
  setAi: Dispatch<SetStateAction<AiPanelState>>;
  /** 清除本次探索：原先在「航线图」页，现在只留在这里一处。 */
  clear: () => void;
}

export function renderSettings({ open, onClose, ai, setAi, clear }: SettingsProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return <div className="board-backdrop" role="presentation" data-settings="open"
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="board-card" role="dialog" aria-modal="true" aria-label="设置">
      <button type="button" className="board-close" aria-label="关闭设置" autoFocus
        onClick={onClose}><Icon name="close" /></button>
      <span className="eyebrow">Settings · 设置</span>
      <h3 className="song" style={{ marginTop: 10 }}>自己的节奏，自己定</h3>
      <p className="psub">谈心用的思考深度、以及本次探索的数据，都收在这张卡片里。改完直接关掉，
        已经聊过的内容和拿到的回复都不受影响。</p>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3><Icon name="spark" />思考深度</h3>
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
        <h3><Icon name="doc" />本人数据</h3>
        <p className="psub">探索内容默认只留在当前内存，刷新页面即清空；只有主动下载时才会写入你的设备。
          清除之后要从「起航」重新来一遍；已经下载到设备上的文件不归这里管，需要你自己删除。</p>
        <div className="chart-actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="btn sm ghost" onClick={() => { clear(); onClose(); }}>清除本次探索</button>
          <small className="muted-note">清除的是本次探索的选科、成绩、区间与自选方向，发布数据本身不动。</small>
        </div>
      </div>
    </div>
  </div>;
}
