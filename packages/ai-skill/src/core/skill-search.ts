/**
 * Skill Search 服务 — localSearch + remoteSkillLoader + prefetch
 *
 * N29: 补全 skillSearch 服务的核心功能。 实际远程加载由宿主注入。
 */

/** Skill Search 配置 */
export interface SkillSearchConfig {
  readonly enabled: boolean;
  readonly localSearchEnabled: boolean;
  readonly remoteSearchEnabled: boolean;
  readonly prefetchOnStartup: boolean;
  readonly maxResults: number;
}

export const DEFAULT_SKILL_SEARCH_CONFIG: SkillSearchConfig = {
  enabled: true,
  localSearchEnabled: true,
  remoteSearchEnabled: false,
  prefetchOnStartup: true,
  maxResults: 20
};

/** Skill Search 结果 */
export interface SkillSearchResult {
  readonly name: string;
  readonly description: string;
  readonly source: 'local' | 'remote' | 'builtin';
  readonly relevanceScore: number;
  readonly category?: string;
}

/** RemoteSkillLoaderFn — 宿主注入的远程skill加载函数 */
export type RemoteSkillLoaderFn = (query: string) => Promise<readonly SkillSearchResult[]>;

/** searchSkillsLocal — 从本地registry搜索skill */
export function searchSkillsLocal(
  query: string,
  registry: { list?: () => readonly { name: string; description: string }[] },
  config?: SkillSearchConfig
): readonly SkillSearchResult[] {
  const effectiveConfig = config ?? DEFAULT_SKILL_SEARCH_CONFIG;
  if (!effectiveConfig.localSearchEnabled) return [];

  const skills = registry.list?.() ?? [];

  const scored = skills.map(skill => ({
    name: skill.name,
    description: skill.description,
    source: 'local' as const,
    relevanceScore: computeRelevance(query, skill.name, skill.description)
  }));

  return scored
    .filter(s => s.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, effectiveConfig.maxResults);
}

/** computeRelevance — 计算搜索相关性分数 */
export function computeRelevance(query: string, name: string, description: string): number {
  const q = query.toLowerCase();
  const n = name.toLowerCase();
  const d = description.toLowerCase();

  let score = 0;

  // 精确名称匹配 → 最高分
  if (n === q) score += 10;
  // 名称包含查询 → 高分
  if (n.includes(q)) score += 5;
  // 描述包含查询 → 中分
  if (d.includes(q)) score += 2;
  // 查询词出现在名称开头 → 加分
  if (n.startsWith(q)) score += 3;

  return score;
}
