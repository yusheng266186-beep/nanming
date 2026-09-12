# 南溟数据与匹配规格

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-12，2026-09-12-acceptance-cloud-snapshot）：负责人授权当前全部半成品快照上云验收；Pages发布进行中，腾讯云API部署待恢复登录凭据。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：36 个测试文件、454 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：完成当前快照Pages/API发布并核验线上链路，供负责人实际验收；未完成门禁仍如实保留。完整进度及操作见[项目进度](../nanhang-app/docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

版本：1.0.0｜规则集：nh-rules-1.0.0｜日期：2026-09-09

本规格定义首版可实现的确定性规则，所有数值示例除另注明外均为合成数据。不存在已经训练完成的高考预测模型。JSON结构见contracts/，验收案例见fixtures/。

## 1. 核心裁决

- 第一个上线版本不做模考到高考的统计预测，calibration.enabled=false。
- 一分一段仅在相同年份、省份、类别、计分口径下定位。只给分数时输出位次区间，不制造精确个人位次。
- 跨年同百分位仅作为用户明确选择的历史情景，首版默认关闭；不称为等效分预测。
- 不建立“冲稳保概率公式”。首版只计算与历史参照的区间关系，标签由产品规格限定。
- 专业组录取最低分、专业组投档线、专业录取最低分分成不同记录类型。
- 不为凑齐院校数补造记录。数据缺失也是有效输出。

## 2. 数据模型与键

原始数据留在离线工作区；公共发布为不可变、分片JSON。SQLite用于离线整理和关联检查，不把服务器临时文件当数据库。字段使用snake_case；单位和口径必须显式。

| 实体 | 主键/关键字段 | 约束 |
|---|---|---|
| source_document | source_id、url、publisher、retrieved_at、content_sha256、access_status | 同URL变化产生新快照；发现入口不等于核实数据 |
| evidence | evidence_id、source_id、locator、fact_type、review_status | locator支持PDF页码/bbox、图片序号/bbox、网页段落或表格单元格 |
| institution | institution_id、canonical_name | 名称与学校编码作为年度别名，不用名称当永久主键 |
| major_catalog | catalog_id、catalog_year、catalog_code、level | 普通本科、职业本科、高职目录分开；校内招生代码不混用 |
| admission_group | group_id、year、province、track、batch、stage、admission_type、institution_id、group_code | 院校专业组每年独立；无组业务不以空字符串强行关联 |
| offering | offering_id、group_id、major_name、admission_major_code、catalog_refs、campus、degree_level | 大类可关联多个专业；专业名同名不代表培养项目相同 |
| plan_record | plan_id、offering_id、plan_count、tuition、study_years、requirements、evidence_ids | 招生数为非负整数或null；0与未知不同；学费必须有币种和计费周期 |
| requirement | requirement_id、scope、kind、expression、effective_year、evidence_ids | 原始文本和结构化规则并存；无法转成规则时标needs_review |
| admission_observation | observation_id、subject_type、subject_id、year、track、batch、stage、admission_type、metric_type、score、score_basis、rank_interval、evidence_ids | 投档/录取、最低/均值/最高分不能互换 |
| score_distribution | distribution_id、year、province、track、score_basis、coverage、rows | 每行score、count、cumulative；记录顶部合并段和尾部省略 |
| control_line | line_id、year、province、track、line_type、score、evidence_ids | 特控线不别名成普通一本批次线；模拟线属于考试档案 |
| comparability_link | link_id、from_id、to_id、status、changed_fields、reviewer、evidence_ids | 不按代码自动通过跨年比较；算法建议不等于人工核实 |
| release | release_id、created_at、schema_version、rules_version、files、coverage、evidence_index | 已发布版本不可原地修改；每个分片记录SHA256 |

批次stage必须单独存储，如B段；录取轮次保存first/collection等，征集不混入首次记录。institution/group/offering用内部不透明ID；导入唯一键含来源、年度和原始行标识，以支持幂等重导入。

observation.metric_type固定为group_filing_min、group_admission_min、major_admission_min、major_admission_mean、major_admission_max、institution_admission_min。只有与请求证据粒度对应的最低值能进入相应历史边界比较，其余仅作信息展示。

## 3. 证据和发布

状态流程：RAW→NORMALIZED→VALIDATED→VERIFIED→PUBLISHED。冲突走QUARANTINED，更正后旧记录SUPERSEDED；撤回发布不删除审计历史。

VERIFIED条件：来源可识别、定位能复核、字段与原文一致、关联校验通过、必要脚注已应用、没有未解决的关键冲突。单个模型自报“已核实”不满足条件。初始试用样本的关键字段逐条核对；扩容后再按版式和风险制定抽样计划，但已知异常始终逐项处理。

正式结果仅使用PUBLISHED。每条发布事实必须能解析全部evidence_ids；缺证据、断引用、重复逻辑键、负招生数、违反已核实选科规则的组内记录阻止发布。

已发布不等于可比较：还需验证年度、范围、数据粒度、口径、跨年关系。来源可信程度不计算成录取概率。

## 4. Excel 优先的数据导入路线（2026-09-10 更新）

用户已将项目目录更名为“南溟”，招生资料输入改为根目录两份 Excel。主处理路径为工作簿结构与单元格解析，不再要求 PDF、OCR 或官方图逐页识别才能继续开发。Excel 作为当前主输入不等于其制作方、年度口径与完整性已经独立核实。

1. 原工作簿只读保存，登记相对路径、SHA-256、字节数、工作表名称、隐藏状态、表头和公式/合并区域。
2. 按 workbook.xml 与关系表解析实际工作表，按表头语义映射字段；物理表缺“科类”表头，使用明确配置的工作表映射并留警告，不凭文件名猜值。
3. 保留单元格地址、原值、类型、格式、公式与合并锚点；代码按文本保留前导零，0 与空值分开。公式不执行，缓存值只作证据；Excel 错误与带单位未解析值保留未知。
4. 仅允许明确合并区域的锚点继承，不因空格就跨院校、批次、专业组前向填充。重复逻辑键保留并列入核实队列。
5. 计划年和历史年分别依据已登记的表头映射：26→2026、25→2025、24→2024、23→2023。文件名中的“22—25”不是存在2022数据的证据。
6. 组录取最低、专业最低/平均/最高分别建记录。不能把“25专业组最低分”转为投档最低，也不能把当前计划的物理/历史类别、批次或专业组身份回填给旧年记录。
7. 输出带工作簿哈希、工作表、行和逐字段单元格定位的非发布样本；记录覆盖、未知和核实状态。需要补证据时针对具体字段找官方页面，图片/OCR 仅作为可选补充。

当前可重跑入口为工程 `pipelines/task03/extract_workbook_samples.py`；样本位于 `data/task03/workbooks/workbook-samples.json`。只读扫描两表52,878条专业行，生成36条开发样本；扫描行数不是去重后的完整招生覆盖数。没有读取到配置工作表中的一分一段表，分段数据仍是独立缺口。

原 `data/task03/structured-samples.json` 的17条官方图/OCR样本及原始快照作为历史回归证据保留，其待人工核实状态不变。新 Excel 样本也不满足正式 PUBLISHED 入口；该迁移不改变证据、位次、资格和公开发布规则。

## 5. 成绩输入的业务校验

机器结构由student-profile.schema.json约束，以下是必须额外实现的语义校验：

- 首选为PHYSICS/HISTORY，再选正好两门且不重复，来自CHEMISTRY/BIOLOGY/POLITICS/GEOGRAPHY。
- school_exam/mock的rank.scope不得伪装为province_gaokao；目标分没有发生日期和真实位次。
- 考试日期未知允许null，不能把“51”等考试标签解读为日期。无日期时趋势按来源顺序显示并标注，不能默认时间排序可靠。
- effective total必须来自明确源总分；缺失或重建总分不可进入招生定位。单科缺失不自动否定明确有效源总分，但显示不完整。
- 真实高考总分按对应年度规则验证；文化分、含加分投档分分别记录。无法确认加分与表口径一致时停止位次比较。
- rank必须为正整数，已知population时不得超过它；相同学校的校排名与联考排名不可互换。
- school/class/name仅用于来源侧人工关联，学生档案必须获得稳定subject_id；同名、转班等无法确认时停止跨考合并。
- 模拟线需要exam_id、track、source与scope一致，否则仅展示原值、不计算达线差。

## 6. 一分一段定位算法

目标情景单独使用contracts/target-scenario.schema.json，不放入真实observations。必要字段为scenario_id、target_exam_year、reference_year、province、track、target_score、score_basis和release_id。首版只接受整数目标分；小数或越界值拒绝，原始学校考试可以按其满分口径保留小数。首版不实现加分情景，涉及加分的真实成绩必须先确认表与分数口径。

对同口径的精确分数s，定义count(s)为该分数人数，cumulative(s)为大于等于该分数的人数。

当count(s)>0且该行是精确单分段：

    rank_best = cumulative(s) - count(s) + 1
    rank_worst = cumulative(s)

使用闭区间[rank_best,rank_worst]，排名数字越小位置越好。例：合成行score=500、count=100、cumulative=1000，输出[901,1000]。

若官方个人位次由用户提供，保留其来源可信状态；可与表校验，冲突时提示核对，不静默替换。没有同分排序所需信息时不推算个人位次。

特殊情况：

- 该分数count=0：目标情景输出NO_OBSERVED_SCORE；首版不插值成个人位次，可显示相邻有记录分数供用户选择。
- 顶部合并段如“某分及以上”：按aggregate_bin区间处理，仅展示合并段范围，不宣称单分精确。
- 低于表公布范围：OUT_OF_DISTRIBUTION_COVERAGE，不外推。
- 不完整累计列、人数不守恒：数据不能发布；明确省略的尾部不强行补零。
- 表的最后累计人数若不包含省略尾部，不作为全体考生population。

## 7. 校准与跨年

### 7.1 首版校准裁决

school_exam/mock默认academic_basis=school_context，comparison=NOT_COMPARABLE。学生可另建target_scenario，两个对象并列，不能用目标情景覆盖真实考试。

后续若提出校准模型，必须提供：合法可用的样本来源、考试日期及范围、特征口径、目标变量、训练/验证分割、跨届或时序留出、误差与区间覆盖、适用人群、漂移检查、禁用条件。身份关联和统计样本缺失时，不接受模型给出的虚构参数。

### 7.2 跨年百分位情景（预留，默认关闭）

仅在两年同类别population口径明确、真实完整且没有制度断裂时，允许显示辅助情景：

    percentile_interval = [rank_best / N_source, rank_worst / N_source]
    mapped_rank_interval = [max(1, floor(p_low*N_target)), min(N_target, ceil(p_high*N_target))]

该定义只是经验位置映射，不能证明各年竞争难度相同。保留向外覆盖的取整规则与使用人口口径；若映射边界因取整倒置，拒绝计算并修正规则。首版不输出据此得到的“录取分数预测”。

专业组可比性与省位次映射是两道独立门槛；百分位可算不代表重组专业组可比。

## 8. 资格规则

规则结构使用受限表达式，不执行动态代码。elective表达式为all_of或any_of；原文需要多层AND/OR时用受限嵌套树。UNKNOWN不能当false或true偷偷合并。

三值合并：任一已确定硬条件FAIL→FAIL；没有FAIL但存在UNKNOWN→UNKNOWN；全部适用硬条件通过→PASS。未支持的招生类型输出UNSUPPORTED_SCOPE，不参与通用排序。

资格检查范围包括：年度/省份/类别、完整选科、当前发布范围，以及该项目明确要求的语种、单科或其他条件。用户预算与地区硬偏好另存preference_constraints，不能冒充官方资格。

只核对了选科时，用“已满足选科要求，其他条件待核对”；不能输出全方位可报保证。首版不要求收集无关健康详情；遇到体检条件可让学生对官方限制自行确认，未知就留UNKNOWN。

## 9. 历史边界比较算法

前置条件：有效成绩基础、可用同口径位次区间、匹配证据粒度、适用范围正确、无关键冲突；跨年还需有效comparability_link。缺任一条件返回NOT_COMPARABLE及原因代码。

候选位次区间C=[c_low,c_high]，历史最低线对应区间H=[h_low,h_high]：

    if c_high < h_low: relation = AHEAD_OF_REFERENCE
    else if c_low > h_high: relation = BEHIND_REFERENCE
    else: relation = OVERLAPS_REFERENCE

相等或接触边界归OVERLAPS_REFERENCE。历史最低线只给分数时，先查该年表得到同分范围；不能假定历史最低录取者就是该分最后一名。

没有专业数据时：group_relation可有值，major_relation=NOT_COMPARABLE。group_admission_min与group_filing_min必须保留不同标题，不混合取最小值。

多年度记录逐年展示关系，不平均、不自动取最有利年份；冲突或变化年份不参与合成结论。计划增减只显示变化，不用“增加20%名额=放宽20%位次”之类公式修正。

## 10. 排序与候选生成

1. 选择发布范围和有效候选。
2. 检查资格，FAIL放入可解释排除区，UNKNOWN单列，UNSUPPORTED_SCOPE不参与普通列表。
3. 应用用户明确设置的硬偏好；未知费用遇硬预算进入待确认，不当作免费。
4. 匹配学生已确认的方向标签。专业内容映射来自维护的tag映射表；AI可以建议，不能修改已发布映射。
5. 结果按“资格分区→用户手工优先方向→用户所选排序→稳定offering_id”排序。

默认用户排序为方向相关优先；不计算无依据的综合适配百分比。只有可比较且同口径的数据才能按历史位置差排序，缺失项置于该分区末尾。搜索无结果时建议用户修改一个条件，不擅自放宽硬条件。

## 11. 输出与原因代码

MatchResult包含run_id、input_revision、release_id、rules_version、mode、academic_basis、coverage、candidates、excluded_summary、warnings。

Candidate包含offering_id、eligibility{status,checked_requirements,pending_requirements,reason_codes}、group_reference、major_reference、interest_reason_refs、preference_status、evidence_ids。参考对象包含relation、source_year、metric_type、candidate_rank_interval、reference_rank_interval；缺失时relation=NOT_COMPARABLE且区间为null。

固定原因代码至少为：INCOMPLETE_SUBJECTS、SUBJECT_REQUIREMENT_FAILED、UNKNOWN_REQUIREMENT、UNSUPPORTED_SCOPE、SCHOOL_SCORE_UNCALIBRATED、TOTAL_NOT_SOURCE、UNKNOWN_SCORE_BASIS、BONUS_BASIS_MISMATCH、RANK_CONFLICT、NO_OBSERVED_SCORE、OUT_OF_DISTRIBUTION_COVERAGE、MAJOR_HISTORY_MISSING、GROUP_HISTORY_MISSING、GROUP_CHANGED、SOURCE_CONFLICT、TARGET_YEAR_PLAN_MISSING、DATASET_WITHDRAWN、TUITION_UNKNOWN、HARD_PREFERENCE_EXCLUDED。

## 12. 版本、更正与回测

- release_id不复用；原始来源快照与更正链保留。
- 发布顺序：生成不可变数据包→关联/结构/隐私检查→样本核实→写manifest→原子更新current指针。
- 用户一次计算锁定一个release_id，不能混用更新前后分片。
- 撤回版本可用于审计历史，但新请求返回DATASET_WITHDRAWN。前端读取当前撤回清单；离线只能显示缓存时明确“截至上次同步”，不假装已知最新状态。
- 回测固定历史时点可见的数据；未来结果只用于评估，不可当作输入。计算边界测试与录取预测有效性验证分别记录。
- 本包只有合成验收案例和少量已核实来源条目，不含可供正式推荐的招生数据库。
