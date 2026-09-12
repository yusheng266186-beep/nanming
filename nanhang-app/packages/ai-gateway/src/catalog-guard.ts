/** Request-scoped, published-catalog vocabulary. It can narrow AI choices, never change matching facts. */
export interface CatalogChoice { readonly id: string; readonly name: string }
export function parseDirectionCatalog(raw: unknown): readonly CatalogChoice[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 500) return null;
  const seen = new Set<string>();
  const choices: CatalogChoice[] = [];
  for (const value of raw) {
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    if (Object.keys(item).some(key => key !== "id" && key !== "name")) return null;
    if (typeof item.id !== "string" || typeof item.name !== "string" || !item.name.trim() || item.name.length > 100) return null;
    if (item.id !== `catalog:${item.name.normalize("NFKC").trim()}` || seen.has(item.id)) return null;
    if (/[<>\r\n]/.test(item.name) || /https?:/i.test(item.name)) return null;
    seen.add(item.id); choices.push({ id: item.id, name: item.name });
  }
  return choices;
}
