# 文件总索引

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-20，2026-09-20-university-detail-enrichment-82）：完成官方学费队列核查和两库合并后，已对统一库 2,308 所院校批量编排详细档案：每校平均 918 字，保留教育部名录、阳光高考章程入口、学科/学位、招生计划、费用与来源状态；统一库与详细来源表一次性写入，数据库独立验证、68 项 TASK-03 Python 测试通过；未执行线上部署，云端开关仍保持关闭。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：47 个测试文件、554 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：统一数据库已生成并作为本地查询入口；后续若招生库或官方学费目录继续更新，应先重建/验证南航规范化招生库，再运行 pipelines/task03/merge_admissions_databases.py 重新生成统一库，不能只替换其中一侧。118 个 institution 实体行仍没有可直接入库的官方明确 CNY/学年金额，继续保持未知；同时按全项目审阅修 P1 与状态生命周期，TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](nanhang-app/docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

本表逐项覆盖项目受管文件；node_modules、dist、dist-scf、.zcode、coverage、*.tsbuildinfo、Python 缓存与 .venv-contracts 是可再生成的依赖/构建目录，按类别保留，不列第三方文件。历史压缩包保持原样，内部旧文档仅用于追溯。

| 文件 | 用途 |
|---|---|
| [.commandcode/taste/taste.md](.commandcode/taste/taste.md) | 工程配置或总入口 |
| [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) | 工程配置或总入口 |
| [.gitignore](.gitignore) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/.github/workflows/pages.yml](.nanhang-ref/zhiliang-huixi/.github/workflows/pages.yml) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/.gitignore](.nanhang-ref/zhiliang-huixi/.gitignore) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/components/charts.tsx](.nanhang-ref/zhiliang-huixi/app/components/charts.tsx) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/globals.css](.nanhang-ref/zhiliang-huixi/app/globals.css) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/analytics.ts](.nanhang-ref/zhiliang-huixi/app/lib/analytics.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/chart-theme.ts](.nanhang-ref/zhiliang-huixi/app/lib/chart-theme.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/class-config.ts](.nanhang-ref/zhiliang-huixi/app/lib/class-config.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/demo.ts](.nanhang-ref/zhiliang-huixi/app/lib/demo.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/exporters.ts](.nanhang-ref/zhiliang-huixi/app/lib/exporters.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/format.ts](.nanhang-ref/zhiliang-huixi/app/lib/format.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/import-client.ts](.nanhang-ref/zhiliang-huixi/app/lib/import-client.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/import-worker.ts](.nanhang-ref/zhiliang-huixi/app/lib/import-worker.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/metrics.ts](.nanhang-ref/zhiliang-huixi/app/lib/metrics.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/parser.ts](.nanhang-ref/zhiliang-huixi/app/lib/parser.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/report-model.ts](.nanhang-ref/zhiliang-huixi/app/lib/report-model.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/score-validation.ts](.nanhang-ref/zhiliang-huixi/app/lib/score-validation.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/storage.ts](.nanhang-ref/zhiliang-huixi/app/lib/storage.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/lib/types.ts](.nanhang-ref/zhiliang-huixi/app/lib/types.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/app/page.tsx](.nanhang-ref/zhiliang-huixi/app/page.tsx) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/docs/WORKBOOK-OPTIMIZATION-v1.2.md](.nanhang-ref/zhiliang-huixi/docs/WORKBOOK-OPTIMIZATION-v1.2.md) | 实施进度与记录 |
| [.nanhang-ref/zhiliang-huixi/eslint.config.mjs](.nanhang-ref/zhiliang-huixi/eslint.config.mjs) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/examples/README.md](.nanhang-ref/zhiliang-huixi/examples/README.md) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/out/dataset.json](.nanhang-ref/zhiliang-huixi/out/dataset.json) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/out/dataset.summary.json](.nanhang-ref/zhiliang-huixi/out/dataset.summary.json) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/package-lock.json](.nanhang-ref/zhiliang-huixi/package-lock.json) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/package.json](.nanhang-ref/zhiliang-huixi/package.json) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/pages-static/index.html](.nanhang-ref/zhiliang-huixi/pages-static/index.html) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/pages-static/main.tsx](.nanhang-ref/zhiliang-huixi/pages-static/main.tsx) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/postcss.config.mjs](.nanhang-ref/zhiliang-huixi/postcss.config.mjs) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/public/favicon.svg](.nanhang-ref/zhiliang-huixi/public/favicon.svg) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/public/file.svg](.nanhang-ref/zhiliang-huixi/public/file.svg) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/public/globe.svg](.nanhang-ref/zhiliang-huixi/public/globe.svg) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/public/og.jpg](.nanhang-ref/zhiliang-huixi/public/og.jpg) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/public/window.svg](.nanhang-ref/zhiliang-huixi/public/window.svg) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/README.md](.nanhang-ref/zhiliang-huixi/README.md) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/scripts/check-pages-build.mjs](.nanhang-ref/zhiliang-huixi/scripts/check-pages-build.mjs) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/scripts/make-fixture.ts](.nanhang-ref/zhiliang-huixi/scripts/make-fixture.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/scripts/verify-accuracy.ts](.nanhang-ref/zhiliang-huixi/scripts/verify-accuracy.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/scripts/verify-analytics.ts](.nanhang-ref/zhiliang-huixi/scripts/verify-analytics.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/scripts/verify-parser.ts](.nanhang-ref/zhiliang-huixi/scripts/verify-parser.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/scripts/verify-workbook.ts](.nanhang-ref/zhiliang-huixi/scripts/verify-workbook.ts) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/tsconfig.json](.nanhang-ref/zhiliang-huixi/tsconfig.json) | 工程配置或总入口 |
| [.nanhang-ref/zhiliang-huixi/vite.pages.config.ts](.nanhang-ref/zhiliang-huixi/vite.pages.config.ts) | 工程配置或总入口 |
| [AGENTS.md](AGENTS.md) | 工程配置或总入口 |
| [archives/nanhang-app-source-before-task04-2026-09-10.zip](archives/nanhang-app-source-before-task04-2026-09-10.zip) | 历史归档（不作为当前进度） |
| [archives/README.md](archives/README.md) | 历史归档（不作为当前进度） |
| [archives/session-transcripts-2026-09-10/part-01.md](archives/session-transcripts-2026-09-10/part-01.md) | 历史归档（不作为当前进度） |
| [archives/session-transcripts-2026-09-10/part-02.md](archives/session-transcripts-2026-09-10/part-02.md) | 历史归档（不作为当前进度） |
| [archives/session-transcripts-2026-09-10/part-03.md](archives/session-transcripts-2026-09-10/part-03.md) | 历史归档（不作为当前进度） |
| [archives/session-transcripts-2026-09-10/part-04.md](archives/session-transcripts-2026-09-10/part-04.md) | 历史归档（不作为当前进度） |
| [archives/session-transcripts-2026-09-10/part-05.md](archives/session-transcripts-2026-09-10/part-05.md) | 历史归档（不作为当前进度） |
| [archives/session-transcripts-2026-09-10/part-06.md](archives/session-transcripts-2026-09-10/part-06.md) | 历史归档（不作为当前进度） |
| [archives/session-transcripts-2026-09-10/part-07.md](archives/session-transcripts-2026-09-10/part-07.md) | 历史归档（不作为当前进度） |
| [archives/session-transcripts-2026-09-10/probe-artifact.txt](archives/session-transcripts-2026-09-10/probe-artifact.txt) | 历史归档（不作为当前进度） |
| [archives/workspace-before-excel-task06-2026-09-10.zip](archives/workspace-before-excel-task06-2026-09-10.zip) | 历史归档（不作为当前进度） |
| [archives/workspace-before-sync-2026-09-10.zip](archives/workspace-before-sync-2026-09-10.zip) | 历史归档（不作为当前进度） |
| [FILE_INDEX.md](FILE_INDEX.md) | 工程配置或总入口 |
| [gui-test-screenshots/t01_sail_full.png](gui-test-screenshots/t01_sail_full.png) | 工程配置或总入口 |
| [gui-test-screenshots/t02_sail_viewport.png](gui-test-screenshots/t02_sail_viewport.png) | 工程配置或总入口 |
| [gui-test-screenshots/t03_sail_form.png](gui-test-screenshots/t03_sail_form.png) | 工程配置或总入口 |
| [gui-test-screenshots/t08_pagedown.png](gui-test-screenshots/t08_pagedown.png) | 工程配置或总入口 |
| [gui-test-screenshots/t09_domcua_click.png](gui-test-screenshots/t09_domcua_click.png) | 工程配置或总入口 |
| [gui-test-screenshots/t10_subjects_selected.png](gui-test-screenshots/t10_subjects_selected.png) | 工程配置或总入口 |
| [gui-test-screenshots/t11_start_sail.png](gui-test-screenshots/t11_start_sail.png) | 工程配置或总入口 |
| [gui-test-screenshots/t12_board_card.png](gui-test-screenshots/t12_board_card.png) | 工程配置或总入口 |
| [gui-test-screenshots/t13_locate_school.png](gui-test-screenshots/t13_locate_school.png) | 工程配置或总入口 |
| [gui-test-screenshots/t14_locate_page.png](gui-test-screenshots/t14_locate_page.png) | 工程配置或总入口 |
| [gui-test-screenshots/t15_wrong_code.png](gui-test-screenshots/t15_wrong_code.png) | 工程配置或总入口 |
| [gui-test-screenshots/t16_identified.png](gui-test-screenshots/t16_identified.png) | 工程配置或总入口 |
| [gui-test-screenshots/t17_identified_chen.png](gui-test-screenshots/t17_identified_chen.png) | 工程配置或总入口 |
| [gui-test-screenshots/t18_locate_exams.png](gui-test-screenshots/t18_locate_exams.png) | 工程配置或总入口 |
| [gui-test-screenshots/t19_range.png](gui-test-screenshots/t19_range.png) | 工程配置或总入口 |
| [gui-test-screenshots/t20_range2.png](gui-test-screenshots/t20_range2.png) | 工程配置或总入口 |
| [gui-test-screenshots/t21_range_card.png](gui-test-screenshots/t21_range_card.png) | 工程配置或总入口 |
| [gui-test-screenshots/t22_explore_range.png](gui-test-screenshots/t22_explore_range.png) | 工程配置或总入口 |
| [gui-test-screenshots/t23_range_instant.png](gui-test-screenshots/t23_range_instant.png) | 工程配置或总入口 |
| [gui-test-screenshots/t24_subject_table_zoom.png](gui-test-screenshots/t24_subject_table_zoom.png) | 工程配置或总入口 |
| [gui-test-screenshots/t25_subject_table_recheck.png](gui-test-screenshots/t25_subject_table_recheck.png) | 工程配置或总入口 |
| [gui-test-screenshots/t26_trail_chart.png](gui-test-screenshots/t26_trail_chart.png) | 工程配置或总入口 |
| [gui-test-screenshots/t27_knowledge.png](gui-test-screenshots/t27_knowledge.png) | 工程配置或总入口 |
| [gui-test-screenshots/t28_talk_entry.png](gui-test-screenshots/t28_talk_entry.png) | 工程配置或总入口 |
| [gui-test-screenshots/t29_totp_prompt.png](gui-test-screenshots/t29_totp_prompt.png) | 工程配置或总入口 |
| [gui-test-screenshots/t30_totp_connect.png](gui-test-screenshots/t30_totp_connect.png) | 工程配置或总入口 |
| [gui-test-screenshots/t31_answer_sent.png](gui-test-screenshots/t31_answer_sent.png) | 工程配置或总入口 |
| [gui-test-screenshots/t32_ai_reply1.png](gui-test-screenshots/t32_ai_reply1.png) | 工程配置或总入口 |
| [gui-test-screenshots/t33_ai_reply2.png](gui-test-screenshots/t33_ai_reply2.png) | 工程配置或总入口 |
| [gui-test-screenshots/t34_suggestions.png](gui-test-screenshots/t34_suggestions.png) | 工程配置或总入口 |
| [gui-test-screenshots/t36_free_text_reply.png](gui-test-screenshots/t36_free_text_reply.png) | 工程配置或总入口 |
| [gui-test-screenshots/t37_final_turn.png](gui-test-screenshots/t37_final_turn.png) | 工程配置或总入口 |
| [gui-test-screenshots/t38_after_career_btn.png](gui-test-screenshots/t38_after_career_btn.png) | 工程配置或总入口 |
| [gui-test-screenshots/t39_career_pending.png](gui-test-screenshots/t39_career_pending.png) | 工程配置或总入口 |
| [gui-test-screenshots/t40_direction.png](gui-test-screenshots/t40_direction.png) | 工程配置或总入口 |
| [gui-test-screenshots/t41_direction_self.png](gui-test-screenshots/t41_direction_self.png) | 工程配置或总入口 |
| [gui-test-screenshots/t42_pick_gongxue.png](gui-test-screenshots/t42_pick_gongxue.png) | 工程配置或总入口 |
| [gui-test-screenshots/t43_two_lines_empty.png](gui-test-screenshots/t43_two_lines_empty.png) | 工程配置或总入口 |
| [gui-test-screenshots/t44_axis_top.png](gui-test-screenshots/t44_axis_top.png) | 工程配置或总入口 |
| [MANIFEST.sha256](MANIFEST.sha256) | 工程配置或总入口 |
| [nanhang-app/.gitignore](nanhang-app/.gitignore) | 工程配置或总入口 |
| [nanhang-app/.tmp_vcit_2026.html](nanhang-app/.tmp_vcit_2026.html) | 工程配置或总入口 |
| [nanhang-app/AGENTS.md](nanhang-app/AGENTS.md) | 工程配置或总入口 |
| [nanhang-app/apps/api/package.json](nanhang-app/apps/api/package.json) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/scf_bootstrap](nanhang-app/apps/api/scf_bootstrap) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/src/config.ts](nanhang-app/apps/api/src/config.ts) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/src/demo-context.ts](nanhang-app/apps/api/src/demo-context.ts) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/src/dev-upstream.ts](nanhang-app/apps/api/src/dev-upstream.ts) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/src/main.ts](nanhang-app/apps/api/src/main.ts) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/src/school-access.ts](nanhang-app/apps/api/src/school-access.ts) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/src/server.ts](nanhang-app/apps/api/src/server.ts) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/test/api.test.ts](nanhang-app/apps/api/test/api.test.ts) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/test/school-access.test.ts](nanhang-app/apps/api/test/school-access.test.ts) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/test/school-cloud.test.ts](nanhang-app/apps/api/test/school-cloud.test.ts) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/test/totp-code.test.ts](nanhang-app/apps/api/test/totp-code.test.ts) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/api/tsconfig.json](nanhang-app/apps/api/tsconfig.json) | TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记） |
| [nanhang-app/apps/web/index.html](nanhang-app/apps/web/index.html) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/package.json](nanhang-app/apps/web/package.json) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/scripts/open-mobile-window.mjs](nanhang-app/apps/web/scripts/open-mobile-window.mjs) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/ai-client.ts](nanhang-app/apps/web/src/ai-client.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/ai-panel.ts](nanhang-app/apps/web/src/ai-panel.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/App.tsx](nanhang-app/apps/web/src/App.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/art.tsx](nanhang-app/apps/web/src/art.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/chapters/axis.tsx](nanhang-app/apps/web/src/chapters/axis.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/chapters/chart.tsx](nanhang-app/apps/web/src/chapters/chart.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/chapters/direction.tsx](nanhang-app/apps/web/src/chapters/direction.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/chapters/locate.tsx](nanhang-app/apps/web/src/chapters/locate.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/chapters/sail.tsx](nanhang-app/apps/web/src/chapters/sail.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/chapters/settings.tsx](nanhang-app/apps/web/src/chapters/settings.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/chapters/shared.ts](nanhang-app/apps/web/src/chapters/shared.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/chapters/talk.tsx](nanhang-app/apps/web/src/chapters/talk.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/chapters/trail.tsx](nanhang-app/apps/web/src/chapters/trail.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/chapters/trajectory.tsx](nanhang-app/apps/web/src/chapters/trajectory.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/chat.tsx](nanhang-app/apps/web/src/chat.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/debug.ts](nanhang-app/apps/web/src/debug.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/direction-quota.ts](nanhang-app/apps/web/src/direction-quota.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/exam-position.ts](nanhang-app/apps/web/src/exam-position.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/exam-trajectory.ts](nanhang-app/apps/web/src/exam-trajectory.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/journey-model.ts](nanhang-app/apps/web/src/journey-model.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/journey-worker.ts](nanhang-app/apps/web/src/journey-worker.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/journey.css](nanhang-app/apps/web/src/journey.css) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/JourneyApp.tsx](nanhang-app/apps/web/src/JourneyApp.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/main.tsx](nanhang-app/apps/web/src/main.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/model.ts](nanhang-app/apps/web/src/model.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/overlay.tsx](nanhang-app/apps/web/src/overlay.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/progress.ts](nanhang-app/apps/web/src/progress.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/quality-huixi.ts](nanhang-app/apps/web/src/quality-huixi.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/quality-types.ts](nanhang-app/apps/web/src/quality-types.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/range-fill.tsx](nanhang-app/apps/web/src/range-fill.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/reference-lines.ts](nanhang-app/apps/web/src/reference-lines.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/release-loader.ts](nanhang-app/apps/web/src/release-loader.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/scroll-lock.ts](nanhang-app/apps/web/src/scroll-lock.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/style.css](nanhang-app/apps/web/src/style.css) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/src/theme.tsx](nanhang-app/apps/web/src/theme.tsx) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/ai-client.test.ts](nanhang-app/apps/web/test/ai-client.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/ai-panel.test.ts](nanhang-app/apps/web/test/ai-panel.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/ai-reasoning.test.ts](nanhang-app/apps/web/test/ai-reasoning.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/backend-alignment.test.ts](nanhang-app/apps/web/test/backend-alignment.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/bottom-nav-narrow.test.ts](nanhang-app/apps/web/test/bottom-nav-narrow.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/chat.test.ts](nanhang-app/apps/web/test/chat.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/class4-codes.test.ts](nanhang-app/apps/web/test/class4-codes.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/direction-levels.test.ts](nanhang-app/apps/web/test/direction-levels.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/direction-quota.test.ts](nanhang-app/apps/web/test/direction-quota.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/entry-gate.test.ts](nanhang-app/apps/web/test/entry-gate.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/exam-position.test.ts](nanhang-app/apps/web/test/exam-position.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/exam-trajectory.test.ts](nanhang-app/apps/web/test/exam-trajectory.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/flow.test.ts](nanhang-app/apps/web/test/flow.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/journey-model.test.ts](nanhang-app/apps/web/test/journey-model.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/locate-motion.test.ts](nanhang-app/apps/web/test/locate-motion.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/overlay-fixed.test.ts](nanhang-app/apps/web/test/overlay-fixed.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/overlay-geometry.test.ts](nanhang-app/apps/web/test/overlay-geometry.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/page-motion.test.ts](nanhang-app/apps/web/test/page-motion.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/page-scroll-top.test.ts](nanhang-app/apps/web/test/page-scroll-top.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/presentation.test.ts](nanhang-app/apps/web/test/presentation.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/progress.test.ts](nanhang-app/apps/web/test/progress.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/quality-huixi.test.ts](nanhang-app/apps/web/test/quality-huixi.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/quality-presentation.test.ts](nanhang-app/apps/web/test/quality-presentation.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/range-fill.test.ts](nanhang-app/apps/web/test/range-fill.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/release-integration.test.ts](nanhang-app/apps/web/test/release-integration.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/route-labels.test.ts](nanhang-app/apps/web/test/route-labels.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/route-split.test.ts](nanhang-app/apps/web/test/route-split.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/sail-deck.test.ts](nanhang-app/apps/web/test/sail-deck.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/sail-pack.test.ts](nanhang-app/apps/web/test/sail-pack.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/serif-font.test.ts](nanhang-app/apps/web/test/serif-font.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/settings.test.ts](nanhang-app/apps/web/test/settings.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/talk-room.test.ts](nanhang-app/apps/web/test/talk-room.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/talk-whisper.test.ts](nanhang-app/apps/web/test/talk-whisper.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/theme-spirit.test.ts](nanhang-app/apps/web/test/theme-spirit.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/topbar-narrow.test.ts](nanhang-app/apps/web/test/topbar-narrow.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/test/totp-access.test.ts](nanhang-app/apps/web/test/totp-access.test.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/tsconfig.json](nanhang-app/apps/web/tsconfig.json) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/visual-evidence/demo-sail-1440x1000.png](nanhang-app/apps/web/visual-evidence/demo-sail-1440x1000.png) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/VISUAL_PROGRESS.md](nanhang-app/apps/web/VISUAL_PROGRESS.md) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web/vite.config.ts](nanhang-app/apps/web/vite.config.ts) | TASK-07无AI学生页面与TASK-08 AI面板 |
| [nanhang-app/apps/web-paper/index.html](nanhang-app/apps/web-paper/index.html) | 工程配置或总入口 |
| [nanhang-app/apps/web-paper/package.json](nanhang-app/apps/web-paper/package.json) | 工程配置或总入口 |
| [nanhang-app/apps/web-paper/src/app.js](nanhang-app/apps/web-paper/src/app.js) | 业务源码 |
| [nanhang-app/apps/web-paper/src/boot-report.js](nanhang-app/apps/web-paper/src/boot-report.js) | 业务源码 |
| [nanhang-app/apps/web-paper/src/data.js](nanhang-app/apps/web-paper/src/data.js) | 业务源码 |
| [nanhang-app/apps/web-paper/src/style.css](nanhang-app/apps/web-paper/src/style.css) | 业务源码 |
| [nanhang-app/apps/web-paper/test/paper-honesty.test.ts](nanhang-app/apps/web-paper/test/paper-honesty.test.ts) | 自动测试 |
| [nanhang-app/apps/web-paper/tsconfig.json](nanhang-app/apps/web-paper/tsconfig.json) | 工程配置或总入口 |
| [nanhang-app/apps/web-paper/vite.config.ts](nanhang-app/apps/web-paper/vite.config.ts) | 工程配置或总入口 |
| [nanhang-app/data/admissions/admissions.db](nanhang-app/data/admissions/admissions.db) | 本地招生数据库构建产物（可重跑，非发布） |
| [nanhang-app/data/admissions/build-manifest.json](nanhang-app/data/admissions/build-manifest.json) | 本地招生数据库构建产物（可重跑，非发布） |
| [nanhang-app/data/admissions/merged-manifest.json](nanhang-app/data/admissions/merged-manifest.json) | 本地招生数据库构建产物（可重跑，非发布） |
| [nanhang-app/data/admissions/university-detail-enrichment-batch.json](nanhang-app/data/admissions/university-detail-enrichment-batch.json) | 本地招生数据库构建产物（可重跑，非发布） |
| [nanhang-app/data/admissions.db](nanhang-app/data/admissions.db) | 工程配置或总入口 |
| [nanhang-app/data/task03/admissions.db](nanhang-app/data/task03/admissions.db) | 工程配置或总入口 |
| [nanhang-app/data/task03/coverage.json](nanhang-app/data/task03/coverage.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/extraction/20260910T094233Z/extraction-run.json](nanhang-app/data/task03/extraction/20260910T094233Z/extraction-run.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/extraction/20260910T094233Z/SC-PLAN-H-2026-P005.ocr.json](nanhang-app/data/task03/extraction/20260910T094233Z/SC-PLAN-H-2026-P005.ocr.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/extraction/20260910T094233Z/SC-PLAN-P-2026-P005.ocr.json](nanhang-app/data/task03/extraction/20260910T094233Z/SC-PLAN-P-2026-P005.ocr.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/extraction/20260910T094233Z/SC-RANK-H-2026-I001.ocr.json](nanhang-app/data/task03/extraction/20260910T094233Z/SC-RANK-H-2026-I001.ocr.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/extraction/20260910T094233Z/SC-RANK-P-2026-I001.ocr.json](nanhang-app/data/task03/extraction/20260910T094233Z/SC-RANK-P-2026-I001.ocr.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/extraction/20260910T094233Z/SICAU-REFERENCE-2026-I001.ocr.json](nanhang-app/data/task03/extraction/20260910T094233Z/SICAU-REFERENCE-2026-I001.ocr.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/human-verification.json](nanhang-app/data/task03/human-verification.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/issues.json](nanhang-app/data/task03/issues.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p001.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p001.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p001.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p001.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p001.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p001.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p002.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p002.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p002.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p002.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p002.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p002.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p003.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p003.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p003.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p003.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p003.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p003.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p004.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p004.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p004.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p004.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p004.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p004.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p005.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p005.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p005.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p005.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p005.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p005.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p006.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p006.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p006.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p006.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p006.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p006.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p007.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p007.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p007.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p007.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p007.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p007.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p008.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p008.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p008.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p008.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p008.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p008.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p009.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p009.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p009.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p009.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p009.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p009.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p010.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p010.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p010.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p010.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p010.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p010.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p011.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p011.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p011.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p011.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p011.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p011.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p012.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p012.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p012.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p012.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p012.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p012.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p013.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p013.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p013.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p013.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p013.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p013.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p014.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p014.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p014.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p014.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p014.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p014.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p015.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p015.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p015.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p015.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p015.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p015.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p016.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p016.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p016.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p016.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p016.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p016.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p017.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p017.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p017.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p017.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p017.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-arts-2024-p017.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p001.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p001.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p001.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p001.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p001.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p001.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p002.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p002.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p002.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p002.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p002.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p002.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p003.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p003.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p003.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p003.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p003.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p003.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p004.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p004.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p004.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p004.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p004.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p004.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p005.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p005.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p005.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p005.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p005.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p005.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p006.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p006.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p006.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p006.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p006.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p006.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p007.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p007.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p007.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p007.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p007.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p007.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p008.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p008.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p008.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p008.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p008.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p008.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p009.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p009.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p009.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p009.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p009.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p009.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p010.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p010.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p010.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p010.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p010.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p010.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p011.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p011.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p011.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p011.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p011.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p011.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p012.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p012.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p012.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p012.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p012.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p012.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p013.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p013.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p013.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p013.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p013.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p013.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p014.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p014.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p014.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p014.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p014.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p014.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p015.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p015.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p015.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p015.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p015.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p015.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p016.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p016.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p016.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p016.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p016.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p016.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p017.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p017.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p017.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p017.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p017.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p017.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p018.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p018.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p018.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p018.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p018.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2025-p018.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p001.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p001.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p001.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p001.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p002.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p002.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p002.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p002.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p003.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p003.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p003.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p003.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p004.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p004.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p004.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p004.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p005.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p005.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p005.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p005.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p006.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p006.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p006.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p006.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p007.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p007.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p007.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p007.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p008.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p008.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p008.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p008.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p009.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p009.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p009.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p009.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p010.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p010.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p010.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p010.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p011.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p011.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p011.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p011.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p012.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p012.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p012.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p012.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p013.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p013.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p013.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p013.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p014.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p014.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p014.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p014.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p015.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p015.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p015.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p015.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p016.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p016.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p016.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p016.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p017.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p017.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p017.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p017.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p018.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p018.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p018.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p018.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p019.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p019.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p019.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p019.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p020.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p020.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p020.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p020.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p020.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-history-2026-p020.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p001.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p001.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p001.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p001.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p001.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p001.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p002.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p002.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p002.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p002.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p002.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p002.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p003.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p003.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p003.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p003.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p003.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p003.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p004.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p004.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p004.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p004.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p004.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p004.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p005.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p005.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p005.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p005.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p005.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p005.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p006.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p006.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p006.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p006.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p006.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p006.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p007.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p007.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p007.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p007.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p007.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p007.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p008.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p008.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p008.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p008.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p008.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p008.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p009.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p009.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p009.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p009.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p009.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p009.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p010.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p010.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p010.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p010.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p010.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p010.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p011.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p011.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p011.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p011.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p011.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p011.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p012.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p012.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p012.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p012.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p012.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p012.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p013.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p013.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p013.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p013.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p013.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p013.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p014.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p014.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p014.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p014.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p014.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p014.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p015.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p015.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p015.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p015.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p015.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p015.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p016.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p016.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p016.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p016.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p016.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p016.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p017.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p017.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p017.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p017.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p017.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p017.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p018.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p018.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p018.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p018.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p018.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p018.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p019.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p019.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p019.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p019.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p019.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2025-p019.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p001.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p001.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p001.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p001.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p002.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p002.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p002.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p002.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p003.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p003.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p003.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p003.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p004.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p004.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p004.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p004.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p005.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p005.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p005.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p005.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p006.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p006.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p006.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p006.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p007.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p007.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p007.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p007.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p008.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p008.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p008.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p008.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p009.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p009.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p009.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p009.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p010.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p010.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p010.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p010.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p011.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p011.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p011.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p011.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p012.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p012.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p012.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p012.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p013.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p013.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p013.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p013.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p014.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p014.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p014.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p014.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p015.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p015.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p015.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p015.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p016.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p016.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p016.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p016.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p017.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p017.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p017.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p017.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p018.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p018.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p018.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p018.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p019.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p019.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p019.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p019.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p020.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p020.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p020.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p020.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p020.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-physics-2026-p020.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p001.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p001.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p001.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p001.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p001.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p001.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p002.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p002.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p002.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p002.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p002.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p002.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p003.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p003.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p003.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p003.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p003.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p003.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p004.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p004.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p004.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p004.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p004.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p004.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p005.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p005.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p005.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p005.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p005.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p005.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p006.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p006.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p006.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p006.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p006.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p006.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p007.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p007.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p007.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p007.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p007.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p007.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p008.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p008.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p008.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p008.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p008.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p008.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p009.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p009.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p009.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p009.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p009.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p009.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p010.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p010.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p010.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p010.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p010.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p010.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p011.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p011.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p011.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p011.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p011.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p011.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p012.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p012.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p012.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p012.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p012.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p012.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p013.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p013.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p013.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p013.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p013.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p013.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p014.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p014.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p014.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p014.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p014.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p014.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p015.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p015.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p015.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p015.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p015.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p015.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p016.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p016.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p016.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p016.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p016.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p016.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p017.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p017.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p017.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p017.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p017.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p017.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p018.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p018.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p018.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p018.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p018.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p018.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p019.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p019.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p019.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p019.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p019.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p019.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p020.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p020.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p020.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p020.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p020.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p020.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p021.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p021.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p021.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p021.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p021.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2023-p021.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p001.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p001.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p001.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p001.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p001.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p001.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p002.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p002.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p002.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p002.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p002.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p002.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p003.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p003.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p003.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p003.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p003.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p003.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p004.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p004.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p004.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p004.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p004.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p004.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p005.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p005.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p005.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p005.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p005.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p005.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p006.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p006.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p006.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p006.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p006.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p006.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p007.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p007.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p007.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p007.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p007.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p007.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p008.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p008.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p008.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p008.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p008.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p008.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p009.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p009.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p009.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p009.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p009.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p009.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p010.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p010.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p010.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p010.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p010.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p010.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p011.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p011.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p011.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p011.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p011.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p011.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p012.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p012.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p012.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p012.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p012.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p012.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p013.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p013.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p013.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p013.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p013.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p013.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p014.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p014.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p014.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p014.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p014.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p014.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p015.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p015.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p015.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p015.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p015.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p015.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p016.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p016.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p016.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p016.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p016.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p016.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p017.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p017.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p017.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p017.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p017.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p017.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p018.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p018.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p018.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p018.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p018.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p018.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p019.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p019.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p019.x2.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p019.x2.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p019.x3.ocr.json](nanhang-app/data/task03/score-distribution/ocr/sc-rank-science-2024-p019.x3.ocr.json) | 一分一段表OCR原始输出（可重算） |
| [nanhang-app/data/task03/score-distribution/score-distribution.json](nanhang-app/data/task03/score-distribution/score-distribution.json) | 一分一段表抽取结果（官方来源，已核实） |
| [nanhang-app/data/task03/score-distribution/workbook-crosscheck-samples.json](nanhang-app/data/task03/score-distribution/workbook-crosscheck-samples.json) | 一分一段表抽取结果（官方来源，已核实） |
| [nanhang-app/data/task03/score-distribution/workbook-crosscheck.json](nanhang-app/data/task03/score-distribution/workbook-crosscheck.json) | 一分一段表抽取结果（官方来源，已核实） |
| [nanhang-app/data/task03/score-distribution-register.json](nanhang-app/data/task03/score-distribution-register.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/source-snapshot-register.json](nanhang-app/data/task03/source-snapshot-register.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-plan-history-2026-p005.png](nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-plan-history-2026-p005.png) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-plan-history-2026.html](nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-plan-history-2026.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-plan-physics-2026-p005.png](nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-plan-physics-2026-p005.png) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-plan-physics-2026.html](nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-plan-physics-2026.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-rank-history-2026-i001.jpg](nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-rank-history-2026-i001.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-rank-history-2026.html](nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-rank-history-2026.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-rank-physics-2026-i001.jpg](nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-rank-physics-2026-i001.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-rank-physics-2026.html](nanhang-app/data/task03/source-snapshots/20260910T094233Z/sc-rank-physics-2026.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260910T094233Z/sicau-plan-history-2026-i001.jpg](nanhang-app/data/task03/source-snapshots/20260910T094233Z/sicau-plan-history-2026-i001.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260910T094233Z/sicau-reference-2026.html](nanhang-app/data/task03/source-snapshots/20260910T094233Z/sicau-reference-2026.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260910T094233Z/snapshot-register.json](nanhang-app/data/task03/source-snapshots/20260910T094233Z/snapshot-register.json) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-full.html](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-full.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p001.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p001.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p002.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p002.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p003.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p003.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p004.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p004.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p005.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p005.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p006.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p006.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p007.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p007.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p008.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p008.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p009.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p009.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p010.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p010.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p011.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p011.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p012.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p012.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p013.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p013.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p014.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p014.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p015.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p015.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p016.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p016.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p017.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p017.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p018.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p018.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p019.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p019.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p020.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-history-2026-p020.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-full.html](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-full.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p001.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p001.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p002.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p002.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p003.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p003.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p004.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p004.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p005.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p005.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p006.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p006.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p007.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p007.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p008.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p008.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p009.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p009.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p010.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p010.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p011.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p011.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p012.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p012.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p013.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p013.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p014.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p014.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p015.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p015.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p016.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p016.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p017.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p017.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p018.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p018.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p019.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p019.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p020.jpg](nanhang-app/data/task03/source-snapshots/20260911T025944Z/sc-rank-physics-2026-p020.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T025944Z/snapshot-register.json](nanhang-app/data/task03/source-snapshots/20260911T025944Z/snapshot-register.json) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-full.html](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-full.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p001.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p001.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p002.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p002.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p003.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p003.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p004.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p004.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p005.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p005.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p006.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p006.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p007.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p007.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p008.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p008.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p009.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p009.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p010.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p010.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p011.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p011.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p012.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p012.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p013.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p013.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p014.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p014.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p015.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p015.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p016.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p016.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p017.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p017.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p018.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p018.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p019.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p019.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p020.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p020.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p021.jpg](nanhang-app/data/task03/source-snapshots/20260911T073243Z/sc-rank-science-2023-p021.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073243Z/snapshot-register.json](nanhang-app/data/task03/source-snapshots/20260911T073243Z/snapshot-register.json) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-full.html](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-full.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p001.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p001.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p002.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p002.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p003.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p003.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p004.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p004.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p005.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p005.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p006.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p006.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p007.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p007.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p008.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p008.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p009.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p009.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p010.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p010.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p011.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p011.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p012.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p012.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p013.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p013.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p014.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p014.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p015.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p015.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p016.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p016.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p017.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-arts-2024-p017.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-full.html](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-full.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p001.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p001.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p002.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p002.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p003.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p003.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p004.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p004.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p005.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p005.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p006.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p006.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p007.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p007.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p008.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p008.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p009.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p009.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p010.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p010.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p011.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p011.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p012.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p012.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p013.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p013.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p014.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p014.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p015.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p015.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p016.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p016.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p017.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p017.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p018.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p018.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p019.jpg](nanhang-app/data/task03/source-snapshots/20260911T073251Z/sc-rank-science-2024-p019.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073251Z/snapshot-register.json](nanhang-app/data/task03/source-snapshots/20260911T073251Z/snapshot-register.json) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-full.html](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-full.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p001.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p001.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p002.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p002.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p003.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p003.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p004.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p004.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p005.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p005.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p006.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p006.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p007.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p007.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p008.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p008.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p009.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p009.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p010.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p010.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p011.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p011.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p012.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p012.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p013.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p013.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p014.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p014.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p015.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p015.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p016.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p016.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p017.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p017.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p018.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-history-2025-p018.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-full.html](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-full.html) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p001.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p001.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p002.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p002.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p003.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p003.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p004.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p004.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p005.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p005.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p006.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p006.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p007.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p007.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p008.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p008.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p009.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p009.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p010.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p010.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p011.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p011.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p012.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p012.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p013.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p013.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p014.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p014.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p015.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p015.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p016.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p016.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p017.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p017.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p018.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p018.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p019.jpg](nanhang-app/data/task03/source-snapshots/20260911T073304Z/sc-rank-physics-2025-p019.jpg) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/source-snapshots/20260911T073304Z/snapshot-register.json](nanhang-app/data/task03/source-snapshots/20260911T073304Z/snapshot-register.json) | 官方来源快照（不可变，含一分一段表全量图） |
| [nanhang-app/data/task03/structured-samples.json](nanhang-app/data/task03/structured-samples.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/verification-records.json](nanhang-app/data/task03/verification-records.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/workbook-input-register.json](nanhang-app/data/task03/workbook-input-register.json) | 工程配置或总入口 |
| [nanhang-app/data/task03/workbooks/workbook-samples.json](nanhang-app/data/task03/workbooks/workbook-samples.json) | Excel 已核实证据样本（全量发布另见 data/releases） |
| [nanhang-app/data/task06/nku-trade.html](nanhang-app/data/task06/nku-trade.html) | 专业卡官方来源快照与登记 |
| [nanhang-app/data/task06/source-register.json](nanhang-app/data/task06/source-register.json) | 专业卡官方来源快照与登记 |
| [nanhang-app/data/task06/ustb-cs.html](nanhang-app/data/task06/ustb-cs.html) | 专业卡官方来源快照与登记 |
| [nanhang-app/data/task06/ustb-me.html](nanhang-app/data/task06/ustb-me.html) | 专业卡官方来源快照与登记 |
| [nanhang-app/docs/ACCURACY_V1_2_FIELD_MAPPING.md](nanhang-app/docs/ACCURACY_V1_2_FIELD_MAPPING.md) | 实施进度与记录 |
| [nanhang-app/docs/ADR_001_EXCEL_PRIMARY.md](nanhang-app/docs/ADR_001_EXCEL_PRIMARY.md) | 实施进度与记录 |
| [nanhang-app/docs/ADR_002_LINE_EQUIVALENT_POSITIONING.md](nanhang-app/docs/ADR_002_LINE_EQUIVALENT_POSITIONING.md) | 实施进度与记录 |
| [nanhang-app/docs/ADR_003_STUDENT_JOURNEY.md](nanhang-app/docs/ADR_003_STUDENT_JOURNEY.md) | 实施进度与记录 |
| [nanhang-app/docs/AI_QIANFAN_SETUP.md](nanhang-app/docs/AI_QIANFAN_SETUP.md) | 实施进度与记录 |
| [nanhang-app/docs/BACKEND_FRONTEND_ALIGNMENT.md](nanhang-app/docs/BACKEND_FRONTEND_ALIGNMENT.md) | 实施进度与记录 |
| [nanhang-app/docs/baseline/contracts/data-release.schema.json](nanhang-app/docs/baseline/contracts/data-release.schema.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/contracts/match-result.schema.json](nanhang-app/docs/baseline/contracts/match-result.schema.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/contracts/student-profile.schema.json](nanhang-app/docs/baseline/contracts/student-profile.schema.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/contracts/target-scenario.schema.json](nanhang-app/docs/baseline/contracts/target-scenario.schema.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/DATA_AND_MATCHING_SPEC.md](nanhang-app/docs/baseline/DATA_AND_MATCHING_SPEC.md) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/DELIVERY_AND_ACCEPTANCE.md](nanhang-app/docs/baseline/DELIVERY_AND_ACCEPTANCE.md) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/evidence/repository-files.json](nanhang-app/docs/baseline/evidence/repository-files.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/evidence/source-register.json](nanhang-app/docs/baseline/evidence/source-register.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/EVIDENCE_AND_REUSE.md](nanhang-app/docs/baseline/EVIDENCE_AND_REUSE.md) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/fixtures/acceptance-cases.json](nanhang-app/docs/baseline/fixtures/acceptance-cases.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/fixtures/match-result.invalid.json](nanhang-app/docs/baseline/fixtures/match-result.invalid.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/fixtures/match-result.valid.json](nanhang-app/docs/baseline/fixtures/match-result.valid.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/fixtures/student-profile.invalid.json](nanhang-app/docs/baseline/fixtures/student-profile.invalid.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/fixtures/student-profile.valid.json](nanhang-app/docs/baseline/fixtures/student-profile.valid.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/fixtures/target-scenario.invalid.json](nanhang-app/docs/baseline/fixtures/target-scenario.invalid.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/fixtures/target-scenario.valid.json](nanhang-app/docs/baseline/fixtures/target-scenario.valid.json) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/IMPLEMENTATION_STATUS_2026-09-10.md](nanhang-app/docs/baseline/IMPLEMENTATION_STATUS_2026-09-10.md) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/MANIFEST.sha256](nanhang-app/docs/baseline/MANIFEST.sha256) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/PRODUCT_SPEC.md](nanhang-app/docs/baseline/PRODUCT_SPEC.md) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/README.md](nanhang-app/docs/baseline/README.md) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/requirements-contracts.txt](nanhang-app/docs/baseline/requirements-contracts.txt) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/SYSTEM_AND_INTERFACE_SPEC.md](nanhang-app/docs/baseline/SYSTEM_AND_INTERFACE_SPEC.md) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/tools/validate_contracts.py](nanhang-app/docs/baseline/tools/validate_contracts.py) | 交接包同步参考副本 |
| [nanhang-app/docs/baseline/VALIDATION.md](nanhang-app/docs/baseline/VALIDATION.md) | 交接包同步参考副本 |
| [nanhang-app/docs/CLASS4_QUERY_CODES.md](nanhang-app/docs/CLASS4_QUERY_CODES.md) | 实施进度与记录 |
| [nanhang-app/docs/DOCUMENTATION_POLICY.md](nanhang-app/docs/DOCUMENTATION_POLICY.md) | 实施进度与记录 |
| [nanhang-app/docs/FRONTEND_CODE_REVIEW_2026-09-13.md](nanhang-app/docs/FRONTEND_CODE_REVIEW_2026-09-13.md) | 实施进度与记录 |
| [nanhang-app/docs/FRONTENDS.md](nanhang-app/docs/FRONTENDS.md) | 实施进度与记录 |
| [nanhang-app/docs/IMPLEMENTATION_LOG.md](nanhang-app/docs/IMPLEMENTATION_LOG.md) | 实施进度与记录 |
| [nanhang-app/docs/PARALLEL_FRONTEND.md](nanhang-app/docs/PARALLEL_FRONTEND.md) | 实施进度与记录 |
| [nanhang-app/docs/project-status.json](nanhang-app/docs/project-status.json) | 实施进度与记录 |
| [nanhang-app/docs/PROJECT_REVIEW_2026-09-13.md](nanhang-app/docs/PROJECT_REVIEW_2026-09-13.md) | 实施进度与记录 |
| [nanhang-app/docs/PROJECT_STATUS.md](nanhang-app/docs/PROJECT_STATUS.md) | 实施进度与记录 |
| [nanhang-app/docs/QUALITY_HUIXI_PIPELINE.md](nanhang-app/docs/QUALITY_HUIXI_PIPELINE.md) | 实施进度与记录 |
| [nanhang-app/docs/TASK03_ADMISSIONS_DB.md](nanhang-app/docs/TASK03_ADMISSIONS_DB.md) | 实施进度与记录 |
| [nanhang-app/docs/TASK03_EXCEL_INTAKE.md](nanhang-app/docs/TASK03_EXCEL_INTAKE.md) | 实施进度与记录 |
| [nanhang-app/docs/TASK03_SCORE_DISTRIBUTION.md](nanhang-app/docs/TASK03_SCORE_DISTRIBUTION.md) | 实施进度与记录 |
| [nanhang-app/docs/TASK03_SOURCE_MAPPING.md](nanhang-app/docs/TASK03_SOURCE_MAPPING.md) | 实施进度与记录 |
| [nanhang-app/docs/TASK03_VALIDATION_REPORT.md](nanhang-app/docs/TASK03_VALIDATION_REPORT.md) | 实施进度与记录 |
| [nanhang-app/docs/TASK03_VERIFICATION_AND_RELEASE.md](nanhang-app/docs/TASK03_VERIFICATION_AND_RELEASE.md) | 实施进度与记录 |
| [nanhang-app/docs/TASK06_CONTENT_SPEC.md](nanhang-app/docs/TASK06_CONTENT_SPEC.md) | 实施进度与记录 |
| [nanhang-app/docs/TASK07_LOCAL_FLOW.md](nanhang-app/docs/TASK07_LOCAL_FLOW.md) | 实施进度与记录 |
| [nanhang-app/docs/TASK09_VISUAL_CHECK.md](nanhang-app/docs/TASK09_VISUAL_CHECK.md) | 实施进度与记录 |
| [nanhang-app/docs/TASK10_STAGE_ACCEPTANCE.md](nanhang-app/docs/TASK10_STAGE_ACCEPTANCE.md) | 实施进度与记录 |
| [nanhang-app/docs/VALIDATION_RESULT.md](nanhang-app/docs/VALIDATION_RESULT.md) | 实施进度与记录 |
| [nanhang-app/docs/verification/acceptance-cloud-api-2026-09-12.json](nanhang-app/docs/verification/acceptance-cloud-api-2026-09-12.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/acceptance-online-2026-09-12.json](nanhang-app/docs/verification/acceptance-online-2026-09-12.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/accuracy-v1.2-source-evidence-2026-09-10.txt](nanhang-app/docs/verification/accuracy-v1.2-source-evidence-2026-09-10.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-build-2026-09-12.txt](nanhang-app/docs/verification/backend-alignment-build-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-build-latest-2026-09-12.txt](nanhang-app/docs/verification/backend-alignment-build-latest-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-focused-2026-09-12.txt](nanhang-app/docs/verification/backend-alignment-focused-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-online-2026-09-12.json](nanhang-app/docs/verification/backend-alignment-online-2026-09-12.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-smoke-2026-09-12.json](nanhang-app/docs/verification/backend-alignment-smoke-2026-09-12.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-tests-2026-09-12.txt](nanhang-app/docs/verification/backend-alignment-tests-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-tests-final-2026-09-12.txt](nanhang-app/docs/verification/backend-alignment-tests-final-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-tests-latest-2026-09-12.txt](nanhang-app/docs/verification/backend-alignment-tests-latest-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-typecheck-final-2026-09-12.txt](nanhang-app/docs/verification/backend-alignment-typecheck-final-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-typecheck-latest-2026-09-12.txt](nanhang-app/docs/verification/backend-alignment-typecheck-latest-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-validate-2026-09-12.txt](nanhang-app/docs/verification/backend-alignment-validate-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/backend-alignment-validate-recheck-2026-09-12.txt](nanhang-app/docs/verification/backend-alignment-validate-recheck-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/build-all-2026-09-12-doc-sync.txt](nanhang-app/docs/verification/build-all-2026-09-12-doc-sync.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/build-journey-2026-09-12.txt](nanhang-app/docs/verification/build-journey-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/class4-codes-result-2026-09-12.json](nanhang-app/docs/verification/class4-codes-result-2026-09-12.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/class4-codes-tests-2026-09-12.txt](nanhang-app/docs/verification/class4-codes-tests-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/class4-codes-typecheck-2026-09-12.txt](nanhang-app/docs/verification/class4-codes-typecheck-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/class4-codes-x0-build-2026-09-12.txt](nanhang-app/docs/verification/class4-codes-x0-build-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/class4-codes-x0-result-2026-09-12.json](nanhang-app/docs/verification/class4-codes-x0-result-2026-09-12.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/class4-codes-x0-tests-2026-09-12.txt](nanhang-app/docs/verification/class4-codes-x0-tests-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/class4-codes-x0-typecheck-2026-09-12.txt](nanhang-app/docs/verification/class4-codes-x0-typecheck-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/cloud-cost-freeze-2026-09-14.json](nanhang-app/docs/verification/cloud-cost-freeze-2026-09-14.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/excel-intake-validation-2026-09-10.txt](nanhang-app/docs/verification/excel-intake-validation-2026-09-10.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/final-turn-cloud-api-2026-09-13.json](nanhang-app/docs/verification/final-turn-cloud-api-2026-09-13.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/final-turn-online-2026-09-13.json](nanhang-app/docs/verification/final-turn-online-2026-09-13.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/handoff-contracts-2026-09-10.txt](nanhang-app/docs/verification/handoff-contracts-2026-09-10.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/handoff-contracts-task03-2026-09-10.txt](nanhang-app/docs/verification/handoff-contracts-task03-2026-09-10.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/journey-browser-check.cjs](nanhang-app/docs/verification/journey-browser-check.cjs) | 本次验证原始日志 |
| [nanhang-app/docs/verification/journey-browser-result.json](nanhang-app/docs/verification/journey-browser-result.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/journey-screenshots/desktop-ai.png](nanhang-app/docs/verification/journey-screenshots/desktop-ai.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/journey-screenshots/desktop-major-choice.png](nanhang-app/docs/verification/journey-screenshots/desktop-major-choice.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/journey-screenshots/desktop-results.png](nanhang-app/docs/verification/journey-screenshots/desktop-results.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/journey-screenshots/desktop-score-pool.png](nanhang-app/docs/verification/journey-screenshots/desktop-score-pool.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/journey-screenshots/desktop-subjects.png](nanhang-app/docs/verification/journey-screenshots/desktop-subjects.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/journey-screenshots/mobile-results.png](nanhang-app/docs/verification/journey-screenshots/mobile-results.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/journey-screenshots/mobile-school-synthetic.png](nanhang-app/docs/verification/journey-screenshots/mobile-school-synthetic.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/journey-screenshots/mobile-subjects-320.png](nanhang-app/docs/verification/journey-screenshots/mobile-subjects-320.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/journey-screenshots/mobile-subjects-390.png](nanhang-app/docs/verification/journey-screenshots/mobile-subjects-390.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/latest-frontend-backend-online-2026-09-12.json](nanhang-app/docs/verification/latest-frontend-backend-online-2026-09-12.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/latest-frontend-build-2026-09-12.txt](nanhang-app/docs/verification/latest-frontend-build-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/latest-frontend-build-2026-09-13.txt](nanhang-app/docs/verification/latest-frontend-build-2026-09-13.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/latest-frontend-tests-2026-09-12.txt](nanhang-app/docs/verification/latest-frontend-tests-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/latest-frontend-tests-2026-09-13.txt](nanhang-app/docs/verification/latest-frontend-tests-2026-09-13.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/latest-frontend-typecheck-2026-09-12.txt](nanhang-app/docs/verification/latest-frontend-typecheck-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/latest-frontend-typecheck-2026-09-13.txt](nanhang-app/docs/verification/latest-frontend-typecheck-2026-09-13.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/latest-pages-online-2026-09-13.json](nanhang-app/docs/verification/latest-pages-online-2026-09-13.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/locate-exam-2026-09-20/01-成绩分析-轨迹.png](nanhang-app/docs/verification/locate-exam-2026-09-20/01-成绩分析-轨迹.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/locate-exam-2026-09-20/03-成绩分析-视口-1x.png](nanhang-app/docs/verification/locate-exam-2026-09-20/03-成绩分析-视口-1x.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/locate-exam-2026-09-20/04-五次考试录入.png](nanhang-app/docs/verification/locate-exam-2026-09-20/04-五次考试录入.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/locate-exam-2026-09-20/05-手填生成成绩分析.png](nanhang-app/docs/verification/locate-exam-2026-09-20/05-手填生成成绩分析.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/locate-exam-2026-09-20/06-手填成绩分析-1x.png](nanhang-app/docs/verification/locate-exam-2026-09-20/06-手填成绩分析-1x.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/locate-exam-2026-09-20/07-五次考试录入-新样式.png](nanhang-app/docs/verification/locate-exam-2026-09-20/07-五次考试录入-新样式.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/nanming-totp-online-2026-09-12.json](nanhang-app/docs/verification/nanming-totp-online-2026-09-12.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/npm-validate-2026-09-10.txt](nanhang-app/docs/verification/npm-validate-2026-09-10.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/npm-validate-2026-09-12-chapter-gate.txt](nanhang-app/docs/verification/npm-validate-2026-09-12-chapter-gate.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/npm-validate-2026-09-12-doc-sync.txt](nanhang-app/docs/verification/npm-validate-2026-09-12-doc-sync.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/npm-validate-2026-09-12-frontend-lanes.txt](nanhang-app/docs/verification/npm-validate-2026-09-12-frontend-lanes.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/npm-validate-2026-09-12-live.txt](nanhang-app/docs/verification/npm-validate-2026-09-12-live.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/npm-validate-2026-09-12-redis.txt](nanhang-app/docs/verification/npm-validate-2026-09-12-redis.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/npm-validate-2026-09-12-school-cloud.txt](nanhang-app/docs/verification/npm-validate-2026-09-12-school-cloud.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/npm-validate-excel-task06-2026-09-10.txt](nanhang-app/docs/verification/npm-validate-excel-task06-2026-09-10.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/npm-validate-journey-2026-09-12.txt](nanhang-app/docs/verification/npm-validate-journey-2026-09-12.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/npm-validate-task03-2026-09-10.txt](nanhang-app/docs/verification/npm-validate-task03-2026-09-10.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/npm-validate-task05-2026-09-10.txt](nanhang-app/docs/verification/npm-validate-task05-2026-09-10.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/pages-mobile-2026-09-20/01-起航.png](nanhang-app/docs/verification/pages-mobile-2026-09-20/01-起航.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/pages-mobile-2026-09-20/02-登船卡.png](nanhang-app/docs/verification/pages-mobile-2026-09-20/02-登船卡.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/pages-mobile-2026-09-20/03-定位.png](nanhang-app/docs/verification/pages-mobile-2026-09-20/03-定位.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/pages-mobile-2026-09-20/04-实时思考.png](nanhang-app/docs/verification/pages-mobile-2026-09-20/04-实时思考.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/pages-mobile-2026-09-20/05-谈心回复.png](nanhang-app/docs/verification/pages-mobile-2026-09-20/05-谈心回复.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/pages-mobile-2026-09-20/06-方向小结卡.png](nanhang-app/docs/verification/pages-mobile-2026-09-20/06-方向小结卡.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/pages-mobile-2026-09-20/07-方向小结卡-滑到底.png](nanhang-app/docs/verification/pages-mobile-2026-09-20/07-方向小结卡-滑到底.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/pages-mobile-2026-09-20/08-设置卡.png](nanhang-app/docs/verification/pages-mobile-2026-09-20/08-设置卡.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/project-review-2026-09-13.json](nanhang-app/docs/verification/project-review-2026-09-13.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/project-review-repro-2026-09-13.mjs](nanhang-app/docs/verification/project-review-repro-2026-09-13.mjs) | 本次验证原始日志 |
| [nanhang-app/docs/verification/school-local-check.mjs](nanhang-app/docs/verification/school-local-check.mjs) | 本次验证原始日志 |
| [nanhang-app/docs/verification/school-local-result.json](nanhang-app/docs/verification/school-local-result.json) | 本次验证原始日志 |
| [nanhang-app/docs/verification/task03-admissions-db-2026-09-11.txt](nanhang-app/docs/verification/task03-admissions-db-2026-09-11.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/task03-data-validation-2026-09-10.txt](nanhang-app/docs/verification/task03-data-validation-2026-09-10.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/task08-ai-gateway-2026-09-11.txt](nanhang-app/docs/verification/task08-ai-gateway-2026-09-11.txt) | 本次验证原始日志 |
| [nanhang-app/docs/verification/task09-screenshots/desktop-reference-1440.png](nanhang-app/docs/verification/task09-screenshots/desktop-reference-1440.png) | TASK-09页面视觉核对截图 |
| [nanhang-app/docs/verification/task09-screenshots/desktop-route-1440.png](nanhang-app/docs/verification/task09-screenshots/desktop-route-1440.png) | TASK-09页面视觉核对截图 |
| [nanhang-app/docs/verification/task09-screenshots/desktop-start-1440.png](nanhang-app/docs/verification/task09-screenshots/desktop-start-1440.png) | TASK-09页面视觉核对截图 |
| [nanhang-app/docs/verification/task09-screenshots/mobile-question-390.png](nanhang-app/docs/verification/task09-screenshots/mobile-question-390.png) | TASK-09页面视觉核对截图 |
| [nanhang-app/docs/verification/task09-screenshots/mobile-top-390.png](nanhang-app/docs/verification/task09-screenshots/mobile-top-390.png) | TASK-09页面视觉核对截图 |
| [nanhang-app/docs/verification/topbar-320-fixed-2026-09-12.png](nanhang-app/docs/verification/topbar-320-fixed-2026-09-12.png) | 本次验证原始日志 |
| [nanhang-app/docs/verification/validation-history-before-e2001cb.md](nanhang-app/docs/verification/validation-history-before-e2001cb.md) | 本次验证原始日志 |
| [nanhang-app/fixtures/acceptance-cases.json](nanhang-app/fixtures/acceptance-cases.json) | 冻结合同或合成案例 |
| [nanhang-app/fixtures/match-result.invalid.json](nanhang-app/fixtures/match-result.invalid.json) | 冻结合同或合成案例 |
| [nanhang-app/fixtures/match-result.valid.json](nanhang-app/fixtures/match-result.valid.json) | 冻结合同或合成案例 |
| [nanhang-app/fixtures/student-profile.invalid.json](nanhang-app/fixtures/student-profile.invalid.json) | 冻结合同或合成案例 |
| [nanhang-app/fixtures/student-profile.valid.json](nanhang-app/fixtures/student-profile.valid.json) | 冻结合同或合成案例 |
| [nanhang-app/fixtures/target-scenario.invalid.json](nanhang-app/fixtures/target-scenario.invalid.json) | 冻结合同或合成案例 |
| [nanhang-app/fixtures/target-scenario.valid.json](nanhang-app/fixtures/target-scenario.valid.json) | 冻结合同或合成案例 |
| [nanhang-app/package-lock.json](nanhang-app/package-lock.json) | 工程配置或总入口 |
| [nanhang-app/package.json](nanhang-app/package.json) | 工程配置或总入口 |
| [nanhang-app/packages/ai-gateway/package.json](nanhang-app/packages/ai-gateway/package.json) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/catalog-guard.ts](nanhang-app/packages/ai-gateway/src/catalog-guard.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/fake-upstream.ts](nanhang-app/packages/ai-gateway/src/fake-upstream.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/gateway.ts](nanhang-app/packages/ai-gateway/src/gateway.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/identity.ts](nanhang-app/packages/ai-gateway/src/identity.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/index.ts](nanhang-app/packages/ai-gateway/src/index.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/input-guard.ts](nanhang-app/packages/ai-gateway/src/input-guard.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/output-guard.ts](nanhang-app/packages/ai-gateway/src/output-guard.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/qianfan-upstream.ts](nanhang-app/packages/ai-gateway/src/qianfan-upstream.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/redis-client.ts](nanhang-app/packages/ai-gateway/src/redis-client.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/redis-store.ts](nanhang-app/packages/ai-gateway/src/redis-store.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/sse.ts](nanhang-app/packages/ai-gateway/src/sse.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/state-store.ts](nanhang-app/packages/ai-gateway/src/state-store.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/src/types.ts](nanhang-app/packages/ai-gateway/src/types.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/test/acceptance-cases.test.ts](nanhang-app/packages/ai-gateway/test/acceptance-cases.test.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/test/catalog-guard.test.ts](nanhang-app/packages/ai-gateway/test/catalog-guard.test.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/test/gateway.test.ts](nanhang-app/packages/ai-gateway/test/gateway.test.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/test/qianfan-upstream.test.ts](nanhang-app/packages/ai-gateway/test/qianfan-upstream.test.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/test/redis-store.test.ts](nanhang-app/packages/ai-gateway/test/redis-store.test.ts) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/ai-gateway/tsconfig.json](nanhang-app/packages/ai-gateway/tsconfig.json) | TASK-08 AI中转纯核（幂等/额度/SSE/安全） |
| [nanhang-app/packages/contracts/package.json](nanhang-app/packages/contracts/package.json) | 工程配置或总入口 |
| [nanhang-app/packages/contracts/schema/data-release.schema.json](nanhang-app/packages/contracts/schema/data-release.schema.json) | 冻结合同或合成案例 |
| [nanhang-app/packages/contracts/schema/match-result.schema.json](nanhang-app/packages/contracts/schema/match-result.schema.json) | 冻结合同或合成案例 |
| [nanhang-app/packages/contracts/schema/student-profile.schema.json](nanhang-app/packages/contracts/schema/student-profile.schema.json) | 冻结合同或合成案例 |
| [nanhang-app/packages/contracts/schema/target-scenario.schema.json](nanhang-app/packages/contracts/schema/target-scenario.schema.json) | 冻结合同或合成案例 |
| [nanhang-app/packages/contracts/src/generated/data-release.ts](nanhang-app/packages/contracts/src/generated/data-release.ts) | Schema 生成类型 |
| [nanhang-app/packages/contracts/src/generated/index.ts](nanhang-app/packages/contracts/src/generated/index.ts) | Schema 生成类型 |
| [nanhang-app/packages/contracts/src/generated/match-result.ts](nanhang-app/packages/contracts/src/generated/match-result.ts) | Schema 生成类型 |
| [nanhang-app/packages/contracts/src/generated/student-profile.ts](nanhang-app/packages/contracts/src/generated/student-profile.ts) | Schema 生成类型 |
| [nanhang-app/packages/contracts/src/generated/target-scenario.ts](nanhang-app/packages/contracts/src/generated/target-scenario.ts) | Schema 生成类型 |
| [nanhang-app/packages/contracts/src/index.ts](nanhang-app/packages/contracts/src/index.ts) | 业务源码 |
| [nanhang-app/packages/contracts/src/validation.ts](nanhang-app/packages/contracts/src/validation.ts) | 业务源码 |
| [nanhang-app/packages/contracts/test/contracts.test.ts](nanhang-app/packages/contracts/test/contracts.test.ts) | 自动测试 |
| [nanhang-app/packages/contracts/test/task03-data.test.ts](nanhang-app/packages/contracts/test/task03-data.test.ts) | 自动测试 |
| [nanhang-app/packages/contracts/test/workbook-data.test.ts](nanhang-app/packages/contracts/test/workbook-data.test.ts) | 自动测试 |
| [nanhang-app/packages/contracts/tsconfig.json](nanhang-app/packages/contracts/tsconfig.json) | 工程配置或总入口 |
| [nanhang-app/packages/domain/package.json](nanhang-app/packages/domain/package.json) | 工程配置或总入口 |
| [nanhang-app/packages/domain/src/academic.ts](nanhang-app/packages/domain/src/academic.ts) | 业务源码 |
| [nanhang-app/packages/domain/src/data.ts](nanhang-app/packages/domain/src/data.ts) | 业务源码 |
| [nanhang-app/packages/domain/src/eligibility.ts](nanhang-app/packages/domain/src/eligibility.ts) | 业务源码 |
| [nanhang-app/packages/domain/src/index.ts](nanhang-app/packages/domain/src/index.ts) | 业务源码 |
| [nanhang-app/packages/domain/src/matching.ts](nanhang-app/packages/domain/src/matching.ts) | 业务源码 |
| [nanhang-app/packages/domain/src/preference.ts](nanhang-app/packages/domain/src/preference.ts) | 业务源码 |
| [nanhang-app/packages/domain/src/rank.ts](nanhang-app/packages/domain/src/rank.ts) | 业务源码 |
| [nanhang-app/packages/domain/src/reference.ts](nanhang-app/packages/domain/src/reference.ts) | 业务源码 |
| [nanhang-app/packages/domain/src/sort.ts](nanhang-app/packages/domain/src/sort.ts) | 业务源码 |
| [nanhang-app/packages/domain/src/types.ts](nanhang-app/packages/domain/src/types.ts) | 业务源码 |
| [nanhang-app/packages/domain/test/acceptance.test.ts](nanhang-app/packages/domain/test/acceptance.test.ts) | 自动测试 |
| [nanhang-app/packages/domain/test/matching.test.ts](nanhang-app/packages/domain/test/matching.test.ts) | 自动测试 |
| [nanhang-app/packages/domain/tsconfig.json](nanhang-app/packages/domain/tsconfig.json) | 工程配置或总入口 |
| [nanhang-app/packages/exploration/package.json](nanhang-app/packages/exploration/package.json) | 工程配置或总入口 |
| [nanhang-app/packages/exploration/src/index.ts](nanhang-app/packages/exploration/src/index.ts) | 业务源码 |
| [nanhang-app/packages/exploration/src/major-cards.ts](nanhang-app/packages/exploration/src/major-cards.ts) | 业务源码 |
| [nanhang-app/packages/exploration/test/exploration.test.ts](nanhang-app/packages/exploration/test/exploration.test.ts) | 自动测试 |
| [nanhang-app/packages/exploration/tsconfig.json](nanhang-app/packages/exploration/tsconfig.json) | 工程配置或总入口 |
| [nanhang-app/packages/match-input/package.json](nanhang-app/packages/match-input/package.json) | 工程配置或总入口 |
| [nanhang-app/packages/match-input/src/index.ts](nanhang-app/packages/match-input/src/index.ts) | 业务源码 |
| [nanhang-app/packages/match-input/tsconfig.json](nanhang-app/packages/match-input/tsconfig.json) | 工程配置或总入口 |
| [nanhang-app/packages/release-loader/package.json](nanhang-app/packages/release-loader/package.json) | 工程配置或总入口 |
| [nanhang-app/packages/release-loader/src/index.ts](nanhang-app/packages/release-loader/src/index.ts) | 业务源码 |
| [nanhang-app/packages/release-loader/tsconfig.json](nanhang-app/packages/release-loader/tsconfig.json) | 工程配置或总入口 |
| [nanhang-app/packages/school-adapter/package.json](nanhang-app/packages/school-adapter/package.json) | 工程配置或总入口 |
| [nanhang-app/packages/school-adapter/src/index.ts](nanhang-app/packages/school-adapter/src/index.ts) | 业务源码 |
| [nanhang-app/packages/school-adapter/test/fixtures/accuracy-v1.2.synthetic.json](nanhang-app/packages/school-adapter/test/fixtures/accuracy-v1.2.synthetic.json) | 自动测试 |
| [nanhang-app/packages/school-adapter/test/school-adapter.test.ts](nanhang-app/packages/school-adapter/test/school-adapter.test.ts) | 自动测试 |
| [nanhang-app/packages/school-adapter/tsconfig.json](nanhang-app/packages/school-adapter/tsconfig.json) | 工程配置或总入口 |
| [nanhang-app/pipelines/quality-huixi/build_quality_db.py](nanhang-app/pipelines/quality-huixi/build_quality_db.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/quality-huixi/export_dataset.ts](nanhang-app/pipelines/quality-huixi/export_dataset.ts) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/quality-huixi/export_identity.py](nanhang-app/pipelines/quality-huixi/export_identity.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/quality-huixi/export_release.py](nanhang-app/pipelines/quality-huixi/export_release.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/quality-huixi/import_class4_codes.py](nanhang-app/pipelines/quality-huixi/import_class4_codes.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/quality-huixi/test_class4_codes.py](nanhang-app/pipelines/quality-huixi/test_class4_codes.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/quality-huixi/verify_class4_codes.py](nanhang-app/pipelines/quality-huixi/verify_class4_codes.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/quality-huixi/verify_release.py](nanhang-app/pipelines/quality-huixi/verify_release.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/build_admissions_db.py](nanhang-app/pipelines/task03/build_admissions_db.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/crawl_official_tuition.py](nanhang-app/pipelines/task03/crawl_official_tuition.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/crosscheck_workbook_ranks.py](nanhang-app/pipelines/task03/crosscheck_workbook_ranks.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/enrich_university_details.py](nanhang-app/pipelines/task03/enrich_university_details.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/export_release.py](nanhang-app/pipelines/task03/export_release.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/extract_official_samples.py](nanhang-app/pipelines/task03/extract_official_samples.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/extract_score_distribution.py](nanhang-app/pipelines/task03/extract_score_distribution.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/extract_workbook_samples.py](nanhang-app/pipelines/task03/extract_workbook_samples.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/fetch_official_samples.py](nanhang-app/pipelines/task03/fetch_official_samples.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/fetch_score_distribution.py](nanhang-app/pipelines/task03/fetch_score_distribution.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/import_guangdong_plan_pdf.py](nanhang-app/pipelines/task03/import_guangdong_plan_pdf.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/import_henan_plan_pdfs.py](nanhang-app/pipelines/task03/import_henan_plan_pdfs.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/import_official_plan_archives.py](nanhang-app/pipelines/task03/import_official_plan_archives.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/merge_admissions_databases.py](nanhang-app/pipelines/task03/merge_admissions_databases.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/merge_official_tuition_entries.py](nanhang-app/pipelines/task03/merge_official_tuition_entries.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/official_guangdong_plan_import.json](nanhang-app/pipelines/task03/official_guangdong_plan_import.json) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/official_institution_tags.json](nanhang-app/pipelines/task03/official_institution_tags.json) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/official_plan_import.json](nanhang-app/pipelines/task03/official_plan_import.json) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/official_tuition_chsi_queue.json](nanhang-app/pipelines/task03/official_tuition_chsi_queue.json) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/official_tuition_chsi_recheck_queue.json](nanhang-app/pipelines/task03/official_tuition_chsi_recheck_queue.json) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/official_tuition_chsi_scan_progress.json](nanhang-app/pipelines/task03/official_tuition_chsi_scan_progress.json) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/official_tuition_crawl_cache.json](nanhang-app/pipelines/task03/official_tuition_crawl_cache.json) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/official_tuition_crawl_results.json](nanhang-app/pipelines/task03/official_tuition_crawl_results.json) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/official_tuition_research_log.json](nanhang-app/pipelines/task03/official_tuition_research_log.json) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/official_tuition_sources.json](nanhang-app/pipelines/task03/official_tuition_sources.json) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/query_admissions.py](nanhang-app/pipelines/task03/query_admissions.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/record_verification.py](nanhang-app/pipelines/task03/record_verification.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/test_admissions_db.py](nanhang-app/pipelines/task03/test_admissions_db.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/test_enrich_university_details.py](nanhang-app/pipelines/task03/test_enrich_university_details.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/test_merge_admissions_databases.py](nanhang-app/pipelines/task03/test_merge_admissions_databases.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/test_workbook_intake.py](nanhang-app/pipelines/task03/test_workbook_intake.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/validate_admissions_db.py](nanhang-app/pipelines/task03/validate_admissions_db.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/validate_score_distribution.py](nanhang-app/pipelines/task03/validate_score_distribution.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/validate_task03_samples.py](nanhang-app/pipelines/task03/validate_task03_samples.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/validate_workbook_samples.py](nanhang-app/pipelines/task03/validate_workbook_samples.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/verified_score_rows.py](nanhang-app/pipelines/task03/verified_score_rows.py) | 招生数据管线与历史来源工具 |
| [nanhang-app/pipelines/task03/windows_ocr.ps1](nanhang-app/pipelines/task03/windows_ocr.ps1) | 招生数据管线与历史来源工具 |
| [nanhang-app/README.md](nanhang-app/README.md) | 工程配置或总入口 |
| [nanhang-app/scripts/build_function.mjs](nanhang-app/scripts/build_function.mjs) | 工程配置或总入口 |
| [nanhang-app/scripts/check_pages_config.mjs](nanhang-app/scripts/check_pages_config.mjs) | 工程配置或总入口 |
| [nanhang-app/scripts/check_pages_config.test.mjs](nanhang-app/scripts/check_pages_config.test.mjs) | 工程配置或总入口 |
| [nanhang-app/scripts/deploy_cos.py](nanhang-app/scripts/deploy_cos.py) | 工程配置或总入口 |
| [nanhang-app/scripts/deploy_function.py](nanhang-app/scripts/deploy_function.py) | 工程配置或总入口 |
| [nanhang-app/scripts/deploy_school_cloud.py](nanhang-app/scripts/deploy_school_cloud.py) | 工程配置或总入口 |
| [nanhang-app/scripts/export_school_cloud.mjs](nanhang-app/scripts/export_school_cloud.mjs) | 工程配置或总入口 |
| [nanhang-app/scripts/generate-contract-types.mjs](nanhang-app/scripts/generate-contract-types.mjs) | 工程配置或总入口 |
| [nanhang-app/scripts/redis_store_check.mjs](nanhang-app/scripts/redis_store_check.mjs) | 工程配置或总入口 |
| [nanhang-app/scripts/totp_code.mjs](nanhang-app/scripts/totp_code.mjs) | 工程配置或总入口 |
| [nanhang-app/tmp/dali-2026-plan.png](nanhang-app/tmp/dali-2026-plan.png) | 工程配置或总入口 |
| [nanhang-app/tmp/fushun-2026-single-page-1.png](nanhang-app/tmp/fushun-2026-single-page-1.png) | 工程配置或总入口 |
| [nanhang-app/tmp/fushun-2026-single-page-2.png](nanhang-app/tmp/fushun-2026-single-page-2.png) | 工程配置或总入口 |
| [nanhang-app/tmp/fushun-2026-single-page-3.png](nanhang-app/tmp/fushun-2026-single-page-3.png) | 工程配置或总入口 |
| [nanhang-app/tmp/fushun-2026-single-page-4.png](nanhang-app/tmp/fushun-2026-single-page-4.png) | 工程配置或总入口 |
| [nanhang-app/tmp/fushun-2026-single-page-5.png](nanhang-app/tmp/fushun-2026-single-page-5.png) | 工程配置或总入口 |
| [nanhang-app/tmp/fushun-2026-single-page-6.png](nanhang-app/tmp/fushun-2026-single-page-6.png) | 工程配置或总入口 |
| [nanhang-app/tmp/fushun-2026-single.pdf](nanhang-app/tmp/fushun-2026-single.pdf) | 工程配置或总入口 |
| [nanhang-app/tmp/huzhou-2025-charter.pdf](nanhang-app/tmp/huzhou-2025-charter.pdf) | 工程配置或总入口 |
| [nanhang-app/tmp/jinken-2026/2d5f9332-2038-4a0a-b91c-e1f5c3bf45a4.png](nanhang-app/tmp/jinken-2026/2d5f9332-2038-4a0a-b91c-e1f5c3bf45a4.png) | 工程配置或总入口 |
| [nanhang-app/tmp/jinken-2026/5af251f9-be1b-43d3-a4cb-4937e6077d99.png](nanhang-app/tmp/jinken-2026/5af251f9-be1b-43d3-a4cb-4937e6077d99.png) | 工程配置或总入口 |
| [nanhang-app/tmp/jinken-2026/6f62b7a2-abdd-42d0-bab8-14b5466e42f1.png](nanhang-app/tmp/jinken-2026/6f62b7a2-abdd-42d0-bab8-14b5466e42f1.png) | 工程配置或总入口 |
| [nanhang-app/tmp/jinken-2026/84c70f55-6089-410c-a495-c680570b2dd3.png](nanhang-app/tmp/jinken-2026/84c70f55-6089-410c-a495-c680570b2dd3.png) | 工程配置或总入口 |
| [nanhang-app/tmp/jinken-2026/8b29d0a2-a1fc-41fc-8e0d-fd5c9852948d.png](nanhang-app/tmp/jinken-2026/8b29d0a2-a1fc-41fc-8e0d-fd5c9852948d.png) | 工程配置或总入口 |
| [nanhang-app/tmp/jinken-2026/928a0b89-17a4-4a64-a3da-dd21e1f5b71a.png](nanhang-app/tmp/jinken-2026/928a0b89-17a4-4a64-a3da-dd21e1f5b71a.png) | 工程配置或总入口 |
| [nanhang-app/tmp/jinken-2026/94c5f23f-6dfc-4e09-bf11-4698fa21b12b.png](nanhang-app/tmp/jinken-2026/94c5f23f-6dfc-4e09-bf11-4698fa21b12b.png) | 工程配置或总入口 |
| [nanhang-app/tmp/jinken-2026/a7516aab-6d9a-4eb3-a99f-bed129458d84.png](nanhang-app/tmp/jinken-2026/a7516aab-6d9a-4eb3-a99f-bed129458d84.png) | 工程配置或总入口 |
| [nanhang-app/tmp/jinken-2026/c04a7bab-bdc2-43fe-863a-780a1a5abde8.png](nanhang-app/tmp/jinken-2026/c04a7bab-bdc2-43fe-863a-780a1a5abde8.png) | 工程配置或总入口 |
| [nanhang-app/tmp/jinken-2026/e79ce52d-9fcb-4e48-bd56-458234498242.png](nanhang-app/tmp/jinken-2026/e79ce52d-9fcb-4e48-bd56-458234498242.png) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-advertising-charter-2026.jpg](nanhang-app/tmp/liaoning-advertising-charter-2026.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-advertising-table-bottom.jpg](nanhang-app/tmp/liaoning-advertising-table-bottom.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-advertising-table-left.jpg](nanhang-app/tmp/liaoning-advertising-table-left.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-advertising-table-right.jpg](nanhang-app/tmp/liaoning-advertising-table-right.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-advertising-table.jpg](nanhang-app/tmp/liaoning-advertising-table.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-building-2026.docx](nanhang-app/tmp/liaoning-building-2026.docx) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-engineering-2026/1.jpg](nanhang-app/tmp/liaoning-engineering-2026/1.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-engineering-2026/2.jpg](nanhang-app/tmp/liaoning-engineering-2026/2.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-engineering-2026/3.jpg](nanhang-app/tmp/liaoning-engineering-2026/3.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-engineering-2026/4.jpg](nanhang-app/tmp/liaoning-engineering-2026/4.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-engineering-2026/5.jpg](nanhang-app/tmp/liaoning-engineering-2026/5.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-engineering-2026/6.jpg](nanhang-app/tmp/liaoning-engineering-2026/6.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-engineering-2026/7.jpg](nanhang-app/tmp/liaoning-engineering-2026/7.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-engineering-2026/8.jpg](nanhang-app/tmp/liaoning-engineering-2026/8.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-equipment-2026.html](nanhang-app/tmp/liaoning-equipment-2026.html) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-equipment-charter.pdf](nanhang-app/tmp/liaoning-equipment-charter.pdf) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-ligong/page-1.jpg](nanhang-app/tmp/liaoning-ligong/page-1.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-ligong/page-2.jpg](nanhang-app/tmp/liaoning-ligong/page-2.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-ligong/page-3.bin](nanhang-app/tmp/liaoning-ligong/page-3.bin) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-ligong/page-4.jpg](nanhang-app/tmp/liaoning-ligong/page-4.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-ligong/page-5.jpg](nanhang-app/tmp/liaoning-ligong/page-5.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-ligong/page-6.jpg](nanhang-app/tmp/liaoning-ligong/page-6.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-ligong/page-7.jpg](nanhang-app/tmp/liaoning-ligong/page-7.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/liaoning-rail-charter.pdf](nanhang-app/tmp/liaoning-rail-charter.pdf) | 工程配置或总入口 |
| [nanhang-app/tmp/lnxdfwxy-charter-fee.jpg](nanhang-app/tmp/lnxdfwxy-charter-fee.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/lnxdfwxy-charter-fee2.jpg](nanhang-app/tmp/lnxdfwxy-charter-fee2.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/lnxdfwxy-fee-0.jpg](nanhang-app/tmp/lnxdfwxy-fee-0.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/lnxdfwxy-fee-1.jpg](nanhang-app/tmp/lnxdfwxy-fee-1.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/lnxdfwxy-fee-2.jpg](nanhang-app/tmp/lnxdfwxy-fee-2.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/lnxdfwxy-fee-3.jpg](nanhang-app/tmp/lnxdfwxy-fee-3.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/lnxdfwxy-fee-4.jpg](nanhang-app/tmp/lnxdfwxy-fee-4.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/lnxdfwxy-fee-5.jpg](nanhang-app/tmp/lnxdfwxy-fee-5.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/lnxdfwxy-fee-6.jpg](nanhang-app/tmp/lnxdfwxy-fee-6.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/lnxdfwxy-fee-table.jpg](nanhang-app/tmp/lnxdfwxy-fee-table.jpg) | 工程配置或总入口 |
| [nanhang-app/tmp/lnxdfwxy-plan.png](nanhang-app/tmp/lnxdfwxy-plan.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-2026-charter-2.pdf](nanhang-app/tmp/pdfs/cskj-2026-charter-2.pdf) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-2026-charter.pdf](nanhang-app/tmp/pdfs/cskj-2026-charter.pdf) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-contact.png](nanhang-app/tmp/pdfs/cskj-contact.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-01.png](nanhang-app/tmp/pdfs/cskj-page-01.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-02.png](nanhang-app/tmp/pdfs/cskj-page-02.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-03.png](nanhang-app/tmp/pdfs/cskj-page-03.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-04.png](nanhang-app/tmp/pdfs/cskj-page-04.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-05.png](nanhang-app/tmp/pdfs/cskj-page-05.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-06.png](nanhang-app/tmp/pdfs/cskj-page-06.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-07.png](nanhang-app/tmp/pdfs/cskj-page-07.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-08.png](nanhang-app/tmp/pdfs/cskj-page-08.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-09.png](nanhang-app/tmp/pdfs/cskj-page-09.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-10.png](nanhang-app/tmp/pdfs/cskj-page-10.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-11.png](nanhang-app/tmp/pdfs/cskj-page-11.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-12.png](nanhang-app/tmp/pdfs/cskj-page-12.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-13.png](nanhang-app/tmp/pdfs/cskj-page-13.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-14.png](nanhang-app/tmp/pdfs/cskj-page-14.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-15.png](nanhang-app/tmp/pdfs/cskj-page-15.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-16.png](nanhang-app/tmp/pdfs/cskj-page-16.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-17.png](nanhang-app/tmp/pdfs/cskj-page-17.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-18.png](nanhang-app/tmp/pdfs/cskj-page-18.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-19.png](nanhang-app/tmp/pdfs/cskj-page-19.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-20.png](nanhang-app/tmp/pdfs/cskj-page-20.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-21.png](nanhang-app/tmp/pdfs/cskj-page-21.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-22.png](nanhang-app/tmp/pdfs/cskj-page-22.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-23.png](nanhang-app/tmp/pdfs/cskj-page-23.png) | 工程配置或总入口 |
| [nanhang-app/tmp/pdfs/cskj-page-24.png](nanhang-app/tmp/pdfs/cskj-page-24.png) | 工程配置或总入口 |
| [nanhang-app/tmp/shenyang-vocational-2026-charter.pdf](nanhang-app/tmp/shenyang-vocational-2026-charter.pdf) | 工程配置或总入口 |
| [nanhang-app/tmp/usl-fee-research/fee.pdf](nanhang-app/tmp/usl-fee-research/fee.pdf) | 工程配置或总入口 |
| [nanhang-app/tmp/usl-fee-research/page-1.png](nanhang-app/tmp/usl-fee-research/page-1.png) | 工程配置或总入口 |
| [nanhang-app/tmp/usl-fee-research/page-2.png](nanhang-app/tmp/usl-fee-research/page-2.png) | 工程配置或总入口 |
| [nanhang-app/tmp/zjitc-chsi.html](nanhang-app/tmp/zjitc-chsi.html) | 工程配置或总入口 |
| [nanhang-app/tmp/zjpc-2025-charter.png](nanhang-app/tmp/zjpc-2025-charter.png) | 工程配置或总入口 |
| [nanhang-app/tmp/zjpc-2025-fees.png](nanhang-app/tmp/zjpc-2025-fees.png) | 工程配置或总入口 |
| [nanhang-app/tsconfig.base.json](nanhang-app/tsconfig.base.json) | 工程配置或总入口 |
| [nanhang-app/tsconfig.json](nanhang-app/tsconfig.json) | 工程配置或总入口 |
| [nanhang-app/VERSION.json](nanhang-app/VERSION.json) | 工程配置或总入口 |
| [nanhang-app/vitest.config.ts](nanhang-app/vitest.config.ts) | 工程配置或总入口 |
| [nanhang-handoff/contracts/data-release.schema.json](nanhang-handoff/contracts/data-release.schema.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/contracts/match-result.schema.json](nanhang-handoff/contracts/match-result.schema.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/contracts/student-profile.schema.json](nanhang-handoff/contracts/student-profile.schema.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/contracts/target-scenario.schema.json](nanhang-handoff/contracts/target-scenario.schema.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/DATA_AND_MATCHING_SPEC.md](nanhang-handoff/DATA_AND_MATCHING_SPEC.md) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/DELIVERY_AND_ACCEPTANCE.md](nanhang-handoff/DELIVERY_AND_ACCEPTANCE.md) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/evidence/repository-files.json](nanhang-handoff/evidence/repository-files.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/evidence/source-register.json](nanhang-handoff/evidence/source-register.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/EVIDENCE_AND_REUSE.md](nanhang-handoff/EVIDENCE_AND_REUSE.md) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/fixtures/acceptance-cases.json](nanhang-handoff/fixtures/acceptance-cases.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/fixtures/match-result.invalid.json](nanhang-handoff/fixtures/match-result.invalid.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/fixtures/match-result.valid.json](nanhang-handoff/fixtures/match-result.valid.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/fixtures/student-profile.invalid.json](nanhang-handoff/fixtures/student-profile.invalid.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/fixtures/student-profile.valid.json](nanhang-handoff/fixtures/student-profile.valid.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/fixtures/target-scenario.invalid.json](nanhang-handoff/fixtures/target-scenario.invalid.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/fixtures/target-scenario.valid.json](nanhang-handoff/fixtures/target-scenario.valid.json) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/IMPLEMENTATION_STATUS_2026-09-10.md](nanhang-handoff/IMPLEMENTATION_STATUS_2026-09-10.md) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/MANIFEST.sha256](nanhang-handoff/MANIFEST.sha256) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/PRODUCT_SPEC.md](nanhang-handoff/PRODUCT_SPEC.md) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/README.md](nanhang-handoff/README.md) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/requirements-contracts.txt](nanhang-handoff/requirements-contracts.txt) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/SYSTEM_AND_INTERFACE_SPEC.md](nanhang-handoff/SYSTEM_AND_INTERFACE_SPEC.md) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/tools/validate_contracts.py](nanhang-handoff/tools/validate_contracts.py) | 交接规范、结构合同、案例与来源登记 |
| [nanhang-handoff/VALIDATION.md](nanhang-handoff/VALIDATION.md) | 交接规范、结构合同、案例与来源登记 |
| [README.md](README.md) | 工程配置或总入口 |
| [releases/nanhang-app-source-2026-09-10.zip](releases/nanhang-app-source-2026-09-10.zip) | 当前源码分发与哈希 |
| [releases/nanhang-app-source-2026-09-10.zip.sha256](releases/nanhang-app-source-2026-09-10.zip.sha256) | 当前源码分发与哈希 |
| [releases/README.md](releases/README.md) | 当前源码分发与哈希 |
| [tools/check_frontend_lanes.py](tools/check_frontend_lanes.py) | 目录与文档维护工具 |
| [tools/sync_project_docs.py](tools/sync_project_docs.py) | 目录与文档维护工具 |
| [历史类 四川2026年高考填报数据招生考试报+近三年22-25年历史录取数据.xlsx](历史类 四川2026年高考填报数据招生考试报+近三年22-25年历史录取数据.xlsx) | 用户提供的只读招生主输入；核实与发布见 TASK-03 记录 |
| [物理类 四川2026年高考填报数据招生考试报+近三年22-25年历史录取数据.xlsx](物理类 四川2026年高考填报数据招生考试报+近三年22-25年历史录取数据.xlsx) | 用户提供的只读招生主输入；核实与发布见 TASK-03 记录 |
