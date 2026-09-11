// 南溟 · 主题元件
//
// 这几件元件把项目的内核翻译成设计语言，而不是把声明贴在界面上：
//
// - Provenance（溯源锚点）：每个来自数据的数字下面挂一枚锚，写明它出自哪一份来源。
//   「锚」在航海里表示停泊与定位，恰好对应「这个数字停在哪份证据上」。
// - Uncharted（未测绘）：缺失、未知、无法比较的数据在航海图上就是空白海域。用它替代
//   一个光秃秃的「—」，既说清状态，也不把「不知道」说成「不好」。
//
// 两者都只描述事实，不改变任何数值口径。
import type { ReactNode } from "react";
import { Icon } from "./art.js";

/**
 * 溯源锚点：一行文字，说明它上面的数字从哪里来。
 *
 * 用在任何「来自发布包/来源文件」的数字或结论下面。不是装饰——没有它，
 * 页面上的数字就只是数字；有它，读者才知道这个数字能不能信、能不能查。
 */
export function Provenance({ children, icon = "anchor" }: { children: ReactNode; icon?: string }) {
  return <p className="provenance"><Icon name={icon} size="sm" /><span>{children}</span></p>;
}

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
