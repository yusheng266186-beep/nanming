// 南溟 · 主题元件
//
// 这几件元件把项目的内核翻译成设计语言，而不是把声明贴在界面上：
//
// - Uncharted（未测绘）：缺失、未知、无法比较的数据在航海图上就是空白海域。用它替代
//   一个光秃秃的「—」，既说清状态，也不把「不知道」说成「不好」。
//
// 它只描述事实，不改变任何数值口径。
import type { ReactNode } from "react";
import { Icon } from "./art.js";

/**
 * 未测绘：该位置没有可用数据。
 *
 * 与「—」的区别是它给了状态一个名字：不是「零」，不是「差」，而是这片海域没有测过。
 */
export function Uncharted({ children, label = "未测绘" }: { children?: ReactNode; label?: string }) {
  return <span className="uncharted" title={typeof children === "string" ? children : undefined}>
    <Icon name="buoy" size="sm" /><span className="uc-label">{label}</span>
    {children ? <span className="uc-why">{children}</span> : null}
  </span>;
}
