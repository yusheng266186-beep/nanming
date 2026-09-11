// 南溟 · 谈心对话组件
//
// 对应原始 南溟.html 的聊天交互：打字指示器（三点跳动）、流式打字机、气泡消息、
// 以及「回答起点」按钮。原实现用 setInterval 直接改 DOM；这里改为 React 状态驱动，
// 并遵守 prefers-reduced-motion：开启时不做逐字动画，直接给出完整文本。
//
// 与原作的重要区别：原作的问题选项带有 dims/avoid 权重，用于算出「方向适配度 %」。
// 本项目禁止由兴趣推断专业适合度（packages/exploration 的 PROMPT_BOUNDARY 第 2 条），
// 因此这里的按钮只是「帮你想怎么开口」的起句，不携带任何权重，也不会生成适配度。
import { useEffect, useRef, useState } from "react";

/** 用户是否要求减少动画。与项目其他位置一致的判定方式。 */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia
    && window.matchMedia("(prefers-reduced-motion:reduce)").matches;
}

/** 三点跳动的「正在输入」指示器。 */
export function TypingDots({ label }: { label: string }) {
  return <>
    <span className="dots" aria-hidden="true"><i /><i /><i /></span>
    <span className="whisper" style={{ display: "block" }}>{label}</span>
  </>;
}

/**
 * 逐字显示一段文字。
 *
 * `main` 先逐字出现，随后 `ask` 整段出现在分隔线下方——与原作的 `||` 分隔约定一致。
 * reduced motion 下直接渲染完整内容，不做定时器。
 */
export function StreamedText({ main, ask, animate, onDone }: {
  main: string;
  ask?: string | null;
  animate: boolean;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState(animate ? 0 : main.length);
  const doneRef = useRef(false);
  // 回调放在 ref 里，避免父组件每次渲染产生的新函数重启定时器。
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!animate) { setShown(main.length); return; }
    setShown(0);
    doneRef.current = false;
    const step = Math.max(1, Math.round(main.length / 90));
    const timer = setInterval(() => {
      setShown((current) => {
        const next = current + step;
        if (next >= main.length) {
          clearInterval(timer);
          if (!doneRef.current) { doneRef.current = true; onDoneRef.current?.(); }
          return main.length;
        }
        return next;
      });
    }, 22);
    return () => clearInterval(timer);
  }, [main, animate]);

  const finished = shown >= main.length;
  return <>
    <span className="t">{main.slice(0, shown)}</span>
    {!finished && animate ? <span className="caret" aria-hidden="true" /> : null}
    {finished && ask ? <span className="ask">{ask}</span> : null}
  </>;
}

/** 一条对话气泡。`who` 为「溟」或「我」。 */
export function ChatBubble({ from, children }: { from: "ai" | "me"; children: React.ReactNode }) {
  return <div className={`msg ${from}`}>
    <span className="who">{from === "ai" ? "溟" : "我"}</span>
    <div className="bub">{children}</div>
  </div>;
}

/**
 * 回答起点按钮。
 *
 * 点一下把这句话放进输入框，学生可以继续改写成自己的话。它只提供措辞帮助，
 * 不参与任何计算，也不代表学生已经表达过。
 */
export function AnswerStarters({ starters, onPick, disabled }: {
  starters: readonly string[];
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  if (starters.length === 0) return null;
  return <div className="qopts" role="group" aria-label="回答起点（可以改写成自己的话）">
    {starters.map((text) => <button className="qopt" type="button" key={text}
      disabled={disabled} onClick={() => onPick(text)}>{text}</button>)}
  </div>;
}
