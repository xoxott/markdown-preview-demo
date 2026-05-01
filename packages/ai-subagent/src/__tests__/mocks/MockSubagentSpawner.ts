/** Mock SubagentSpawner — 用于测试的可控子代理创建器模拟 */

import { ToolRegistry } from '@suga/ai-tool-core';
import type { LoopResult } from '@suga/ai-agent-loop';
import type { SubagentDefinition } from '../../types/subagent';
import type { SubagentResult } from '../../types/result';
import type { Spawner } from '../../spawner/SubagentSpawner';

/** Mock Spawner 配置 */
export interface MockSpawnerConfig {
  /** 是否抛出错误 */
  shouldFail?: boolean;
  /** 自定义 spawn 结果 */
  customResult?: (def: SubagentDefinition, task: string) => SubagentResult;
}

/**
 * MockSubagentSpawner — 实现 Spawner 接口
 *
 * 用于 AgentTool 测试场景，不依赖真实 AgentLoop。
 */
export class MockSubagentSpawner implements Spawner {
  private shouldFail = false;
  private customResult?: (def: SubagentDefinition, task: string) => SubagentResult;
  private spawnHistory: { def: SubagentDefinition; task: string; context?: string }[] = [];
  private spawnCount = 0;

  constructor(config?: MockSpawnerConfig) {
    if (config?.shouldFail) this.shouldFail = config.shouldFail;
    if (config?.customResult) this.customResult = config.customResult;
  }

  /** createScopedRegistry — Mock 实现（返回空注册表） */
  createScopedRegistry(_parentRegistry: ToolRegistry, _def: SubagentDefinition): ToolRegistry {
    return new ToolRegistry();
  }

  /** spawn 实现 — 返回模拟结果 */
  async spawn(
    def: SubagentDefinition,
    task: string,
    contextDirective?: string,
    _parentRegistry?: ToolRegistry,
    _parentSignal?: AbortSignal
  ): Promise<SubagentResult> {
    this.spawnHistory.push({ def, task, context: contextDirective });
    this.spawnCount++;

    if (this.shouldFail) {
      throw new Error('MockSubagentSpawner: 模拟执行失败');
    }

    if (this.customResult) {
      return this.customResult(def, task);
    }

    // 默认成功结果
    const loopResult: LoopResult = {
      type: 'completed',
      reason: '子代理任务完成',
      messages: [
        { id: 'msg_1', role: 'user', content: task, timestamp: Date.now() },
        {
          id: 'msg_2',
          role: 'assistant',
          content: `完成 ${def.agentType} 任务: ${task}`,
          toolUses: [],
          timestamp: Date.now()
        }
      ]
    };

    return {
      agentType: def.agentType,
      loopResult,
      summary: `完成 ${def.agentType} 任务`,
      success: true,
      durationMs: 100
    };
  }

  /** 获取调用历史 */
  getSpawnHistory() {
    return this.spawnHistory;
  }

  /** 获取调用次数 */
  getSpawnCount() {
    return this.spawnCount;
  }

  /** 设置失败模式 */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}
