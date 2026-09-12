# TASK-03 本地招生数据库

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-12，2026-09-12-latest-frontend-backend-alignment）：最新前端合同已对齐，Pages发布中；API版本9继续在线。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：41 个测试文件、509 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：完成最新前端Pages发布与公网资产核验；继续TASK-13身份生命周期与TASK-14学生规模、校园网和回滚演练。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

两份根目录 Excel 清洗后写入一个可重建的 SQLite 库，并提供按考生输入快速匹配的查询入口。库是离线整理与本地匹配的工作产物，**不是**数据发布：`publication_status = NOT_PUBLISHED`、`human_review_performed = 0`，与 `DATA_AND_MATCHING_SPEC.md` 的状态流程一致。

## 产物与命令

在 `nanhang-app` 目录执行。源工作簿默认从工程父目录（即"南溟"目录）只读读取。

```powershell
# 1. 建库（约 70 秒，重跑结果逐字节一致）
py -3.12 pipelines/task03/build_admissions_db.py

# 2. 独立校验：重新解析原工作表单元格，与库内逐字段核对
py -3.12 pipelines/task03/validate_admissions_db.py

# 3. 行为测试（清洗规则与匹配规则）
py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py

# 4. 查询
py -3.12 pipelines/task03/query_admissions.py --stats
py -3.12 pipelines/task03/query_admissions.py --track 物理 --subjects 化学,生物 --rank 12000
py -3.12 pipelines/task03/query_admissions.py --track 物理 --score 600 --subjects 化学,生物 `
    --batch 本科批B段 --level 本科 --sort history_position --limit 20
py -3.12 pipelines/task03/query_admissions.py --track 历史 --subjects 政治,地理 --rank 3000 `
    --batch 本科批B段 --level 本科 --sort history_position --limit 20
```

一分一段表（官方来源）的重抓与校验：

```powershell
py -3.12 pipelines/task03/fetch_score_distribution.py --fetch
py -3.12 pipelines/task03/extract_score_distribution.py
py -3.12 pipelines/task03/validate_score_distribution.py
py -3.12 pipelines/task03/fetch_score_distribution.py --verify-local
```

产物：

| 文件 | 说明 |
|---|---|
| `data/admissions/admissions.sqlite` | 数据库本体，约 117 MB；可重跑生成，不进入 FILE_INDEX/MANIFEST/源码包 |
| `data/admissions/build-manifest.json` | 构建清单：源文件 SHA-256、各表行数、问题码统计、库文件 SHA-256 |

`build_admissions_db.py` 构建的是**确定性**文件：同一份源工作簿与同一个 SQLite 版本下，重建得到的库文件哈希相同（已实测两次重建一致）。

## 数据流

```
物理/历史 两份 .xlsx（只读）
  └─ pipelines/task03/extract_workbook_samples.py 的 XLSX 单元格解析器
       （按 workbook.xml 关系表定位真实工作表；按表头名称定位列；不执行公式）
       └─ build_admissions_db.py 清洗
            ├─ 计划事实：2026 招生计划、学费原值、学制、选科要求
            ├─ 历史事实：2025/2024/2023 各组/专业录取分与位次
            └─ data_issue：所有无法解析、被推断、被拒绝的值逐条留痕
                 └─ admissions.sqlite（+ match_pool 物化匹配表）
                      └─ query_admissions.py 按考生输入匹配
```

## 表结构

| 表 | 主键 | 内容 |
|---|---|---|
| `source_document` / `header_map` | source_id | 源工作簿 SHA-256、工作表、表头行、每个字段对应的列字母 |
| `release` / `meta` | release_id / key | 构建版本、口径说明、源哈希；`NOT_PUBLISHED` |
| `institution` | institution_id | 院校属性、排名、保研率、招生章程链接等（第一行出现的值为准） |
| `institution_tag` / `offering_tag` | 复合 | 院校标签、院校水平、专业水平按 `/` 拆成标签 |
| `admission_group` | group_id | 2026 院校专业组：(院校, 批次, 专业组代码) 唯一 |
| `offering` | offering_id | 招生专业：(组, 专业代码) 唯一 |
| `requirement` | requirement_id | 选科要求；`scope` 区分组级/专业级 |
| `plan_record` | plan_id | 计划人数的非负整数、学费原值、学制、逐字段单元格地址 |
| `admission_observation` | observation_pk | 历史录取观察；`subject_type` + 组/专业外键 + 年份 + 指标唯一 |
| `history_column_map` | 复合 | 历史指标对应的原始列，用于推导证据单元格地址 |
| `score_distribution` | distribution_id | 分段表头：年份、科类、分数范围、行数、来源页、核验状态；**已核实** |
| `score_distribution_row` | row_pk | 每个公布分数一行：人数、累计、位次区间、证据图片坐标 |
| `data_issue` | issue_pk | 数据问题台账 |
| `match_pool` | offering_pk | 物化的匹配宽表（含 2025/2024/2023 最低位次），带索引 |

读取用视图：`v_offering_full`（专业+组+院校+计划+选科）、`v_observation`（历史事实，带可读 ID 与证据单元格地址）、`v_observation_context`（历史事实回连计划行，**显式标注为假定关联**）、`v_offering_history`、`v_group_history`、`v_facet_summary`（可筛选维度统计）、`v_score_distribution_row`（分段表）。

ID 采用可读文本：`GRP-<科类>-<院校代码>-<专业组代码>-<批次/计划类别哈希>`、`OFF-<组后缀>-<专业代码>`、`REQ-<序号>`、`PLAN-<专业后缀>`。事实表另存 INTEGER 代理键以控制体积；`v_observation` 提供 `OBS-<年>-<指标>-<主体>` 形式的历史事实 ID。

## 清洗规则

这些规则是可验证的不变量，`validate_admissions_db.py` 与测试逐条检查：

1. **代码保文本**：院校/专业组/专业代码按文本存储，前导零保留（如 `09`、`0003`）。
2. **0 与缺失分开**：计划人数 0 是真实值；单元格为空是未知。
3. **位次 0 无效**：`rank = 0` 不是有效位次，存为 `rank IS NULL` 且 `rank_is_valid = 0`，并记 `ZERO_RANK_INVALID`。全表 12 处。
4. **公式不执行**：公式单元格只作证据，缓存值不作为取值；Excel 错误值不变成 0（记 `FORMULA_NOT_EVALUATED` / `EXCEL_ERROR_VALUE`）。
5. **学费口径未知**：金额可解析时存数值，但 `tuition_currency`、`tuition_period` 保持 NULL、`tuition_comparable = 0`。`免费` → 0.0 + `TUITION_MARKED_FREE`；`待定` → NULL + `TUITION_PENDING`。全表 797 条待定、1215 条免费。
6. **不跨行前向填充**：只在明确合并区域的锚点继承，不因空格就跨院校/批次/专业组填充。
7. **历史事实不回填当代身份**：`observed_track`、`observed_batch`、`observed_admission_type`、`score_basis` 全部为 NULL，`comparability = NOT_ESTABLISHED`。计划行的批次/科类/计划类别只在 `v_observation_context` 中作为**假定关联**暴露，并带 `batch_assumed_from_plan_row = 1` 标记。逐专业查询时按同主体的 2025/2024/2023 记录关系比较，不把 2026 的组身份回填给旧年。
8. **选科要求三值解析**：`不限` → `unlimited`；`化学`/`化学和生物` 等 → `all_of` + 科目代码；空值或其他无法识别文本 → `unknown`，资格判定保持 `UNKNOWN`，绝不并入 PASS 或 FAIL。全表 82 条为 MISSING。
9. **计划类别空值显式推断**：空值按"普通类"处理，同时 `admission_type_inferred = 1` 并记 `ADMISSION_TYPE_BLANK_TREATED_AS_ORDINARY`，查询默认会标注来源，可用 `--exclude-inferred-admission-type` 排除。
10. **问题不静默**：任何无法解析或需要推断的值都写入 `data_issue`。逐行重复的源级说明（如"学费口径未核实"）折叠为一条带计数的记录，逐值问题保留逐行。

## 匹配逻辑

`query_admissions.py` 复用 `packages/domain` 的规则语义，只做确定性计算：

- **资格**：选科三值判定（PASS / UNKNOWN / FAIL）。物理/历史 + 恰好两门再选科；`unlimited` 对完整选科直接 PASS；未提供完整选科时保持 UNKNOWN；`unknown` 规则保持 UNKNOWN。只有 FAIL 的条目被排除。
- **位次关系**：闭区间比较。`candidate < reference → AHEAD_OF_REFERENCE`；`> → BEHIND_REFERENCE`；`= → OVERLAPS_REFERENCE`。位次数字越小越靠前。
- **多年度**：2025/2024/2023 **逐年分别显示**，不平均、不自动取最有利年份。
- **排序**：先按资格分区（PASS 在前），再按用户方向优先（`--prefer-category` 按门类），再按所选排序（`--sort history_position` 用与最近年度历史边界的距离），最后按 offering_id 稳定排序。
- **硬预算**：只有在显式传入 `--assume-tuition-rmb-per-year`（承认"人民币/学年"这一未经核实的假定）时，`--budget` 才排除条目；否则金额照常显示并标 `TUITION_UNKNOWN`。

**分数→位次换算**：库内已有 2026 年四川物理类/历史类一分一段表（官方来源，已核实），`--score` 可直接定位位次区间，比较时取区间下界。未列出的分数、低于或高于公布范围分别返回 `NO_OBSERVED_SCORE`、`OUT_OF_DISTRIBUTION_COVERAGE`、`ABOVE_PUBLISHED_RANGE`，不做插值或外推。详见 [一分一段表](TASK03_SCORE_DISTRIBUTION.md)。考生自报 `--rank` 优先于分数换算。

固定原因码沿用规格：`INCOMPLETE_SUBJECTS`、`SUBJECT_REQUIREMENT_FAILED`、`UNKNOWN_REQUIREMENT`、`NO_OBSERVED_SCORE`、`MAJOR_HISTORY_MISSING`、`SOURCE_CONFLICT`、`TUITION_UNKNOWN`、`HARD_PREFERENCE_EXCLUDED`、`ADMISSION_TYPE_INFERRED` 等。

## 覆盖与已知限制

| 项目 | 数量 |
|---|---:|
| 专业行（两表合计） | 51,878 |
| 院校 | 2,308 |
| 院校专业组 | 12,275（物理 7,859 / 历史 4,416） |
| 招生专业 | 51,878 |
| 2026 计划人数合计 | 422,017 |
| 历史录取观察 | 264,971（含位次 264,959） |
| 可比较的历史专业最低位次 | 2025 年 36,762 / 2024 年 30,737 / 2023 年 28,849 |
| 数据问题记录 | 2,113 |

限制（构建与查询都按未知处理，未做静默修补）：

- 数据提供方已于 2026-09-11 确认工作簿并完成机器交叉复核；真实数据已导出为 PUBLISHED 分片包。来源仍是用户提供的 Excel，不声称官方直接发布了该工作簿；具体核实和发布见 [核实与发布](TASK03_VERIFICATION_AND_RELEASE.md)。
- 学费币种与计费周期未核实，`tuition_comparable = 0`；中外合作与港澳台院校可能以外币标示。
- 跨年可比性按已登记 comparability_link 判断：网页当前使用已核实的 2025 参考年，未建立关系的 2024/2023 不视为可比。专业组逐年重组，不能仅按相同代码合并。
- `计划类别` 空值按普通类处理，属推断值。
- 一分一段表仅 2026 年两类；历史位次比较仍直接使用工作簿给出的位次，不做跨年换算。
- 无 2022 年列：文件名中的"22—25"不是存在 2022 数据的证据。
- 组级录取最低分（`group_admission_min`）与专业级最低分（`major_admission_min`）分别存储，语义按工作簿表头解释，未核实为官方口径；未创建 `group_filing_min`。
- 同一院校的名称/属性以首次出现的行取值为准；院校属性为来源方整理结果。
- 专业组选科要求：本次两表每组只有一种要求，未触发组内规则分裂（`GROUP_REQUIREMENT_VARIES` 为 0）；代码已支持分裂为专业级要求。

## 与现有交接规格的对应

| 规格实体 | 本库实现 |
|---|---|
| source_document | `source_document` + `header_map` |
| institution | `institution` + `institution_tag` |
| admission_group | `admission_group`（含 stage、admission_type、group_code） |
| offering | `offering` + `offering_tag` |
| plan_record | `plan_record` |
| requirement | `requirement`（原始文本 + 结构化规则并存） |
| admission_observation | `admission_observation`（metric_type 区分组/专业与最低/平均/最高） |
| score_distribution | `score_distribution` + `score_distribution_row`（2026 两类，官方来源，已核实） |
| evidence | `source_document.sha256` + 单元格地址 + `data_issue` 定位 |
| release | `release`（`NOT_PUBLISHED`） |

后续管线已实现发布导出、可比性登记及 2023—2026 分段表接入，不能再把它们列为未实现。仍不声称实现概率或录取预测；加分等未验收能力按规则边界处理。
