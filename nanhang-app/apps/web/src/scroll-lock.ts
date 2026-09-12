import { useEffect } from "react";

/**
 * 弹出卡片打开时锁住整页滚动。
 *
 * 登船卡片与设置卡片都是盖在页面之上的浮层：浮层开着的时候还能滚动底下的长页面，
 * 手指一滑就滑到了浮层外面去，看起来像页面「漏了」。这里在挂载时把滚动容器
 * （html 与 body）的 overflow 存起来改成 hidden，卸载时按原样还回去。
 *
 * 为什么不用 CSS：`:has()` 能写得更短，但老浏览器不支持就会静默失效；这里要的是
 * 「一定锁住」。滚动条本身在全局样式里是隐藏的，所以锁定不会引起页面宽度跳动。
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const targets = [document.documentElement, document.body];
    const previous = targets.map((node) => node.style.overflow);
    for (const node of targets) node.style.overflow = "hidden";
    return () => { targets.forEach((node, index) => { node.style.overflow = previous[index] ?? ""; }); };
  }, [locked]);
}
