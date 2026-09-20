# 当前验证结果

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-20，2026-09-20-unified-ui-polish-deployed-85）：主前端六章体验统一已合并并发布到 GitHub Pages：触屏潮汐、连续抽屉、紧凑清单与定位、北辰式设置已上线；线上 index、JS、CSS 与 Pages 产物逐字节一致；视觉验收仍由负责人执行。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：54 个测试文件、592 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：负责人直接在线验收桌面/手机画框、抽屉、清单、定位和设置，不满意处继续迭代；前端已合并部署。后续若招生库或官方学费目录继续更新，应先重建/验证南航规范化招生库，再运行 pipelines/task03/merge_admissions_databases.py 重新生成统一库，不能只替换其中一侧。118 个 institution 实体行仍没有可直接入库的官方明确 CNY/学年金额，继续保持未知；同时按全项目审阅修 P1 与状态生命周期，TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

## 本次实测：前端体验统一已上线（2026-09-20）

- PR [#1](https://github.com/yusheng266186-beep/nanming/pull/1) 已合并，merge commit `b625dc2fe4889b1077d5eec092419e6717a9d83e`。
- Pages 工作流 [35513184905](https://github.com/yusheng266186-beep/nanming/actions/runs/35513184905) 的 build 与 deploy 均成功；线上地址 <https://yusheng266186-beep.github.io/nanming/>。
- 本次工作流产物与线上 `index.html`、JS、CSS 逐字节一致，三个文件 HTTP 200；SHA-256 和字节数见 [部署证据](verification/ui-polish-deploy-2026-09-20.json)。未进行视觉验收。
- CI 测试步骤为非阻断项，本次公开检出结果是 559 通过、30 跳过、3 失败：私有学校分片缺失 1 项，冻结来源哈希不一致 2 项；构建和发布步骤独立成功。本机完整工作区的 54 文件 592 项通过记录仍是本轮代码验证基线。

## 本次实测：前端体验统一（2026-09-20，unified-ui-polish-2）

- 完整原工作区实测 `npm --workspace @nanhang/web run typecheck` 通过；`npm test -- --run` **54 文件 592 项通过，0 失败**；`npm --workspace @nanhang/web run build` 通过，72 modules，CSS 99.92 kB / gzip 19.98 kB、JS 348.45 kB / gzip 113.42 kB。
- `node scripts/check-ui-polish.mjs docs/verification/ui-polish-dom-2026-09-20.json`：23 项通过。合成 DOM 覆盖抽屉中间帧/关闭保留/快速反向/无滚动跳动/sticky，动效开关和系统偏好即时更新，以及 320/390/768/1280 宽度横向溢出、40px 开关触控高度与桌面清单并排。
- [脱敏验证汇总](verification/ui-polish-2026-09-20.json)；[DOM 细项](verification/ui-polish-dom-2026-09-20.json)。原工作区中既有私有学校夹具仅用于原有自动测试，不复制至分支或分发包；公开 CI 缺少这些夹具时不能冒充完整本机测试。
- 本轮未做浏览器视觉、真机、真实 AI/学校服务或线上验收；未合并主分支、未部署。以下均为历史记录，不代表本轮验收。


## 本次实测：Pages 上线与本轮前端修复的线上手机档验收（2026-09-20）

- 提交 `8245b5a` 已推送（`f5ee66a..8245b5a`），工作流 `Deploy 南溟学生端` 运行 `35486087777` **success**（55 秒）；线上产物换版为 `index-B_BdHKrK.js` / `index-DMctSkdn.css`，新 bundle 内已含本轮修复标记。
- 手机档（390×844 / DPR 3 / 触摸，Chrome 设备仿真跑线上 Pages）：无调试角标、谈心室不预填演示码；探索区间 `616–616`；底部导航进谈心正常；当前 TOTP 兑换后「已连接」；输入框下的小字已消失；低语按秒变化；**真模型返回 77 字正文 + 4 个可点选项**；控制台与网络异常 `0`。
- 通路核对：仓库变量 `NANHANG_API_BASE` / `NANHANG_RELEASE_BASE` 只读核对正确且与新 bundle 内联值一致；云函数对 Pages 来源预检 `204`；`/readyz` 为 `upstream:"qianfan"`；COS `current.json` 为 `200`。
- 本机侧：`npm run validate` = 51 文件 568 项通过、0 失败；`--package` 与 `--check` 均 passed。
- 边界：本轮为设备仿真而非真机；云端 `store=memory`（Redis 冻结档），冷启动或换实例会要求重新输入动态码；未改云函数与云端环境变量。CI 中 `quality-huixi.test.ts` 因依赖本机 `private/` 产物而 ENOENT，该步骤 `continue-on-error: true`，不拦上传。

## 本次实测：南航招生库与外部四川招生库统一合并（2026-09-20）

- 新库：`nanhang-app/data/admissions/admissions_merged.sqlite`；生成清单：`nanhang-app/data/admissions/merged-manifest.json`。原始 `admissions.sqlite` 与外部 `.db.gz` 均未覆盖。
- 51,878 条记录按来源文件/工作表/Excel行号全部匹配，2,308 所院校简介全部匹配，`merge_conflict=0`。
- 新库保留官方学费 `8,887` 条、211/985/双一流等院校标签、原始单元格 `3,207,195` 个、教育部高校名录 `2,952` 条、院校简介 `2,308` 条；合并视图 `v_merged_admission` 有 51,878 行，`v_merged_institution` 有 2,308 行。
- 独立验证：`validate_admissions_db.py` 为 `66,399/66,399`；TASK-03 Python 测试 `65/65`；`integrity_check=ok`；外键违规 0；统一库 SHA-256：`c187c1d3881c5d055e93ad21897a679622afea6bbcd97444a6297e9e62d00d3b`。
- 查询脚本在统一库存在时默认读取 `admissions_merged.sqlite`；本轮未部署、未推送、未做浏览器视觉验收。

## 本次实测：合并库院校详细档案批量补充（2026-09-20）

- 先批量生成全量中间文件，再一次性写入数据库：`university_detail=2,308`、`university_detail_source=6,918`、`v_university_detail=2,308`；平均简介 `915.46` 字，范围 `760–2,126` 字。
- 官方来源 URL 共 `4,610` 条，域名仅为 `www.moe.gov.cn` 与 `gaokao.chsi.com.cn`；教育部名录/阳光高考入口匹配状态保留在 `detail_status`，未知字段未猜测填充。
- `py -3.12 -X utf8 nanhang-app/pipelines/task03/enrich_university_details.py --build-batch` 生成批次；批次 SHA-256：`7cb4782ff6c6708d2a5e94379d0a18ea340afe1663aaf1e7cb5863a8509f86ba`。
- 最终 `validate_admissions_db.py`：`66,399/66,399` 通过；TASK-03 Python 测试：`68/68` 通过；`integrity_check=ok`；外键违规 `0`；统一库 SHA-256：`d4e8167a8109bf8ee2a34f28268c62e41ab021cf9bf15f180a20bb557e02bb17`。
- 新增查询：`py -3.12 pipelines/task03/query_admissions.py --institution-detail 0001 --format json`。未部署、未推送、未更新线上发布包、未做浏览器视觉验收。

## 本次实测：剩余官方学费队列全部核查后一次性重建（2026-09-20）

- 官方检索先于构建完成：118 所队列院校逐校记录在 `pipelines/task03/official_tuition_research_log.json`；仅 4 所新增官方目录条目写入费用配置，香港两校的港币金额未换算或强行匹配。
- `py -3.12 -X utf8 nanhang-app/pipelines/task03/build_admissions_db.py`：本轮唯一一次数据库重建通过；2,308 所院校、51,878 条招生计划，SQLite `integrity_check=ok`；官方目录 2,190 所/8,887 条费用证据，`offering_matches=2,029`。
- `py -3.12 -X utf8 nanhang-app/pipelines/task03/validate_admissions_db.py`：66,399/66,399 项检查通过，0 失败；未核验 118 个 institution 实体行继续保持未知。
- `py -3.12 -X utf8 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：59/59 通过（核心数据库测试 54/54）；`py_compile` 通过。重建之后只修复验证器旧白名单误报并重跑验证，没有再次构建数据库。
- 数据库 SHA-256：`94d286a8942695b2a71e58bc6bc3e8822db5eefb96fe67def2c0bb5def314a52`；本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 本次实测：官方学费证据继续补录第七十九批（2026-09-19）

- 本轮完成辽宁剩余 4 所院校、4 条官方费用引用；官方目录覆盖 `2,053/2,308` 所院校、`official_fee_reference=8,251`，`offering_matches=1,470`，机构级未核验 255 行，辽宁队列已清零。来源仅为教育部阳光高考平台 2026 年章程/计划和阜新高专官网 2026 年章程，专业与批次边界按原文保留。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：`status=passed`，2,308 所院校、51,878 条招生计划，SQLite `integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：62,923/62,923 项检查通过，0 失败；TASK-03 Python 测试：59/59 通过（核心数据库测试 54/54）；`py_compile` 通过。
- 原始配置 SHA-256：`8AB06C9A6FA51C82A9FED9B7EC58CB0E42145209456440950B10AFACF9DA4B44`；规范化官方学费配置 SHA-256：`76875161bd9f740ed38e80aa34e056c1a8499fc7c49d6fb3311c1e222169eb67`；数据库 SHA-256：`ad22bbbf69c61ce16a00f6e7f32c3a90e1a88159a47df73e9a3de87f8bb2b511`。
- 本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 本次实测：官方学费证据继续补录第七十八批（2026-09-19）

- 本轮新增辽宁 10 所院校、24 条官方费用引用；官方目录覆盖 `2,049/2,308` 所院校、`official_fee_reference=8,247`，`offering_matches=1,470`，机构级未核验 259 行。来源仅为教育部阳光高考平台 2026 年审核章程或征集志愿计划；暂定/待定、批次和专业边界按原文保留。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：`status=passed`，2,308 所院校、51,878 条招生计划，SQLite `integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：62,899/62,899 项检查通过，0 失败；TASK-03 Python 测试：59/59 通过（核心数据库测试 54/54）；`py_compile` 通过。
- 原始配置 SHA-256：`157741D026754CD1ADE9CDA70ED6E149B557FB76D42AB4404B58CFA210D620F5`；规范化官方学费配置 SHA-256：`f2966ca0f54a1cb070d21e6353413e14a11410d81265fd215d7d6bd25e9f6cc0`；数据库 SHA-256：`3b64ad0ec97ff4f3844cc86f97b757172a5d93e2e7f6221accf95d5d06a1e392`。
- 本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 本次实测：官方学费证据继续补录第七十七批（2026-09-19）

- 本轮新增辽宁 4 所院校、10 条官方费用引用；官方目录覆盖 `2,030/2,308` 所院校、`official_fee_reference=8,152`，`offering_matches=1,432`，机构级未核验 278 行。辽阳职业技术学院 4 个章程标注“暂定”的专业保留原文边界，最终金额以辽阳市发展和改革委员会文件为准；辽宁石化职业技术学院金额限定在单独招生方案范围内。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：`status=passed`，2,308 所院校、51,878 条招生计划，SQLite `integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：62,398/62,398 项检查通过，0 失败；`py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test*.py'`：59/59 通过（核心数据库测试 54/54）；`py_compile` 通过。
- 原始配置 SHA-256：`1E2C194D70EFFC746B3C86C623FD71729FA3012149C0D85223BF404A73092CE`；规范化官方学费配置 SHA-256：`877b54966b1e23ea206d477017ea9ba0895aeaf206eb4e9bb6e41cc01300b225`；数据库 SHA-256：`5EA5778344B78AD495DE4620571D3E15D92A8991DAF7ED5000E830635288F201`。
- 官方来源为学校官网/招生网：[辽宁地质工程职业学院](https://www.lngc.edu.cn/zzxxw/info/1027/1323.htm)、[辽阳职业技术学院](https://www.419.com.cn/info/1009/7653.htm)、[辽宁农业职业技术学院](https://zsw.lnnzy.ln.cn/index/index/article/20074.html)、[辽宁石化职业技术学院](https://www.lnpc.edu.cn/zs/2026/0311/c331a47397/page.htm)；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 本次实测：官方学费证据继续补录第七十六批（2026-09-19）

- 本轮新增辽宁 4 所院校、15 条官方费用引用；官方目录覆盖 `2,026/2,308` 所院校、`official_fee_reference=8,142`，`offering_matches=1,432`，机构级未核验 282 行。辽东学院的定向临床医学项目按章程“免费”记录为 0，并保留项目适用边界。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：`status=passed`，2,308 所院校、51,878 条招生计划，SQLite `integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：62,344/62,344 项检查通过，0 失败；`py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test*.py'`：59/59 通过（核心数据库测试 54/54）；`py_compile` 通过。
- 原始配置 SHA-256：`6F19A16DEF11A79CAF798C22C0DBB324090BED82FB9A280C37E3486E5A6EE8B6`；规范化官方学费配置 SHA-256：`99254A75D996585484F3911B519BA8B3D26D9411369DE8437D5D802EE2F1332A`；数据库 SHA-256：`04AC16AC8072A4962315B93957A027E9F9608B62B69D8307995D06741A4531DA`。
- 官方来源为省级阳光高考平台和学校官网/招生网：[辽东学院](https://11779.gaokao.haedu.cn/policy/brochure/2026/0623/153625.html)、[营口理工学院](https://14435.gaokao.haedu.cn/policy/brochure/2026/0623/153671.html)、[沈阳科技学院](https://zhaosheng.syist.edu.cn/index/Article/details/id/817.html)、[沈阳工学院](https://zsxx.situ.edu.cn/info/1002/2548.htm)；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 本次实测：官方学费证据继续补录第七十五批（2026-09-19）

- 本轮新增辽宁 3 所院校、9 条官方费用引用；官方目录覆盖 `2,022/2,308` 所院校、`official_fee_reference=8,127`，`offering_matches=1,432`，机构级未核验 286 行。北软两条专业费用在同一院校条目内各自保留官方来源 URL。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：`status=passed`，2,308 所院校、51,878 条招生计划，SQLite `integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：62,265/62,265 项检查通过，0 失败；`py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test*.py'`：59/59 通过（核心数据库测试 54/54）；`py_compile` 通过。
- 原始配置 SHA-256：`81478C4FDE77C7A8CC44B0EBD3CD9E28F0A895FEDF2314A264AD5388074E01F6`；规范化官方学费配置 SHA-256：`F4CC363073B801532415945F241C39050C6A9C19B9A81858BCF9E8C935CDC841`；数据库 SHA-256：`3946C0DB6D531192C2240557EF3C919D7D9C1A758A4D174E4825C8C031D45ACE`。
- 官方来源为学校官网/招生网 2026 年招生章程、招生计划和专业问答：[大连装备制造](https://zsb.dlemcedu.cn/?news/7033)、[抚顺师专](https://www.fsvti.edu.cn/cnc_school/resources/upload/file/20260312/20260312180054_770.pdf)、[北软大数据技术](https://www.nsi-soft.com/nsi/content/675075639871.html)、[北软计算机应用技术](https://www.nsi-soft.com/nsi/content/675075431689.html)；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 本次实测：官方学费证据继续补录第七十四批（2026-09-19）

- 本轮新增辽宁大连 5 所院校、20 条官方费用引用；官方目录覆盖 `2,019/2,308` 所院校、`official_fee_reference=8,118`，`offering_matches=1,432`，机构级未核验 289 行。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：`status=passed`，2,308 所院校、51,878 条招生计划，SQLite `integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：62,217/62,217 项检查通过，0 失败；`py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test*.py'`：58/58 通过；`py_compile` 通过。
- 原始配置 SHA-256：`333CD9EAFB9DBB5AD69797070C19B8F8D16C3E54263CDCE6A627A8DC0FFEDBB6`；规范化官方学费配置 SHA-256：`fc162acbbae798d25a40ed628c57a9ad3e228add43ee02016f7fac8b15b428cc`；数据库 SHA-256：`4F241400F7EE6EFB1581E9D203BBA350C42FF05E871759E34A50B7B5652F0055`。
- 官方来源为学校官网/招生网 2026 年招生章程或官方实施方案；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 本次实测：官方学费证据继续补录第七十三批（2026-09-19）

- 本轮新增陕西 9 所院校、14 条官方费用引用；官方目录覆盖 `2,014/2,308` 所院校、`official_fee_reference=8,098`，`offering_matches=1,432`，机构级未核验 294 行。西安高新科技职业学院的 10,780 元按 2024 年官方历史材料记录。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：`status=passed`，2,308 所院校、51,878 条招生计划，SQLite `integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：62,112/62,112 项检查通过，0 失败；`py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test*.py'`：58/58 通过；`py_compile` 通过。
- 原始配置 SHA-256：`18497AC691D27E7A429790911E9584E76C351A469346E0C7AA50B4C8EBEC760D`；规范化官方学费配置 SHA-256：`8e4d799fd24f0a2da122f47b373141893726d4ae89f555234ee56b0779aefaaf`；数据库 SHA-256：`249FC29A0556432BA8A3D8D70A183A1C8A4905ADA1BB96602C87F71358DE8CEB`。
- 官方来源为学校官网/招生网、教育部阳光高考审核章程和省级教育招生官方平台；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 本次实测：官方学费证据继续补录第七十二批（2026-09-19）

- 本轮新增咸阳职业技术学院、陕西工业职业技术大学、延安职业技术学院、神木职业技术学院、汉中职业技术学院、西安电力高等专科学校、陕西邮电职业技术学院 7 所院校、11 条官方费用引用；官方目录覆盖 `2,005/2,308` 所院校、`official_fee_reference=8,084`，`offering_matches=1432`，机构级未核验 303 行。咸阳职院 2025 金额按历史材料记录。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：`status=passed`，2,308 所院校、51,878 条招生计划，SQLite `integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：62,033/62,033 项检查通过，0 失败；`py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test*.py'`：58/58 通过；`py_compile` 通过。
- 原始配置 SHA-256：`0BF20B3805697B651C98702FDD76D7F3CCEAE590D056D2EEC78271F74E2CF13B`；规范化配置 SHA-256：`7b00626644547b777a4ecae2772d9ff461ec3460dbdd29e158ccf221a6b8d946`；数据库 SHA-256：`DCC21F138402C6C306AE8F0E37D344252DCF13BBF21629F67FFA923E2E8D5D34`。
- 官方来源为学校官网/招生网、教育部阳光高考审核章程和省级教育招生官方平台；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 本次实测：官方学费证据继续补录第七十一批（2026-09-19）

- 本轮合并记录 5 所江苏、12 所浙江、3 所辽宁和 2 所河北院校，官方费用目录从 1,976 所/7,979 条扩展到 1,998 所/8,073 条；`offering_matches=1432`，机构级未核验队列为 310 行。辽宁理工学院、辽宁轨道交通职业学院、辽宁医药职业学院、唐山海运职业学院和河北机电职业技术学院的金额均来自学校官网或招生网 2026 材料；河北机电中英合作专业 20,000 元为简章载明的暂定标准，住宿费未入库。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：`status=passed`，2,308 所院校、51,878 条招生计划，SQLite `integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：61,971/61,971 项检查通过，0 失败；`py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test*.py'`：58/58 通过；`py_compile` 通过。
- 原始配置 SHA-256：`C3F94DB68AC8A085718AFB39B0E3EFC3E8E8D848533BA916977AD8474816CDBA`；规范化配置 SHA-256：`c7cff0de1adff0735b4f62d931c0086801f04049e92ecb9bc7b04d93cfda96d7`；数据库 SHA-256：`44c32300505673b87e9d6a881308363fe26f1605f151b001f0457ad0cdc6b2bc`。
- 官方来源：学校官网/招生网和省级教育招生官方平台；2023、2024、2025 材料及 2024 秋季备案表按历史年份记录。杭州科技职业技术学院普通高职收费未核到学校官网明确金额，未使用第三方转载。
- 本轮只更新本地可重建数据、来源白名单、测试断言和文档；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 本次实测：官方学费证据继续补录第七十批（2026-09-19）

- 数据库重建：`py -3.12 pipelines/task03/build_admissions_db.py` 通过；2,308 所院校、51,878 条招生计划，官方目录 1,976 所/7,979 条费用证据，`offering_matches=1432`，机构级未核验 332 行，SQLite `integrity_check=ok`。
- 独立数据库校验：`py -3.12 pipelines/task03/validate_admissions_db.py` 通过，61,479/61,479，0 失败。
- TASK-03 Python 测试：`py -3.12 -m unittest discover -s pipelines/task03 -p 'test*.py'` 通过，58/58；核心数据库测试 53/53。`py -3.12 -m py_compile` 通过。
- 本轮未重跑全项目 Node 测试 47 文件/554 项历史基线；该历史基线不冒充本轮实测。未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。
- 官方来源：[金肯职业技术学院2026年招生简章](https://www.njjku.com/detail/372340)收费标准原图；没有使用第三方收费汇总页。

## 当前增量验证：官方学费证据继续补录第五十三批（2026-09-18）

本轮核验[德宏职业学院招生信息网 2026 年招生简章](https://zs.yndhvc.com/showarticle_zs.php?actiontype=0&id=120&keyword_type=0&search_keyword=)及其链接的[学校官方微信公众号图文](https://mp.weixin.qq.com/s/0sdTs2Dlgadw3bWXQVNgag?color_scheme=light&from=industrynews)，为德宏职业学院新增 1 条官方收费档；官方“相关说明”明确三年制专科学费 5,000 元/生·学年，展开后新增 6 条费用引用，按 101 专业组和同名专业精确匹配。没有使用第三方来源，也没有改写原始招生计划学费字段。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,876 所/6,434 条原始收费档，展开后 `official_fee_reference=7223`、`offering_matches=1050`。
- `validate_admissions_db.py`：57,534/57,534 项检查通过，0 失败；机构级未核验队列 432 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 原始配置 SHA-256：`743BBADF6CB8BF89C2B72D8C3854188B94A4E809A3D589736F46AEDEC8FF85BE`；规范化配置 SHA-256：`72a27e4f14b97ca6640c627c72ba40cefd9de413e4dea33e23c7aa4dac720d2c`；数据库 SHA-256：`4ca1903765bc5db2af8b3d202720e5a71127501278bfd8bd4002d48e3f57272e`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。官方来源：[德宏职业学院招生信息网](https://zs.yndhvc.com/showarticle_zs.php?actiontype=0&id=120&keyword_type=0&search_keyword=)及页面链接的[学校官方微信公众号图文](https://mp.weixin.qq.com/s/0sdTs2Dlgadw3bWXQVNgag?color_scheme=light&from=industrynews)。

## 当前增量验证：官方学费证据继续补录第五十二批（2026-09-18）

本轮核验四川省教育考试院 2026 年普通高校在川招生专业及名额介绍（物理类）第 131、132 图，为阿坝师范学院、四川民族学院新增 11 条官方收费档；展开后新增 39 条费用引用，均按专业组和同名专业精确匹配。没有使用第三方来源，也没有改写原始招生计划学费字段。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,875 所/6,433 条原始收费档，展开后 `official_fee_reference=7217`、`offering_matches=1044`。
- `validate_admissions_db.py`：57,502/57,502 项检查通过，0 失败；机构级未核验队列 433 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 原始配置 SHA-256：`5A0868A8D0C72581D4DA5F53FEBBA40B3EB44ABD2719E06126910ACB4DD92449`；规范化配置 SHA-256：`606ef39831aeead175616529cbd2ebc6402cf57a74338951d54831e4813d8d25`；数据库 SHA-256：`2980497e40d5f97512310ec3076c8c1a700adad1e3795fef872af1dd1efa6b5f`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。官方来源：[四川省教育考试院计划入口](https://plan.sceea.cn/lkjh.html)，直接证据为[第 131 图](https://plan.sceea.cn/img/wl/tu/wl%20(131).png)和[第 132 图](https://plan.sceea.cn/img/wl/tu/wl%20(132).png)。

## 当前增量验证：官方学费证据继续补录第五十一批（2026-09-18）

本轮核验苏州市人民政府 2026 年军队院校报考指南，并以国防科技大学、海军工程大学招生网官方说明交叉验证；新增 5 所数据库已有军队院校、5 条官方收费档，展开后新增 73 条费用引用，全部按军事类专业名精确匹配，记录为学生自付学费 0 元/生·学年。没有使用第三方来源，也没有改写原始招生计划学费字段。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,873 所/6,422 条原始收费档，展开后 `official_fee_reference=7178`、`offering_matches=1005`。
- `validate_admissions_db.py`：57,294/57,294 项检查通过，0 失败；机构级未核验队列 435 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 原始配置 SHA-256：`5339301086782C5D1E1BE82CCB48A714044A7D091B426CC647B7DC759511E4A9`；规范化配置 SHA-256：`2d2e4e79189d0bf19147b86e3c414ae9eab639fc5302c99e4d933c763cacf13d`；数据库 SHA-256：`b6b97e843881edea2b8a52e1286b49949b6d0f02683cb5e6b25ee935a4c479ac`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。官方来源：[苏州市人民政府 2026 年军队院校在苏招生报考指南](https://www.suzhou.gov.cn/szsrmzf/mszx/202606/116f07f8f1fc48ec924aae1b4ea6201d.shtml)。

## 当前增量验证：官方学费证据继续补录第五十批（2026-09-18）

本轮核验四川省教育考试院 2026 年普通高校在川招生专业及名额介绍（物理类）第 190 图，为成都轨道交通职业学院新增 1 条官方收费档；展开后新增 5 条费用引用，按专业组 501 和同名专业精确匹配。官方计划列明 17800 元/生·学年；没有使用第三方来源，没有改写原始招生计划学费字段。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,868 所/6,417 条原始收费档，展开后 `official_fee_reference=7105`、`offering_matches=932`。
- `validate_admissions_db.py`：56,919/56,919 项检查通过，0 失败；机构级未核验队列 440 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 原始配置 SHA-256：`9FCCD1219C23D3239FA1B7378047850F54F6D1A3ED56FFBAC1EFACAB001A05C1`；规范化配置 SHA-256：`c89cfb970fe30dd068600bb7469b137062cd27c35feab0264f9d78026583700f`；数据库 SHA-256：`180da9c7d5752c4e6ed15081357242c8aa9ba0e36ff1ca28323eb15d273357f9`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收；`publication_status=NOT_PUBLISHED`，云端开关保持关闭。官方来源：[四川省教育考试院计划入口](https://plan.sceea.cn/lkjh.html)。

## 当前增量验证：官方学费证据继续补录第四十九批（2026-09-18）

本轮核验四川省教育考试院 2026 年普通高校在川招生专业及名额介绍物理类第 191 图、历史类第 102 图，为宜宾工业职业技术学院、宜宾医药健康职业学院新增 7 条官方收费档；展开后新增 38 条费用引用，按专业名和专业组精确匹配。官方计划列明 4800、5200、5800 元/生·学年档；没有使用第三方来源，没有改写原始招生计划学费字段。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,867 所/6,416 条原始收费档，展开后 `official_fee_reference=7100`、`offering_matches=927`。
- `validate_admissions_db.py`：56,892/56,892 项检查通过，0 失败；机构级未核验队列 441 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 原始配置 SHA-256：`4E11A270602938C823601F4EC3128B00DA2ACD094CF2BA723F88A5A3CA4424F4`；规范化配置 SHA-256：`aa0ae6ff1bed32db1df60a7e0a694bdc88a6b2a0e705859b8305587cf33ecbaa`；数据库 SHA-256：`95d2c96abee295c6f4a6d9efe6422993f4e17a9425350033f2c604d66bd3c5d0`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收；`publication_status=NOT_PUBLISHED`，云端开关保持关闭。官方来源：[四川省教育考试院计划入口](https://plan.sceea.cn/) / [物理类第 191 图](https://plan.sceea.cn/img/wl/tu/wl%20(191).png) / [历史类第 102 图](https://plan.sceea.cn/img/ls/tu/ls%20(102).png)。

## 当前增量验证：官方学费证据继续补录第四十八批（2026-09-18）

本轮核验四川省教育考试院 2026 年普通高校在川招生专业及名额介绍（物理类）第 184 图，为川北幼儿师范高等专科学校新增 3 条官方收费档；展开后新增 25 条费用引用，13 个专业名精确匹配到 25 条招生记录。官方图表列明 4800、5200、5800 元/生·学年三档；没有使用第三方来源，没有改写原始招生计划学费字段。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,865 所/6,409 条原始收费档，展开后 `official_fee_reference=7062`、`offering_matches=889`。
- `validate_admissions_db.py`：56,693/56,693 项检查通过，0 失败；机构级未核验队列 443 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 原始配置 SHA-256：`FCAD984999EBD476A15EF6DBC0397E7264132A9E8BA855A6CB5EC9F4975F7531`；规范化配置 SHA-256：`07e0ac46ff17cb3574fd3cd4406fcdb234a7dccee0bcac4ce3a8f391f70fd88f`；数据库 SHA-256：`26EC6BE2B29D3F0598389170DA49BC8DC602BF05606A3B5AC7C53418B2836477`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收；`publication_status=NOT_PUBLISHED`，云端开关保持关闭。官方来源：[四川省教育考试院计划入口](https://plan.sceea.cn/lkjh.html)。

## 当前增量验证：官方学费证据继续补录第四十七批（2026-09-18）

本轮核验新疆应用职业技术学院官网 2026 年招生章程，官方目录新增 1 所院校、4 条原始收费档；展开后新增 4 条费用引用，其中 1 条精确匹配当前数据库招生专业，3 条保留为院校级收费档。章程明确理工/文理兼类、艺术类、护理、财经类收费标准。未使用第三方学费汇总，也没有把住宿费、教材费或代收费写入学费表。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,864 所/6,406 条原始收费档，展开后 `official_fee_reference=7037`、`offering_matches=864`。
- `validate_admissions_db.py`：56,564/56,564 项检查通过，0 失败；机构级未核验队列 444 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。本轮未重跑全项目 Node 测试 47 文件/554 项历史基线。
- 原始配置 SHA-256：`2172a403e2e249a0c618a57fee152d5d1e62fe51aaa5333fb40511ee00637b3d`；规范化配置 SHA-256：`ecba8b6e3c9b93eb2f1a1f99d1a3fb22828aea85e0b1e2d6589c59adb0ee7d78`；数据库 SHA-256：`8114d302afbbc9eb8ec7244ee6465ab8b82c3ba67f1ce0aafd420a5ec2d3cda3`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收；`publication_status=NOT_PUBLISHED`，云端开关保持关闭。官方来源：[新疆应用职业技术学院2026年招生章程](https://www.xjyyedu.cn/2026/0520/c26a5688/page.htm)。

## 当前增量验证：官方学费证据继续补录第四十六批（2026-09-18）

本轮核验河北水利电力学院招生信息网优势本科专业调费公示，官方目录新增 1 所院校、3 条原始收费档；展开后新增 6 条费用引用，其中 4 条精确匹配当前数据库招生专业，2 条保留为院校级收费档。公示明确调整标准自 2026 年秋季入学新生开始执行。未使用第三方学费汇总，也没有把住宿费、教材费或代收费写入学费表。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,863 所/6,402 条原始收费档，展开后 `official_fee_reference=7033`、`offering_matches=863`。
- `validate_admissions_db.py`：56,542/56,542 项检查通过，0 失败；机构级未核验队列 445 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。本轮未重跑全项目 Node 测试 47 文件/554 项历史基线。
- 原始配置 SHA-256：`e16e9eba55140dc56c731ae994da5f0633853a9d30ac40c86803c59f0ade9d0d`；规范化配置 SHA-256：`3ff7a458abf417eee0eadaae3ffa80f9c4ad2dbca495e4da9c972268b4c629e9`；数据库 SHA-256：`e2198c2190bb45d9288de12e7ee21ac66ebe5687593c237ee80d8dc10c94b088`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收；`publication_status=NOT_PUBLISHED`，云端开关保持关闭。官方来源：[河北水利电力学院优势本科专业调整学费标准的公示](https://zsb.hbwe.edu.cn/info/1006/6041.htm)。

## 当前增量验证：官方学费证据继续补录第四十五批（2026-09-18）

本轮核验新疆职业大学官网 2026 年普通高职（专科）招生简章，官方目录新增 1 所院校、11 条原始收费档；展开后新增 20 条费用引用，其中 11 条精确匹配当前数据库招生专业，9 条保留为院校级收费档。未使用第三方学费汇总，也没有把住宿费、制服费、教材费或代收费写入学费表。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,862 所/6,399 条，展开后 `official_fee_reference=7027`、`offering_matches=859`。
- `validate_admissions_db.py`：56,510/56,510 项检查通过，0 失败；机构级未核验队列 446 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest test_admissions_db test_workbook_intake`：58/58 通过，其中 `test_admissions_db` 53/53。本轮未重跑全项目 Node 测试 47 文件/554 项历史基线。
- 原始配置 SHA-256：`5139788d74b64ff132a61100f40fc2b0e16b34947dbbd73373524e064bfbe221`；规范化配置 SHA-256：`da1460c54e489a57555e1e20203488382ec0f8ba413c6c27b617064f3ba572f4`；数据库 SHA-256：`11f496e2670c23b0a847d3f608061bd11533bc12b5d73594919803f7ad7965b9`；`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收；`publication_status=NOT_PUBLISHED`，云端开关保持关闭。官方来源：[新疆职业大学 2026 年普通高职（专科）招生简章](https://www.xjvu.edu.cn/zjb/info/1051/1517.htm)。

## 当前增量验证：官方学费证据继续补录第四十批（2026-09-18）

本轮核验湖南 6 所院校官网或官方招生信息平台的 2026 年招生材料，官方目录新增 6 所院校、41 条原始收费档；展开后新增 68 条费用引用，其中 51 条精确匹配当前数据库招生专业，17 条保留为院校级收费档。未使用第三方学费汇总，也没有把住宿费、教材费或代收费写入学费表。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,853 所/6,322 条，展开后 `official_fee_reference=6860`、`offering_matches=748`。
- `validate_admissions_db.py`：55,645/55,645 项检查通过，0 失败；机构级未核验队列 455 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest test_admissions_db`：53/53 通过；`py -3.12 -m unittest test_admissions_db test_workbook_intake`：58/58 通过。本轮未重跑全项目 Node 测试 47 文件/554 项历史基线。
- 构建清单官方学费配置规范化 SHA-256：`4568fd214e962414b8968f0eb9259897558043f58f0827a36c290f29e51ae952`；原始配置文件 SHA-256：`04b01b6aa7c54d9f8c0c6d8737b99f14cb0555eab3db3097a05e1f513f392da5`；数据库 SHA-256：`261f0a0e7dff89a2dbc92bd23356611a6f39c67ace34010deb895e2435cafcff`；构建清单 `release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收；`publication_status=NOT_PUBLISHED`，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第三十九批（2026-09-18）

本轮核验 3 所海南院校的官网/招生信息网 2026 年招生材料，官方目录新增 3 所院校、11 条原始收费档；展开后新增 30 条费用引用，30 条精确匹配当前招生专业。三亚城市职业学院的普通组与新加坡 PSB 合作组按专业组代码区分；海南经贸职业大学仅录入当前数据库明确为乌拉尔学院中外合作办学的记录。没有使用第三方学费汇总，也没有把住宿费、教材费或代收费写入学费表。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,847 所/6,281 条，展开后 `official_fee_reference=6792`、`offering_matches=697`。
- `validate_admissions_db.py`：55,275/55,275 项检查通过，0 失败；机构级未核验队列 461 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest test_admissions_db`：53/53 通过；`py -3.12 -m unittest test_admissions_db test_workbook_intake`：58/58 通过。原始配置 SHA-256：`88e9630f54d47c7769eecfce9771075bcb59035763f3b738217832393a80c45b`；规范化配置 SHA-256：`1414bcb2d364c83974fddd585facee9e48ff8a006cd3459fc8add2655344c1ef`；数据库 SHA-256：`36a911c245da1c45b778565d01b64a0627a667b015f31d82fbc66155d48c6419`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收；`publication_status=NOT_PUBLISHED`，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第三十八批（2026-09-18）

本轮核验鹤壁能源化工职业学院官网、河南省阳光高考平台和河南省教育考试院 2026 年招生材料，官方目录新增 5 所院校、15 条原始收费档；展开后新增 29 条费用引用，29 条精确匹配当前招生专业。没有使用第三方学费汇总，也没有把住宿费、教材费或代收费写入学费表；网络营销与直播电商因缺少专业级官方金额继续留空。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,844 所/6,270 条，展开后 `official_fee_reference=6762`、`offering_matches=667`。
- `validate_admissions_db.py`：55,111/55,111 项检查通过，0 失败；机构级未核验队列 464 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest test_admissions_db`：53/53 通过；`py -3.12 -m unittest test_admissions_db test_workbook_intake`：58/58 通过。原始配置 SHA-256：`2eef0d4fd3cb8917175d1c7fc056ea5cff8b0898edb461c32cedc963feb3f7d5`；规范化配置 SHA-256：`6c1c2cf07891db6a079c9287800c0dcf7278851319a081b9ef1a0d8493f1f27f`；数据库 SHA-256：`de3fce57ad4f02bd5989706a850c4573e2e65bc4a6dd50f6fb20df03189dfd67`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收；`publication_status=NOT_PUBLISHED`，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第三十七批（2026-09-17）

本轮核验天津机电职业技术学院、吉林工业职业技术学院、长春师范高等专科学校官网/招生信息网的 2026 年官方招生材料，官方目录新增 3 所院校、20 条原始收费档；展开后新增 35 条费用引用，其中 33 条精确匹配当前招生专业。天津机电普通/特殊专业 2 条因官方没有给出特殊专业清单而保留为院校级证据；未使用第三方学费汇总，也没有把住宿费、教材费或代收费写入学费表。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,839 所/6,255 条，展开后 `official_fee_reference=6733`、`offering_matches=638`。
- `validate_admissions_db.py`：54,946/54,946 项检查通过，0 失败；机构级未核验队列 469 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。原始配置 SHA-256：`ed2b232802ea7e6ad64c83e6803072b3aa38045a4afb7dbb25dc10d9cefbfac2`；规范化配置 SHA-256：`8eca5a21f6c36b1cb3c921c050f9ebbf2b7e9c3cce51e763ddd1eb500b07968e`；数据库 SHA-256：`e1e47a8afcaa6ceec3c1ba7c9090d1ce151a456a053ca071e67fb21637412734`。
- 本轮为本地可重建验证，未部署、未推送、未做浏览器视觉验收；`publication_status=NOT_PUBLISHED`，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第三十六批（2026-09-17）

本轮复核吉林 5 所院校的教育部阳光高考 2026 年招生章程，官方目录为 1,831 所院校、6,222 条原始收费档，展开后 `official_fee_reference=6656`、`offering_matches=563`；按未覆盖 `institution_pk` 仍有 477 行未核验。`build_admissions_db.py` 通过且 `integrity_check=ok`，`validate_admissions_db.py` 为 54,522/54,522，核心数据库测试 53/53、TASK-03 全量测试 58/58 通过。原始配置 SHA-256 为 `5ca9d36a319b716b258b658ab26954b78ff717863884a882f180ec885f91363e`，规范化配置 SHA-256 为 `82c9831436e3256f9354acb8034e3be4188e4a6b9c78d05647f2e9e1247f6538`，数据库 SHA-256 为 `ee13e3ba15501a347dd7bb9d86d1d1501ac1a9b5659780e6e7e199d026cbe390`。本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第三十五批（2026-09-17）

本轮按学校官网/招生信息网 2026 年招生章程新增 3 所数据库已有院校、5 条 `CNY + academic_year` 收费档；展开后新增 40 条官方费用引用，40 条均精确匹配当前招生专业。宁夏工商职业技术大学以 `admission_type` 区分普通类专科4600 元和定向培养军士7000 元，未将本科“按批复标准”推断为金额。没有使用第三方学费汇总，也没有把住宿费、教材费或其他代收费换算为学费。

- `build_admissions_db.py`：`status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划；官方目录 1,831 所/6,221 条，展开后 `official_fee_reference=6626`、`offering_matches=525`。
- `validate_admissions_db.py`：54,363 项检查通过、0 失败；按未覆盖 `institution_pk` 统计机构级未核验队列 477 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。原始配置 SHA-256：`c155e64f5a983de1cf7dacdb80146df96d17ba163effd15cdf4bbbf37bc8678c`；规范化配置 SHA-256：`7e0b60123880b80512162d2b9828be9cbeaa4bc723673f229ad5112d3304d213`；数据库 SHA-256：`5c1829554e65db4119f0859c7190e53d72bf485d62b4203df3b51e9a86227698`。
- 发布状态仍为本地可重建 `NOT_PUBLISHED`；本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第三十四批（2026-09-17）

- 本轮按学校官网、学校招生网和省级教育主管部门官方页面新增中国消防救援学院、北京经贸职业学院、北京经济管理职业学院、北京警察学院、北京邮电大学世纪学院 5 所院校、11 条 `CNY + academic_year` 收费档；展开后新增 25 条官方费用引用，25 条均精确匹配到当前招生专业。中国消防学院“免交学费”按 0 元存证；北京邮电大学世纪学院物联网工程按官方收费图表列示的 43,000 元写入。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,828 所/6,216 条，展开后 `official_fee_reference=6586`、`offering_matches=485`；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：54,155/54,155 项检查通过，0 失败；按未覆盖 `institution_pk` 统计机构级未核验 480 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。原始配置 SHA-256：`cf13eb2b0e6698871ea26508a623d44ced2547ba3adb310d1d91e90d18356aa0`；规范化配置 SHA-256：`bd8498ffb5947eca4526279d82f89e0166882cf0753d82e90f44ab6f3090647f`；数据库 SHA-256：`4caca801438f710cfc8e7f5188c9f7b39c4bc4a8c9d00bb57a8f26279b6d12c2`。
- 发布状态仍为本地可重建 `NOT_PUBLISHED`；本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第三十三批（2026-09-17）

- 本轮按学校官网及教育部官方材料新增内蒙古科技大学包头师范学院、赤峰大学 2 所院校、6 条 `CNY + academic_year` 收费档；展开后新增 14 条官方费用引用，14 条精确匹配到当前招生专业。赤峰 2025 计划页仍使用更名前校名，教育部 2026 年更名函确认实体连续；未使用第三方学费汇总，也没有把住宿费、教材费或其他代收费换算为学年金额。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,823 所/6,205 条，展开后 `official_fee_reference=6561`、`offering_matches=460`；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：54,014/54,014 项检查通过，0 失败；按未覆盖 `institution_pk` 统计机构级未核验 485 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。原始配置 SHA-256：`6254a3d547d7c2d8ab786effdcf1fd8097fc9134fb499993695f2c38d3a9719a`；规范化配置 SHA-256：`b7ec6e14f04948dbdce1b18611c323ff213c8b5160421df4e0e890358d4a1d09`；数据库 SHA-256：`a631b8a9ee1f1b1de58a821c01afc8f2bae685c1e85ffc20942bd31aed5a5842`。
- 发布状态仍为本地可重建 `NOT_PUBLISHED`；本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第三十二批（2026-09-17）

- 本轮按学校官网、学校招生网和学校信息公开官方材料新增昆明幼儿师范高等专科学校、昆明工业职业技术学院、昆明铁道职业技术学院、云南交通职业技术大学 4 所院校、5 条 `CNY + academic_year` 收费档；展开后新增 36 条官方费用引用，36 条精确匹配到当前招生专业。云南交通职业技术大学仅采用官网收费公示“高等职业教育”行，不把艺术类、五年制或中外合作办学金额扩展到当前 2026 高职（专科）批专业。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,821 所/6,199 条，展开后 `official_fee_reference=6547`、`offering_matches=446`；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：53,936/53,936 项检查通过，0 失败；按未覆盖 `institution_pk` 统计机构级未核验 487 行，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。原始配置 SHA-256：`9f4d8f37b8d162307abdef54284a9fdb2d4fade46c0916bb31fa552fbc253912`；规范化配置 SHA-256：`5069f1b5b6b06253f7dc0fed674d0cde4df146685f4fe5b87a7ac899a27020d8`；数据库 SHA-256：`e1b8e5cff7600ac45464a9721431e44dee721dd09225b0dbe25bea7187df8133`。
- 发布状态仍为本地可重建 `NOT_PUBLISHED`；本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第三十一批（2026-09-17）

- 本轮按学校官网、学校招生网和学校信息公开官方材料新增安徽文达信息工程学院、安徽城市管理职业学院、合肥理工学院 3 所院校、4 条 `CNY + academic_year` 收费档；展开后新增 18 条官方费用引用，18 条精确匹配到当前招生专业。合肥理工使用学校收费公示链接的安徽省官方收费标准附件，未使用第三方整理金额。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,817 所/6,194 条，展开后 `official_fee_reference=6511`、`offering_matches=410`；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：53,747/53,747 项检查通过，0 失败；机构级未核验 491 所，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。原始配置 SHA-256：`58066b6618bfa8d0ac0ba868f6c10978c62159e238f96e85809984ae237ecb46`；数据库 SHA-256：`84c8f00254109b909b819459c5d8b17ecd692e362cac86ecf7b0f848ef7144eb`。
- 发布状态仍为本地可重建 `NOT_PUBLISHED`；本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第三十批（2026-09-17）

- 本轮按学校官网/招生网官方材料新增北京信息职业技术学院、北京第二外国语学院中瑞酒店管理学院 2 所院校、2 条 `CNY + academic_year` 收费档；展开后新增 4 条官方费用引用，4 条精确匹配到当前招生专业。中瑞酒店管理的官方方向专业名称未被模糊映射。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,814 所/6,190 条，展开后 `official_fee_reference=6493`、`offering_matches=392`；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：53,650/53,650 项检查通过，0 失败；机构级未核验 494 所，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。原始配置 SHA-256：`a368cdd40fe2b6c3762a62d37229fe96d0def42a400d35bdd08013affc0a5bc0`；数据库 SHA-256：`2c1388f7752fbf2133fd3109baec2b74da12a55c4f270204af37d62799510570`。
- 发布状态仍为本地可重建 `NOT_PUBLISHED`；本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第二十九批（2026-09-17）

- 本轮按学校官网/信息公开网官方材料新增合肥共达职业技术学院、安徽电子信息职业技术学院、安徽财贸职业学院 3 所院校、9 条 `CNY + academic_year` 收费档；展开后新增 12 条官方费用引用，12 条精确匹配到当前招生专业。软件技术的官方按学分金额未换算成学年金额。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,812 所/6,188 条，展开后 `official_fee_reference=6489`、`offering_matches=388`；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：53,626/53,626 项检查通过，0 失败；机构级未核验 496 所，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。原始配置 SHA-256：`9787075dade2f0df0c1e5e552d96dd4dc37b6f4f5968389fa732d4e6efc52670`；数据库 SHA-256：`fe5e9bb2718379538a7809db55447d41b0f03098550da60f11b9087efd530a13`。
- 发布状态仍为本地可重建 `NOT_PUBLISHED`；本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第二十八批（2026-09-17）

- 本轮按河南省阳光高考平台和河南省教育考试院官方材料新增黄河水利职业技术大学、长垣烹饪职业技术学院、林州建筑职业技术学院 3 所院校、15 条 `CNY + academic_year` 收费档；展开后新增 22 条官方费用引用，22 条精确匹配到当前招生专业。林州当前“财税大数据应用”未取得官方明确收费行，继续留空。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,809 所/6,179 条，展开后 `official_fee_reference=6477`、`offering_matches=376`；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：53,554/53,554 项检查通过，0 失败；机构级未核验 499 所，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。原始配置 SHA-256：`681319de58863f5f5f265d24662f03fdb73c2789f3481982ee7aa7ca846718dc`；数据库 SHA-256：`bd6d8d8cf8290482577c431692f49b9ba4e8428c672d4ea33b7e8fe2c76c3c3f`。
- 发布状态仍为本地可重建 `NOT_PUBLISHED`；本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第二十七批（2026-09-17）

- 本轮按学校官网和教育部阳光高考审核章程新增安徽国防科技职业学院、宁夏幼儿师范高等专科学校、天津渤海职业技术学院、天津滨海职业学院 4 所院校、9 条 `CNY + academic_year` 收费档；展开后新增 21 条官方费用引用，其中 16 条精确匹配到当前招生专业。天津两校一般/特殊/艺术类别无法与当前专业可靠对应，按院校级证据保留；住宿费和代收费不并入学费。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,806 所/6,164 条，展开后 `official_fee_reference=6455`、`offering_matches=354`；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：53,426/53,426 项检查通过，0 失败；机构级未核验 502 所，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 构建清单官方学费配置规范化 SHA-256：`26e5596eea647557e8eb861cb9769d670e2a3fde00e443bd2fa6163dc095c030`；数据库 SHA-256：`b2e45240f46a22242195f1566815aa2763379ead99be7a7176f7e36a19d66940`。
- 发布状态仍为本地可重建 `NOT_PUBLISHED`；本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。合并过程中的编码异常已记录并恢复，不影响最终配置和数据库完整性。

## 当前增量验证：官方学费证据继续补录第二十六批（2026-09-17）

- 本轮按学校官网、宁夏招生考试信息网和河南省阳光高考平台官方审核材料新增天津滨海汽车工程职业学院、吉林职业技术学院、宁夏警官职业学院 3 所院校、9 条 `CNY + academic_year` 收费档。天津 15,800 元档因当前库没有同名专业只保留院校级证据；其余金额按当前专业名称精确匹配，未使用第三方网页。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,802 所/6,155 条，展开后 `official_fee_reference=6434`、`offering_matches=338`，本轮新增 42 条费用引用；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：53,313/53,313 项检查通过，0 失败；机构级未核验 506 所，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 构建清单官方学费配置规范化 SHA-256：`cb2694b2e1c552f5ae1dd159e92ebaecb908850ee89306060c5fa4673421cea0`；数据库 SHA-256：`c3d1697bc41757268ad313f725389c45c6a229b87ca4f0375e090084e9101c8a`。
- 发布状态：本地可重建产物仍为 `NOT_PUBLISHED`；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。逐校官方链接和收费边界见 [TASK03_SOURCE_MAPPING.md](TASK03_SOURCE_MAPPING.md)。

## 当前增量验证：官方学费证据继续补录第二十五批（2026-09-17）

- 本轮按学校官网公开材料新增南充卫生职业学院、江阳城建职业学院 2 所院校、6 条 `CNY + academic_year` 收费档；南充 5 个专业均为 5,800 元，江阳城建 40 个专科专业按官网表格金额精确归并，未使用第三方网页。两所非 `.edu.cn` 官网仅以 `jyccc.cn`、`ncwzy.com` 精确 HTTPS 白名单接受。
- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,799 所/6,146 条，展开后 `official_fee_reference=6392`、`offering_matches=298`，本轮新增 70 条专业费用引用；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：53,093/53,093 项检查通过，0 失败；机构级未核验 509 所，`TUITION_PENDING=797` 保持原始计划级状态。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 构建清单官方学费配置 SHA-256：`01b8b49f91889925fb357a76ad62763955398e0cbeef5b9ec603439859c97533`；数据库 SHA-256：`5baaafeea5165b2daf355f4450f73f7f44067dcfa6812ed69c84958e6571cf26`。
- 发布状态：本地可重建产物仍为 `NOT_PUBLISHED`；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。逐校官方链接和收费边界见 [TASK03_SOURCE_MAPPING.md](TASK03_SOURCE_MAPPING.md)。

## 当前增量验证：官方学费证据继续补录第二十四批（2026-09-17）

本轮复核并替换 8 所数据库已有院校的官方收费条目，保留 28 条 `CNY + academic_year` 原始收费档：吉林科技职业技术学院、天津商务职业学院、天津职业大学、天津艺术职业学院、甘肃工业职业技术大学、甘肃交通职业技术学院、兰州资源环境职业技术大学、新疆工业职业技术大学。来源为教育部阳光高考审核的 2026 招生章程/招生计划及新疆学校官方招生网收费表；类别金额只在能和当前招生专业可靠对应时精确挂接，其他官方类别档案不做猜测扩展。第三方页面未作为入库依据，原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 保持不变。

- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,797 所/6,140 条，展开后的 `official_fee_reference=6322`、`offering_matches=228`；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：52,735/52,735 项检查通过，0 失败；验证包含官方来源白名单、金额范围、币种/周期、证据哈希、数据库计数、精确专业匹配及计划级原始字段未被覆盖。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 构建清单官方学费配置 SHA-256：`0d8d4c7741c2d369cad079c61e9a61968a2e0ac765e71f0b100e2ac3d0477932`；数据库 SHA-256：`835e4e37c43429cbc06d0dd552e490b73ff01c904e349d0d5aea36559494e7ae`；机构级未核验 511 所。
- 发布状态：本地可重建产物仍为 `NOT_PUBLISHED`；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 当前增量验证：官方学费证据继续补录第二十三批（2026-09-17）

本轮新增 5 所数据库已有院校、15 条 `CNY + academic_year` 官方收费档：贵阳康养职业大学、贵州轻工职业大学、荆楚理工学院、重庆电子科技职业大学、山东农业工程学院。来源为学校官网招生章程/收费目录/收费公示、重庆市人民政府网发布的学校招生章程及河南省阳光高考平台审核章程；重庆电子科技的官方区间原样保留，山东农业工程的学分制年平均数限制写入证据备注。第三方页面未作为入库依据，原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 保持不变。

- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划；官方目录 1,796 所/6,129 条，展开后的 `official_fee_reference=6209`、`offering_matches=111`；`integrity_check=ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：52,154/52,154 项检查通过，0 失败。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 原始配置文件 SHA-256：`a72718c6beb66b6292e4c0ec745b8e823ed9aa1fad98d542b91c0425580a10b7`；数据库 SHA-256：`1b451d193d04eda128f5c0a08cef6bbd792dc409425ad9c8aaa38402a585989f`；机构级未核验 512 所。
- 发布状态：`publication_status=NOT_PUBLISHED`；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-17 / 官方学费证据继续补录第二十二批实测

本轮新增 5 所数据库已有院校、18 条 `CNY + academic_year` 官方收费档：昭通卫生职业学院、大理护理职业学院、吉林交通职业技术学院、吉林水利电力职业学院和通化医药健康职业学院。来源为学校官网 2026 招生章程、学校官方收费目录/公示和河南省阳光高考平台审核章程；吉林、通化的专业级证据按数据库现有专业精确匹配，未把局部金额扩展到未列专业。住宿费、教材费、保险、待定金额及第三方页面不入库，原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 保持不变。

- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划，官方目录 `1,791` 所/`6,114` 条，展开后的 `official_fee_reference=6,127`，`offering_matches=29`，数据库完整性 `ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：51,724/51,724 检查通过，0 失败；验证包含官方来源白名单、专业精确匹配计数、金额范围、币种/周期、证据哈希、数据库计数及计划级原始字段未被覆盖。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 原始配置文件 SHA-256：`18495cbb8b45b85669e30cebb3f360674f05e300dedaf2dd9062a7ae5e816c1b`；数据库 SHA-256：`c2ec8de4413b2ea63a96f610381a602ee8807680919f3992162f0690c3778658`；机构级未核验队列 517 所。
- 发布状态：本地可重建产物仍为 `NOT_PUBLISHED`；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-17 / 官方学费证据继续补录第二十一批实测

本轮新增 6 所数据库已有院校、12 条 `CNY + academic_year` 官方收费记录：2 份学校官网 2026 招生章程、1 份河南省阳光高考平台审核章程、1 份学校官网 2025-2026 学年收费公示、1 份学校官方收费目录和 1 份学校官方收费公示。收费证据的招生类型、专业分类和历史适用范围均写入备注；住宿费、教材费、保险、资助金额及无法可靠读取的附件金额不入库，原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 保持不变。

- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划，`official_fee_reference=6096`，独立官方院校 1,786 所，数据库完整性 `ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：49,762/49,762 检查通过，0 失败。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 配置规范化 SHA-256：`24258c1aee9e9867ba08875790b4e7d9dd02519e2abb1c2202b6957c9fb8a7e4`；数据库 SHA-256：`5930b34a39741602511dbd657769b6227eb55cada03e64944bb1b6a47ff93cf0`；机构级未核验队列 522 所。
- 发布状态：本地可重建产物仍为 `NOT_PUBLISHED`；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-17 / 官方学费证据继续补录第二十批实测
## 2026-09-17 / 官方学费证据继续补录第二十批实测

本轮将河南 4 所院校的 2026 官方招生章程收费档写入可重建目录：3 份来源来自学校官网，1 份来源来自河南省阳光高考信息平台审核章程，共新增 14 条 `CNY + academic_year` 记录。证据范围按普通高招、单招或对口招生类型保留，住宿费、教材费、保险和未被官方页面覆盖的专业没有进入学费表，原始 `plan_record.tuition_*` 未覆盖。

- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划，`official_fee_reference=6084`，独立官方院校 1,780 所，数据库完整性 `ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：49,702/49,702 检查通过，0 失败。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 配置规范化 SHA-256：`824323e395e33b1567dc0975b871575a75785a6ccd5b893a6daa00916cd4ce74`；数据库 SHA-256：`e09ee315357edf73d09abb47490b1ba2beef086095067ba1cd919b443bc89c1f`；机构级未核验队列 528 所，`TUITION_PENDING=797` 保持原始计划级状态。
- 发布状态仍为 `NOT_PUBLISHED`；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-17 / 官方学费证据继续补录第十九批实测

本轮将河南 8 所院校的 2026 官方招生章程收费档写入可重建目录：7 所来源于河南省阳光高考信息平台审核章程，河南水利与环境职业学院来源于学校招生信息网官方章程，共新增 35 条 `CNY + academic_year` 记录。第三方页面没有作为入库证据，住宿费、教材费、保险和资助金额未进入学费表，原始 `plan_record.tuition_*` 未覆盖。

- `py -3.12 nanhang-app/pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划，`official_fee_reference=6070`，独立官方院校 1,776 所，数据库完整性 `ok`。
- `py -3.12 nanhang-app/pipelines/task03/validate_admissions_db.py`：49,632/49,632 检查通过，0 失败。
- `py -3.12 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 配置规范化 SHA-256：`7c157d798ab22dfde8f527cb5e1790ddb90dbd5c7e350335c2728914b5ba2927`；数据库 SHA-256：`c101b6f8626969987078146da72a3cddcc2ed3f2d8440f346d59ca864c89312d`；机构级未核验队列 532 所，`TUITION_PENDING=797` 保持原始计划级状态。
- 本轮把已核验的 `haedu.cn` 纳入构建器/验证器精确官方教育域名白名单；未放宽为任意 `.cn` 域名。发布状态仍为 `NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-17 / 官方学费证据继续补录第十八批实测

本轮读取河南省教育考试院 2026 年对口专科官方计划 PDF，新增 11 所数据库已有院校、41 条收费档。金额来自表内“学费标准（元/年）”列；焦作新材料职业学院跨行排版按同一官方 PDF 专业行人工复核。第三方页面没有作为入库证据，原始 `plan_record.tuition_*` 未覆盖。

- `py -3.12 pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划，`official_fee_reference=6035`，独立官方院校 1,768 所，数据库完整性 `ok`。
- `py -3.12 pipelines/task03/validate_admissions_db.py`：49,457/49,457 检查通过，0 失败。
- `py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 配置规范化 SHA-256：`dd6fbe60afa535fd783c5c4c08b6776a4b1c9aade405d8c6e57845a212c8fc88`；数据库 SHA-256：`7b7c365117d041fff580a657fbf813f3e119660b140477f2687c1b36c220a900`；机构级未核验队列 540 所，`TUITION_PENDING=797` 保持原始计划级状态。
- 未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；仅更新本地可重建配置、SQLite、解析器、测试与文档。

## 2026-09-17 / 官方学费证据继续补录第十七批实测

本轮把云南、内蒙古、广东、广西及北海地区官方来源核实到的 30 所院校、92 条收费档写入目录；第三方页面没有作为入库证据，原始 `plan_record.tuition_*` 未覆盖。重建后官方目录为 1,757 所院校、5,994 条记录，机构级未核验队列为 551 所，计划级 `TUITION_PENDING=797` 保持不变。

- `py -3.12 pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划，`official_fee_reference=5994`，数据库完整性 `ok`。
- `py -3.12 pipelines/task03/validate_admissions_db.py`：49,252/49,252 检查通过，0 失败。
- `py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 配置规范化 SHA-256：`3cc5f9d94b03425aea0d3816392a074c875011be3dd2ab5038db2b02bd970fa4`；数据库 SHA-256：`506b5f396a14f536c67d1c51d28ef0d64e083fad0769323ad775963ff00c5212c`。
- 未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；仅更新本地可重建配置、SQLite、测试与文档。

## 2026-09-16 / 官方学费证据继续补录第十六批实测

本轮从 9 所江苏及无锡院校的官方招生章程、招生计划或官方招生网页面新增 40 所分类收费档；其中扬州职业技术大学同时包含本科和专科，所有记录仍放在独立 `official_fee_reference` 表中，原始招生计划学费字段不改写。无锡南洋官方招生页为同校 HTTP 旧入口，仅对该精确主机兼容，其他 HTTP 来源仍被拒绝。

- `py -3.12 pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条招生计划、`official_fee_reference=5902`；数据库完整性 `ok`。
- `py -3.12 pipelines/task03/validate_admissions_db.py`：48,792 项检查通过，0 失败。
- `py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'`：58/58 通过，其中 `test_admissions_db.py` 53/53。
- 数据库 SHA-256：`20f1b1ee4e063c586a3d4965b200eda37a5ea58de81a95a111a66d0d42f61fd6`；官方目录按规范化院校名覆盖 1,727/2,308，581 所仍为 `UNVERIFIED`；`TUITION_PENDING=797` 未被人为清零。
- 配置规范化 SHA-256：`2a059bf79597ff8915efd32b044a59c5fdd632b69c1345062c91385c835ce0d9`。本轮未部署、未推送、未做浏览器视觉验收，也未改变云端开关状态。官方来源映射见 [TASK03_SOURCE_MAPPING.md](TASK03_SOURCE_MAPPING.md)。

## 2026-09-16 / 官方学费证据继续补录第十五批实测

本轮从济南护理职业学院招生就业处官方计划页和山东省教育招生考试院官方春季高考专科计划 XLS 新增 14 所数据库内院校、35 条收费记录。山东计划表的收费列明确为“收费标准（元/年）”；第三方页面没有作为入库证据。潍坊科技学院官方财务附件因验证码无法公开读取具体数字，保持 `UNVERIFIED`。

- `py -3.12 pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条计划、`official_fee_reference=5862`、独立官方院校 1,718 所；数据库 `integrity_check=ok`。
- `py -3.12 pipelines/task03/validate_admissions_db.py`：48,592/48,592 检查通过，0 失败。
- `py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'`：58/58 通过；其中 `test_admissions_db.py` 53/53。
- 数据库 SHA-256：`3504deef91e5667907c87aa12204d7a084cce16a723533829527b0af5f8be7c5`；官方目录按规范化院校名覆盖 1,718/2,308，590 所仍为 `UNVERIFIED`；`TUITION_PENDING=797` 未被人为清零。
- 本轮未部署、未推送、未做浏览器视觉验收；云端开关保持关闭。官方来源映射见 [TASK03_SOURCE_MAPPING.md](TASK03_SOURCE_MAPPING.md)。

## 2026-09-16 / 官方学费证据继续补录第十四批实测

本轮逐页核对四川省教育考试院 2026 年高职单招普高类官方计划页及 21 张计划图片，新增 39 所数据库内院校、113 条收费记录；第三方页面没有作为入库证据。只登记计划专业行明确的学费档，住宿费和代收费不并入学费。

- `py -3.12 pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条计划、`official_fee_reference=5827`、独立官方院校 1,704 所；数据库 `integrity_check=ok`。
- `py -3.12 pipelines/task03/validate_admissions_db.py`：48,417/48,417 检查通过，0 失败。
- `py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'`：58/58 通过；其中 `test_admissions_db.py` 53/53。
- 数据库 SHA-256：`658b2efbf0f38d7e246848091b2a02e2cf64800c5b2235d87dd1fd836bc47a1d`；官方目录按规范化院校名覆盖 1,704/2,308，604 所仍为 `UNVERIFIED`；`TUITION_PENDING=797` 未被人为清零。
- 本轮未部署、未推送、未做浏览器视觉验收；云端开关保持关闭。官方来源映射见 [TASK03_SOURCE_MAPPING.md](TASK03_SOURCE_MAPPING.md)。

## 2026-09-16 / 官方学费证据继续补录第十三批实测

本轮从官方来源新增四川中医药职业学院、四川质量工程职业技术学院、四川财经职业学院、成都工贸职业技术学院 4 所数据库已有院校、24 条收费记录；第三方页面只用于发现线索，不作为入库证据。普通专业未见明确金额的院校继续保留为未核实，住宿费和代收费不并入学费。

- `py -3.12 pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条计划、`official_fee_reference=5714`、独立官方院校 1,665 所；数据库 `integrity_check=ok`。
- `py -3.12 pipelines/task03/validate_admissions_db.py`：47,852/47,852 检查通过，0 失败。
- `py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'`：58/58 通过；其中 `test_admissions_db.py` 53/53。
- 数据库 SHA-256：`40d26b4bf22432b4e30c2570ffe198184ec69832ad8a192ebf7a59220a0c853b`；官方目录按规范化院校名覆盖 1,665/2,308，643 所仍为 `UNVERIFIED`；`TUITION_PENDING=797` 未被人为清零。
- 本轮未部署、未推送、未做浏览器视觉验收；云端开关保持关闭。

## 2026-09-16 / 官方学费证据继续补录第十二批实测

本轮从官方来源新增云南轻纺职业学院、广安理工学院、内蒙古美术职业学院 3 所数据库已有院校、5 条收费记录；第三方页面只用于发现线索，不作为入库证据。云南特殊教育职业学院 2026 招生简章正文未给出可读取金额，因此没有用 2025 章程金额替代 2026 数据。

- `py -3.12 pipelines/task03/build_admissions_db.py`：通过；2,308 所院校、51,878 条计划、`official_fee_reference=5690`、独立官方院校 1,661 所；数据库 `integrity_check=ok`。
- `py -3.12 pipelines/task03/validate_admissions_db.py`：47,732/47,732 检查通过，0 失败。
- `py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'`：58/58 通过；其中 `test_admissions_db.py` 53/53。
- 数据库 SHA-256：`80180eba6ea33fc3a75fed85d083e461a007efb69b392d5335132d26d9d9b316`；官方目录按规范化院校名覆盖 1,661/2,308，647 所仍为 `UNVERIFIED`；`TUITION_PENDING=797` 未被人为清零。
- 本轮未部署、未推送、未做浏览器视觉验收；云端开关保持关闭。

## 2026-09-16 / 官方学费首轮剩余院校检索完成实测

本轮 700 所排队院校全部完成检索；严格复核后新增 32 所、114 条官方收费记录，668 所没有查到官方明确金额，仍标为未核实。临时附近金额规则产生的候选值已全部撤回并按收费章节重验，住宿费、资助/学费补偿金额和待定收费没有进入目录。

- `py -3.12 pipelines/task03/build_admissions_db.py`：通过；院校 2,308 所、招生计划 51,878 条、`official_fee_reference=5594`、独立官方院校 1,639 所，`integrity_check=ok`。
- `py -3.12 pipelines/task03/validate_admissions_db.py --db data/admissions/admissions.sqlite`：47,252/47,252 检查通过，0 失败。
- `py -3.12 -m unittest discover -s pipelines/task03 -p 'test*.py'`：58/58 通过；其中 `test_admissions_db.py` 为 53/53。
- 数据库摘要：`requirements=12275`、`observations=264971`、`TUITION_PENDING=797`、`requirement_unresolved=82`、`source_conflicts=0`；按规范化校名去重后 668 所未核实，原始工作簿 1 条重复“厦门大学”行使 raw `institution_pk` 未匹配行显示 669；数据库 SHA-256 为 `a121fdc81824900cff12d42380fb0898441e83690e22ed6925d3cd1434b2e1e0`。
- 发布边界：`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收；云端开关保持关闭。完整来源见 [TASK03_SOURCE_MAPPING.md](TASK03_SOURCE_MAPPING.md)。

## 2026-09-16 / 官方学费证据继续补录第十批实测

本轮新增吉林外国语大学、吉林师范大学博达学院、长春光华学院、长春工业大学人文信息学院 4 所数据库已有院校、15 条官方收费记录。来源为教育部阳光高考审核通过的 2026 年招生章程或学校官网招生章程；普通本科、艺术类、中外合作项目和专科收费分档保留，待定项目没有写入。

- `py -3.12 pipelines/task03/build_admissions_db.py --output data/admissions/admissions.sqlite`：通过；院校 2,308 所、招生专业计划 51,878 条、`official_fee_reference=1152`；数据库完整性 `ok`。
- `py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py`：53 项通过，0 失败。
- `py -3.12 pipelines/task03/validate_admissions_db.py --db data/admissions/admissions.sqlite`：25,042 项检查通过，0 失败；覆盖配置/数据库哈希、来源域名与 HTTPS、金额范围、币种/周期、证据哈希、数据库计数和原始计划事实未被覆盖。
- 官方目录累计 213 所院校、1,152 条记录；2,095 所仍没有足够官方具体金额，继续保持 `UNVERIFIED`；`TUITION_PENDING=797` 未被人为清零。
- 数据库 SHA-256：`996dbddbd38673b1d3e0f569f3988c2cb5674bd0ea9501ae151927d14ef13423`。本轮未部署、未推送、未做浏览器视觉验收，也未改变云端开关状态。

## 2026-09-16 / 官方学费证据继续补录第九批实测

本轮新增延边大学、白城师范学院、长春工业大学、吉林农业科技学院 4 所数据库已有院校、50 条官方收费记录。来源为学校招生网或教育部阳光高考审核通过的 2026 年招生章程；待批复项目没有写入，原始 `plan_record.tuition_*` 保持不变。

- `py -3.12 pipelines/task03/build_admissions_db.py --output data/admissions/admissions.sqlite`：通过；院校 2,308 所、招生专业计划 51,878 条、`official_fee_reference=1137`；数据库完整性 `ok`。
- `py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py`：53 项通过，0 失败。
- `py -3.12 pipelines/task03/validate_admissions_db.py --db data/admissions/admissions.sqlite`：24,967 项检查通过，0 失败；覆盖配置/数据库哈希、来源域名与 HTTPS、金额范围、币种/周期、证据哈希、数据库计数和原始计划事实未被覆盖。
- 官方目录累计 209 所院校、1,137 条记录；2,099 所仍没有足够官方具体金额，继续保持 `UNVERIFIED`；`TUITION_PENDING=797` 未被人为清零。
- 数据库 SHA-256：`b14c87888d1422a724a7022844881e6af6ecf9bce2e9d6385256d416049fd6af`。本轮未部署、未推送、未做浏览器视觉验收，也未改变云端开关状态。

## 2026-09-16 / 官方学费证据继续补录第八批实测

本轮新增吉林医药学院、吉林工商学院、吉林工程技术师范学院、吉林警察学院 4 所数据库已有院校、38 条官方收费记录。来源全部为教育部阳光高考审核通过的 2026 年招生章程；免费医学定向生、合作办学和艺术类按章程分类保留，未明确金额的项目没有写入，原始 `plan_record.tuition_*` 保持不变。

- `py -3.12 pipelines/task03/build_admissions_db.py --output data/admissions/admissions.sqlite`：通过；院校 2,308 所、招生专业计划 51,878 条、`official_fee_reference=1087`；数据库完整性 `ok`。
- `py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py`：53 项通过，0 失败。
- `py -3.12 pipelines/task03/validate_admissions_db.py --db data/admissions/admissions.sqlite`：24,717 项检查通过，0 失败；覆盖配置/数据库哈希、来源域名与 HTTPS、金额范围、币种/周期、证据哈希、数据库计数和原始计划事实未被覆盖。
- 官方目录累计 205 所院校、1,087 条记录；2,103 所仍没有足够官方具体金额，继续保持 `UNVERIFIED`；`TUITION_PENDING=797` 未被人为清零。
- 数据库 SHA-256：`d7c81aa9ffeef6e7e287a352ea459820f49e01811f0ee165393590f7ac42240b`。本轮未部署、未推送、未做浏览器视觉验收，也未改变云端开关状态。

## 2026-09-16 / 官方学费证据继续补录第七批实测

本轮新增吉林农业大学、吉林化工大学、吉林财经大学、长春理工大学 4 所数据库已有院校、41 条官方收费记录。来源为教育部阳光高考审核章程或吉林财经大学招生网 2026 年章程；长春理工大学章程明确标注待定的专业没有写入，原始 `plan_record.tuition_*` 保持不变。

- `py -3.12 pipelines/task03/build_admissions_db.py --output data/admissions/admissions.sqlite`：通过；院校 2,308 所、招生专业计划 51,878 条、`official_fee_reference=1049`；官方标签计数保持 `211=132`、`985=52`、`双一流=161`，数据库完整性 `ok`。
- `py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py`：53 项通过，0 失败。
- `py -3.12 pipelines/task03/validate_admissions_db.py --db data/admissions/admissions.sqlite`：24,527 项检查通过，0 失败；覆盖配置/数据库哈希、来源域名与 HTTPS、金额区间、币种/周期、证据哈希、数据库计数和原始计划事实未被覆盖。
- 官方目录累计 201 所院校、1,049 条记录；2,107 所仍没有足够官方具体金额，继续保持 `UNVERIFIED`；`TUITION_PENDING=797` 未被人为清零。
- 数据库 SHA-256：`30925736395f5f0e575b518fbdb463d43dacf2671e2b2aeaa744fc6386bfe664`。本轮未部署、未推送、未做浏览器视觉验收，也未改变云端开关状态。

## 2026-09-16 / 官方学费证据继续补录第六批实测

本轮在前一条记录基础上继续补录 14 所现有院校、50 条官方收费记录：上海健康医学院、上海商学院、中华女子学院、北京信息科技大学、北京第二外国语学院、上海应用技术大学、上海师范大学、上海政法学院、上海戏剧学院、北京印刷学院、北京建筑大学、北京联合大学、首都经济贸易大学、北京物资学院。来源全部为学校官方 2026 页面或教育部阳光高考审核章程；上海海事大学的既有记录经核对后没有重复插入。

- `py -3.12 pipelines/task03/build_admissions_db.py --output data/admissions/admissions.sqlite`：通过；院校 2,308 所、招生专业计划 51,878 条、`official_fee_reference=1008`；官方标签计数保持 `211=132`、`985=52`、`双一流=161`，数据库完整性 `ok`。
- `py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py`：53 项通过，0 失败。
- `py -3.12 pipelines/task03/validate_admissions_db.py --db data/admissions/admissions.sqlite`：24,322 项检查通过，0 失败；覆盖配置/数据库哈希、来源域名与 HTTPS、金额区间、币种/周期、证据哈希、数据库计数和原始计划事实未被覆盖。
- 官方目录累计 197 所院校、1,008 条记录；2,111 所仍没有足够官方具体金额，继续保持 `UNVERIFIED`。计划级 `TUITION_PENDING=797` 未被人为清零，因为机构收费表没有逐条匹配到招生计划。
- 数据库 SHA-256：`48ed7026c27939337b56504661a0f27b565993e3673ac069e75ae94dc0d1bdd5`。本轮未部署、未推送、未做浏览器视觉验收，也未改变云端开关状态。

## 2026-09-16 / 官方学费证据继续补录第五批实测

本轮继续将教育部阳光高考已审核的 2026 年招生章程明确收费标准写入独立 `official_fee_reference` 表；新增东北电力大学、长春大学、长春师范大学、长春大学旅游学院、吉林师范大学、长春中医药大学、北华大学、吉林建筑大学 8 所院校、103 条官方收费记录。原始 `plan_record.tuition_*` 保持不变，未核实项保持 `UNVERIFIED`。

- `py -3.12 pipelines/task03/build_admissions_db.py --output data/admissions/admissions.sqlite`：通过；院校 2,308 所、招生专业计划 51,878 条、`official_fee_reference=958`；官方标签计数保持 `211=132`、`985=52`、`双一流=161`，数据库完整性 `ok`。
- `py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py`：53 项通过，0 失败。
- `py -3.12 pipelines/task03/validate_admissions_db.py --db data/admissions/admissions.sqlite`：24,072 项检查通过，0 失败；覆盖目录哈希、来源域名/HTTPS、金额区间、币种/周期、证据哈希、数据库计数和原始计划事实不被覆盖。
- `py -3.12 pipelines/task03/query_admissions.py --db data/admissions/admissions.sqlite --stats`：`institution=2308`、`plan_record=51878`、`official_fee_reference=958`，schema `1.1.0`。
- 数据库 SHA-256：`91ee7de03a2744bbbeb41f9c86aba6147060e3fb7103e1c554aacfd7e66941015`。本轮未部署、未推送、未做浏览器视觉验收，也未改变云端开关状态。

## 2026-09-16 / 官方学费证据继续补录第四批实测

本轮继续把教育部阳光高考已审核的 2026 年招生章程明确收费标准写入独立 `official_fee_reference` 表；原始 `plan_record.tuition_*` 保持不变。新增北京电影学院、鞍山师范学院、天津理工大学中环信息学院、长春建筑学院、长春人文学院 5 所院校、15 条官方收费记录；目录累计 175 所院校、855 条记录，2,133 所院校仍没有足够的官方具体金额，保持 `UNVERIFIED`。

- `py -3.12 pipelines/task03/build_admissions_db.py --output data/admissions/admissions.sqlite`：通过；院校 2,308 所、招生专业计划 51,878 条、`official_fee_reference=855`；官方标签计数保持 `211=132`、`985=52`、`双一流=161`，数据库完整性 `ok`。
- `py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py`：53 项通过，0 失败。
- `py -3.12 pipelines/task03/validate_admissions_db.py --db data/admissions/admissions.sqlite`：23,557 项检查通过，0 失败；覆盖目录哈希、来源域名/HTTPS、金额区间、币种/周期、证据哈希、数据库计数和原始计划事实不被覆盖。
- `py -3.12 pipelines/task03/query_admissions.py --db data/admissions/admissions.sqlite --stats`：`institution=2308`、`plan_record=51878`、`official_fee_reference=855`，schema `1.1.0`。
- 数据库 SHA-256：`e79d722e8028e63dd156ab3ed6d6bb7dfe26beb5c352c9d1c700df6dc2bf8606`。本轮未部署、未推送、未做浏览器视觉验收，也未改变云端开关状态。

## 2026-09-16 / 官方学费证据继续补录第三批实测

本轮继续把教育部阳光高考已审核的 2026 年招生章程明确收费标准写入独立 `official_fee_reference` 表；原始 `plan_record.tuition_*` 保持不变。新增长春科技学院、喀什大学、白城医学高等专科学校、玉溪师范学院、北京石油化工学院、长春电子科技学院 6 所院校、25 条官方收费记录；目录累计 170 所院校、840 条记录，2,138 所院校仍没有足够的官方具体金额，保持 `UNVERIFIED`。

- `py -3.12 pipelines/task03/build_admissions_db.py --output data/admissions/admissions.sqlite`：通过；院校 2,308 所、招生专业计划 51,878 条、`official_fee_reference=840`；官方标签计数保持 `211=132`、`985=52`、`双一流=161`，数据库完整性 `ok`。
- `py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py`：53 项通过，0 失败。
- `py -3.12 pipelines/task03/validate_admissions_db.py --db data/admissions/admissions.sqlite`：23,482 项检查通过，0 失败；覆盖目录哈希、来源域名/HTTPS、金额区间、币种/周期、证据哈希、数据库计数和原始计划事实不被覆盖。
- `py -3.12 pipelines/task03/query_admissions.py --db data/admissions/admissions.sqlite --stats`：`institution=2308`、`plan_record=51878`、`official_fee_reference=840`，schema `1.1.0`。
- 数据库 SHA-256：`b2abf335a84a898d84cf65104fbca060dc634ed922c7246d921495bacdd1178bd`。本轮未部署、未推送、未做浏览器视觉验收，也未改变云端开关状态。

## 2026-09-16 / 官方学费证据继续补录第二批实测

本轮继续把教育部阳光高考已审核的 2026 年招生章程明确收费标准写入独立 `official_fee_reference` 表；原始 `plan_record.tuition_*` 保持不变。新增首都医科大学、河南中医药大学、天津医科大学临床医学院、桂林医科大学、内蒙古医科大学 5 所院校、27 条官方收费记录；目录累计 164 所院校、815 条记录，2,144 所院校仍没有足够的官方具体金额，保持 `UNVERIFIED`。

- `py -3.12 pipelines/task03/build_admissions_db.py --output data/admissions/admissions.sqlite`：通过；院校 2,308 所、招生专业计划 51,878 条、`official_fee_reference=815`；官方标签计数保持 `211=132`、`985=52`、`双一流=161`，数据库完整性 `ok`。
- `py -3.12 pipelines/task03/test_admissions_db.py`：53 项通过，0 失败。
- `py -3.12 pipelines/task03/validate_admissions_db.py`：23,357 项检查通过，0 失败；覆盖官方目录哈希、来源域名/HTTPS、金额区间、币种/周期、证据哈希、数据库计数和原始计划事实不被覆盖。
- `py -3.12 pipelines/task03/query_admissions.py --stats`：`institution=2308`、`plan_record=51878`、`official_fee_reference=815`，schema `1.1.0`。
- 数据库 SHA-256：`82970fc1685bd5fea5cfa5899759c1c27008bad262ff41f029c6c0c6c9fe9f97`。本轮未部署、未推送、未做浏览器视觉验收，也未改变云端开关状态。

## 2026-09-16 / 官方学费证据继续补录本轮实测

本轮继续把学校官网或教育部阳光高考审核章程中明确的 2026 年收费标准写入独立 `official_fee_reference` 表；原始招生工作簿学费字段保持不变。新增 7 所院校、18 条记录后，当前官方目录为 159 所院校、788 条记录；2,308 所院校中仍有 2,149 所没有足够官方具体金额，保持 `UNVERIFIED`。

- `py -3.12 pipelines/task03/build_admissions_db.py`：通过；院校 2,308 所、招生专业计划 51,878 条、`official_fee_reference=788`；数据库本地发布状态仍为 `NOT_PUBLISHED`。
- `py -3.12 pipelines/task03/test_admissions_db.py`：53 项通过，0 失败。
- `py -3.12 pipelines/task03/validate_admissions_db.py`：23,222 项检查通过，0 失败；覆盖目录哈希、来源域名/HTTPS、金额区间、币种/周期、证据哈希、数据库计数和原始计划事实不被覆盖。
- `py -3.12 pipelines/task03/query_admissions.py --stats`：`institution=2308`、`plan_record=51878`、`official_fee_reference=788`，schema `1.1.0`。
- 数据库 SHA-256：`38ce90f2bad374f04439dad093c7d7cc079c11519fad4d4cf3c41ccff7db47c0`。本轮未部署、未推送、未做浏览器视觉验收，也未改变云端开关状态。

## 2026-09-15 / 官方学费证据补录本轮实测

本轮把官方收费信息放入独立的 `official_fee_reference` 表，保持原始招生工作簿学费字段不变。当前数据库共 2,308 所院校，已从学校官网或教育部阳光高考审核招生章程核验 18 所、87 条 2026 学年收费记录；其余 2,290 所没有足够的官方证据，保持 `UNVERIFIED`，不使用第三方网页推断。

- `py -3.12 pipelines/task03/build_admissions_db.py`：通过；院校 2,308 所、招生专业计划 51,878 条；本地数据库发布状态仍为 `NOT_PUBLISHED`。
- `py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py`：53 项通过，0 失败；新增断言确认 `ownership` 与 `level_label` 已能区分公办/民办本科和专科组合。
- `py -3.12 pipelines/task03/validate_admissions_db.py`：19,717 项检查通过，0 失败；包括目录哈希、来源域名、HTTPS、金额区间、币种/周期、证据哈希和数据库计数。
- `py -3.12 pipelines/task03/query_admissions.py --stats`：`official_fee_reference=87`，schema `1.1.0`。
- 性质字段实测无空值；组合计数为公办专科 753、公办本科 853、民办专科 266、民办本科 314。该属性来自当前招生工作簿院校属性列，本轮没有把它宣称为逐校教育部性质复核。
- 数据库 SHA-256：`3a3ae7ab973779283c7aa1c6b4401fe393faf10cd5f974b2ac4e2d5a444655d8`。本轮未部署、未做线上验收、未改变云端开关状态。

## 2026-09-15 / 官方院校标签本轮实测

本轮新增并重建招生库的官方 `211`、`985`、`双一流` 标签；本节只记录本轮命令，不覆盖下方历史验证。官方名单基数为 `211=112`、`985=39`、第二轮 `双一流=147`，数据库当前命中分别为 `132/52/161`，差异来自明确校区、医学部、深圳/威海等招生实体的继承映射，以及当前招生工作簿未出现的官方成员不被凭空创建；独立学院排除规则已验证。

- `py -3.12 pipelines/task03/build_admissions_db.py`：通过；招生库核心记录仍为 51,878 条，院校 2,308 所，数据库发布状态保持 `NOT_PUBLISHED`。
- `py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py`：50 项通过，0 失败。
- `py -3.12 pipelines/task03/validate_admissions_db.py`：19,279 项检查通过，0 失败。
- `py -3.12 pipelines/task03/query_admissions.py --stats`：已纳入 `reference_index` 表计数，可查看官方定义索引存在性。
- 本轮未执行：线上部署、浏览器视觉验收、全项目 Node 测试；也未改变招生库发布状态。

## 2026-09-14 / 云端开关：任意设备网页 + 中转，开/关实测通过

本轮把开关升级为「任意设备可用」：网页（COS 静态 HTML）→ 云端中转函数 `nanming-control`（SCF，Python 3.10，成都）→ 腾讯云 API。没有改业务代码，因此没有跑类型检查、构建或单元测试；47 文件 554 项仍是历史结果。

本次实测：

- 网页公网可达：`GET https://…/switch/b76b5b97.html` → 200、`text/html`、14,046 字节；页面内只有中转地址与控制口令，没有 `AKID` 样式密钥。
- 浏览器侧（真实浏览器，在 `github.io` 源上 `fetch`）：读 COS 发布指针 → 200；调中转 `/api/status` → 401「口令不对」；说明跨域头与口令鉴权在浏览器里都生效，且错误口令被拒。
- 中转接口：`/api/status` 正常返回实例/函数/探针/账单；`/api/action` 的 `off` 12 秒内 `done=true`；重复点同一动作 2 秒返回「已经是开启状态，无需改动」。
- 完整 `on`：新建实例 → 等运行中 → 开通外网地址 → `AUTH OK · PING PONG` → 回填三项环境变量并把 `NANHANG_AI_ALLOW_MEMORY_STORE` 置 0 → `/healthz` 200 且 `store=redis`；随后 `off` 销毁实例、移除变量，回到 `store=memory`、学校查询 401。
- 欠费路径（本轮早前实测）：创建被腾讯云以 `ERR_INSUFFICIENT_BALANCE` 拒绝，不产生费用；页面与 CLI 都给出「先充值」的提示。
- 助手核心 `selftest` 7/7（含「云函数环境写入回路」原样写回比对）。

未做：网页的视觉与交互最终验收（按项目规则由负责人执行）；未跑本地测试套件（本轮未改业务代码）。已知脾气：首次开启时腾讯云「开通外网地址」可能排队几分钟到十几分钟（实测 20 秒～13 分钟），页面会持续显示进度；关闭是秒级。收尾时云端保持关闭状态。

## 2026-09-14 / 服务开关：助手自检、网页连通，开→关全链路实测通过

本轮只新增一个本机工具（在工作区之外：`C:\Users\yusheng\Desktop\南溟服务开关\`），没有改业务代码，因此没有跑类型检查、构建或单元测试；47 文件 554 项仍是历史结果。

本次实测（命令与输出都在助手窗口与 `操作记录.log` 里）：

- `py -3.12 nanming_switch.py selftest`：7/7 通过——凭据读取（本机私有交接文档）、Redis 实例查询、云函数环境读取、「云函数环境写入回路」（把现有 10 个变量原样写回并逐项比对一致，只验证写入路径、不改内容）、账单与余额、`/healthz`、学校查询 401。
- `py -3.12 nanming_switch.py status`：`state=off`、`consistent=true`；账单本月 ¥7.01（缓存 6.28 / CLS 0.52 / 计费精度差异 0.12 / COS 0.09），与上一轮独立审计逐项一致。
- `py -3.12 nanming_switch.py off`：幂等通过（无运行实例 → 跳过销毁；环境变量已是内存档 → 原样写回并复核；站点确认回到 `store=memory`）。
- 本地网页服务：`GET /` 200（19,099 字节）、`/api/status` 返回当前状态；伪造来源 `Origin: https://evil.example` 的 `POST /api/action` 得到 403；`Origin: null`（双击 HTML 打开的场景）可正常走到参数校验；页面脚本经 `node --check` 通过。
- `启动开关.cmd` 双击路径：起服务、自动开浏览器、页面 200、状态正确；重复双击时第二个实例明确报「端口 8770 已经被占用」并以退出码 1 结束（不再出现两个助手同时监听）。
- 欠费时的 `on`：参数经 `DescribeProductInfo` 核实（`ZoneId=160001`＝ap-chengdu-1、TypeId 17、256MB、1 副本、按量可售）后提交，被腾讯云拒绝：`ERR_INSUFFICIENT_BALANCE ... balance -13 is less than the frozen amount 4`。**欠费账户不能创建按量资源**；该请求未创建资源、未产生费用。
- 负责人当天充值后（余额 187）**补测开启全链路并成功**：创建 `crs-i937eo6w` → 运行中 → 自动开通外网地址 `cd-crs-i937eo6w.sql.tencentcdb.com:20449` → `AUTH OK · PING PONG` → 回填三项环境变量并把 `NANHANG_AI_ALLOW_MEMORY_STORE` 置 0 → `/healthz` 200 且 `store=redis`、`/readyz` 为 `{"public_data":true,"ai":true,"state_store":true,"upstream":"qianfan"}`；随后 `off` 回到冻结态（实例 `-3`、函数 10 个变量且无 `NANHANG_REDIS_*`、`store=memory`、学校查询 401）。测试实例存活约 3 分钟。

未做：网页的视觉与交互验收（按项目规则由负责人执行）；未跑本地测试套件。工具目录不含任何凭据，也不进入 Git 与源码包；结束时云端处于「已关闭」状态。

## 2026-09-14 / 云端计费冻结：只读盘点 + 冻结后探针

本轮只改云端配置与文档，没有改业务代码，因此没有运行类型检查、构建、单元测试或浏览器校检；47 文件 554 项等数字仍是历史结果。

本次实测分两段。盘点段全部只读：用腾讯云 SDK 读账单明细与资源清单，得到 2026-09-01 至 09-14 共 ¥7.01（缓存 ¥6.28、CLS ¥0.52、计费精度差异 ¥0.12、COS ¥0.09），账单中出现过 9 个 Redis 实例、冻结前仅 1 个在运行，五个云函数都没有定时触发器，CVM 五个地域均为 0 台。动作段销毁该按量实例并调整函数环境变量，随后探针：`GET /healthz` 返回 200 与 `{"ai":true,"store":"memory"}`，`POST /v1/school/identify` 以不存在的姓名请求返回 401 与既定提示语。未消耗负责人 TOTP 动态码，未使用真实学生姓名或成绩，未在冻结后重测真实 AI 链路。

账单按小时结算并有两小时左右延迟，最后一笔 Redis 费用需之后再回读确认；账户欠费未处理。逐项证据见[冻结记录](verification/cloud-cost-freeze-2026-09-14.json)。

## 2026-09-13 / 前端专项：仅代码审阅，无业务实测

本轮按负责人要求未执行类型检查、单元测试、构建、复现脚本、API调用、浏览器/视觉/操作校检。检查方法仅为读取当前基线 `14fad3f` 的源代码、配置、测试代码与文档；发现数与推导边界见[前端代码审阅](FRONTEND_CODE_REVIEW_2026-09-13.md)。上轮47文件554项、Python与数据校验仍是历史，未重跑。

本轮唯一执行的校验为项目要求的文档一致性 `tools/sync_project_docs.py --package` / `--check`，它不证明功能或视觉正确，结果以本轮实际工具返回为准。


## 2026-09-13 / 全项目审阅实测

基线 `14fad3f`：类型检查通过，Vitest 47 文件 554 项通过；双前端构建通过。Python task03 53 项、学校码 4 项、Pages 配置 1 项通过。独立招生库验证 19,264 项、分段表验证 19,178 项通过。5 项审阅探针复现当前问题（提取前端回调与真实 Redis 客户端合成服务），不是业务通过数，也不是浏览器验收。

官方 registry 审计返回同一 Vitest 中危公告的 2 个包条目；默认镜像 audit 不支持，未把其 404 当成无漏洞。命令与脱敏摘要见[本轮证据](verification/project-review-2026-09-13.json)，问题、范围与未执行项见[全项目审阅](PROJECT_REVIEW_2026-09-13.md)。没有生产探测/部署、视觉、学生规模或回滚验收。历史 554 项日志属于此前快照，本轮独立命令结果记录在上述 JSON。


## 2026-09-13 最新前端待发布快照

全站宋体与定位/分数轴共用区间标尺已纳入本机完整快照。`npm run typecheck` 通过；`npm test -- --maxWorkers=2` 为 45 个测试文件、549 项通过、0 失败；使用正式公开 API/COS 地址与 `/nanming/` base 构建主前端通过（JS gzip 111.12 kB）。工作区根目录 `py -3.12 tools/sync_project_docs.py --package` 与 `--check` 通过。这些是本机结果，下面的 Pages `c0b2664` 是上一轮已经上线的快照；新版本的线上结果待工作流和公网资产核验后补记。

## 2026-09-13 当前前端与 AI 收尾轮

仓库文档：根 README 和工程 README 已清理旧主入口/旧部署表述，公开页面链接与本地命令已核对；GitHub About 简介和主页字段经 `gh repo view` 回读均为新值。文件仅整理导航与说明，未移动前端源码。

并发验证注记：第一次全量 43 文件 532 项通过后，纸堆动画继续变动，之后两次全量各有 1 个前端源码字符串断言未跟上同时写入的常量/样式，故不能把初次结果当成最终源码结果；最终重新执行的命令与日志覆盖下方旧数据。失败未涉及后端收尾功能，千帆专项 35 项通过。

- 本次实测 `npm run typecheck` 通过；`npm test -- --maxWorkers=2` 为 44 文件、540 项通过、0 失败；正式公网 API/COS 地址 `npm run web:build` 通过，主 JS gzip 111.08 kB。日志：`verification/latest-frontend-typecheck-2026-09-13.txt`、`latest-frontend-tests-2026-09-13.txt`、`latest-frontend-build-2026-09-13.txt`。
- `node scripts/build_function.mjs` 通过。云端 API 版本 10 Active，环境未改，ZIP 内容比对一致，health/ready HTTP 200。合成材料经真实 TOTP 兑换和千帆收尾轮返回 HTTP 200、complete、0 选项、无追问；会话撤销。脱敏报告：`verification/final-turn-cloud-api-2026-09-13.json` 和 `final-turn-online-2026-09-13.json`。未使用真实学生资料。
- Pages 提交 `c0b2664` 的 [工作流 34706440514](https://github.com/yusheng266186-beep/nanming/actions/runs/34706440514) 构建和部署成功；公网 HTML、JS、CSS 均 200，JS/CSS 与本机正式构建逐字节一致，公开 README 是当前版本，见 `verification/latest-pages-online-2026-09-13.json`。CI 验证另有 3 项失败：两处既有数据哈希断言和缺少私有学校分片；按负责人要求不阻断半成品发布，不记为通过。浏览器视觉验收由负责人完成；学生规模、校园网与回滚限制保持。

## 2026-09-12 最新前端与后端合同对齐

- `npm run typecheck`：通过；日志见 [latest-frontend-typecheck-2026-09-12.txt](verification/latest-frontend-typecheck-2026-09-12.txt)。
- `npm test -- --maxWorkers=2`：41个测试文件、509项通过、0失败；日志见 [latest-frontend-tests-2026-09-12.txt](verification/latest-frontend-tests-2026-09-12.txt)。
- 使用正式 `VITE_NANHANG_API_BASE` 与 `VITE_NANHANG_RELEASE_BASE` 执行 `npm run web:build`：通过，主JS 329.86 kB（gzip 106.84 kB）；日志见 [latest-frontend-build-2026-09-12.txt](verification/latest-frontend-build-2026-09-12.txt)。
- 合同检查：院校分组、方向收口冻结和最新谈心交互没有新增API或数据库字段；就业方向按钮继续向 `/v1/career/turn` 发送普通学生文本，现有后端可处理。线上 `/healthz`、`/readyz` 均200，AI、Redis、千帆和公开数据就绪。
- 本轮未修改前端源码，也未作浏览器视觉验收。Pages发布结果将在工作流完成后补记。

## 2026-09-12 南溟 TOTP

- `npm run typecheck`：通过；`npm test -- --run apps/api/test/api.test.ts packages/ai-gateway/test/redis-store.test.ts apps/web/test/ai-panel.test.ts apps/web/test/backend-alignment.test.ts --maxWorkers=2`：4文件66项通过。
- `npm test -- --maxWorkers=2`：40文件，482项通过、1项失败。失败为航线图窄屏断言仍要求 `useNarrowPlate`，当前并行实现已无该符号；与认证代码无关，未宣称全量通过。`npm run web:build` 通过。
- 云端 API 版本9：动态码兑换200、同码重放401 `TOTP_REPLAYED`、旧固定码401、会话撤销200、线上ZIP内容一致、旧环境配置保留。见 [脱敏报告](verification/nanming-totp-online-2026-09-12.json)。本轮未打印或记录原始种子。
- Pages `8de1983` 经工作流 `34697202201` 构建与部署成功；公网HTML、JS均200，JS包含动态码输入及过期/重放提示。CI另有两处既有数据哈希断言与私有成绩分片缺失，共3项失败；它们未阻断本轮发布，也未记为通过。
- 未作页面视觉验收、学生规模发码或回滚演练。

## 2026-09-12 / acceptance-followup-complete

补充快照9e31d9f已完成Pages构建与部署，工作流34696117253由gh run watch --exit-status返回成功。CI仍出现两处哈希断言与私有学校测试文件缺失，按授权不阻断；不冒充全量通过。API继续版本8。本条仅归档发布结果，重新执行--package/--check后以[skip ci]文档提交推送，避免重复构建相同代码。负责人从Pages实际验收，未完成门禁保持。


## 2026-09-12 / acceptance-followup：继续发布当前前端

负责人要求继续；核对基线5124e86，上一轮线上为f18f215。本次把其后方向卡片修复、航线图样式及当前talk聊天界面、动效与聊天测试一起纳入快照，不等待在建工作收尾；不覆盖其他任务修改。API源代码未变，保留已经线上核验的版本8和881密文，不重复上传。已有39文件481项本地结果来自其他任务记录，不充当本轮新实测。根目录--package/--check同步后提交推送，等待Pages构建和部署；本轮仍允许测试失败不阻断半成品发布，具体结果以对应Actions运行记录为准。任务与门禁不变，完整视觉/功能验收仍由负责人完成。


## 2026-09-12 / acceptance-final-confirmed：最终发布结果

最终源码快照f18f215已成功发布，GitHub Actions [34694705981](https://github.com/yusheng266186-beep/nanming/actions/runs/34694705981)构建与部署成功；API为版本8。公网HTML、JS、CSS请求均200。云端测试为3文件失败、33文件通过、1文件跳过（3项失败）：两处数据哈希断言不一致及学校私有分片未进入CI；按负责人要求允许半成品发布，没有把这些测试标为通过，也没有为测试上传学生明文。本轮无后续功能修改；本条仅补充实际发布结果，文档重新--package/--check后归档提交。线上48人查询、两种speed聊天和会话撤销结果见acceptance-online记录。完整功能与视觉由负责人验收。


## 2026-09-12 当前快照线上实测（负责人验收版本）

- API版本8为Active，881密文上传及线上ZIP逐项比对成功，环境变量全部保留；[部署结果](verification/acceptance-cloud-api-2026-09-12.json)。
- 使用负责人提供的身份表逐一请求线上接口：四班48人均成功，本人分片与原数据一致，匿名考试汇总返回，Pages来源CORS一致；其余8人保留原码。本机保留规则已在前轮全量核验，本次未用缺失身份的8人做线上登录。
- 真实千帆speed档：guided完成且返回4项选择；open完成且无选择项；兑换和会话撤销成功。health/ready、Redis、Pages均通过。详见[线上结果](verification/acceptance-online-2026-09-12.json)。
- 首次网络断连后有限重试；核验脚本一度用错evidence.kind被400拒绝，改成与前端一致的student_self_report后两模式通过。此错误来自脚本测试数据，没有修改线上接口来迁就脚本。
- 首轮Pages工作流34694203265成功；本次最终提交继续纳入期间的前端在建修改，推送后由同一工作流构建发布。未再次运行本机全量测试，云端保留验证结果但依负责人要求不阻断半成品发布。历史454项结果不能冒充最终快照的新测试结果。
- 未完成：负责人视觉与完整功能验收、standard/deep本轮在线调用、真实学生规模/校园网、回滚演练；任务与门禁不虚增。文档执行根目录--package和--check后随代码同次提交。


## 最新：四班身份证后六位查询码，X转0

- 类型检查通过：[日志](verification/class4-codes-x0-typecheck-2026-09-12.txt)；全量36文件454项通过：[测试](verification/class4-codes-x0-tests-2026-09-12.txt)。Python合成测试4项通过；SCF打包通过。
- 48人真实本机HTTP查询全部成功，6人验证X→0。旧48个查询键移除，其余832键保持原样，四班未提供身份的8人保留原码。成绩SQLite哈希不变：[脱敏结果](verification/class4-codes-x0-result-2026-09-12.json)。
- 先前支持X的结果为历史，已被负责人改用0的指示替代；初始测试跨目录导入造成类型检查失败，最终已修正。当时尚未部署或线上核验新码；后续验收部署结果见本页最新补充，不作视觉验收。
- 操作与发布边界见[查询码专题](CLASS4_QUERY_CODES.md)。


## 最新：章节版后端对齐（2026-09-12）

- 类型检查通过：[最终类型检查](verification/backend-alignment-typecheck-latest-2026-09-12.txt)。全量34文件439项通过：[最终测试](verification/backend-alignment-tests-latest-2026-09-12.txt)。后端与AI客户端专项11文件168项通过：[专项](verification/backend-alignment-focused-2026-09-12.txt)。
- 双前端生产构建通过：[构建](verification/backend-alignment-build-latest-2026-09-12.txt)；SCF打包与Pages配置检查器单元测试通过。
- 本机SCF打包产物，真实学校身份只回本人+汇总、假AI HTTP与会话撤销：[脱敏结果](verification/backend-alignment-smoke-2026-09-12.json)。新增汇总密文实际回读与源exams/trend完全一致。
- 线上现有API/Redis健康、Pages CORS与招生current.json通过：[线上只读](verification/backend-alignment-online-2026-09-12.json)。该记录为部署前状态，不视为本轮联合上线验收；后续发布与实测单列。
- 先前两轮默认并发目录测试超时，后采用maxWorkers=2通过；中途因并发前端编辑出现的编译/文案断言失败已由最新工作区通过结果替代，原始日志保留。本轮不做视觉验收、全量Excel重解析或学生规模/校园网/回滚验收。
- 发布顺序与各功能映射见[后端对齐](BACKEND_FRONTEND_ALIGNMENT.md)。文档包同步结果以本轮根目录 --package/--check 实际结果为准。


## 最新验证：五步主流程（2026-09-12）

| 验证 | 实测结果 | 证据 |
|---|---|---|
| 合同生成、全工程类型检查与测试 | 26 个文件、377 项通过、0 失败 | [完整日志](verification/npm-validate-journey-2026-09-12.txt) |
| 两前端构建 | 主版与纸感版通过；主 JS gzip 63.12 KB，另有 19.54 KB Worker | [构建日志](verification/build-journey-2026-09-12.txt) |
| 主流程浏览器 | 真实招生数据；合成 AI 与学校界面响应；1440/390/320、页面异常 0、无横向溢出，完整分路/重算/双成绩路径通过 | [结果](verification/journey-browser-result.json)、[截图](verification/journey-screenshots/) |
| 学校真实本地接口 | 抽一条已发放身份，正确二元组成功、错名失败；回环 HTTP，不输出隐私 | [结果](verification/school-local-result.json) |

新增 17 项专项断言覆盖范围判断、缺考/缺线、目录 ID、实际网关、本人二元组与限流。旧章节静态测试保留作迁移回归，不单独证明新主入口。

本次未验证：真实模型在新词表上的对话质量、新五步前端与学校端点的线上运行、真实学生理解、校园网络和回滚。
（共享会话与限流的线上行为已另行验证：云函数跑 Redis 共享存储、跨实例会话可用、学校端点限流 429 跨实例生效，见 [AI 接入与部署](AI_QIANFAN_SETUP.md) 与 [质量慧析管线](QUALITY_HUIXI_PIPELINE.md)。）并发任务的既有线上 API 三轮记录保留在 AI 专题中，不能替代这里的新协议验收。

本轮根目录 `--package` 与 `--check` 均通过：11 份冻结副本一致、24 份基线文件、0 错误；交接副本、索引、哈希与源码包已同步。当前主流程和后续事项见 [项目进度](PROJECT_STATUS.md)，决策见 [ADR-003](ADR_003_STUDENT_JOURNEY.md)。

## 先前文档同步轮验证（历史，不代表最新主入口）



核对：2026-09-12；业务基线 `e2001cb5a1ff301c303a4bf4295ebf71c3ab4e1b`。当时任务见 [项目进度](PROJECT_STATUS.md)。测试通过不等于线上验收或真实学生试用。

| 验证 | 本次结果 | 证据 |
|---|---|---|
| 合同类型生成、TypeScript 检查、Vitest | 22 文件、342 项通过、0 失败 | [原始日志](verification/npm-validate-2026-09-12-doc-sync.txt) |
| 主前端与纸感前端构建 | 两者通过 | [构建日志](verification/build-all-2026-09-12-doc-sync.txt) |
| 文档摘要、交接参考副本、源码包、索引、哈希与链接 | 本轮 --package 与 --check 均通过：11 份冻结副本一致、24 份基线文件、0 错误 | 本机实际输出已核对；完整工作区可复跑 |

本机 Node 26.7.0 / npm 11.19.0。Pages 使用 Node 22，SCF 脚本指定 Nodejs20.19；本机通过不代替云运行时兼容性验证。

## 既有证据（本次未重新执行）

- 招生数据核实及不可变发布：51,878 条，见 [核实与发布](TASK03_VERIFICATION_AND_RELEASE.md)。
- 学校工作簿解析、建库、分片核验及浏览器实测，见 [学校管线](QUALITY_HUIXI_PIPELINE.md)。发布数据为 12 场考试；源表的 13 组考试列不应写成已发布 13 场。
- 真千帆探针与完整网关历史成功记录，见 [AI 接入](AI_QIANFAN_SETUP.md)。本轮测试使用自动化测试配置，不消耗真实模型额度。
- 早期多视口、打印及本地阶段验收见 TASK09/TASK10 专题；它们是对应阶段的历史结果，不能直接覆盖新增界面。

## 该轮当时的验证缺口

- 未在本次执行真实模型连续多轮/多人并发/计费验证、线上健康检查、手机与校园网络、回滚、全量 Python 管线或浏览器重验。
- 学生原话请求链路已在 e2001cb 实现并补测试；空证据仍回退到演示注册表，生产隔离待完成。
- 学生成绩鉴权与限流未实现；API 仍使用内存存储，部署脚本开启试用豁免不等于共享状态已完成。
- ADR-002 公式断言不证明模考到高考的统计预测有效性。
- TASK-11 按负责人决定跳过，GATE-PILOT 无观察证据；GATE-PUBLISH、GATE-APP 未通过。

此前各阶段详细表格保存在 [历史验证快照](verification/validation-history-before-e2001cb.md)，不得引用其中“当前”作为最新进度。后续每次修改按 [同步规范](DOCUMENTATION_POLICY.md) 维护本页。
