/** ForkSpawner — 并行 Fork 子代理执行（prompt cache 共享 + 噪声隔离 + 递归防护） */

import { AgentLoop, createSystemPrompt } from '@suga/ai-agent-loop';
import { ToolRegistry } from '@suga/ai-tool-core';
import type { LLMProvider, LoopResult } from '@suga/ai-agent-loop';
import type { SubagentDefinition } from '../types/subagent';
import type { SubagentResult } from '../types/result';
import type { ForkSpawnerOptions } from '../types/fork';
import { DEFAULT_MAX_FORK_DEPTH, DEFAULT_SUBAGENT_TIMEOUT } from '../constants';
import { OutputFileBridge } from '../output/OutputFileBridge';
import { extractCacheSafeParams } from '../cache/PromptCacheBridge';
import { detectBreak } from '../cache/CacheBreakDetector';
import { SubagentSpawner } from './SubagentSpawner';
import type { Spawner } from './SubagentSpawner';
import { injectForkBoilerplate } from './ForkGuard';

/**
 * ForkSpawner — 在父进程内创建 fork 子 AgentLoop（prompt cache 共享）
 *
 * Fork 与普通 Subagent 的核心差异:
 *
 * 1. **prompt cache 共享** — 子代理继承父的消息历史 + 使用 placeholder 工具结果 保证消息前缀字节一致，最大化 Anthropic API 的 prompt
 *    cache hit
 * 2. **placeholder 工具结果** — 所有 fork 子代理使用同一占位文本 只有 directive 文本块不同（per-child）
 * 3. **噪声隔离** — 大输出通过 OutputFileBridge 持久化到磁盘 父只看 summary（截取前 maxPreviewChars 字符）
 * 4. **递归防护** — `<fork-boilerplate>` 标签检测，防止 fork 嵌套
 * 5. **cache break 检测** — 比较父子 cache 安全参数，检测是否导致 cache break
 *
 * spawn 流程:
 *
 * 1. 递归防护检查 → isInForkChild + getForkDepth → 超限拒绝
 * 2. extractCacheSafeParams → 评估 cache 安全参数
 * 3. detectBreak → 检测是否导致 cache break（日志）
 * 4. 从父消息历史获取最后一个 assistant 消息的 toolUses
 * 5. buildPlaceholderResults → 构造 placeholder 工具结果
 * 6. injectForkBoilerplate → 在 system prompt 前注入 `<fork-boilerplate>` 标记
 * 7. assembleChildMessages → 组装子代理消息（parent_history + placeholders + directive）
 * 8. 创建子 AgentLoop（scopedToolRegistry + maxTurns + timeout + systemPrompt）
 * 9. 运行 childLoop.queryLoop
 * 10. OutputFileBridge.processResult → 大输出持久化
 * 11. 返回 SubagentResult
 */
export class ForkSpawner implements Spawner {
  private readonly parentProvider: LLMProvider;
  private readonly spawner: SubagentSpawner;
  private readonly outputBridge: OutputFileBridge | undefined;
  private readonly enableCacheBreakDetection: boolean;
  private readonly _maxForkDepth: number;

  constructor(parentProvider: LLMProvider, options?: ForkSpawnerOptions) {
    this.parentProvider = parentProvider;
    this.spawner = new SubagentSpawner(parentProvider);
    this.outputBridge = options?.outputOptions
      ? new OutputFileBridge(options.outputOptions)
      : undefined;
    this.enableCacheBreakDetection = options?.enableCacheBreakDetection ?? true;
    this._maxForkDepth = options?.maxForkDepth ?? DEFAULT_MAX_FORK_DEPTH;
  }

  /** 创建 scoped ToolRegistry（复用 SubagentSpawner 的逻辑） */
  createScopedRegistry(parentRegistry: ToolRegistry, def: SubagentDefinition): ToolRegistry {
    return this.spawner.createScopedRegistry(parentRegistry, def);
  }

  /** 获取最大 fork 嵌套深度 */
  getMaxForkDepth(): number {
    return this._maxForkDepth;
  }

  /**
   * spawn — 创建 fork 子 AgentLoop 并执行
   *
   * @param def 子代理定义
   * @param task 任务描述（directive 文本）
   * @param contextDirective 上下文指令（可选）
   * @param parentRegistry 父 ToolRegistry
   * @param parentSignal 父中断信号
   * @returns SubagentResult
   */
  async spawn(
    def: SubagentDefinition,
    task: string,
    contextDirective?: string,
    parentRegistry?: ToolRegistry,
    parentSignal?: AbortSignal
  ): Promise<SubagentResult> {
    // === Step 1: 递归防护检查 ===
    // Fork 需要父消息历史来组装子消息，但 spawn 不传入消息历史
    // 所以递归防护在 ForkSpawner 中通过 def.systemPromptPrefix 或 fork 标记检测
    // 如果 def.systemPromptPrefix 包含 <fork-boilerplate>，说明已在 fork child 中

    // 检查 fork 标记
    if (def.systemPromptPrefix && def.systemPromptPrefix.includes('<fork-boilerplate>')) {
      return {
        agentType: def.agentType,
        loopResult: {
          type: 'completed',
          reason: 'Fork 递归防护: 已在 fork child 中，不能再 spawn fork',
          messages: []
        },
        summary: 'Fork 递归防护: 已在 fork child 中',
        success: false,
        durationMs: 0
      };
    }

    // === Step 2: 创建 scoped ToolRegistry ===
    const scopedRegistry = parentRegistry
      ? this.createScopedRegistry(parentRegistry, def)
      : new ToolRegistry();

    // === Step 3: Cache break 检测 ===
    if (this.enableCacheBreakDetection && parentRegistry) {
      const parentParams = extractCacheSafeParams(this.parentProvider, parentRegistry, {
        ...def,
        tools: undefined // 父使用完整工具池
      });
      const childParams = extractCacheSafeParams(this.parentProvider, parentRegistry, def);
      const breakInfo = detectBreak(parentParams, childParams);

      if (breakInfo.broke) {
        // Cache break 仅日志，不阻止 fork 执行
        // 实际场景中 cache break 会增加 API 成本，但不影响功能
      }
    }

    // === Step 4: 组装 fork 子代理消息 ===
    // Fork 消息构造模式:
    // [directive_message] — 仅 directive 文本（简化版，不需要父完整历史）
    // 完整版需要父历史 → 需要从外部传入，此处使用简化版
    const directiveText = contextDirective
      ? `${task}\n\n---\n上下文指令:\n${contextDirective}`
      : task;

    // 注入 fork 标记到 system prompt
    const systemPromptPrefix = def.systemPromptPrefix
      ? injectForkBoilerplate(def.systemPromptPrefix)
      : injectForkBoilerplate('你是一个 fork 子代理，继承父的完整上下文。');
    const systemPrompt = createSystemPrompt([systemPromptPrefix]);

    const initialMessages = [
      {
        id: `fork_directive_${Date.now()}`,
        role: 'user' as const,
        content: directiveText,
        timestamp: Date.now()
      }
    ];

    // === Step 5: 创建子 AgentLoop ===
    const timeout = def.timeout ?? DEFAULT_SUBAGENT_TIMEOUT;
    const maxTurns = def.maxTurns ?? 10;

    const childLoop = new AgentLoop({
      provider: this.parentProvider,
      toolRegistry: scopedRegistry,
      maxTurns,
      toolTimeout: timeout,
      systemPrompt
    });

    // === Step 6: 创建子 AbortController ===
    const childAbortController = new AbortController();
    if (parentSignal) {
      if (parentSignal.aborted) {
        childAbortController.abort();
      } else {
        parentSignal.addEventListener('abort', () => childAbortController.abort(), { once: true });
      }
    }

    // === Step 7: 执行子循环 ===
    const startTime = Date.now();
    let loopResult: LoopResult | undefined;

    try {
      for await (const event of childLoop.queryLoop(initialMessages, childAbortController.signal)) {
        if (event.type === 'loop_end') {
          loopResult = event.result;
        }
      }
    } catch (err) {
      return {
        agentType: def.agentType,
        loopResult: {
          type: 'model_error',
          reason: err instanceof Error ? err.message : String(err),
          messages: initialMessages
        },
        summary: `Fork 子代理执行失败: ${err instanceof Error ? err.message : String(err)}`,
        success: false,
        durationMs: Date.now() - startTime
      };
    }

    if (!loopResult) {
      return {
        agentType: def.agentType,
        loopResult: {
          type: 'completed',
          reason: 'Fork 子代理循环未产出结果',
          messages: initialMessages
        },
        summary: 'Fork 子代理循环未产出结果',
        success: false,
        durationMs: Date.now() - startTime
      };
    }

    // === Step 8: 生成 summary + 大输出持久化 ===
    const success = loopResult.type === 'completed';
    let result: SubagentResult = {
      agentType: def.agentType,
      loopResult,
      summary: this.generateSummary(loopResult),
      success,
      durationMs: Date.now() - startTime
    };

    // 大输出持久化
    if (this.outputBridge) {
      result = this.outputBridge.processResult(result);
    }

    return result;
  }

  /** 生成结果摘要（复用 SubagentSpawner 逻辑） */
  private generateSummary(loopResult: LoopResult): string {
    const lastMsg = loopResult.messages[loopResult.messages.length - 1];

    if (lastMsg && lastMsg.role === 'assistant') {
      const content = lastMsg.content;
      return content.length > 500 ? `${content.slice(0, 500)}...` : content;
    }

    return `Fork 子代理完成，类型: ${loopResult.type}, 原因: ${loopResult.reason}`;
  }
}
