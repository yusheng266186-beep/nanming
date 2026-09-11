export interface MajorFactCard {
  readonly cardId: string; readonly majorName: string; readonly exampleInstitution: string;
  readonly relatedExperienceId: string; readonly sourceId: string; readonly sourceUrl: string;
  readonly sourceLocator: string; readonly checkedOn: string; readonly sourcePublishedOn: string | null;
  readonly facts: readonly string[]; readonly courseExamples: readonly string[];
  readonly scopeNote: string; readonly unknowns: readonly string[];
  readonly nextQuestion: string;
}

const unknowns = Object.freeze(["目标年度在四川的招生计划与资格要求", "具体培养方案的适用年级", "历史录取资料及可比口径"]);
const scopeNote = "以下是该校专业介绍中的学习内容示例，不能代表所有学校，也不构成院校推荐或报考资格判断。体验任务由本项目自拟。";
const cards: MajorFactCard[] = [
  { cardId: "major-cs", majorName: "计算机科学与技术", exampleInstitution: "北京科技大学",
    relatedExperienceId: "experience-data", sourceId: "USTB-CS",
    sourceUrl: "https://zhaosheng.ustb.edu.cn/xkzy/zyjs/jsjl_zyjs/fe2d63e31c4b4c058d59f5359c0b1b5f.htm",
    sourceLocator: "专业简介；主要课程（2026-06-18发布）", sourcePublishedOn: "2026-06-18", checkedOn: "2026-09-10",
    facts: ["该校介绍将计算机系统与应用技术作为学习和工程实践的内容，并强调交流合作与解决工程问题。"],
    courseExamples: ["数据结构", "操作系统", "软件工程"], scopeNote, unknowns,
    nextQuestion: "除了整理数据，你是否愿意进一步了解程序怎样组织、运行和维护？" },
  { cardId: "major-mechanical", majorName: "机械工程", exampleInstitution: "北京科技大学",
    relatedExperienceId: "experience-model", sourceId: "USTB-ME",
    sourceUrl: "https://me.ustb.edu.cn/jyjx/bks/f08f2ef382b546d7b31e560452fb5c08.htm",
    sourceLocator: "专业简介；主要课程（2025-12-01发布）", sourcePublishedOn: "2025-12-01", checkedOn: "2026-09-10",
    facts: ["该校介绍覆盖机械系统的设计、制造、检测与控制，并强调自然科学基础和学习实践。"],
    courseExamples: ["机械制图", "机械设计", "控制工程基础"], scopeNote, unknowns,
    nextQuestion: "做完结构体验后，你是否想进一步了解材料、受力或控制方法？" },
  { cardId: "major-trade", majorName: "国际经济与贸易", exampleInstitution: "南开大学",
    relatedExperienceId: "experience-rules", sourceId: "NKU-TRADE",
    sourceUrl: "https://nkiet.nankai.edu.cn/11797/list.htm",
    sourceLocator: "专业简介中的国际经济与贸易专业段落（网页未标明发布日期）", sourcePublishedOn: null, checkedOn: "2026-09-10",
    facts: ["该系介绍强调经济贸易理论、专业技能、英语运用和相关政策理解。"],
    courseExamples: ["国际经济学", "世界经济概论", "国际贸易实务"], scopeNote, unknowns,
    nextQuestion: "读完规则体验后，你是否愿意继续了解跨地区交换、经济关系与语言沟通？" },
];
for (const card of cards) { Object.freeze(card.facts); Object.freeze(card.courseExamples); Object.freeze(card); }
export const MAJOR_FACT_CARDS: readonly MajorFactCard[] = Object.freeze(cards);
