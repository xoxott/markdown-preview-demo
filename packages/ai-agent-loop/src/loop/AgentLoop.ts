/** Agent 循环引擎（Agent Loop） 核心 AsyncGenerator while(true) 循环 */

import { ToolExecutor, ToolRegistry } from '@suga/ai-tool-core';
import { HookAfterToolPhase, HookBeforeToolPhase, HookStopPhase } from '@suga/ai-hooks';
import type {
  AgentConfig,
  AgentState,
  ContinueTransition,
  TerminalTransition
} from '../types/state';
import type { AgentEvent } from '../types/events';
import type { LoopResult } from '../types/result';
import type { AgentMessage } from '../types/messages';
import type { LLMStreamChunk } from '../types/provider';
import type { LoopPhase } from '../phase/LoopPhase';
import { composePhases } from '../phase/LoopPhase';
import { PreProcessPhase } from '../phase/PreProcessPhase';
import { CallModelPhase } from '../phase/CallModelPhase';
import { CheckInterruptPhase } from '../phase/CheckInterruptPhase';
import { ExecuteToolsPhase } from '../phase/ExecuteToolsPhase';
import { PostProcessPhase } from '../phase/PostProcessPhase';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import { isTerminal } from '../types/state';
import { ParallelScheduler } from '../scheduler/ToolScheduler';
import { DEFAULT_MAX_TURNS, DEFAULT_SESSION_ID, DEFAULT_TOOL_TIMEOUT } from '../constants';
import { advanceState } from './stateMachine';

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
    const phases: LoopPhase[] = [
      new PreProcessPhase(),
      new CallModelPhase(this.config.provider, toolDefs, this.config.systemPrompt),
      new CheckInterruptPhase()
    ];

    // 有 hook 注册表 → 在 ExecuteTools 前插入 HookBeforeTool
    if (hookRegistry) {
      phases.push(new HookBeforeToolPhase(hookRegistry));
    }

    // 有工具注册表时添加执行阶段
    if (this.config.toolRegistry) {
      const scheduler = this.config.scheduler ?? new ParallelScheduler();
      phases.push(
        new ExecuteToolsPhase(scheduler, new ToolExecutor(), this.config.toolRegistry, toolTimeout)
      );
    }

    // 有 hook 注册表 → 在 ExecuteTools 后插入 HookAfterTool
    if (hookRegistry) {
      phases.push(new HookAfterToolPhase(hookRegistry));
    }

    phases.push(new PostProcessPhase(maxTurns));

    // 有 hook 注册表 → 在 PostProcess 后插入 HookStop
    if (hookRegistry) {
      phases.push(new HookStopPhase(hookRegistry));
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
      signal.addEventListener('abort', () => abortController.abort(), { once: true });
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
      signal.addEventListener('abort', () => abortController.abort(), { once: true });
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
    _abortController: AbortController
  ): AsyncGenerator<AgentEvent> {
    let state = initialState;
    const composed = composePhases(this.phases);
    /** 累积最后一轮的 usage（CallModelPhase 写入 ctx.meta.usage） */
    let lastUsage: LLMStreamChunk['usage'] | undefined;

    // while(true) 无限循环
    while (true) {
      // 创建本轮可变上下文
      const ctx = createMutableAgentContext(state);

      // 执行阶段链，流式产出事件
      yield* composed(ctx);

      // harvest本轮usage（CallModelPhase将LLMStreamChunk.usage写入ctx.meta）
      if (ctx.meta.usage) {
        lastUsage = ctx.meta.usage as LLMStreamChunk['usage'];
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
}
