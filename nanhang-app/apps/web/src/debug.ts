/**
 * 调试模式（临时）。
 *
 * 负责人要求：验收期间打开所有限制，确保每个按钮都有反馈、每一步都能进，
 * 允许用示例数据撑起界面视觉效果。验收完成后把 DEBUG_MODE 改回 false，
 * 或直接 git revert 引入本文件的提交。
 *
 * 本文件只放开关与调试专用常量，不写业务逻辑；所有消费点都必须带 DEBUG_MODE 判断。
 */
export const DEBUG_MODE = import.meta.env.DEV;

/** 调试模式下预填的本地访问码（本地 API 开发档的演示码）。 */
export const DEBUG_ACCESS_CODE = "local-trial-code";

/** 调试模式下的示例探索区间：让院校池、方向、航线图无需先填成绩即可查看。 */
export const DEBUG_SAMPLE_RANGE = { low: 550, high: 570 };
