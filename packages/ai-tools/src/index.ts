/** @suga/ai-tools — 工具实现包 barrel 导出 */

// ToolUseContext 扩展类型
export type { ExtendedToolUseContext } from './context-merge';

// 类型导出
export type * from './types/fs-provider';
export type * from './types/http-provider';
export type * from './types/tool-inputs';
export type * from './types/team-provider';
export type * from './types/task-provider';
export type * from './types/tool-outputs';

// 工具输入 Schema 导出（供宿主构建工具时使用）
export {
  GlobInputSchema,
  GrepInputSchema,
  FileReadInputSchema,
  FileWriteInputSchema,
  FileEditInputSchema,
  BashInputSchema,
  WebFetchInputSchema,
  FileLsInputSchema,
  NotebookEditInputSchema,
  TaskCreateInputSchema,
  TaskGetInputSchema,
  TaskListInputSchema,
  TaskUpdateInputSchema,
  TeamCreateInputSchema,
  TeamDeleteInputSchema,
  SendMessageInputSchema
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
export { webFetchTool } from './tools/web-fetch';
export { fileLsTool } from './tools/file-ls';
export { notebookEditTool } from './tools/notebook-edit';

// Task工具导出
export { taskCreateTool } from './tools/task-create';
export { taskGetTool } from './tools/task-get';
export { taskListTool } from './tools/task-list';
export { taskUpdateTool } from './tools/task-update';

// Team/SendMessage工具导出
export { teamCreateTool } from './tools/team-create';
export { teamDeleteTool } from './tools/team-delete';
export { sendMessageTool } from './tools/send-message';

// Provider 实现
export { NodeFileSystemProvider } from './provider/NodeFileSystemProvider';
export { DefaultHttpProvider } from './types/http-provider';
export { InMemoryTaskStoreProvider } from './provider/InMemoryTaskStoreProvider';
export { InMemoryTeamProvider } from './provider/InMemoryTeamProvider';
export { InMemoryMailboxProvider } from './provider/InMemoryMailboxProvider';
