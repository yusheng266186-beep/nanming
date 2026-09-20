import { useSyncExternalStore } from "react";

/** 系统偏好和本次会话的设置使用同一判定，修改后立即通知 JS 动画。 */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && (
    document.documentElement.dataset.motion === "off"
    || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  query?.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => {
    query?.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
