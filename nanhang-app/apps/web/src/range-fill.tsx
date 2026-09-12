import type { ChangeEvent } from "react";

/** 「区间两端」的成对输入（定位页的微调、分数轴的区间上下限共用）。 */
export interface RangeFillProps {
  /** 下端的大字标题：定位页是「微调下限」，分数轴是「区间下限」。 */
  lowLabel: string;
  /** 上端的大字标题，同上。 */
  highLabel: string;
  /** 下端值；还没有这个端点时传 NaN（两端都按「空着」渲染）。 */
  low: number;
  high: number;
  /** 改了哪一端就只交回哪一端——另一端怎么补齐由各页自己决定（两页的兜底值不同）。 */
  onLow: (value: number) => void;
  onHigh: (value: number) => void;
}

/** 空串表示「这个端点还没填」，交回 NaN——与两页原来写在 onChange 里的写法一致。 */
const toEndpoint = (raw: string) => (raw === "" ? Number.NaN : Number(raw));

/**
 * 探索区间的上下限：一支标尺，不是两个各自独立的字段。
 *
 * 上下限属于同一个值（一段区间），所以这里不做两只一样的框，而是：
 * 数字是纸面填空——无框、铺一条铜色细底线，聚焦时底线点亮并浮一层柔光；
 * 中间一根带两个端头的细线读作「从下到上」，与分数轴那条金带上的端头是同一支记号笔；
 * 单位「分」整支标尺只出现一次。两页共用这一个模块，改一处两处一起变。
 *
 * 深色底不在这里判断：分数轴的深海底由 `#page-axis .range-fill` 换成深海玻璃底。
 * 端点语义（谁补谁、basis 怎么写）留在各页自己的 setRange 里，本模块只负责问与报。
 */
export function RangeFill({ lowLabel, highLabel, low, high, onLow, onHigh }: RangeFillProps) {
  const end = (label: string, value: number, aria: string, change: (value: number) => void) =>
    <label className="rf-end" key={label}>
      <span className="rf-cap">{label}</span>
      <input className="rf-inp" type="number" min={0} max={750} inputMode="numeric"
        aria-label={aria} value={Number.isFinite(value) ? value : ""}
        onChange={(event: ChangeEvent<HTMLInputElement>) => change(toEndpoint(event.target.value))} />
    </label>;
  return <div className="range-fill">
    {end(lowLabel, low, "探索区间下限", onLow)}
    <span className="rf-dash" aria-hidden="true" />
    {end(highLabel, high, "探索区间上限", onHigh)}
    <span className="rf-unit" aria-hidden="true">分</span>
  </div>;
}
