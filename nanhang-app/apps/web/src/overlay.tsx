import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * 浮层的统一挂载点：把背板 portal 到 `document.body`，**不再挂在章节里**。
 *
 * 为什么必须 portal（2026-09-20 实测的根因）：
 * 章节 `.view` 带入场动画 `animation:arrive`，而 `@keyframes arrive` 里有 `transform`。
 * 只要元素的 transform 不是 none（动画进行中、或动画规则仍在生效），它就成为
 * **`position:fixed` 后代的包含块**——挂在章节里的背板于是按章节盒子定位：
 * 实测 390×844 手机档，`.wrap` 的 18px 内边距把背板挤成 354 宽、左边留出 18px
 * （负责人看到的「左右两条白条」），底边被推到视口下方（小结卡只剩一条边，滑不到）。
 * 2026-09-13 去掉 `animation-fill-mode` 只能解决「动画结束后仍带 fill」这一种情形，
 * 动画运行期间照样会创建包含块。portal 到 body 之后，背板的包含块永远是视口本身，
 * 与任何祖先的 transform/动画无关。
 *
 * 放在 `@nanhang` 之外的一个普通模块里：三处浮层（起航登船卡、设置卡、方向小结）共用，
 * 免得以后有人再往章节里塞一个新的浮层、又踩同一个坑。
 */
export function Overlay({ children, ...rest }: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly role?: string;
  readonly "aria-label"?: string;
  readonly "data-settings"?: string;
  readonly onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  readonly onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}) {
  const { className = "board-backdrop", ...rest2 } = rest;
  const backdrop = <div className={className} {...rest2}>{children}</div>;
  // 服务端/测试环境没有 document 时退回内联渲染，保证不炸。
  if (typeof document === "undefined") return backdrop;
  return createPortal(backdrop, document.body);
}
