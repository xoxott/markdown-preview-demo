/** StreamingToolScheduler — 流式工具并行调度器 */

import type { ToolExecutor, ToolRegistry, ToolUseContext } from '@suga/ai-tool-core';
import type { ToolResultMessage, ToolScheduler, ToolUseBlock } from '@suga/ai-agent-loop';
import type { StreamingSchedulerConfig, TrackedTool } from '../types/scheduler';
import { DEFAULT_MAX_CONCURRENCY } from '../constants';
import { executeSingle } from './executeSingle';

/** 生成唯一追踪 ID */
function generateTrackingId(): string {
  return `track_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 流式工具并行调度器
 *
 * 实现 ToolScheduler 接口，提供两种使用模式:
 *
 * 1. **批量模式**: 通过 schedule() 一次性传入所有 toolUse，按并发安全分区调度执行
 * 2. **流式模式**: 通过 addTool() 逐个添加工具，tool_use 到达即启动执行
 *
 * 并发安全策略:
 *
 * - safe 工具可与其他 safe 工具并行执行
 * - unsafe 工具必须串行执行
 * - 正在执行 unsafe 工具时，所有后续工具必须等待
 *
 * 结果按序 yield:
 *
 * - yield 顺序与 addTool 顺序一致
 * - safe 工具先完成也必须等前面的 unsafe 工具完成后按序 yield
 */
export class StreamingToolScheduler implements ToolScheduler {
  private readonly tools: TrackedTool[] = [];
  private readonly maxConcurrency: number;
  /** 存储每个工具的执行 Promise，用于等待完成 */
  private readonly executionPromises = new Map<string, Promise<void>>();

  constructor(config?: StreamingSchedulerConfig) {
    this.maxConcurrency = config?.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
  }

  // ========== 批量模式: 实现 ToolScheduler.schedule() ==========

  async *schedule(
    toolUses: readonly ToolUseBlock[],
    executor: ToolExecutor,
    registry: ToolRegistry,
    context: ToolUseContext,
    timeout: number
  ): AsyncGenerator<ToolResultMessage> {
    // 重置状态
    this.tools.length = 0;
    this.executionPromises.clear();

    // 批量添加工具
    for (const toolUse of toolUses) {
      this.addToolInternal(toolUse, registry);
    }

    // 启动所有可以执行的工具
    this.startQueuedTools(executor, registry, context, timeout);

    // 等待所有工具完成
    await this.waitForAll();

    // 按序 yield 所有结果
    for (const tool of this.tools) {
      if (tool.result !== undefined) {
        yield tool.result;
      }
    }
  }

  // ========== 流式模式: addTool + getCompletedResults + getRemainingResults ==========

  /**
   * 流式添加工具
   *
   * LLM 流式输出期间，每收到一个 tool_use block 即调用此方法。 工具立即进入队列并尝试启动执行。
   */
  addTool(
    toolUse: ToolUseBlock,
    registry: ToolRegistry,
    executor: ToolExecutor,
    context: ToolUseContext,
    timeout: number
  ): void {
    this.addToolInternal(toolUse, registry);
    // 尝试启动新加入的及被阻塞的工具
    this.startQueuedTools(executor, registry, context, timeout);
  }

  /**
   * 流式模式: 获取已完成的结果（同步 yield）
   *
   * 在 LLM 流式输出循环中调用，立即返回已完成的工具结果。 yield 顺序与 addTool 顺序一致。
   */
  *getCompletedResults(): Generator<ToolResultMessage> {
    for (const tool of this.tools) {
      if (tool.status === 'completed' && tool.result !== undefined) {
        tool.status = 'yielded';
        yield tool.result;
      } else if (tool.status === 'executing' && !tool.isConcurrencySafe) {
        // unsafe 工具正在执行 → 后续 safe 工具即使完成也不能跳过
        break;
      }
    }
  }

  /**
   * 流式模式: 获取所有剩余结果（异步等待）
   *
   * 在 LLM 流式输出结束后调用，等待所有工具执行完成并按序 yield。
   */
  async *getRemainingResults(): AsyncGenerator<ToolResultMessage> {
    // 等待所有工具完成
    await this.waitForAll();

    // 按序 yield 所有未 yield 的结果
    for (const tool of this.tools) {
      if (tool.result !== undefined && tool.status !== 'yielded') {
        tool.status = 'yielded';
        yield tool.result;
      }
    }
  }

  // ========== 内部方法 ==========

  /** 内部添加工具到队列 */
  private addToolInternal(toolUse: ToolUseBlock, registry: ToolRegistry): void {
    const tool = registry.get(toolUse.name);
    // 未注册工具默认 unsafe（失败封闭）
    const isConcurrencySafe = tool ? tool.isConcurrencySafe(toolUse.input) : false;

    const tracked: TrackedTool = {
      id: generateTrackingId(),
      toolUse,
      isConcurrencySafe,
      status: 'queued'
    };

    // 未注册工具 → 直接标记为完成（错误结果）
    if (!tool) {
      tracked.status = 'completed';
      tracked.result = {
        id: `tu_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role: 'tool_result',
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        error: `工具 "${toolUse.name}" 未注册`,
        isSuccess: false,
        timestamp: Date.now()
      };
    }

    this.tools.push(tracked);
  }

  /** 并发安全判断 — 是否可以启动新工具 */
  private canExecuteTool(isConcurrencySafe: boolean): boolean {
    const executing = this.tools.filter(t => t.status === 'executing');

    // 没有工具在执行 → 任何工具可启动
    if (executing.length === 0) {
      return true;
    }

    // 有工具在执行 → 新工具是 safe 且所有正在执行的也是 safe → 可并行
    if (isConcurrencySafe && executing.every(t => t.isConcurrencySafe)) {
      return executing.length < this.maxConcurrency;
    }

    // 否则 → 必须等待
    return false;
  }

  /** 启动所有可以执行的工具（不等待完成） */
  private startQueuedTools(
    executor: ToolExecutor,
    registry: ToolRegistry,
    context: ToolUseContext,
    timeout: number
  ): void {
    for (const tool of this.tools) {
      if (tool.status !== 'queued') {
        continue;
      }

      if (this.canExecuteTool(tool.isConcurrencySafe)) {
        // 启动执行（不等待完成）
        const promise = this.executeTool(tool, executor, registry, context, timeout);
        this.executionPromises.set(tool.id, promise);
        // 完成后触发后续启动
        promise.then(() => {
          this.executionPromises.delete(tool.id);
          this.startQueuedTools(executor, registry, context, timeout);
        });
      } else if (!tool.isConcurrencySafe) {
        // unsafe 工具无法执行 → 停止遍历（保持顺序）
        break;
      }
      // safe 工具无法执行 → 跳过，继续尝试后续 safe 工具
    }
  }

  /** 执行单个工具（异步，不阻塞调用方） */
  private async executeTool(
    tracked: TrackedTool,
    executor: ToolExecutor,
    registry: ToolRegistry,
    context: ToolUseContext,
    timeout: number
  ): Promise<void> {
    tracked.status = 'executing';

    const result = await executeSingle(tracked.toolUse, executor, registry, context, timeout);

    tracked.result = result;
    tracked.status = 'completed';
  }

  /** 等待所有工具完成 */
  private async waitForAll(): Promise<void> {
    // 等待所有正在执行的 Promise
    const promises = Array.from(this.executionPromises.values());
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }

    // 检查是否还有 executing 的工具（可能在等待期间新启动了）
    const maxIterations = 50;
    for (let i = 0; i < maxIterations; i++) {
      const stillExecuting = this.tools.some(t => t.status === 'executing');
      if (!stillExecuting) {
        return;
      }
      const pending = Array.from(this.executionPromises.values());
      if (pending.length > 0) {
        await Promise.allSettled(pending);
      } else {
        // 没有 promise 但还有 executing → 等一小段时间
        await new Promise<void>(resolve => {
          setTimeout(resolve, 5);
        });
      }
    }
  }
}
