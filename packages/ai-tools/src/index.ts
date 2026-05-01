/**
 * @suga/ai-tools — 6 核心工具实现包 barrel 导出
 *
 * Phase 1 stub: 仅导出类型和 context merge
 * Phase 2+: 导出工具实现
 */

// ToolUseContext 扩展类型
export type { ExtendedToolUseContext } from './context-merge';

// 类型导出
export type * from './types/fs-provider';
export type * from './types/tool-inputs';
export type * from './types/tool-outputs';

// 工具输入 Schema 导出（供宿主构建工具时使用）
export {
  GlobInputSchema,
  GrepInputSchema,
  FileReadInputSchema,
  FileWriteInputSchema,
  FileEditInputSchema,
  BashInputSchema
} from './types/tool-inputs';

// 纯函数工具导出
export {
  normalizeCurlyQuotes,
  enforceLfLineEndings,
  normalizeContent
} from './utils/path-normalize';
export { truncateOutput } from './utils/output-truncate';
export type { TruncateResult } from './utils/output-truncate';
export { isStale } from './utils/staleness-check';

// 工具实现导出
export { globTool } from './tools/glob';
export { grepTool } from './tools/grep';
export { fileReadTool } from './tools/file-read';
export { fileWriteTool } from './tools/file-write';
export { fileEditTool } from './tools/file-edit';
export { bashTool } from './tools/bash';
