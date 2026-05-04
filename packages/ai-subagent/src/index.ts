/**
 * @suga/ai-subagent
 * In-Process 子代理执行系统 — AgentTool桥接、SubagentSpawner真实执行、scoped ToolRegistry隔离、prompt cache脚手架、DiskTaskOutput噪声隔离
 */

// 类型导出
export type * from './types';

// 常量
export {
  AGENT_TOOL_NAME,
  DEFAULT_SUBAGENT_TIMEOUT,
  DEFAULT_MAX_IN_MEMORY_CHARS,
  DEFAULT_MAX_FORK_DEPTH
} from './constants';

// 注册表
export { SubagentRegistry } from './registry/SubagentRegistry';

// 创建器
export { SubagentSpawner } from './spawner/SubagentSpawner';
export type { Spawner } from './spawner/SubagentSpawner';
export { ForkSpawner } from './spawner/ForkSpawner';

// Fork 递归防护
export {
  FORK_BOILERPLATE,
  isInForkChild,
  getForkDepth,
  injectForkBoilerplate
} from './spawner/ForkGuard';

// 工具
export { createAgentTool } from './tool/AgentTool';

// Cache 脚手架
export {
  extractCacheSafeParams,
  buildPlaceholderResults,
  assembleChildMessages
} from './cache/PromptCacheBridge';
export { detectBreak } from './cache/CacheBreakDetector';

// 噪声隔离
export { DiskTaskOutput } from './output/DiskTaskOutput';
export { OutputFileBridge } from './output/OutputFileBridge';

// P9 集成
export { SubagentDispatchPhase } from './integration/SubagentDispatchPhase';

// 内置代理定义
export {
  BUILTIN_AGENT_DEFINITIONS,
  createBuiltinSubagentRegistry
} from './builtin/BuiltinAgentDefinitions';
export { getSystemPromptForAgentType } from './builtin/SystemPrompts';
