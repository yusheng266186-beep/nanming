# TASK-03 数据核实与发布导出

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-13，2026-09-13-font-range-pending）：API版本10与Pages c0b2664已部署并核验；宋体与区间标尺新快照本机通过、待Pages发布。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：46 个测试文件、552 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：负责人进行实际页面验收；继续TASK-13身份生命周期与TASK-14学生规模、校园网和回滚演练。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

招生数据已完成两件事：**核实**（人工确认 + 机器交叉复核）与**发布导出**（库 → 不可变分片数据包 → 网页读取）。本文记录这两步的依据、产物与边界。

## 一、核实

### 人工确认

| 项目 | 内容 |
|---|---|
| 核实方 | 数据提供方（用户） |
| 日期 | 2026-09-11 |
| 记录 | `data/task03/human-verification.json` |
| 覆盖 | 两份招生工作簿全部专业行与历史观察、官方一分一段表 7 张、17 条历史 OCR 样本 |

人工确认写入 `workbook-samples.json`、`verification-records.json`、`structured-samples.json`，逐条标记 `human_review_status = VERIFIED` 并记录核实方与日期。

### 机器交叉复核

核实之外，全部历史位次与官方分段表做了独立比对：

对每条记录（年份 y、科类 t、分数 s、位次 r），在官方 y/t 表中查 s，检验 r 是否落在 `[cumulative(s) − count(s) + 1, cumulative(s)]` 内。

| 年份 | 科类 | 核对条数 | 区间内 | 区间外 | 高于公布范围 |
|---|---|---:|---:|---:|---:|
| 2025 | 物理 | 81,122 | 81,076 | **0** | 46 |
| 2025 | 历史 | 38,335 | 38,297 | **0** | 38 |
| 2024 | 理科 | 40,852 | 40,826 | **0** | 26 |
| 2024 | 文科 | 19,527 | 19,503 | **0** | 24 |
| 2023 | 理科 | 57,982 | 57,933 | **0** | 49 |
| 合计 | | 237,818 | 237,635 | **0** | 183 |

- **0 条越界**：工作簿位次与官方分段表完全一致。
- 183 条高于官方公布最高分，官方在这些分段合并为「某分及以上」不逐分列出，不计为不一致。
- 复核可重跑：`py -3.12 pipelines/task03/crosscheck_workbook_ranks.py`，结果写 `data/task03/score-distribution/workbook-crosscheck.json`。

### 刷新核实的命令

```powershell
py -3.12 pipelines/task03/crosscheck_workbook_ranks.py      # 机器交叉复核
py -3.12 pipelines/task03/record_verification.py            # 写入核实标记
py -3.12 pipelines/task03/record_verification.py --check     # 只检查是否已是最新
```

`record_verification.py` **不改动** `publication_status`：核实与发布是两个独立决定，发布由下面的导出步骤单独记录。

## 二、发布导出

`pipelines/task03/export_release.py` 把 `data/admissions/admissions.sqlite` 转成产品规格定义的公开数据包。

```powershell
py -3.12 pipelines/task03/export_release.py            # 生成发布包
py -3.12 pipelines/task03/export_release.py --check     # 逐个文件校验 SHA-256
```

### 产物

| 路径 | 内容 |
|---|---|
| `data/releases/current.json` | 指向当前发布版本的指针 |
| `data/releases/<release_id>/manifest.json` | 清单：版本、规则版本、状态、每个文件的 SHA-256、覆盖声明 |
| `data/releases/<release_id>/index.json` | 分片索引：按 `scopeId`/类别/批次/招生类型定位文件 |
| `data/releases/<release_id>/offerings/*.json` | 专业分片，每片最多 2,500 条 |
| `data/releases/<release_id>/distributions.json` | 7 张一分一段表（含年份与口径标记） |
| `data/releases/<release_id>/evidence.json` | 证据索引规则与计数 |

本次：`SC-2026-e48a598a1832`，90 个分片、51,878 条专业、74 条覆盖声明、93 个文件、约 60 MB。

### 设计约束

- **不可变**：发布目录一次写入。内容不同时再次运行会失败而非覆盖，更正须产生新 release id。
- **可追溯**：每条历史记录的证据 id 为 `EV-<类型>-<主体id>-<年份>-<指标>`，可由分片内的 `groupId`/`offeringId` 逐条解析；清单记录每个文件的 SHA-256。
- **未知保持未知**：学费币种/周期未核实 → `tuition: null`（原值另存 `tuitionRaw`）；历史年份的科类定义未逐行给出 → `trackBasis` 显式标注，不声称与计划年同口径。
- **范围自述**：每个 scope 记录发布条数、是否穷尽，读者能看到覆盖了什么、没覆盖什么。
- **口径分离**：`scopeId` 含招生类型，特殊类型招生不会被当作普通类展示。

## 三、网页接入

| 文件 | 作用 |
|---|---|
| `apps/web/src/release-loader.ts` | 读取发布包、把分片转成匹配输入 |
| `apps/web/vite.config.ts` | 开发期只读提供 `data/releases`，路径规范化后校验，不能越出该目录 |
| `apps/web/src/model.ts` | `loadPublishedRelease` / `buildPublishedInput`；载入失败退回合成演示并显示原因 |

行为：

- 页面启动时载入发布指针与清单，横幅显示「已发布数据」及版本号；载入失败显示原因并继续可用合成数据。
- 匹配只加载学生自己类别与两个主要批次的分片。
- **参考年选择**：匹配要求位次表与历史记录同年。计划年为 2026（有计划无录取历史），因此参考年取「同时有分段表与历史记录」的最近年份（本发布为 2025）。无可用年份时明确报错，不混用年份。参考年还必须有一条 `status = VERIFIED` 的可比性记录，否则该年不会被选中。
- **跨年可比性**：只有 `comparability_link` 中已建立的年份才参与历史位置比较。未建立的年份（2024/2023 的理科/文科）在参考对象上返回 `NOT_COMPARABLE`，不降级为「可比」。
- **批次可选**：页面上学生自行勾选搜索批次（本科批B段 / 高职专科批），只加载所选批次的分片。
- 位次区间取官方分段表推导值，比较用区间下界。

批次选择带来的实际差异（物理类，本机实测）：

| 选择 | 分片数 | 流量 | 匹配耗时 |
|---|---:|---:|---:|
| 只选本科批B段（默认） | 17 | 23.4 MB | 817 ms |
| 本科批B段 + 高职专科批 | 22 | 33.5 MB | 1210 ms |

只选专科批约 11 MB。特别类型招生（提前批、专项计划、预科等，约 4,900 条）**不在页面提供**：其资格规则与普通批次不同，作为普通选项列出会误导可报考人群；这些数据仍在发布包内，可由 CLI 访问。

验证：`apps/web/test/release-integration.test.ts`（8 项）直接读取磁盘上的发布产物，检查清单与索引一致、分段表区间可推导、分片可转换为可比较候选、可比性记录完整、批次选择只加载所选范围且计数与覆盖声明一致。全部测试 15 个文件 195 项通过。

## 四、边界（不得省略）

- 位次是**官方分段区间**，不是个人精确名次。
- 历史年份的科类定义未在来源中逐行给出；跨年比较的 `comparability` 保持 `NOT_ESTABLISHED`，不自动等同。
- 本数据不构成录取概率、不构成报考建议，不输出「冲稳保」分档。
- 工作簿仍为用户提供的输入：本记录确认其内容已被核对，**不声称官方发布了工作簿本身**。
- 未完成：真实学生成绩工作簿验证（O-03）、真实模型费用核算（O-04）。

## 五、可重跑顺序

```powershell
py -3.12 pipelines/task03/fetch_score_distribution.py --verify-local
py -3.12 pipelines/task03/extract_score_distribution.py
py -3.12 pipelines/task03/validate_score_distribution.py
py -3.12 pipelines/task03/build_admissions_db.py
py -3.12 pipelines/task03/validate_admissions_db.py
py -3.12 pipelines/task03/crosscheck_workbook_ranks.py
py -3.12 pipelines/task03/record_verification.py
py -3.12 pipelines/task03/export_release.py
py -3.12 pipelines/task03/export_release.py --check
npm run validate
```
