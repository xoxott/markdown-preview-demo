/**
 * ExtractMemories — 会话结束时从 transcript 提取持久记忆
 *
 * 使用 forked agent 分析 transcript，识别值得持久记住的信息。 这是类型+配置层，实际 LLM 调用由宿主注入。
 */

/** 提取的记忆条目 */
export interface ExtractedMemory {
  readonly type: 'user' | 'feedback' | 'project' | 'reference';
  readonly content: string;
  readonly confidence: number; // 0-1，置信度
  readonly reason: string;
}

/** ExtractMemories 配置 */
export interface ExtractMemoriesConfig {
  readonly enabled: boolean;
  readonly maxExtractions: number; // 每次最多提取条目数（默认5）
  readonly minConfidence: number; // 最低置信度（默认0.7）
  readonly forkOnSessionEnd: boolean; // 是否在会话结束时 fork（默认true）
}

export const DEFAULT_EXTRACT_MEMORIES_CONFIG: ExtractMemoriesConfig = {
  enabled: true,
  maxExtractions: 5,
  minConfidence: 0.7,
  forkOnSessionEnd: true
};

/** ExtractMemoriesFn — 宿主注入的LLM提取函数 */
export type ExtractMemoriesFn = (transcript: string) => Promise<readonly ExtractedMemory[]>;

/**
 * extractMemoriesFromTranscript — 从会话转录提取记忆
 *
 * 1. 调用宿主注入的 LLM 函数分析 transcript
 * 2. 过滤低置信度条目
 * 3. 返回值得持久记住的信息
 */
export async function extractMemoriesFromTranscript(
  transcript: string,
  extractFn: ExtractMemoriesFn,
  config?: ExtractMemoriesConfig
): Promise<readonly ExtractedMemory[]> {
  const effectiveConfig = config ?? DEFAULT_EXTRACT_MEMORIES_CONFIG;

  if (!effectiveConfig.enabled) return [];

  const raw = await extractFn(transcript);

  // 过滤低置信度
  const filtered = raw.filter(m => m.confidence >= effectiveConfig.minConfidence);

  // 限制数量
  return filtered.slice(0, effectiveConfig.maxExtractions);
}
