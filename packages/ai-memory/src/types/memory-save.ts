/** 记忆保存验证类型 */

/** 保存决策 */
export type SaveDecision = 'save' | 'skip' | 'normalize';

/** 保存排除原因 */
export interface SaveExclusion {
  readonly decision: 'skip' | 'normalize';
  readonly reason: string;
  readonly pattern: string; // 触发排除的模式
}

/** 保存验证结果 */
export interface SaveValidationResult {
  readonly decision: SaveDecision;
  readonly exclusion?: SaveExclusion;
  readonly normalizedContent?: string; // normalizeMemoryContent 后的内容
}

/** 排除模式 — 不应保存的内容特征 */
export const WHAT_NOT_TO_SAVE_PATTERNS: readonly SaveExclusion[] = [
  // 代码模式 — 可从代码本身推导
  { decision: 'skip', reason: 'code_pattern', pattern: '```' },
  { decision: 'skip', reason: 'code_pattern', pattern: 'function ' },
  { decision: 'skip', reason: 'code_pattern', pattern: 'class ' },
  { decision: 'skip', reason: 'code_pattern', pattern: 'import ' },
  { decision: 'skip', reason: 'code_pattern', pattern: '// TODO' },
  { decision: 'skip', reason: 'code_pattern', pattern: '// FIXME' },
  // Git 历史 — 可从 git log/blame 推导
  { decision: 'skip', reason: 'git_history', pattern: 'git log' },
  { decision: 'skip', reason: 'git_history', pattern: 'git diff' },
  { decision: 'skip', reason: 'git_history', pattern: 'commit ' },
  // 调试方案 — 修复已在代码中，commit message 有上下文
  { decision: 'skip', reason: 'debugging', pattern: 'console.log' },
  { decision: 'skip', reason: 'debugging', pattern: 'debugger' },
  { decision: 'skip', reason: 'debugging', pattern: 'stack trace' },
  // CLAUDE.md 文档 — 已有专门文件
  { decision: 'skip', reason: 'claude_md', pattern: 'CLAUDE.md' },
  { decision: 'skip', reason: 'claude_md', pattern: '# CLAUDE' },
  // 临时任务 — 仅当前对话有用
  { decision: 'skip', reason: 'ephemeral', pattern: 'temporary' },
  { decision: 'skip', reason: 'ephemeral', pattern: 'just for now' }
];
