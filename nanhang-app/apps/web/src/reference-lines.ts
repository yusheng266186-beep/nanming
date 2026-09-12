/**
 * 四川省 2026 年普通高校招生录取控制分数线（官方登记数据）。
 *
 * 这是本工作区引入的第一份「公共省控制线」参考数据。原《SYSTEM_AND_INTERFACE_SPEC》§5.1
 * 规定不导入公共省控制线表；docs/ADR_002_LINE_EQUIVALENT_POSITIONING.md 修订了该条款，
 * 允许以静态、带来源登记的方式引入最近一届的特控线与本科批线，且仅用于定位页的
 * 线差比例等位估算——不进入匹配，不得表述为录取预测。
 */

export interface OfficialTrackLines {
  /** 特殊类型招生录取控制分数线。 */
  specialControl: number;
  /** 本科批次线。 */
  undergraduate: number;
}

export interface OfficialLineSet {
  year: number;
  province: string;
  tracks: Record<"PHYSICS" | "HISTORY", OfficialTrackLines>;
  source: {
    publisher: string;
    title: string;
    url: string;
    publishedAt: string;
    retrievedAt: string;
    note: string;
  };
}

export const OFFICIAL_LINES_2026: OfficialLineSet = {
  year: 2026,
  province: "四川",
  tracks: {
    PHYSICS: { specialControl: 519, undergraduate: 435 },
    HISTORY: { specialControl: 525, undergraduate: 455 }
  },
  source: {
    publisher: "四川省教育考试院",
    title: "官方发布！四川省2026年普通高校招生录取控制分数线",
    url: "https://www.sceea.cn/Html/202606/Newsdetail_4853.html",
    publishedAt: "2026-06-25",
    retrievedAt: "2026-09-12",
    note: "物理类：特控线 519、本科批 435；历史类：特控线 525、本科批 455。"
      + "「特控线」全称特殊类型招生录取控制分数线；页面上 2026 年数值以考试院公布为准，"
      + "如官方勘误应在此同步并更新 ADR_002 的登记。"
  }
};
