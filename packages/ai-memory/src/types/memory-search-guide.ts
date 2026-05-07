/** G40: Memory 搜索指导配置类型 */

export interface MemorySearchGuideConfig {
  /** 是否启用搜索指导 */
  readonly enabled: boolean;
  /** 搜索最大结果数 */
  readonly maxSearchResults: number;
  /** 相关性阈值 */
  readonly relevanceThreshold: number;
  /** 触发搜索的关键词列表 */
  readonly searchHintKeywords: readonly string[];
  /** 是否包含搜索策略提示 */
  readonly includeSearchStrategyHint: boolean;
}
