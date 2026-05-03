/** HookExecutor 工厂函数 — 简化 Runner 组装 */

import type { HookRegistry } from '../registry/HookRegistry';
import type { HookRunnerDeps } from '../types/runner';
import type { SessionHookStore } from '../types/session';
import type { LLMProvider } from '@suga/ai-agent-loop';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from './RunnerRegistry';
import { CallbackRunner } from './CallbackRunner';
import { CommandRunner } from './CommandRunner';
import { HttpRunner } from './HttpRunner';
import { PromptRunner } from './PromptRunner';
import { AgentRunner } from './AgentRunner';
import { LLMQueryAdapter } from './LLMQueryAdapter';

/**
 * createDefaultHookExecutor — 仅注册 CallbackRunner
 *
 * 最简配置，行为与旧版 HookExecutor(registry) 完全一致。 Phase 现有测试可使用此工厂保持零改动。
 */
export function createDefaultHookExecutor(
  registry: HookRegistry,
  sessionStore?: SessionHookStore
): HookExecutor {
  const runnerRegistry = new RunnerRegistryImpl();
  runnerRegistry.register(new CallbackRunner());

  return new HookExecutor(registry, runnerRegistry, sessionStore);
}

/**
 * createFullHookExecutor — 注册全部 4种 Runner + CallbackRunner
 *
 * 需要提供 HookRunnerDeps 中的各 Runner 依赖注入。 未提供的 deps 对应 Runner 不会被注册（resolve 时 fallback 到
 * CallbackRunner）。
 */
export function createFullHookExecutor(
  registry: HookRegistry,
  deps: HookRunnerDeps,
  sessionStore?: SessionHookStore
): { executor: HookExecutor; runnerRegistry: RunnerRegistryImpl } {
  const runnerRegistry = new RunnerRegistryImpl();

  // CallbackRunner 始终注册（作为 fallback）
  runnerRegistry.register(new CallbackRunner());

  // CommandRunner — 需要 ShellExecutor
  if (deps.shellExecutor !== undefined) {
    runnerRegistry.register(new CommandRunner(deps.shellExecutor));
  }

  // HttpRunner — 需要 HttpClient
  if (deps.httpClient !== undefined) {
    runnerRegistry.register(new HttpRunner(deps.httpClient, deps.ssrfGuard, deps.envProvider));
  }

  // PromptRunner — 需要 LLMProvider → LLMQueryAdapter 适配
  if (deps.llmProvider !== undefined) {
    const queryService = new LLMQueryAdapter(deps.llmProvider as LLMProvider);
    runnerRegistry.register(new PromptRunner(queryService));
  }

  // AgentRunner — 需要 LLMProvider → LLMQueryAdapter 适配
  if (deps.llmProvider !== undefined) {
    const queryService = new LLMQueryAdapter(deps.llmProvider as LLMProvider);
    runnerRegistry.register(new AgentRunner(queryService));
  }

  const executor = new HookExecutor(registry, runnerRegistry, sessionStore);
  return { executor, runnerRegistry };
}

/**
 * createHookExecutorDeps — 创建 HookExecutorDeps 对象
 *
 * 用于 Phase 构造器，避免手动组装 deps 对象。
 */
export function createHookExecutorDeps(
  registry: HookRegistry,
  sessionStore?: SessionHookStore
): import('../types/runner').HookExecutorDeps {
  const runnerRegistry = new RunnerRegistryImpl();
  runnerRegistry.register(new CallbackRunner());

  return { registry, runnerRegistry, sessionStore };
}
