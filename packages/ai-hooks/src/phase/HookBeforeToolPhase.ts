/** HookBeforeToolPhase — 工具执行前的 Hook 拦截阶段 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { PreToolUseInput } from '../types/input';
import type { HookExecutionContext } from '../types/hooks';
import type { HookExecutorDeps } from '../types/runner';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

/**
 * HookBeforeToolPhase — 工具执行前的 Hook 拦截
 *
 * 在 ExecuteToolsPhase 前插入，对每个 ToolUseBlock 执行 PreToolUse hooks：
 *
 * 1. 从 ctx.toolUses 获取当前轮的工具调用列表
 * 2. 对每个 toolUse 执行 PreToolUse hooks
 * 3. 聚合结果写入 ctx.meta:
 *
 *    - hookPermissionBehavior → 权限行为决策
 *    - hookUpdatedInputs → 修改后的输入（Map<toolUseId, updatedInput>）
 *    - hookPreventContinuation → 是否阻止后续
 *    - hookStopReason → 阻止原因
 *    - hookAdditionalContexts → 附加上下文信息
 */
export class HookBeforeToolPhase implements LoopPhase {
  private readonly executor: HookExecutor;

  /** 向后兼容: 传入 HookRegistry 时自动创建默认 RunnerRegistry（仅 CallbackRunner） */
  constructor(registryOrDeps: HookRegistry | HookExecutorDeps) {
    if ('registry' in registryOrDeps && 'runnerRegistry' in registryOrDeps) {
      // 新接口: HookExecutorDeps
      const deps = registryOrDeps as HookExecutorDeps;
      this.executor = new HookExecutor(deps.registry, deps.runnerRegistry, deps.sessionStore);
    } else {
      // 旧接口: HookRegistry — 自动创建默认 RunnerRegistry
      const registry = registryOrDeps as HookRegistry;
      const runnerRegistry = new RunnerRegistryImpl();
      runnerRegistry.register(new CallbackRunner());
      this.executor = new HookExecutor(registry, runnerRegistry);
    }
  }

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 对每个 toolUse 执行 PreToolUse hooks
    const toolUses = ctx.toolUses;

    if (toolUses.length > 0) {
      const hookContext = this.buildHookContext(ctx);

      // 聚合所有工具的 PreToolUse hook 结果
      let globalPreventContinuation = false;
      let globalStopReason: string | undefined;
      const updatedInputs = new Map<string, Record<string, unknown>>();
      let permissionBehavior: 'allow' | 'deny' | 'ask' | 'passthrough' | undefined;
      const additionalContexts: string[] = [];

      for (const toolUse of toolUses) {
        // 快速路径: 无匹配 hooks → 跳过
        const matchingHooks = this.executor.getMatchingHookDefinitions('PreToolUse', toolUse.name);
        if (matchingHooks.length === 0) {
          continue;
        }

        const input: PreToolUseInput = {
          hookEventName: 'PreToolUse',
          toolName: toolUse.name,
          toolInput: toolUse.input,
          toolUseId: toolUse.id
        };

        const aggregated = await this.executor.execute('PreToolUse', input, hookContext);

        // 记录修改后的输入
        if (aggregated.updatedInput !== undefined) {
          updatedInputs.set(toolUse.id, aggregated.updatedInput);
        }

        // 记录权限行为（取最严格）
        if (aggregated.permissionBehavior !== undefined) {
          permissionBehavior = this.mergePermissionBehavior(
            permissionBehavior,
            aggregated.permissionBehavior
          );
        }

        // 汇集附加上下文
        for (const ctxStr of aggregated.additionalContexts) {
          additionalContexts.push(ctxStr);
        }

        // 阻止继续
        if (aggregated.preventContinuation) {
          globalPreventContinuation = true;
          if (aggregated.stopReason !== undefined) {
            globalStopReason = aggregated.stopReason;
          }
        }
      }

      // 写入 ctx.meta — 后续 ExecuteToolsPhase 可读取
      ctx.meta.hookPermissionBehavior = permissionBehavior;
      ctx.meta.hookUpdatedInputs = updatedInputs;
      ctx.meta.hookPreventContinuation = globalPreventContinuation;
      ctx.meta.hookStopReason = globalStopReason;
      ctx.meta.hookAdditionalContexts = additionalContexts;

      // 如果 hook 阻止继续 → 设置错误终止循环
      if (globalPreventContinuation) {
        ctx.setError(new Error(globalStopReason ?? 'PreToolUse hook 阻止了执行'));
      }
    }

    // 传递到下一个阶段
    yield* next();
  }

  /** 构建 HookExecutionContext */
  private buildHookContext(ctx: MutableAgentContext): HookExecutionContext {
    const state = ctx.state;
    const abortController = state.toolUseContext.abortController;

    return {
      sessionId: state.sessionId,
      abortSignal: abortController.signal,
      toolRegistry: state.toolUseContext.tools,
      meta: ctx.meta
    };
  }

  /** 合并权限行为: deny > ask > allow > passthrough */
  private mergePermissionBehavior(
    current: 'allow' | 'deny' | 'ask' | 'passthrough' | undefined,
    incoming: 'allow' | 'deny' | 'ask' | 'passthrough'
  ): 'allow' | 'deny' | 'ask' | 'passthrough' {
    if (current === undefined) return incoming;
    const priority: Record<string, number> = { deny: 3, ask: 2, allow: 1, passthrough: 0 };
    return priority[incoming] > priority[current] ? incoming : current;
  }
}
