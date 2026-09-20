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
    // 调用写成了多行（多了 route / releaseId / 两个开关），所以拆成两条断言，不绑缩进。
    expect(app).toContain("renderSettings({");
    expect(app).toContain("open: settingsOpen");
  });

  it("顶栏不再挂「四川 · …」上下文按钮：它与航程条上的定位重复", () => {
    expect(app).not.toContain('className="ctx-btn"');
    // 样式刻意留在 style.css 里——另一条线的窄屏守卫仍在断言它，只是不再有标记用它。
    expect(src("style.css")).toContain(".ctx-btn");
  });

  it("设置卡里的两个开关：思考低语与界面动效，都接到真实状态上", () => {
    expect(settings).toContain("等待与动效");
    expect(settings).toContain("思考低语");
    expect(settings).toContain("界面动效");
    // 低语不是模型思考：卡片上必须如实写明这一点。
    expect(settings).toContain("不是模型的内部思考");
    // 开关落成 aria-pressed 的「开 / 关」两枚 chip（与北辰的开/关按钮同一套做法）。
    expect(settings).toContain('aria-pressed={value}');
    expect(settings).toContain(">开</button>");
    expect(settings).toContain(">关</button>");
    // 动效开关落到 html[data-motion] 上，样式与系统「减少动态效果」共用一套选择器。
    expect(app).toMatch(/if \(motionOff\) root\.dataset\.motion = "off";/);
    expect(src("style.css")).toContain('html[data-motion="off"] *');
  });

  it("「现在的样子」是只读一览，读数取自真实状态", () => {
    expect(settings).toContain("现在的样子");
    expect(settings).toContain('{route === "school" ? "荣县一中 · 增强模式" : "全国通用模式"}');
    expect(settings).toContain('{releaseId ?? "尚未载入"}');
    expect(settings).toContain('{ai.connected ? "已连接" : "未连接"} · {tierLabel}');
    // 只读：这一块里没有任何按钮。
    const block = settings.slice(settings.indexOf("现在的样子"), settings.indexOf("本人数据"));
    expect(block).not.toContain("<button");
  });

  it("低语只在开着且真的在等回答时出现，内容是南溟自己的实时进度", () => {
    expect(app).toContain("whisperOn");
    expect(talk).toContain("if (!ai.pending || !whisperOn) { setWaited(0); return; }");
    expect(talk).toMatch(/ai\.pending \? <ChatBubble from="ai"><TypingDots label=\{whisperOn \?/);
    // 负责人 2026-09-20：低语要实时变，不是三句一轮的循环——现在按真实经过的秒数推进，句子里带秒数。
    expect(talk).toContain("export function whisperLine(seconds: number, tier: ThinkingTier): string");
    expect(talk).toContain("已等 ${seconds} 秒");
    expect(talk).not.toContain("setInterval(() => setWhisperStep");
    // 同一轮里还有「实时思考」那一块：模型思考逐块显示（负责人 2026-09-20 明确要求）。
    expect(talk).toContain('className="thinking"');
    expect(talk).toContain("reasoningRef");
    expect(app).toContain("onReasoning");
    // 低语是一行「溟在做什么」，不许夹带分数或录取判断。
    expect(talk).not.toMatch(/whisperLine[\s\S]{0,600}概率|whisperLine[\s\S]{0,600}冲稳保/);
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
