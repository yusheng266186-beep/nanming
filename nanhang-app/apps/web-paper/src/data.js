// 南溟 · 纸感版数据层
//
// 这一层替代了原先内嵌在 HTML 里的 1.81 MB 数据切片与本地重实现的匹配规则。
// 现在它读取与 React 版完全相同的发布包，并调用同一套共享包：
//
//   @nanhang/release-loader  发布包线格式、分片转换、参考年、位次、分数轴刻度
//   @nanhang/match-input     从发布包构建匹配输入
//   @nanhang/domain          匹配规则本体（资格、参考关系、排序）
//
// 为什么必须共用：两套前端如果各写一份「哪一年可比」「位次取哪张表」的判断，
// 迟早会有一套悄悄给出错误结论。共用之后，两条路线对同一份数据给出同样的解读。
import {
  loadRelease, loadShard, convertShard, shardsFor,
  referenceYearFor as referenceYearForFromRelease,
  scorePosition, axisMarks, DIRECTION_CATEGORY_CLASSES,
} from "@nanhang/release-loader";
import { buildPublishedInput, DEFAULT_BATCHES, SELECTABLE_BATCHES } from "@nanhang/match-input";
import { buildMatchResult } from "@nanhang/domain";

export { SELECTABLE_BATCHES, DEFAULT_BATCHES, DIRECTION_CATEGORY_CLASSES, scorePosition, axisMarks };

/**
 * 参考年：同时具备官方分段表与已核实跨年可比关系的最近一年。
 *
 * 共享包需要显式传入 release；这里包一层，页面只给科类与年份集合，
 * 避免页面各自记住「release 要放在第一个参数」这类细节而出错。
 */
export function referenceYearFor(track, years) {
  if (!release || !track) return null;
  return referenceYearForFromRelease(release, track, years);
}

/** 已载入的发布包；页面启动时异步填充。 */
export let release = null;
/** 已按需加载的 offering，键为 offeringId。 */
export const offerings = new Map();
/** 展示名（院校、专业、门类、标签），键为 offeringId。 */
export const catalog = Object.create(null);

const shardCache = new Map();

export function releaseReady() {
  return release !== null;
}

/**
 * 载入发布包。
 *
 * 与 React 版走同一个入口，因此两套前端看到的是同一个 release_id 与同一份可比性记录。
 */
export async function loadPublishedRelease(basePath) {
  release = await loadRelease(basePath ? { basePath } : {});
  return release;
}

/** 某个批次在某科类下已发布的专业条数——取自 coverage，不靠加载后的数组长度猜。 */
export function batchOfferings(track, batch) {
  if (!release || !track) return null;
  const entries = release.manifest.coverage.filter(
    (item) => item.track === track && item.batch === batch);
  if (entries.length === 0) return null;
  return entries.reduce((total, item) => total + item.published_offerings, 0);
}

/** 取某个科类 + 批次的全部 offering（含历史记录与展示名），按需加载并缓存。 */
export async function ensureOfferings(track, batches) {
  if (!release) throw new Error("RELEASE_NOT_LOADED");
  const wanted = batches && batches.length > 0 ? batches : DEFAULT_BATCHES;
  const entries = shardsFor(release, track, wanted);
  for (const entry of entries) {
    const key = `${release.basePath}/${entry.path}`;
    if (shardCache.has(key)) continue;
    const shard = await loadShard(release, entry.path);
    const converted = convertShard(shard);
    shardCache.set(key, converted);
    for (const offering of converted.offerings) offerings.set(offering.offeringId, offering);
    Object.assign(catalog, converted.catalog);
  }
  return offerings;
}

/** 参与本次搜索范围的 offering（已加载部分中，属于该科类与批次）。 */
export function scopedOfferings(track, batches) {
  const wanted = new Set(batches && batches.length > 0 ? batches : DEFAULT_BATCHES);
  return [...offerings.values()].filter(
    (offering) => offering.track === track && wanted.has(offering.batch));
}

/** 参考年的可比性记录（VERIFIED）；页面据此说明「为什么可以用这一年」。 */
export function comparabilityRecord(track, year) {
  if (!release || !track || year === null) return null;
  return release.comparability.find((record) =>
    record.plan_track === track && record.history_year === year && record.status === "VERIFIED") ?? null;
}

/** 某科类下所有可用的历史年份（用于挑参考年）。 */
export function availableHistoryYears(track) {
  const years = new Set();
  for (const offering of offerings.values()) {
    if (offering.track !== track) continue;
    for (const record of offering.history) years.add(record.sourceYear);
  }
  return [...years];
}

/**
 * 运行一次匹配。
 *
 * 规则完全交给 @nanhang/domain 的 buildMatchResult：资格三值、组线/专业线分离、
 * 可比性为 NOT_ESTABLISHED 的年份不参与比较，全部由共享规则决定。
 * 这里只负责把结果整理成纸感版页面需要的形状。
 */
export async function runPaperMatch(request) {
  if (!release) throw new Error("RELEASE_NOT_LOADED");
  await ensureOfferings(request.track, request.batches);
  const built = await buildPublishedInput(request, release);
  if (!built) return null;
  const result = buildMatchResult(built.input);
  return { result, catalog: built.catalog };
}

export { buildMatchResult };
