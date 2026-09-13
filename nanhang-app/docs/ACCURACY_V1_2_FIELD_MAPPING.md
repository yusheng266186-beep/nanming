# accuracy-v1.2 单人摘要字段映射

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-13，2026-09-13-font-range-pending）：API版本10与Pages c0b2664已部署并核验；宋体与区间标尺新快照本机通过、待Pages发布。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：46 个测试文件、552 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：负责人进行实际页面验收；继续TASK-13身份生命周期与TASK-14学生规模、校园网和回滚演练。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

> 本文正文保留该工作包当时的验证范围和问题编号，不是当前任务清单。招生核实、学校实数据及 AI 的后续进展见 [当前进度](PROJECT_STATUS.md)，最新测试见 [验证结果](VALIDATION_RESULT.md)。

核对日期：2026-09-10。本文记录 TASK-05 的固定来源、适配入口、字段映射和冲突边界。实现只生成调用方已经选定的一名学生的一条 observation；不搜索姓名、不输出全班、不跨考试合并。

## 固定来源与取证

来源仓库为 `yusheng266186-beep/zhiliang-huixi-new-`，固定提交为 `6f70eab4e6e9ecadc00149b1387103b45b5d8e2b`。本次通过固定 SHA 拉取并读取下列文件，`git rev-parse FETCH_HEAD:<path>` 的 Git blob 与既有证据登记一致；没有使用 main 或最新分支替代。

| 文件 | Git blob | 用途 |
|---|---|---|
| [app/lib/types.ts](https://github.com/yusheng266186-beep/zhiliang-huixi-new-/blob/6f70eab4e6e9ecadc00149b1387103b45b5d8e2b/app/lib/types.ts) | `b6979f1e83d35f1a36858c6bb0839fc0a6a81c2f` | `StudentScore`、`ScoreCellState`、`ScoreConflict`、来源位置的真实字段 |
| [app/lib/parser.ts](https://github.com/yusheng266186-beep/zhiliang-huixi-new-/blob/6f70eab4e6e9ecadc00149b1387103b45b5d8e2b/app/lib/parser.ts) | `65ea6ca4c596718e1c0bb209b8e6fb54e27fb7c2` | 表头选择、缺源总分排除、重复和冲突处理 |
| [app/lib/score-validation.ts](https://github.com/yusheng266186-beep/zhiliang-huixi-new-/blob/6f70eab4e6e9ecadc00149b1387103b45b5d8e2b/app/lib/score-validation.ts) | `529410a4b89ae9e0c4fb534a4af9ed12b13fe4a2` | 0 分、缺考、缓考、不适用、公式错误和异常值语义 |
| [app/lib/class-config.ts](https://github.com/yusheng266186-beep/zhiliang-huixi-new-/blob/6f70eab4e6e9ecadc00149b1387103b45b5d8e2b/app/lib/class-config.ts) | `696af130e4aebd40f06b27740b7517add777949f` | 组合映射及其学校特定、未知班级默认值限制 |
| [app/lib/metrics.ts](https://github.com/yusheng266186-beep/zhiliang-huixi-new-/blob/6f70eab4e6e9ecadc00149b1387103b45b5d8e2b/app/lib/metrics.ts) | `a2d74619b18c67baf4b68b5c11bb1f16dbf070ef` | 质量指标的缺失/部分口径，确认其不是录取概率 |
| [scripts/verify-accuracy.ts](https://github.com/yusheng266186-beep/zhiliang-huixi-new-/blob/6f70eab4e6e9ecadc00149b1387103b45b5d8e2b/scripts/verify-accuracy.ts) | `2e1f8a45807ae71731fac3b7bc586cc256a9e9a6` | 固定版本已有合成检查与真实工作簿分支边界 |

## 适配入口

`packages/school-adapter/src/index.ts` 导出 `adaptAccuracyV12SelectedStudent(input, options)`。`input.selectedScore` 是已经选定的单个 accuracy-v1.2 `StudentScore` 运行时对象；可同时传入与该对象有关的 `scoreConflicts`、源文件摘要和数据画像质量值。`options` 只承载南溟调用方明确确认的信息，例如日期、计分口径、满分、稳定 ID 和学生确认的选科。

返回 `status: "adapted"` 时只有一个 `StudentProfileEnvelope` 且 `observations.length === 1`；返回 `status: "rejected"` 时 `profile === null` 并给出拒绝原因。适配器生成后会调用冻结结构校验和独立语义校验，任一失败均不返回档案。

## 字段映射

| accuracy-v1.2 来源字段 | 南溟字段 | 转换规则 | 未知值与冲突处理 |
|---|---|---|---|
| `exam`, `rawExam`, `school` | `exam_id`, `source_exam_label` | 标签原样使用 `rawExam`；ID 由学校、规范考试名和原标签生成不可逆摘要 | 不把 `51` 等标签猜成日期；日期由调用方单独确认 |
| `school`, `classNo`, `name` | 不进入档案正文 | 只用于源侧选人、解析器冲突键和考试 ID 隔离 | 不作为稳定身份；不按同名查找、覆盖或跨班合并 |
| `track`, `combination` | `selection.primary`, `selection.additional` | 仅识别固定源中明确的 `物化生`、`物化地`、`历政地` 且要求 track 一致 | 未配置/未知组合保留不完整并警告；是否由学生确认由 `confirmed_by_student` 单独记录 |
| `total`, `totalSource` | `total.value`, `total.origin` | 有限非负且 `totalSource=source` 才保留值 | 缺失/异常为 `null/unknown`；`reconstructed` 数值被抑制，不按科目求和重建 |
| 调用方确认的总分元数据 | `total.max_score`, `total.score_basis` | 仅显式传入时映射 | 源对象没有这些字段，默认 `null/unknown`，不从表头偏好或考试名推断 |
| `subjects`, `subjectStates` | `subjects[code].value/state` | 中文学科名映射为冻结代码；`0` 保持 valid；源状态中的连字符转换为合同下划线形式 | 非 valid 状态一律为 `value=null`；状态和值冲突发警告；英语和日语同时出现时不擅自选择外语 |
| 调用方确认的逐科元数据 | `subjects[code].max_score/score_basis` | 仅显式传入时映射 | 源 `StudentScore` 不含逐科满分和原分/赋分口径，默认 `null/unknown` |
| `cityRank`, `schoolRank` | `ranks[]` | 分别保留为 city/school；仅接受大于等于 1 的整数 | `population=null`、`tie_convention=unknown`、`source_status=imported_unverified`；不转省位次 |
| `source.sheet/row` | `source_refs[]` | 生成本地源行定位，不包含姓名 | 缺位置时写明未知并警告；源文件名和私人路径不进入协议 |
| `ScoreConflict.resolution=rank-only` | 单条 observation＋全部重复行 `source_refs` | 仅当所有候选及所选记录的源解析指纹完全一致时折叠 | 元数据与内容不一致则拒绝，不能借 rank-only 掩盖成绩差异 |
| `ScoreConflict.resolution=excluded` | 无档案 | 返回 `SOURCE_RECORD_CONFLICT` | 不选最后一条，不让冲突记录进入比较 |
| `Threshold` | 不映射 | TASK-05 最小个人摘要不导入模拟线 | 源对象缺参照群体和可验证来源，不猜补 contextual line |
| `DataProfile.overallConfidence` | 仅转换警告 | 记录其存在 | 不写入学生可信度，不转换为录取概率 |
| 导入侧“已认证”声明 | `provenance` | 始终保持 `local_import/local_only` | 忽略自声明并警告；只有后续服务器认证上下文能提升身份 |
| 外部稳定 ID | `subject_id` | 仅 `stableIdConfirmed=true` 且有 ID 时做 SHA-256 派生 | 固定源没有稳定 ID，默认生成仅本摘要有效的 `local:` ID |

## 冲突样例与验证边界

合成/脱敏样例位于 `packages/school-adapter/test/fixtures/accuracy-v1.2.synthetic.json`，字段名和层级与固定源 `StudentScore`/`ScoreConflict` 一致，覆盖真实 0 分、缺考、缺总分、完全重复、成绩冲突和同名跨班。样例没有真实姓名、学校或成绩，不能作为真实数据验收证据。

本次未取得真实工作簿，也未运行固定源 `verify-accuracy.ts <workbook>` 的真实工作簿分支。因此已验证的是固定源代码字段到冻结南溟合同的实现和合成冲突行为；真实工作簿映射仍标记为未验证，不声称完成实数据验收。
