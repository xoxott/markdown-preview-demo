/**
 * @suga/ai-tool-core
 * AI 工具抽象层核心包 — 基于失败封闭默认值的工具定义、注册和执行管线
 */

// 类型导出
export type * from './types';

// 核心实现
export { buildTool, TOOL_DEFAULTS } from './tool';
export { ToolRegistry } from './registry';
export { ToolExecutor } from './executor';
export type { ExecutorResult } from './executor';
export { lazySchema } from './lazy-schema';
export type { LazySchema, LazySchemaFactory } from './lazy-schema';

// 常量
export {
  DEFAULT_MAX_RESULT_SIZE,
  DEFAULT_SESSION_ID,
  TOOL_NAME_PATTERN,
  TOOL_ALIAS_PATTERN
} from './constants';
