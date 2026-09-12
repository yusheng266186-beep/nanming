# TASK-03 最小官方来源样本验证报告

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-12，2026-09-12-latest-frontend-backend-alignment）：最新前端合同已对齐，Pages发布中；API版本9继续在线。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：42 个测试文件、526 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：完成最新前端Pages发布与公网资产核验；继续TASK-13身份生命周期与TASK-14学生规模、校园网和回滚演练。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

> 本文正文保留该工作包当时的验证范围和问题编号，不是当前任务清单。招生核实、学校实数据及 AI 的后续进展见 [当前进度](PROJECT_STATUS.md)，最新测试见 [验证结果](VALIDATION_RESULT.md)。

本文保留上一轮官方图/OCR的历史方法与结果；其中“工作簿为二级输入”和OCR命令仅适用于该次运行。当前用户已指定 Excel 为主输入，后续操作统一见 [Excel主管线](TASK03_EXCEL_INTAKE.md)。不要覆盖历史样本或把未签字记录改为已核实。

验证日期：2026-09-10。取得运行 `20260910T094233Z`，UTC 取得时间 `2026-09-10T09:42:33Z`（北京时间 17:42:33）。

## 历史记录：结论

“取得原文 → 保留快照与哈希 → OCR/文字层提取 → 字段对照 → 17 条结构化样本 → 独立哈希与语义检查”的最小技术链路已跑通。TASK-03 **未达到全部完成标准**：17 条均尚未由人工对照原图签字确认，且仍缺官方组投档最低样本与历史口径说明。样本因此全部保持 `VALIDATED_NOT_VERIFIED`，正式发布记录仍为 0。

## 本次实际取得

取得了 5 个官方入口 HTML 和 5 张代表图片。完整 URL、HTTP 元数据、取得时间、字节数和 SHA-256 在 `data/task03/source-snapshots/20260910T094233Z/snapshot-register.json`。

| 代表资产 | 定位 | SHA-256 | 字节 |
|---|---|---|---:|
| `SC-PLAN-P-2026-P005` | 省考试院 2026 物理类计划第 5 页 | `2f373fbaf9a2c34f23d59b4fadefd30da77f7217d1f0c82863e4662ac0940d00` | 674877 |
| `SC-PLAN-H-2026-P005` | 省考试院 2026 历史类计划第 5 页 | `aefaab1b74de1ed0ae824f3edccacef52f6ba17e652cc8c99cdc74d573d31ae7` | 568709 |
| `SC-RANK-P-2026-I001` | 省考试院物理类分段表第 1 张正文图 | `0ec85945d95e1a6c7f8b63bcbe3c5b115d899ba000889c0214f4cb7be9b5b065` | 331090 |
| `SC-RANK-H-2026-I001` | 省考试院历史类分段表第 1 张正文图 | `9914e7bc5d4b83e55f7825a793b78f5728b7b2d9b028d2976e894155b70aee01` | 334177 |
| `SICAU-REFERENCE-2026-I001` | 川农招生网文章正文大图 | `d9ff2ef10914ada222b8c6e626bc09d5a6fd8e93e2289d6cbeacec810dbe0d93` | 1662964 |

两个用户提供的工作簿仅作二级文字层输入：历史类 SHA-256 为 `78305a687e166fb3a5788d0f5a680029bb44f79932e8a19691f7fdc0330525eb`，物理类为 `bc2e03abbc6870c7bc30b6325c6839fa783e17ed19aac6dc31b0342cebaf1974`。本轮没有修改两个工作簿，也没有将它们宣称为官方原文。

## 提取效果与样本

| 类型 | 方法 | 样本数 | 结果与局限 |
|---|---|---:|---|
| 2026 计划 | 工作簿 XML 文字层定位 + 官方图片 Windows OCR 名称对照 | 7 | 覆盖物理/历、专业组继承、国家专项和公安司法备注；多栏 OCR 有串栏及 `1B`→`IB` 等误识，待人工核对 |
| 2026 分段表 | Windows OCR 词坐标按 y 行对齐 | 6 | 5 行三字段取得；物理 679 分的本段人数漏识并保留 `null` |
| 2025 川农录取 | 行名锚点 + 2025 列坐标 | 4 | 含 2 条 `major_admission_min` 和 2 条 `group_admission_min`；批次、招生类型、分数口径保持未知 |

结构化主文件为 `data/task03/structured-samples.json`；逐条核对状态为 `verification-records.json`；覆盖与缺口分别为 `coverage.json` 和 `issues.json`。原始 OCR 结果包含行、词与像素坐标，保留在 `data/task03/extraction/20260910T094233Z/`。

## 逐条核对状态

- 17/17 条：`human_review_status=PENDING`，人工验收数为 0。
- 11/17 条：自动字段定位为 `MATCH`，但仍为 `PENDING_HUMAN`。
- 5/17 条：计划图片 OCR 把 `1B/1C/1H/1J/1K` 的数字 `1` 识别为字母 `I`，自动状态为 `CONFLICT`；工作簿值没有因此被 OCR 覆盖。
- 1/17 条：`rank-physics-679` 的 `people_at_score` 为 `null`，状态 `MISSING`；未用累计人数差重建。
- 0 条为 `PUBLISHED`；没有人工签字、没有全量覆盖，不得把“自动匹配”写成“与原文已人工一致”。

## 覆盖缺口与问题

1. 计划只取物理/历各第 5 页，没有全量抓取或跨页续表验收。
2. 分段表只取两个高分段首图；并非完整一分一段表。
3. 未取得官方 `group_filing_min`；川农“组最低录取”仅是 `group_admission_min`。
4. 川农图的历史分数列未逐行提供批次、招生类型与原分/投档分口径。
5. 工作簿的上游制作方、生成方法和全量误差率未独立证明。
6. 密集中文多栏 OCR 不能在无人工复核情况下自动发布。

## TASK-06 / TASK-07 可用接口与禁止边界

TASK-06 可读取 `structured-samples.json` 进行字段卡片、缺失提示和证据定位的开发验证，必须显示 `publication_status`、`unknown_fields` 与 `review`。TASK-07 可用它验证“未核实数据不可用于正式结果”和证据展示，但不得将这 17 条送入只接受 `PUBLISHED` 数据的 `buildMatchResult`。

建议两个下游任务定义一个只读开发接口：

```ts
type Task03SampleEnvelope = {
  publication_status: "NOT_PUBLISHED";
  human_review_performed: false;
  records: Array<{
    sample_id: string;
    entity_type: "plan_record" | "score_distribution_point" | "admission_observation";
    unknown_fields: string[];
    evidence: { official_asset_id: string; official_snapshot_sha256: string; official_image_locator: string };
    review: { source_comparison_status: "PENDING_HUMAN" | "MISSING" | "CONFLICT"; human_review_performed: false };
  }>;
};
```

缺口是人工核实工作流和合法 `PUBLISHED` 数据发布器，二者都不应在 TASK-06/07 中暗中绕过。

## 可重跑命令

从 `nanhang-app` 目录执行：

```powershell
py -3.12 pipelines/task03/fetch_official_samples.py --verify-local
py -3.12 pipelines/task03/extract_official_samples.py --raw-ocr
py -3.12 pipelines/task03/extract_official_samples.py --build-sample --workbook-root ..
py -3.12 pipelines/task03/validate_task03_samples.py
$env:Path = 'C:\Users\yusheng\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
npm run validate
```

重新联网取得时使用 `--fetch`；它会新建时间戳快照目录，不覆盖历史运行。本轮实际检查结果：快照 10/10 哈希一致，OCR 5/5 哈希一致，17/17 结构化记录通过 11 组独立语义检查；`npm run validate` 为 5 个测试文件、79 项通过、0 失败。
