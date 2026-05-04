/** SubagentSpawner — 创建子 AgentLoop 并执行任务 */

import { AgentLoop } from '@suga/ai-agent-loop';
import { ToolRegistry } from '@suga/ai-tool-core';
import type { LLMProvider, LoopResult } from '@suga/ai-agent-loop';
import type { SubagentDefinition } from '../types/subagent';
import type { SubagentResult } from '../types/result';
import { OutputFileBridge } from '../output/OutputFileBridge';
import type { OutputFileOptions } from '../types/output';
import { DEFAULT_SUBAGENT_TIMEOUT } from '../constants';

/**
 * Spawner 接口 — 子代理创建器的公共协议
 *
 * AgentTool 通过此接口调用 spawn，MockSubagentSpawner 也实现此接口。
 */
export interface Spawner {
  /** 创建 scoped ToolRegistry（基于 SubagentDefinition 的工具约束） */
  createScopedRegistry(parentRegistry: ToolRegistry, def: SubagentDefinition): ToolRegistry;
  /** 创建子 AgentLoop 并执行任务 */
  spawn(
    def: SubagentDefinition,
    task: string,
    contextDirective?: string,
    parentRegistry?: ToolRegistry,
    parentSignal?: AbortSignal
  ): Promise<SubagentResult>;
}

/**
 * SubagentSpawner — 在父进程内创建子 AgentLoop 执行任务
 *
 * spawn 流程：
 *
 * 1. 从 parent ToolRegistry 创建 scoped ToolRegistry（工具白名单 + 黑名单）
 * 2. 用 parentProvider 创建子 AgentLoop（config: scopedToolRegistry + maxTurns + timeout）
 * 3. 构造初始消息: [UserMessage{ content: task + contextDirective }]
 * 4. 运行 childLoop.queryLoop(initialMessages, parentSignal)
 * 5. 收集 LoopResult，生成 summary
 * 6. 返回 SubagentResult
 */
export class SubagentSpawner implements Spawner {
  private readonly parentProvider: LLMProvider;
  private readonly outputBridge?: OutputFileBridge;

  constructor(parentProvider: LLMProvider, outputOptions?: OutputFileOptions) {
    this.parentProvider = parentProvider;
    if (outputOptions) {
      this.outputBridge = new OutputFileBridge(outputOptions);
    }
  }

  /**
   * 创建 scoped ToolRegistry — 基于 SubagentDefinition 的工具约束
   *
   * 规则：
   *
   * - 无白名单(def.tools === undefined) → 继承父全部工具
   * - 有白名单 → 只保留白名单工具
   * - 黑名单(disallowedTools) → 在白名单基础上额外移除
   */
  createScopedRegistry(parentRegistry: ToolRegistry, def: SubagentDefinition): ToolRegistry {
    const parentTools = parentRegistry.getAll();

    // 白名单筛选
    const whitelist = def.tools;
    const filtered = whitelist ? parentTools.filter(t => whitelist.includes(t.name)) : parentTools;

    // 黑名单排除
    const blacklist = def.disallowedTools ?? [];
    const scoped = filtered.filter(t => !blacklist.includes(t.name));

    return new ToolRegistry({ tools: scoped, allowOverride: true });
  }

  /**
   * spawn — 创建子 AgentLoop 并执行任务
   *
   * @param def 子代理定义
   * @param task 任务描述
   * @param contextDirective 上下文指令（可选，附加到任务描述后）
   * @param parentRegistry 父 ToolRegistry（用于创建 scoped registry）
   * @param parentSignal 父中断信号（可选）
   * @returns SubagentResult
   */
  async spawn(
    def: SubagentDefinition,
    task: string,
    contextDirective?: string,
    parentRegistry?: ToolRegistry,
    parentSignal?: AbortSignal
  ): Promise<SubagentResult> {
    const startTime = Date.now();
    const timeout = def.timeout ?? DEFAULT_SUBAGENT_TIMEOUT;

    // 创建 scoped ToolRegistry
    const scopedRegistry = parentRegistry
      ? this.createScopedRegistry(parentRegistry, def)
      : new ToolRegistry();

    // 构造初始消息
    const content = contextDirective ? `${task}\n\n---\n上下文指令:\n${contextDirective}` : task;

    const initialMessages = [
      {
        id: `subagent_${Date.now()}`,
        role: 'user' as const,
        content,
        timestamp: Date.now()
      }
    ];

    // 创建子 AgentLoop
    const childLoop = new AgentLoop({
      provider: this.parentProvider,
      toolRegistry: scopedRegistry,
      maxTurns: def.maxTurns ?? 10,
      toolTimeout: timeout
    });

    // 创建子 AbortController（链接到父信号）
    const childAbortController = new AbortController();
    if (parentSignal) {
      if (parentSignal.aborted) {
        childAbortController.abort();
      } else {
        parentSignal.addEventListener('abort', () => childAbortController.abort(), { once: true });
      }
    }

    // 执行子循环
    let loopResult: LoopResult | undefined;

    try {
      for await (const event of childLoop.queryLoop(initialMessages, childAbortController.signal)) {
        if (event.type === 'loop_end') {
          loopResult = event.result;
        }
      }
    } catch (err) {
      // 执行异常
      return {
        agentType: def.agentType,
        loopResult: {
          type: 'model_error',
          reason: err instanceof Error ? err.message : String(err),
          messages: initialMessages
        },
        summary: `子代理执行失败: ${err instanceof Error ? err.message : String(err)}`,
        success: false,
        durationMs: Date.now() - startTime
      };
    }

    // 没有结果（异常情况）
    if (!loopResult) {
      return {
        agentType: def.agentType,
        loopResult: {
          type: 'completed',
          reason: '子代理循环未产出结果',
          messages: initialMessages
        },
        summary: '子代理循环未产出结果',
        success: false,
        durationMs: Date.now() - startTime
      };
    }

    // 生成 summary
    const success = loopResult.type === 'completed';
    const rawSummary = this.generateRawSummary(loopResult);

    const result: SubagentResult = {
      agentType: def.agentType,
      loopResult,
      summary: rawSummary,
      success,
      durationMs: Date.now() - startTime
    };

    // OutputFileBridge 整合 — 大输出持久化后再截取 summary
    if (this.outputBridge) {
      return this.outputBridge.processResult(result);
    }

    // 无 OutputFileBridge → 手动截取 summary
    return {
      ...result,
      summary: rawSummary.length > 500 ? `${rawSummary.slice(0, 500)}...` : rawSummary
    };
  }

  /** 生成原始摘要（不截取，由 OutputFileBridge 或后续处理决定截取） */
  private generateRawSummary(loopResult: LoopResult): string {
    const lastMsg = loopResult.messages[loopResult.messages.length - 1];

    if (lastMsg && lastMsg.role === 'assistant') {
      return lastMsg.content;
    }

    return `子代理完成，类型: ${loopResult.type}, 原因: ${loopResult.reason}`;
  }
}
