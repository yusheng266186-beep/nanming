# 荣县一中质量慧析管线

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-13，2026-09-13-font-range-pending）：API版本10与Pages c0b2664已部署并核验；宋体与区间标尺新快照本机通过、待Pages发布。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：46 个测试文件、552 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：负责人进行实际页面验收；继续TASK-13身份生命周期与TASK-14学生规模、校园网和回滚演练。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

## 四班查询码最新规则（2026-09-12，本机已更新）

四班已匹配的48人改用身份证后六位，X替换成0；其他四班8人按负责人确认保留原码。查询仍核对姓名＋码，48旧码在新索引失效。通过私有摘要覆盖表更新认证，原数据库code6_sha256继续用于存储定位，不再等同于覆盖学生的当前登录码；既有CSV中的旧码为历史发放记录。重建后运行export_identity.py读取覆盖表，不得手工绕过覆盖。完整身份证不复制进工程。详情与验证见[四班查询码](CLASS4_QUERY_CODES.md)，本轮已部署API版本8。


本文件说明如何从学校复盘工作簿得到「成绩数据库 + 前端发布产物」，以及这条链路上每一处
不能放宽的规则。管线只解析、聚合并如实标注问题；它不预测录取，也不对学生做评价。

## 2026-09-12 章节版接口补齐（已部署）

实际 App 主入口已走姓名＋码核验；此次修复其后续仍请求本机静态汇总的问题。接口一次返回本人分片及 `{ exams, trend }` 匿名汇总，页面不再读取 `/data/quality-huixi/release/index.json`。导出脚本增加同密钥加密的汇总对象（HMAC 输入 `index.json`），本轮 880 本人密文与 1 汇总密文已生成，实际汇总解密回读一致；没有修改成绩数据库或换算公式。先上传新增密文，再部署 API 与 Pages，否则新接口会明确返回 503。学校身份生命周期、真实规模与回滚仍待验收。详见 [后端对齐](BACKEND_FRONTEND_ALIGNMENT.md)。

## 1. 数据来源与固定版本

| 对象 | 值 |
|---|---|
| 源工作簿 | `高2024级51质量复盘（新版）赋分3(1).xlsx`（用户提供，位于工程父目录，只读） |
| 解析器仓库 | `yusheng266186-beep/zhiliang-huixi-new-` |
| 解析器提交 | `6f70eab4e6e9ecadc00149b1387103b45b5d8e2b`（accuracy-v1.2） |
| 解析器代码位置 | 工程外 `../.nanhang-ref/zhiliang-huixi`（不进本工程索引与源码包） |

解析与统计**全部调用质量慧析自己的代码**（`app/lib/parser.ts`、`analytics.ts`、
`class-config.ts`、`report-model.ts`、`score-validation.ts`），本工程不重写解析规则。导出脚本
在启动时会核对参考仓库的 `HEAD`，不是该提交就拒绝运行。

工作簿含 33 张工作表，其中本次实际使用：

| 工作表 | 用途 |
|---|---|
| 学生基础 | 主成绩表：13 次考试 × 各科原分/赋分、市赋名、校赋名；表头在第 31–33 行 |
| 语文…政治等 9 张学科表 | 逐题得分与知识点；表头块从各次考试的「题号」行开始 |
| 学科有效、年级物理/历史、班级有效人、优生物/历 | 原始汇总页，未被管线采用（由解析器重算，见下文） |

## 2. 三步操作

```powershell
# 0) 一次性：把参考仓库取到工程外并固定提交
cd ..
git clone https://github.com/yusheng266186-beep/zhiliang-huixi-new- .nanhang-ref/zhiliang-huixi
cd .nanhang-ref/zhiliang-huixi && git checkout 6f70eab4e6e9ecadc00149b1387103b45b5d8e2b
npm install --no-save xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz tsx@4.23.12

# 1) 用固定解析器导出（在参考仓库内运行，让它用上自己的依赖）
cd ../南航
node --max-old-space-size=6144 --import tsx `
  nanhang-app/pipelines/quality-huixi/export_dataset.ts `
  "..\高2024级51质量复盘（新版）赋分3(1).xlsx" `
  nanhang-app/data/quality-huixi/dataset.json

# 2) 建库（含自检）→ 3) 出前端发布产物 → 4) 端到端核验
cd nanhang-app
py -3.12 pipelines/quality-huixi/build_quality_db.py
py -3.12 pipelines/quality-huixi/export_release.py
py -3.12 pipelines/quality-huixi/verify_release.py
```

首次建库会生成 `../private/keystore/quality-huixi-salt.txt`（32 字节随机盐）与
`../private/quality-huixi-codes.csv`（明文验证码）。**盐决定验证码，必须保留**：丢了盐可以重建
数据库，但学生手里的码会全部换掉。两个文件都在工程外，不随源码包分发。

## 3. 产物

| 路径 | 内容 | 是否进源码包 |
|---|---|---|
| `data/quality-huixi/dataset.json` | 解析器原始输出（约 8.9 MB，含姓名与本机路径） | 否 |
| `data/quality-huixi/quality-huixi.sqlite` | 本机成绩库（32 MB，23 张表 + 2 张视图） | 否 |
| `data/quality-huixi/release/` | 前端读取的发布产物（index + 880 份分片 + manifest） | 否 |
| `../private/quality-huixi-codes.csv` | 明码表，发给班主任 | 否 |
| `../private/keystore/quality-huixi-salt.txt` | 派生码用的盐 | 否 |
| `../private/verification/` | 本机浏览器核对脚本与截图 | 否 |

`nanhang-app/.gitignore` 与 `tools/sync_project_docs.py` 的 `UNMANAGED` 都把
`nanhang-app/data/quality-huixi/` 排除在外：源码包会被分发，学生成绩不属于交付物。

`private/` 位于工作区根目录（`南航/private/`），同样写进了 `UNMANAGED`，因此**不进文件索引、
不进哈希清单、不进源码包**。已实测核对：源码包 740 项中不含 `private/`、不含 `dataset.json`、
不含任何 `.sqlite`；`FILE_INDEX.md` 与 `MANIFEST.sha256` 也不含 `private/` 条目。
它留在工作区内是为了让学生手里的验证码在重建时保持不变（盐必须复用），但对外分发时不要带走它。

另有独立的姓名泄漏扫描（`private/verification/scan_name_leaks.py`）：把 870 个学生姓名逐一在
除发布产物与 `private/` 之外的**全部**工程文件里检索。当前结果：源码、文档、归档中 0 处命中。

## 4. 数据库结构

`quality-huixi.sqlite` 分四层，全部可由 `dataset.json` 重跑生成：

- **来源与质量**：`meta`、`source_document`、`data_profile`、`field_match`、`capability`、
  `data_issue`、`score_conflict(_candidate)`
- **事实层**：`exam`、`person`、`person_code`、`person_class_history`、`score_observation`、
  `subject_score`、`threshold(_subject)`、`question`
- **聚合层**：`exam_track_summary`、`class_summary`、`class_benchmark`、`class_subject_summary`、
  `subject_summary`、`score_segment`、`exam_distribution`、`knowledge_summary`、
  `knowledge_student`、`critical_student`、`trend_point`、`rank_check`
- **文本层**：`insight`、`recommendation`、`methodology`

视图：`v_person_exam`（含该场科类的分数线）、`v_person_subject`（含该场科类的双线）。

常用查询：

```powershell
# 数据健康度
py -3.12 -c "import sqlite3;c=sqlite3.connect('data/quality-huixi/quality-huixi.sqlite');print(c.execute('select * from data_profile').fetchall())"

# 某次考试的年级与班级概况
py -3.12 -c "import sqlite3;c=sqlite3.connect('data/quality-huixi/quality-huixi.sqlite');[print(r) for r in c.execute(\"select c.label,c.students,round(c.average,1),c.top_count,c.undergraduate_count from class_summary c join exam e on e.exam_pk=c.exam_pk where e.exam_code='51' order by c.class_no\")]"

# 位次口径差异（源校赋名 vs 重算）
py -3.12 -c "import sqlite3;c=sqlite3.connect('data/quality-huixi/quality-huixi.sqlite');[print(r) for r in c.execute(\"select e.exam_code,count(*),sum(abs(difference)<=2) from rank_check r join exam e on e.exam_pk=r.exam_pk where source_rank is not null group by e.exam_code order by e.ordinal\")]"
```

## 5. 身份规则（管线自己定，必须在页面上说清）

工作簿没有学号，只有「班级 + 姓名」。实际数据里 880 名学生的姓名有重复，因此：

- 一个人 = **(姓名, 科类, 选科组合)**，跨全部考试。这样 39 组同名但不同科类/组合的记录不会被
  错并成一个人（名单里确实存在同名学生在物理类与历史类各有一份记录的情况）。
- 16 班美术生在 41 与 4半 两次考试里以 `艺术` 组合单独出现，共 35 行。这些行会并入同名的唯一
  常规班学生，并在 `person.identity_note` 标注「含美术班（艺术组合）单次记录，已并入本人」。
- 8 名学生中途换过班。`person.class_no` 取最近一次常规班记录，`person_class_history` 保留每次
  考试的原始班号，页面按各次原始班号统计并在表格里标注。
- 因此 `person_key` 是本地标识（形如 `姓名|科类|选科组合`），**不是**可以跨年使用的稳定学号。
  真正的稳定 ID 属于 TASK-13 的范围。

## 6. 必须保留的口径与诚实标注

这些是本次核对中发现、并已写进数据库与页面的事实，不能被后续改动抹掉：

1. **位次重算，不用源列。** 工作簿「校赋名」列在不同考试中语义不同：`21`/`33`/`51` 是年级位次
   （51 物 433 条全部吻合），`4册`/`41`/`43`/`2册`/`3册`/`4半` 是班内位次（4册 405 条中 327 条吻合），
   `入口`/`1册`/`4月` 两者都不是。页面统一显示按赋分总分在同场同科类内重算的位次，
   `rank_check` 保留源位次与差值，`data_issue` 为 9 次不一致考试各记一条
   （`RANK_SOURCE_DISAGREEMENT`，共 5,633 条差异）。
2. **跨科类考试按该场科类算。** 美术班的 41/4半 记录在成绩表里属历史类，其位次池、分数线与
   班级均分都取历史类；页面在该行标注「按历史类」。科类不同的观察行在
   `score_observation.track` 单独保存，不写成学生的主科类。
3. **缺失不按 0。** 学科单元格状态为 `missing`/`absent`/`deferred`/`not-applicable`/
   `formula-error`/`invalid` 时 `value` 为 `NULL`，页面显示「—」。总分缺失或异常的行由解析器
   整行排除（本工作簿 0 行），不用部分科目求和重建。
4. **冲突保留来源。** 24 组「同考试同班同名」记录中，23 组成绩不一致判定为 `excluded`（保留
   两侧来源，不进统计），1 组完全一致判定为 `rank-only`（合并保留）。这些记录在
   `score_conflict` 与 `score_conflict_candidate`。
5. **知识点只算有来源满分的小题。** 无满分或知识点为空的题不参与得分率，也不补成满分；
   `knowledge_summary` 是解析器给出的全年级口径，`knowledge_student` 按同规则逐人重算，
   建库时两者逐条比对（689 组全等才通过）。页面上「最该先补的几块」的排序是
   **得分率升序 → 并列时丢分多的优先（`possible` 降序）→ 再并列时与年级差得多的优先**。
   第二级不能省：一次考试里并列 0% 很常见，若按分值升序排，表格会被一连串「0/3」的小题占满，
   真正丢分最多的「0/17」反而看不见（这是本次浏览器核对中发现并修掉的问题）。
6. **小题明细有两处无法归属。** 41 与 4册 共 169 条小题记录在成绩表里找不到对应的有效学生行
   （本人该次总分缺失、冲突被排除或该次未参加），记为 `ITEM_RESPONSE_UNLINKED`（8 条），
   不进小题库；不影响成绩、班级与学科分析。

## 7. 前端发布产物

```
data/quality-huixi/release/
  manifest.json          发布身份、解析器提交、逐文件 SHA-256、分片命名规则、验证码强度警告
  index.json             全体共享的匿名汇总：考试、分数线、班级/年级聚合、知识点、数据健康度
  shards/<40位十六进制>.json   一名学生一份，文件名 = sha256(6位验证码)[:40]
```

当前主页面流程：姓名与六位码 POST 到服务端 → 校验私有映射并限流 → 只返回本人分片。分片的哈希文件名仍是内部存储格式，不再是浏览器权限机制。
分片只含该生自己的成绩行 + 班级/年级匿名汇总。**同一场考试里所有学生的班级临界生名单留在数据库，
不进发布包。**

发布包里没有任何全体姓名：`index.json` 的问题描述与 `raw_value` 里的姓名被掩码成「曹＊＊」，
冲突记录只保留条数与处理方式。位次字段同时给出重算值与源值，并附
`sourceRankNote` 说明源列语义不一致。

## 8. 当前主前端接入（ADR-003）

主前端在五步旅程的成绩入口使用姓名＋验证码；纸感备选没有接入学校识别。旧前端哈希取静态文件的示例不再作为新接入指引。

在工程目录生成私有映射：

```powershell
py -3.12 pipelines/quality-huixi/export_identity.py
```

产物 `../private/quality-identity.json` 只包含姓名标准化值与验证码哈希组合的摘要到分片文件名的映射，880 条，不进索引/源码包。每次重建成绩库或更换验证码后，必须重新导出并复验。

客户端 POST `/v1/school/identify`，JSON 仅为 `name` 与 `code`。服务端响应只有本人 `shard`，不提供姓名搜索或全班名单；错名与错码同样拒绝。选科和源记录不符时页面要求返回核对，同科类的最近考试才用于区间估算。

生产环境必须显式配置 `NANHANG_QUALITY_IDENTITY_FILE` 和 `NANHANG_QUALITY_RELEASE_DIR` 指向服务端私有文件，否则返回 503；本机开发按模块路径定位现有私有数据。当前限流单姓名 5 次/15 分钟、单 IP 120 次/15 分钟，为单进程实现；正式共享限流与身份生命周期待完成。

Vite 已移除学校成绩静态目录挂载，只保留公开招生数据。不要将学校分片与公开招生数据一起上传 COS/Pages。本轮真实本地接口抽验一人成功且未打印隐私，见 [核验记录](verification/school-local-result.json)。


## 9. 已知限制

- **6 位验证码不是安全边界。** 100 万种组合可离线穷举；谁能读到发布目录，谁就能拿到全部分片。
负责人 2026-09-12 决定采用「云端托管」方案（方案 B），因此这条风险不是靠加强验证码来消，而是靠三道闸：

1. **云端只有密文。** `scripts/export_school_cloud.mjs` 把 880 份分片用 AES-256-GCM 加密后再上传，
   对象名是 `HMAC(密钥, 分片名)[:40]`——文件名里不再含 `sha256(验证码)`，所以「穷举验证码」这条路
   在对象存储这一侧完全失效：拿到清单也只是一堆随机名 + 密文。密钥在 `private/school-cloud-key.txt`，
   只进函数环境变量（`NANHANG_SCHOOL_KEY`），存储侧泄露读不出姓名与成绩。
2. **服务端校验 + 共享限流。** 学生只经 `POST /v1/school/identify`（姓名 + 验证码），
   服务端查身份索引后只返回本人分片；限流用 Redis 共享计数（同一姓名 5 次 / 同一 IP 120 次，15 分钟窗），
   多实例下也生效——这是「离线穷举」在接口这一侧的成本来源。
3. **取分片优先走云端。** 配了 `NANHANG_SCHOOL_CLOUD_BASE` + `NANHANG_SCHOOL_KEY` 就不再读本地目录；
   云端取不到就是 401，绝不悄悄回落到本地明文（有测试盯着这条）。

仍然要记住：验证码弱这件事没有消失，只是不再是唯一门槛。谁同时拿到**密钥**和**一个学生的姓名**，
仍然可以取到那个学生的分片；密钥轮换 = 重新导出（`export_school_cloud.mjs`，会生成新密钥前先删旧的）
+ 重新上传 + 更新函数环境变量。

运维事实：身份索引（`private/quality-identity.json`，只有「姓名+验证码」的摘要，不含明文）
随函数代码包一起发布（`scripts/build_function.mjs` 自动附带）；分片密文在 COS 的 `school/objects/`。

**两条通道并存（2026-09-12 负责人裁定主入口切回七章旧前端之后）**：

| 通道 | 取数方式 | 可用范围 |
|---|---|---|
| 七章旧前端（当前主入口） | 只读挂载 `/data/quality-huixi`，按 `sha256(验证码)[:40]` 取分片 | **仅校内/本机演示**；线上 Pages 没有这个目录，增强模式在线上不可用 |
| 旅程壳（`JourneyApp`，流程参考） | `POST /v1/school/identify` → 函数取 COS 密文解密后只回本人分片 | 校内与线上都可用 |

不要把旧前端的 `VITE_NANHANG_QUALITY_BASE` 指到公开发布目录——那等于把明文分片放到公网上，
密文托管和限流就都白做了。线上要给学生用的那条路，只有服务端识别这一条。
  `MAX_CODE_ATTEMPTS = 5` 只挡误触。增强模式当前仅限本机/校内演示，正式上线必须改成服务端
  校验 + 限流 + 访问审计，并考虑把分片换成不可枚举的随机标识。
- **发布包仍是可枚举的静态文件。** 即使改为服务端校验，也应把分片命名从码摘要换成独立随机 ID，
  否则仍可离线枚举名称并下载。
- **位次是校内位次。** 它与省位次不是一回事，页面不得把它换算成录取概率。
- **真实学生试用未发生。** 学生是否理解「校内位次 ≠ 录取可能」没有观察证据。
- 双线完整度为 75%、学科完整度 84.7%：43 历史类缺本科线，入口/1册/4月 缺双线，逐条见
  `data_issue`。

## 10. 与工程其余部分的关系

- 管线放在 `pipelines/quality-huixi/`，与 `pipelines/task03/`（招生数据）平行，互不读写对方产物。
- 前端读取层是 `apps/web/src/quality-huixi.ts` + `quality-types.ts`，页面在 `App.tsx` 的
  `renderQuality`（第三章「成绩」）；纸感版（`apps/web-paper`）尚未接入，接口见第 8 节。
- 开发服务器中间件 `qualityData()` 只暴露 `data/quality-huixi`，做了路径越界复检。
- 测试：`apps/web/test/quality-huixi.test.ts`（19 项，读真实发布产物）与
  `quality-presentation.test.ts`（10 项，静态表现约定）。
- 验证脚本：`py -3.12 pipelines/quality-huixi/verify_release.py`（抽检 40 份分片，核对哈希、
  姓名隔离、位次范围、线差减法、知识点得分率）。
