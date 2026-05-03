/** @suga/ai-hooks — Hooks 生命周期系统公共 API */

// ——— 类型导出 ———
export type * from './types';

// ——— 常量导出 ———
export {
  DEFAULT_HOOK_TIMEOUT,
  DEFAULT_COMMAND_TIMEOUT,
  DEFAULT_PROMPT_TIMEOUT,
  DEFAULT_AGENT_TIMEOUT,
  DEFAULT_HTTP_TIMEOUT,
  DEFAULT_AGENT_MAX_TURNS,
  HOOK_NAME_PATTERN,
  HOOK_EVENTS
} from './constants';

// ——— 注册表导出 ———
export { HookRegistry } from './registry/HookRegistry';
export { InMemorySessionHookStore } from './registry/SessionHookStore';

// ——— 执行器导出 ———
export { HookExecutor } from './executor/HookExecutor';

// ——— Runner 导出 ———
export { RunnerRegistryImpl } from './runner/RunnerRegistry';
export { CallbackRunner } from './runner/CallbackRunner';
export { CommandRunner } from './runner/CommandRunner';
export { HttpRunner } from './runner/HttpRunner';
export { PromptRunner } from './runner/PromptRunner';
export { AgentRunner } from './runner/AgentRunner';
export { NodeShellExecutor } from './runner/NodeShellExecutor';
export { NodeHttpClient } from './runner/NodeHttpClient';
export { LLMQueryAdapter } from './runner/LLMQueryAdapter';
export { adaptFunctionHook } from './runner/adaptFunctionHook';
export {
  createDefaultHookExecutor,
  createFullHookExecutor,
  createHookExecutorDeps
} from './runner/createExecutors';

// ——— Phase 导出 ———
export { HookBeforeToolPhase } from './phase/HookBeforeToolPhase';
export { HookAfterToolPhase } from './phase/HookAfterToolPhase';
export { HookStopPhase } from './phase/HookStopPhase';

// ——— 工具函数导出 ———
export { aggregateHookResults } from './utils/aggregate';
export { matchesPattern } from './utils/match';
export { resolveHooksPolicy } from './utils/resolvePolicy';
export { validateHookDefinition, getDefaultTimeoutForType } from './utils/validateHookDefinition';
export { isPrivateIp } from './utils/ssrfGuard';
export { sanitizeHeaderValue } from './utils/sanitizeHeader';
export { parseCommandOutput } from './utils/parseCommandOutput';
