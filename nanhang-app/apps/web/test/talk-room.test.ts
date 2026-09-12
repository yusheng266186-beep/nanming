// 谈心：进对话之后的房间形态，以及「聊完之后」才出现的东西。
//
// 负责人 2026-09-12 定：选好聊法进到聊天界面之后，不再给切换引航 / 泛舟的按钮；
// 聊天区要放大到接近整屏、输入框贴底；「去方向 · 选专业」只在 AI 聊出建议之后才出现
// （之前给了按钮点了没反应），并像登船卡片那样弹一张方向小结卡。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const talk = src("chapters/talk.tsx");
const css = src("style.css");

describe("谈心：进对话后的房间", () => {
  it("对话里不再有聊法切换按钮：聊法只在进对话之前选一次", () => {
    expect(talk).not.toContain("dock-ctrl");
    expect(talk).not.toContain('className="dc-k"');
    expect(css).not.toContain(".dock-ctrl{");
    // 进对话之前那张选择卡还在（学生仍然选一次），切换函数也仍然只在那儿用。
    expect(talk).toContain('className="voyage-card"');
    expect(talk).toContain("withMode(ai, choice.value)");
  });

  it("按钮可以去，状态得留着：当前档位仍显示在对话头部", () => {
    expect(talk).toContain('className="ch-tier"');
  });

  it("聊天区跟着视口给高度，消息区撑满剩余空间、输入栏贴底", () => {
    // 这几条必须带 #page-talk：页面原有的 `.chat-scroll{max-height:min(48vh,440px)}` 在文件里更靠后，
    // 不带作用域会被它盖掉——第一版就是这样，消息区没撑开、卡片下方留了一圈白。
    expect(css).toMatch(/#page-talk \.chat\{display:flex;flex-direction:column;height:clamp\(\d+px,calc\(100dvh - \d+px\),\d+px\)\}/);
    expect(css).toMatch(/#page-talk \.chat-head,#page-talk \.dock\{flex:0 0 auto\}/);
    expect(css).toMatch(/#page-talk \.chat-scroll\{flex:1 1 auto;min-height:0;max-height:none\}/);
  });

  it("放大的是房间不是每一行：容器放宽但气泡仍限宽", () => {
    expect(css).toMatch(/#page-talk \.talk\{max-width:min\(1024px,100%\)\}/);
    expect(css).toMatch(/#page-talk \.bub\{max-width:min\(82%,560px\)\}/);
  });

  it("备选按钮排成规整的两列网格（借北辰 .choices 的排法）", () => {
    expect(css).toMatch(/\.qopts\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:8px/);
    expect(css).toMatch(/\.qopt\{[^}]*text-align:center/);
    expect(css).toMatch(/@media\(max-width:640px\)\{\.qopts\{grid-template-columns:minmax\(0,1fr\)\}\}/);
    // 不再用 flex 换行排——那正是「一行两个、一行一个」参差的来源。
    expect(css).not.toMatch(/\.qopts\{display:flex/);
  });

  it("手机上再放宽一档高度", () => {
    expect(css).toContain("#page-talk .chat{height:clamp(360px,calc(100dvh - 200px),760px)}");
  });
});

describe("谈心：开场第一句", () => {
  it("两个模式的第一句都是问题，问题取自内容规格的第一条而不是另造", () => {
    expect(talk).toContain('import { QUESTIONS } from "@nanhang/exploration"');
    expect(talk).toContain("const OPENING_QUESTION = QUESTIONS[0]!.text;");
    expect(talk).toContain("{OPENING_QUESTION}");
    // 模式只决定「怎么答」的那句提示，不再决定开场说什么。
    expect(talk).toContain("OPENING_HINT[ai.mode]");
    expect(talk).not.toContain("我们一句一句来");
    expect(talk).not.toContain("泛舟开始。不设路线");
  });

  it("引航一进来就摆出可点的答案，点了才算学生说的", () => {
    expect(talk).toContain('ai.mode === "guided" && ai.history.length === 0');
    expect(talk).toContain("<AnswerStarters starters={OPENING_STARTERS}");
    expect(talk).toContain("onPick={(text) => void sendAi(text)}");
    expect(talk).toContain("const OPENING_STARTERS = [");
    // 还没连上或正在等回复时不给点（点了也发不出去）。
    expect(talk).toContain("disabled={ai.pending || !ai.connected}");
  });

  it("泛舟不给现成答案：只留问题，让学生自己说", () => {
    // 起点只在 guided 上渲染；泛舟那条分支里没有 AnswerStarters。
    expect(talk).toMatch(/ai\.mode === "guided" && ai\.history\.length === 0\s*\n\s*\? <AnswerStarters/);
  });
});

describe("谈心：聊完之后才给的东西", () => {
  it("AI 给出建议之前，不出现「去方向 · 选专业」", () => {
    expect(talk).toContain('{ai.suggestions.length ? <div className="talk-meta">');
    // 旧写法是按 hasChatted 灰着按钮——点了没反应，正是负责人指出的问题。
    expect(talk).not.toContain("disabled={!hasChatted}");
    expect(talk).toContain(">去方向 · 选专业<");
  });

  it("聊完之后自动弹一次方向小结卡，关掉后不再打扰，可手动再看", () => {
    expect(talk).toContain("const summarySeen = useRef(false)");
    // 触发点是「收口」（聊够方向覆盖），不是「刚拿到第一条建议」——借北辰到量即停的做法。
    expect(talk).toMatch(/if \(!settled \|\| summarySeen\.current\) return;/);
    // 素材判据吃的是学生原话与目录，不再只看轮数：
    expect(talk).toContain("directionTalkSettled(studentTurns, ai.suggestions, catalogGroups)");
    expect(talk).toContain('aria-label="溟听出来的方向"');
    expect(talk).toContain('className="board-backdrop"');
    expect(talk).toContain(">方向小结<");
  });

  it("聊够之后：说清「完成了、还能聊、方向不再变」，输入框仍可继续用", () => {
    expect(talk).toContain("这一轮谈心到这里就算完成。");
    expect(talk).toContain("只是不再往上加新的专业类了");
    // 输入框不禁用，只换提示语。
    expect(talk).toContain("还想补充就接着说——方向已经收齐，不再新增专业类");
    expect(talk).not.toMatch(/textarea[^>]*disabled=\{settled\}/);
  });

  it("冻结发生在收尾轮落定之后：收尾轮自己算出来的那套不会被冻掉", () => {
    const app = src("App.tsx");
    // 普通轮按 finalDone 决定是否冻结；收尾轮以 false 合并，落定后才置 finalDone。
    expect(app).toContain("mergeSuggestions(current.suggestions, merged.suggestions, groups, finalDone)");
    expect(app).toContain("mergeSuggestions(current.suggestions, merged.suggestions, catalog?.groups ?? [], false)");
    expect(app).toContain("setFinalDone(true)");
  });

  it("收尾轮借北辰的「报告轮」：界面发起一次，只发学生原话，指令不进转写", () => {
    const app = src("App.tsx");
    expect(app).toContain("FINAL_TURN_INSTRUCTION");
    expect(app).toContain("web-final-");
    // 素材只取学生自己的话（不重复发 AI 正文，也不把整段对话原样再发一遍）。
    expect(app).toContain("const chatEvidence = userTurns.map((turn, index) => (");
    // 收尾轮直接调 askAi，而不是走 sendAi：那条指令不能被当成学生说的话写进转写。
    expect(app).toMatch(/const runFinalTurn = async \(\) => \{[\s\S]*?await askAi\(ai, aiStamp\(\), aiStamp\(\), FINAL_TURN_INSTRUCTION/);
    expect(app).toMatch(/const runFinalTurn = async \(\) => \{[\s\S]*?setFinalDone\(true\)/);
    // 触发条件：聊够 + 已连上 + 不忙，且只发一次。
    expect(app).toContain("if (finalTurnRef.current || finalDone) return;");
    expect(app).toContain("if (!directionTalkSettled(studentTurns, ai.suggestions, catalog?.groups ?? [])) return;");
  });


  it("删掉那句每次回复都挂一遍的免责声明；真实状态照旧", () => {
    const panel = src("ai-panel.ts");
    expect(panel).not.toContain("AI 建议仅作待确认方向");
    // 出错/降级/限流这些真实状态仍然写进 status（只是正常一轮不再挂话）。
    expect(panel).toContain("AI 回复未通过安全校验，已降级为本地提示");
    expect(panel).toContain("replyRevision: inputRevision, status: null }");
  });

  it("没有专业类目录时把原因说出来，并指向起航的选科", () => {
    expect(talk).toContain("还没定选科：专业类清单按选科与批次生成，现在 AI 认不出专业类");
    expect(talk).toContain("{!catalog?.directions.length ? <p className=\"fhint\">");
  });

  it("小结卡按大类分组列出 AI 挑出的专业类，并带上原话与理由", () => {
    expect(talk).toMatch(/\(catalog\?\.groups \?\? \[\]\)\.map\(\(group\) => \{[\s\S]*?className="vpill"/);
    expect(talk).toContain("每条都带着那句话");
  });

  it("就业方向不在这里编：卡片只给一个入口，答案由 AI 在对话里现场给出", () => {
    expect(talk).toContain(">让溟讲讲就业方向<");
    expect(talk).toContain("这些方向以后主要做什么工作");
    // 卡片里不许出现写死的「就业方向」清单式内容。
    expect(talk).not.toMatch(/就业方向[:：]\s*[「"']/);
  });

  it("小结卡也锁住整页滚动（与登船卡片同一套浮层做法）", () => {
    expect(talk).toContain("useScrollLock(summaryOpen)");
    expect(talk).toContain("if (event.target === event.currentTarget) setSummaryOpen(false)");
  });
});
