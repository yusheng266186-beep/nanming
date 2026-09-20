import { useState, type ReactNode } from "react";

/** 首次打开才挂载卡片，之后保留正文，让关闭和快速反向操作都有连续的高度过渡。
 * overflow:clip 裁掉收起内容，同时保留院校卡相对页面的 sticky 行为。
 */
export function Disclosure({ id, open, children }: { id: string; open: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  return <div id={id} className="stop-body card-disclosure" aria-hidden={!open} {...(!open ? { inert: "" } : {})}>
    <div className="disclosure-clip"><div className="disclosure-content">
      {mounted ? children : null}
    </div></div>
  </div>;
}
