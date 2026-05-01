/** @suga/ai-commands 共享常量 */

/** Commit diff 最大展示行数 */
export const MAX_COMMIT_DIFF_LINES = 300;

/** Commit log 默认拉取数量 */
export const DEFAULT_COMMIT_LOG_COUNT = 5;

/** Compact prompt 模板标题 */
export const COMPACT_PROMPT_TITLE = '## Context Compaction';

/** Memory save 确认提示标题 */
export const MEMORY_SAVE_TITLE = '## Memory Save';

/** Config 操作结果标题 */
export const CONFIG_TITLE = '## Configuration';

/** Doctor 报告标题 */
export const DOCTOR_TITLE = '## Diagnostic Report';

/** Status 展示标题 */
export const STATUS_TITLE = '## Session Status';

/** Diff 展示标题 */
export const DIFF_TITLE = '## Git Diff';

/** MCP 服务器列表标题 */
export const MCP_TITLE = '## MCP Servers';

/** Init 创建文件列表标题 */
export const INIT_TITLE = '## Project Initialization';

/** Provider 缺失时的通用错误提示 */
export const PROVIDER_MISSING_TEMPLATE =
  'Error: {command} requires {provider}. Host must inject it via SkillExecutionContext.';
