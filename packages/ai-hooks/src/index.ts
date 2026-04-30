/** @suga/ai-hooks — Hooks 生命周期系统公共 API */

// ——— 类型导出 ———
export type * from './types';

// ——— 常量导出 ———
export { DEFAULT_HOOK_TIMEOUT, HOOK_NAME_PATTERN } from './constants';

// ——— 注册表导出 ———
export { HookRegistry } from './registry/HookRegistry';

// ——— 执行器导出 ———
export { HookExecutor } from './executor/HookExecutor';

// ——— Phase 导出 ———
export { HookBeforeToolPhase } from './phase/HookBeforeToolPhase';
export { HookAfterToolPhase } from './phase/HookAfterToolPhase';
export { HookStopPhase } from './phase/HookStopPhase';

// ——— 工具函数导出 ———
export { aggregateHookResults } from './utils/aggregate';
export { matchesPattern } from './utils/match';
