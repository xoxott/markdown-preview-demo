/** Agent 循环引擎（Agent Loop） 核心 AsyncGenerator while(true) 循环 */

import { ToolExecutor, ToolRegistry } from '@suga/ai-tool-core';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import {
  HookAfterToolPhase,
  HookBeforeToolPhase,
  HookNotificationPhase,
  HookSessionEndPhase,
  HookSessionStartPhase,
  HookStopPhase,
  HookUserPromptPhase
} from '@suga/ai-hooks';
import { StreamingToolScheduler } from '@suga/ai-stream-executor';
import type {
  AgentConfig,
  AgentState,
  ContinueTransition,
  TerminalTransition
} from '../types/state';
import type { AgentEvent } from '../types/events';
import type { LoopResult } from '../types/result';
import type { AgentMessage, AssistantMessage } from '../types/messages';
import type { LLMStreamChunk, ToolDefinition } from '../types/provider';
import type { LoopPhase } from '../phase/LoopPhase';
import { composePhases } from '../phase/LoopPhase';
import { PreProcessPhase } from '../phase/PreProcessPhase';
import { CallModelPhase } from '../phase/CallModelPhase';
import { CheckInterruptPhase } from '../phase/CheckInterruptPhase';
import { ExecuteToolsPhase } from '../phase/ExecuteToolsPhase';
import { StreamingCallModelPhase } from '../phase/StreamingCallModelPhase';
import { PostProcessPhase } from '../phase/PostProcessPhase';
import { isInterleavedScheduler } from '../types/scheduler';
import type { InterleavedToolScheduler } from '../types/scheduler';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import { isTerminal } from '../types/state';
import {
  DEFAULT_MAX_TURNS,
  DEFAULT_SESSION_ID,
  DEFAULT_TOOL_TIMEOUT,
  MAX_LOOP_ITERATIONS
} from '../constants';
import { advanceState } from './stateMachine';

/**
 * P99: Deferred tools delta 计算函数 — 由 ai-runtime 注入（避免循环依赖）
 *
 * 封装 getDeferredToolsDelta + buildDeferredToolsSystemReminder 调用。
 */
export type DeferredToolsDeltaFn = (
  deferredTools: readonly AnyBuiltTool[],
  messages: readonly AgentMessage[]
) => string | null;

/**
 * G12: PromptCache 断裂检测函数 — 由 ai-runtime 注入（避免循环依赖）
 *
 * 封装 detectCacheBreak 调用，避免 ai-agent-loop 依赖 ai-tool-adapter。
 */
export interface CacheBreakResult {
  readonly isCacheBreak: boolean;
  readonly reason?: string;
  readonly cacheHitRate?: number;
  readonly previousCacheHitRate?: number;
  readonly recommendedAction?: 'retry_with_same_prefix' | 'accept_and_continue' | 'reduce_context';
}

export type CacheBreakDetectionFn = (
  currentUsage: {
    inputTokens: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  },
  previousUsage?: {
    inputTokens: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  }
) => CacheBreakResult;

/**
 * Agent 循环引擎
 *
 * 核心 queryLoop 是一个 AsyncGenerator<AgentEvent>：
 *
 * - while(true) 无限循环，每次迭代代表一个"轮次"
 * - 每轮通过 composePhases 阶段链处理
 * - 终止条件时产出 loop_end 事件并退出
 * - 继续条件时 advanceState 到下一轮
 *
 * @example
 *   const loop = new AgentLoop({ provider: myProvider, maxTurns: 5 });
 *   for await (const event of loop.queryLoop([{ role: 'user', content: 'hello' }])) {
 *     if (event.type === 'text_delta') console.write(event.delta);
 *     if (event.type === 'loop_end') break;
 *   }
 */
export class AgentLoop {
  private readonly config: AgentConfig;
  private readonly phases: LoopPhase[];

  constructor(config: AgentConfig) {
    this.config = config;
    const maxTurns = config.maxTurns ?? DEFAULT_MAX_TURNS;
    const toolTimeout = config.toolTimeout ?? DEFAULT_TOOL_TIMEOUT;

    // 构建工具定义（如果提供了 toolRegistry）
    const toolDefs = config.toolRegistry
      ? config.toolRegistry.getAll().map(t => config.provider.formatToolDefinition(t))
      : undefined;

    // 构建阶段链（自定义phases优先，否则使用默认buildPhases）
    this.phases = config.phases
      ? [...config.phases]
      : this.buildPhases(maxTurns, toolTimeout, toolDefs);
  }

  /** 构建阶段链 */
  private buildPhases(
    maxTurns: number,
    toolTimeout: number,
    toolDefs?: readonly {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }[]
  ): LoopPhase[] {
    const hookRegistry = this.config.hookRegistry;
    const phases: LoopPhase[] = [];

    // 有 hook 注册表 → 在 PreProcess 前插入 SessionStart + UserPrompt
    if (hookRegistry) {
      phases.push(new HookSessionStartPhase(hookRegistry));
      phases.push(new HookUserPromptPhase(hookRegistry));
    }

    phases.push(new PreProcessPhase());

    // ★ P42: 判断 scheduler 是否支持交错流式模式
    if (this.config.toolRegistry && isInterleavedScheduler(this.config.scheduler)) {
      // 流式模式: StreamingCallModelPhase（合并 CallModel + ExecuteTools）
      phases.push(
        new StreamingCallModelPhase(
          this.config.provider,
          this.config.scheduler as InterleavedToolScheduler,
          new ToolExecutor(),
          this.config.toolRegistry,
          toolTimeout,
          toolDefs,
          this.config.systemPrompt
        )
      );
      phases.push(new CheckInterruptPhase());
    } else {
      // batch 模式: CallModelPhase + ExecuteToolsPhase（不变）
      phases.push(new CallModelPhase(this.config.provider, toolDefs, this.config.systemPrompt));
      phases.push(new CheckInterruptPhase());
    }

    // 有 hook 注册表 → 在 ExecuteTools 前插入 HookBeforeTool
    if (hookRegistry) {
      phases.push(new HookBeforeToolPhase(hookRegistry));
    }

    // batch 模式下，有工具注册表时添加执行阶段
    // 流式模式下工具执行已在 StreamingCallModelPhase 内完成，无需独立 ExecuteToolsPhase
    if (!isInterleavedScheduler(this.config.scheduler) && this.config.toolRegistry) {
      const scheduler = this.config.scheduler ?? new StreamingToolScheduler();
      phases.push(
        new ExecuteToolsPhase(scheduler, new ToolExecutor(), this.config.toolRegistry, toolTimeout)
      );
    }

    // 有 hook 注册表 → 在 ExecuteTools 后插入 HookAfterTool
    if (hookRegistry) {
      phases.push(new HookAfterToolPhase(hookRegistry));
    }

    phases.push(new PostProcessPhase(maxTurns, this.config.structuredOutputEnforcement));

    // 有 hook 注册表 → 在 PostProcess 后插入 HookStop + Notification + SessionEnd
    if (hookRegistry) {
      phases.push(new HookStopPhase(hookRegistry));
      phases.push(new HookNotificationPhase(hookRegistry));
      phases.push(new HookSessionEndPhase(hookRegistry));
    }

    return phases;
  }

  /**
   * 核心 queryLoop — AsyncGenerator 模式
   *
   * @param initialMessages 初始消息列表
   * @param signal 外部中断信号（可选）
   * @returns AsyncGenerator<AgentEvent> 流式产出事件
   */
  async *queryLoop(
    initialMessages: readonly AgentMessage[],
    signal?: AbortSignal
  ): AsyncGenerator<AgentEvent> {
    const abortController = new AbortController();
    if (signal) {
      // P88: 如果外部信号已 aborted → 立即级联
      if (signal.aborted) {
        abortController.abort();
      } else {
        signal.addEventListener('abort', () => abortController.abort(), { once: true });
      }
    }

    const state = this.createInitialState(initialMessages, abortController);
    yield* this.runLoop(state, abortController);
  }

  /**
   * 从已有状态恢复循环
   *
   * 用于会话管理器恢复暂停的会话。接收预构建的 AgentState， 替换其中的 AbortController（旧的已失效），进入 while(true) 循环。
   *
   * @param state 预构建的 AgentState（来自暂停/反序列化）
   * @param signal 外部中断信号（可选）
   * @returns AsyncGenerator<AgentEvent> 流式产出事件
   */
  async *resumeLoop(state: AgentState, signal?: AbortSignal): AsyncGenerator<AgentEvent> {
    const abortController = new AbortController();
    if (signal) {
      // P88: 如果外部信号已 aborted → 立即级联
      if (signal.aborted) {
        abortController.abort();
      } else {
        signal.addEventListener('abort', () => abortController.abort(), { once: true });
      }
    }

    // 替换已失效的 AbortController
    const resumedState: AgentState = {
      ...state,
      toolUseContext: { ...state.toolUseContext, abortController }
    };

    yield* this.runLoop(resumedState, abortController);
  }

  /** 核心循环逻辑（queryLoop 和 resumeLoop 共用） */
  private async *runLoop(
    initialState: AgentState,
    abortController: AbortController
  ): AsyncGenerator<AgentEvent> {
    let state = initialState;
    const composed = composePhases(this.phases);
    /** 累积最后一轮的 usage（CallModelPhase 写入 ctx.meta.usage） */
    let lastUsage: LLMStreamChunk['usage'] | undefined;
    /** G12: 前一次 usage（用于 cache break detection） */
    let previousUsage: LLMStreamChunk['usage'] | undefined;
    /** P88: 硬性循环计数 — 防止 while(true) 无限循环 */
    let iterationCount = 0;

    // while(true) 无限循环
    while (true) {
      iterationCount++;
      // P88: 每轮开头检查 abort signal — Phase 层也可通过 ctx.signal 检查
      if (abortController.signal.aborted) {
        yield {
          type: 'loop_end',
          result: this.buildLoopResult(
            { type: 'aborted', reason: 'Agent loop 被中断' },
            state,
            lastUsage
          )
        };
        return;
      }
      // P88: 硬性循环上限保护 — 即使 PostProcessPhase 的 max_turns 检查被绕过，也不会无限循环
      if (iterationCount > MAX_LOOP_ITERATIONS) {
        yield {
          type: 'loop_end',
          result: this.buildLoopResult(
            { type: 'max_turns', maxTurns: MAX_LOOP_ITERATIONS },
            state,
            lastUsage
          )
        };
        return;
      }
      // P12+P99: 根据消息历史中的 toolReferences 动态计算工具定义 + delta 通知
      const { toolDefs: dynamicToolDefs, deferredToolsReminder } = this.computeToolDefs(
        state.messages
      );

      // 创建本轮可变上下文（P88: 传递 abort signal 到 Phase 层）
      const ctx = createMutableAgentContext(state, abortController.signal);

      // P12: 注入动态工具定义到 ctx.meta（供 CallModelPhase/StreamingCallModelPhase 优先使用）
      if (dynamicToolDefs) {
        ctx.meta.dynamicToolDefs = dynamicToolDefs;
      }

      // P99: 注入 delta 通知到 ctx.meta（供 CallModelPhase 读取并追加到 systemPrompt）
      if (deferredToolsReminder) {
        ctx.meta.deferredToolsReminder = deferredToolsReminder;
      }

      // 执行阶段链，流式产出事件
      yield* composed(ctx);

      // harvest本轮usage（CallModelPhase将LLMStreamChunk.usage写入ctx.meta）
      if (ctx.meta.usage) {
        const currentUsage = ctx.meta.usage as LLMStreamChunk['usage'] | undefined;

        // G12: PromptCache 断裂检测 — 比较 current 和 previous usage
        const cacheBreakFn = this.config.providers?.cacheBreakDetectionFn as
          | CacheBreakDetectionFn
          | undefined;
        if (cacheBreakFn && previousUsage && currentUsage) {
          const result = cacheBreakFn(
            {
              inputTokens: currentUsage.inputTokens,
              cacheCreationInputTokens: currentUsage.cacheCreationInputTokens,
              cacheReadInputTokens: currentUsage.cacheReadInputTokens
            },
            {
              inputTokens: previousUsage.inputTokens,
              cacheCreationInputTokens: previousUsage.cacheCreationInputTokens,
              cacheReadInputTokens: previousUsage.cacheReadInputTokens
            }
          );

          if (result.isCacheBreak) {
            // 产出 cache_break_detected 事件
            yield {
              type: 'cache_break_detected',
              reason: result.reason ?? 'unknown',
              currentCacheHitRate: result.cacheHitRate,
              previousCacheHitRate: result.previousCacheHitRate,
              recommendedAction: result.recommendedAction
            };

            // 记录到 ctx.meta（供 CallModelPhase 调整后续行为）
            ctx.meta.cacheBreakResult = result;
          }
        }

        // 保存当前 usage 作为下一轮的 previousUsage
        previousUsage = currentUsage;
        lastUsage = currentUsage;
      }

      // 如果有错误但 PostProcessPhase 未被调用（composePhases 短路），
      // 需要手动设置终止过渡
      if (ctx.error && !isTerminal(state.transition)) {
        if (ctx.error instanceof DOMException && ctx.error.name === 'AbortError') {
          state.transition = { type: 'aborted', reason: 'Agent loop 被中断' };
        } else {
          state.transition = { type: 'model_error', error: ctx.error as Error };
        }
      }

      // 检查过渡类型
      const transition = state.transition;

      if (isTerminal(transition)) {
        // 终止：产出 loop_end 事件并退出循环
        yield {
          type: 'loop_end',
          result: this.buildLoopResult(transition, state, lastUsage)
        };
        return;
      }

      // next_turn → advanceState → continue
      // 不同 Continue reason → 不同 advanceState 逻辑
      state = advanceState(state, ctx, transition as ContinueTransition);
    }
  }

  /** 创建初始 AgentState */
  private createInitialState(
    messages: readonly AgentMessage[],
    abortController: AbortController
  ): AgentState {
    const sessionId = `${DEFAULT_SESSION_ID}_${Date.now()}`;
    const registry = this.config.toolRegistry ?? new ToolRegistry();

    return {
      sessionId,
      turnCount: 0,
      messages,
      toolUseContext: createAgentToolUseContext(
        sessionId,
        0,
        registry,
        abortController,
        this.config.providers
      ),
      transition: { type: 'next_turn' }
    };
  }

  /** 构建循环结果 */
  private buildLoopResult(
    transition: TerminalTransition,
    state: AgentState,
    usage?: LLMStreamChunk['usage']
  ): LoopResult {
    const reasonMap: Record<TerminalTransition['type'], string> = {
      completed: transition.type === 'completed' ? transition.reason : '对话结束',
      aborted: transition.type === 'aborted' ? transition.reason : '被中断',
      model_error: transition.type === 'model_error' ? transition.error.message : '模型错误',
      max_turns: `达到最大轮次限制 ${transition.type === 'max_turns' ? transition.maxTurns : 0}`
    };

    return {
      type: transition.type,
      reason: reasonMap[transition.type],
      messages: state.messages,
      usage
    };
  }

  /**
   * computeToolDefs — P12+P99: 根据消息历史中的 toolReferences 动态计算工具定义列表
   *
   * 策略:
   *
   * - alwaysLoad 工具始终包含
   * - 已发现的延迟工具动态加入（P12: 从 toolReferences）
   * - P99: 发现 deferred 工具时 attach 到 active registry（后续 turn 不重复发现）
   * - P99: 通过 providers.deferredToolsDeltaFn 计算 delta 通知
   *
   * @returns {toolDefs, deferredToolsReminder} — 工具定义 + delta 提醒文本
   */
  private computeToolDefs(messages: readonly AgentMessage[]): {
    toolDefs: ToolDefinition[] | undefined;
    deferredToolsReminder?: string;
  } {
    const registry = this.config.toolRegistry;
    if (!registry) return { toolDefs: undefined };

    // P99: 从 providers 中读取 deferred 池和 delta 计算函数
    const providers = this.config.providers ?? {};
    const deferredTools = providers.deferredTools as readonly AnyBuiltTool[] | undefined;
    const deferredToolsDeltaFn = providers.deferredToolsDeltaFn as DeferredToolsDeltaFn | undefined;

    // 从消息历史扫描已发现的工具名 (P12: 从 toolReferences)
    const discoveredNames = new Set<string>();
    for (const msg of messages) {
      if (msg.role === 'assistant') {
        const refs = (msg as AssistantMessage).toolReferences;
        if (refs) {
          for (const ref of refs) {
            discoveredNames.add(ref.name);
          }
        }
      }
    }

    // alwaysLoad 工具（非延迟）+ 已发现的延迟工具
    const allTools = registry.getAll();
    const alwaysLoad = allTools.filter(t => !this.isDeferredToolLocal(t));

    // P99: attach 机制 — 发现的 deferred 工具注册到 active registry
    if (deferredTools && deferredTools.length > 0) {
      for (const name of discoveredNames) {
        if (registry.getByName(name)) continue;
        const deferredTool = deferredTools.find(t => t.name === name);
        if (deferredTool) {
          registry.register(deferredTool);
        }
      }
    }

    // 非 deferred 池中但存在于原始 registry 的工具
    const discoveredFromRegistry = [...discoveredNames]
      .map(n => registry.getByName(n))
      .filter((t): t is NonNullable<typeof t> => t !== undefined)
      .filter(t => !alwaysLoad.some(a => a.name === t.name));

    const effective = [...alwaysLoad, ...discoveredFromRegistry];
    const toolDefs = effective.map(t => this.config.provider.formatToolDefinition(t));

    // P99: 计算 delta 通知（通过注入的 deltaFn 避免循环依赖）
    let deferredToolsReminder: string | undefined;
    if (deferredTools && deferredTools.length > 0 && deferredToolsDeltaFn) {
      const reminder = deferredToolsDeltaFn(deferredTools, messages);
      deferredToolsReminder = reminder ?? undefined;
    }

    return { toolDefs, deferredToolsReminder };
  }

  /** 内联延迟判定 — 避免循环依赖 ai-tools (P12) */
  private isDeferredToolLocal(tool: {
    name: string;
    shouldDefer?: boolean;
    alwaysLoad?: boolean;
  }): boolean {
    if (tool.alwaysLoad) return false;
    if (tool.name === 'tool-search') return false;
    if (tool.shouldDefer) return true;
    if (tool.name.startsWith('mcp__')) return true;
    return false;
  }
}
