/**
 * 荣县一中增强模式的读取层。
 *
 * 数据来自 `data/quality-huixi/release/`：`index.json` 是全体共享的匿名汇总（年级/班级的
 * 均分、上线率、分数线、知识点与数据健康度），`shards/<hash>.json` 是一个人一份，文件名是
 * 该生 6 位验证码的 SHA-256 前 40 位。
 *
 * 边界必须说清楚：
 *  1. 6 位数字只有 100 万种，只要能读到发布目录就可以离线穷举，因此这套产物**只能在校内/
 *     本机演示**；真正的身份校验必须搬到服务器并加限流（见 manifest.codeStrength）。
 *  2. 分片里只有该生自己的成绩行和匿名汇总，没有同学姓名；班级临界生名单留在数据库里，
 *     不进发布包。
 *  3. 本模块不生成任何录取结论：位次与线差只描述校内相对位置，不构成录取概率。
 */
import type { QualityIndex, QualityShard, QualityStudentExam, QualitySubjectRow, QualityKnowledgeArea } from "./quality-types.js";

export const QUALITY_BASE =
  (import.meta.env?.VITE_NANHANG_QUALITY_BASE as string | undefined) ?? "/data/quality-huixi";

/** 尝试次数上限：仅用于挡住误触与随手试号，不构成安全边界。 */
export const MAX_CODE_ATTEMPTS = 5;

export interface LoadedQuality {
  index: QualityIndex;
  shard: QualityShard;
}

export class QualityError extends Error {
  readonly reason: "not_found" | "network" | "malformed" | "attempts";

  constructor(reason: QualityError["reason"], message: string) {
    super(message);
    this.name = "QualityError";
    this.reason = reason;
  }
}

/**
 * 取 JSON，并把三类失败分开。
 *
 * 不存在的分片在静态托管下是 404，但在带 SPA 回落的开发服务器上会返回 200 + index.html。
 * 两者都表示「按这个验证码找不到人」，所以按内容判断：不是 JSON 就当查无此人，而不是把它
 * 报成数据损坏，否则学生会看到一句和技术细节有关、却与自己的操作无关的提示。
 */
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal, cache: "no-store" });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new QualityError("network", `无法连接成绩数据：${url}`);
  }
  if (!response.ok) throw new QualityError("not_found", `成绩数据不可用（HTTP ${response.status}）`);
  const body = await response.text();
  const looksLikeHtml = /^\s*<(?:!doctype|html)/i.test(body);
  try {
    return JSON.parse(body) as T;
  } catch {
    if (looksLikeHtml) throw new QualityError("not_found", "没有找到与该验证码对应的成绩记录。");
    throw new QualityError("malformed", `成绩数据无法解析：${url}`);
  }
}

/** 只接受 6 位数字；其它输入在校验前就被拒绝，不发起请求。 */
export function normalizeCode(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return digits.length === 6 ? digits : null;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function loadQualityIndex(signal?: AbortSignal): Promise<QualityIndex> {
  return getJson<QualityIndex>(`${QUALITY_BASE}/release/index.json`, signal);
}

/**
 * 按验证码取回本人分片。
 *
 * 不搜索姓名、不按班级取全量：只有知道 6 位码才能定位到文件。找不到时抛出 `not_found`，
 * 调用方据此提示「验证码不正确或不在本次数据范围内」，不透露某个码是否存在。
 */
export async function loadQualityShard(code: string, signal?: AbortSignal): Promise<QualityShard> {
  const normalized = normalizeCode(code);
  if (!normalized) throw new QualityError("attempts", "请输入 6 位数字验证码。");
  const name = (await sha256Hex(normalized)).slice(0, 40);
  return getJson<QualityShard>(`${QUALITY_BASE}/release/shards/${name}.json`, signal);
}

export interface QualityAttempts {
  count: number;
  blocked: boolean;
}

export const initialQualityAttempts: QualityAttempts = { count: 0, blocked: false };

export function registerFailure(attempts: QualityAttempts): QualityAttempts {
  const count = attempts.count + 1;
  return { count, blocked: count >= MAX_CODE_ATTEMPTS };
}

export function attemptsMessage(attempts: QualityAttempts): string {
  if (attempts.blocked) return `已连续输错 ${attempts.count} 次，本页不再重试。请向班主任核对验证码后刷新页面。`;
  return `验证码不正确，或该生不在本次数据范围内。还可尝试 ${MAX_CODE_ATTEMPTS - attempts.count} 次。`;
}

/** 一份分片里最近的考试记录，按考试顺序的最后一个。 */
export function latestExam(shard: QualityShard): QualityStudentExam | null {
  return shard.exams.length ? shard.exams[shard.exams.length - 1] : null;
}

/** 表单要用的历史分：最近 N 次的总分，旧→新。 */
export function recentTotals(shard: QualityShard, limit = 5): number[] {
  return shard.exams.slice(-limit).map((exam) => exam.total);
}

/** 再选科目的组合字符 → 表单科目代码。首选「物/历」不在此表，由本人 track 决定。 */
const ADDITIONAL_SUBJECT_CODES: Record<string, string> = {
  化: "CHEMISTRY", 生: "BIOLOGY", 政: "POLITICS", 地: "GEOGRAPHY"
};

/**
 * 从选科组合原文解析再选科目的表单代码。
 *
 * 组合形如「物化地」：首字符是首选科目，后两个字符是再选科目。只解析能识别的字符；
 * 识别不足两门时返回 null，调用方保持表单原样、由学生自己选——成绩摘要可能出现当前
 * 数据里没有的新组合，按旧名单猜一个出来会把资格判断悄悄带偏。
 */
export function additionalFromCombination(combination: string): [string, string] | null {
  const codes = [...combination.slice(1)].map((char) => ADDITIONAL_SUBJECT_CODES[char] ?? null);
  if (codes.length !== 2 || codes[0] === null || codes[1] === null) return null;
  return [codes[0], codes[1]];
}

/**
 * 把分片里的科目行转成「距线差」视图。
 *
 * 只做减法：分数、线、均分都来自数据；线缺失就显示为不可用，不推断、不插值。
 */
export interface SubjectDistance {
  subject: string;
  value: number | null;
  state: string;
  undergraduateLine: number | null;
  topLine: number | null;
  undergraduateGap: number | null;
  topGap: number | null;
  gradeAverage: number | null;
  classAverage: number | null;
  gradeGap: number | null;
  classGap: number | null;
}

export function subjectDistances(exam: QualityStudentExam): SubjectDistance[] {
  // subtractions stay exact; formatting is the display layer's job, so no rounding here.
  return exam.subjects.map((row: QualitySubjectRow) => ({
    subject: row.subject,
    value: row.value,
    state: row.state,
    undergraduateLine: row.undergraduateLine,
    topLine: row.topLine,
    undergraduateGap: row.undergraduateLine === null || row.value === null
      ? null : row.value - row.undergraduateLine,
    topGap: row.topLine === null || row.value === null ? null : row.value - row.topLine,
    gradeAverage: row.gradeAverage,
    classAverage: row.classAverage,
    gradeGap: row.gradeAverage === null || row.value === null ? null : row.value - row.gradeAverage,
    classGap: row.classAverage === null || row.value === null ? null : row.value - row.classAverage
  }));
}

/**
 * 该生最需要优先补的知识点。
 *
 * 只取有来源满分、且该生确有作答的知识点。排序规则决定了这张表有没有用：
 *  1. 先按本人得分率升序——最弱的排前面；
 *  2. 得分率相同（尤其是一批并列 0%）时，**先看丢了多少分**（`possible` 大的优先）。
 *     否则并列里会挤满「0/3」这类小题，把「0/17」的大题挤到看不见；
 *  3. 再相同时，看与年级得分率的差——差得越多，越可能是本人而不是全年级的问题。
 *
 * 不生成补弱结论，只排序；年级得分率一并给出，让「全班都不高」和「只有我掉队」能区分开。
 */
export interface KnowledgeGap extends QualityKnowledgeArea {
  subject: string;
  exam: string;
}

export function weakestKnowledge(shard: QualityShard, limit = 8): KnowledgeGap[] {
  const rows: KnowledgeGap[] = [];
  for (const exam of shard.exams) {
    for (const block of exam.knowledge) {
      for (const area of block.areas) {
        if (area.possible <= 0) continue;
        rows.push({ ...area, subject: block.subject, exam: exam.exam });
      }
    }
  }
  return rows
    .sort((left, right) =>
      left.rate - right.rate
      || right.possible - left.possible
      || (left.rate - (left.gradeRate ?? left.rate)) - (right.rate - (right.gradeRate ?? right.rate)))
    .slice(0, limit);
}

/** 成绩表里发生过班级变动的考试标签，用于在页面上说明「班号取的是最近一次」。 */
export function classChanges(shard: QualityShard): QualityStudentExam[] {
  const seen = new Set<number>();
  const changes: QualityStudentExam[] = [];
  for (const exam of shard.exams) {
    if (seen.size && !seen.has(exam.classNo)) changes.push(exam);
    seen.add(exam.classNo);
  }
  return changes;
}

/**
 * 分数显示：最多两位小数并去掉尾随的 0，让 562.25 不显示成 562.3、604 不显示成 604.00。
 */
export function formatScore(value: number | null): string {
  if (value === null) return "—";
  return String(Math.round(value * 100) / 100);
}

export function formatGap(value: number | null): string {
  if (value === null) return "—";
  const rounded = Math.round(value * 100) / 100;
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

export function formatRate(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

/**
 * 航迹柱高：把历次总分画成一条可看的轨迹。
 *
 * 只在本人考过的场次之间比较，柱高按各场自己的总分在「本人最低–最高」之间的位置取值，
 * 不跨考试难度、不与分数线混算。缺考或没有来源总分的场次返回 null，由页面画成空柱——
 * 不补成 0 分，因为 0 分会看起来像「考了 0 分」。
 *
 * 抽成纯函数是为了能验证：页面上那条轨迹此前只能靠真实验证码才能看到。
 */
export function trailHeights(totals: readonly (number | null)[]): (number | null)[] {
  const known = totals.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (known.length === 0) return totals.map(() => null);
  const max = Math.max(...known);
  const min = Math.min(...known);
  const span = Math.max(max - min, 1);
  return totals.map((value) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(((value - min) / span) * 70 + 30)
      : null);
}
