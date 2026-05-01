/** 记忆提示配置 + 结果类型 */

import type { TruncateResult } from './memory-index';

/** 记忆提示配置 */
export interface MemoryPromptConfig {
  readonly mode: 'individual' | 'team' | 'combined' | 'none';
  readonly includeStaleness: boolean; // 默认 true
  readonly includeTypes: boolean; // 默认 true
  readonly includeSaveRules: boolean; // 默认 true
  readonly maxContentLines: number; // 默认 MAX_ENTRYPOINT_LINES
  readonly maxContentBytes: number; // 默认 MAX_ENTRYPOINT_BYTES
}

/** 记忆提示生成结果 */
export interface MemoryPromptResult {
  readonly promptSections: readonly string[];
  readonly fullPrompt: string; // 所有段落拼接
  readonly truncationResult?: TruncateResult;
  readonly loadedFiles: readonly string[];
}
