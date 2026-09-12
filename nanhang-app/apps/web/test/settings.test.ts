// 设置卡片：入口与归属的守卫。
//
// 「思考深度」原先在谈心页出现两处（聊法面板与对话底栏），「清除本次探索」在航线图页。
// 同一件事分散在两章，学生要回头找；现在两者都只留在顶栏右上角「溟」打开的设置卡片里。
// 这些断言钉住三件事：入口分工（左品牌 = 《逍遥游》彩蛋、右「溟」= 设置）、被搬走的位置
// 不再长回来、以及谈心页仍然如实显示当前档位（否则学生不知道这句话是按哪一档答的）。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");

const app = src("App.tsx");
const talk = src("chapters/talk.tsx");
const chart = src("chapters/chart.tsx");
const settings = src("chapters/settings.tsx");

describe("设置：入口与归属", () => {
  it("顶栏「溟」进设置，品牌标记留着《逍遥游》彩蛋", () => {
    expect(app).toMatch(/className="avatar" aria-label="设置"/);
    expect(app).toContain("onClick={() => setSettingsOpen(true)}>溟</button>");
    expect(app).toMatch(/className="brand" aria-label="南溟 · 逍遥游"/);
    expect(app).toContain("onClick={() => setShowKun(true)}>");
    expect(app).toContain("renderSettings({ open: settingsOpen");
  });

  it("思考深度只在设置里改，谈心页只显示当前档", () => {
    expect(settings).toContain("THINKING_CHOICES");
    expect(settings).toContain("withTier");
    expect(talk).not.toContain("withTier");
    expect(talk).toContain("ch-tier");
    // 两处旧位置都不该留下可点的档位：设置卡是唯一入口。
    expect(talk).not.toContain("tier-pick");
  });

  it("清除本人数据只在设置里；航线图那块个人资料面板整块下线", () => {
    expect(settings).toContain("清除本次探索");
    // 负责人 2026-09-12：航线图底部那块个人资料面板整块删除（下载 JSON 与清除按钮一起走），
    // 打印 / 另存为 PDF 也一并下线，只留导出 PNG、复制文字版与返回。清除的唯一入口在设置里。
    // （旧标记 onClick={clear} 不许回来。）
    expect(chart).not.toContain("onClick={clear}");
    expect(chart).not.toContain("下载本人 JSON");
    expect(chart).not.toContain("本人数据");
    expect(chart).not.toContain("打印 / 另存为 PDF");
  });
});
