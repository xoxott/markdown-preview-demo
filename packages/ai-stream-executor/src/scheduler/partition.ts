/** partitionToolCalls — 并发安全分区调度 */

import type { ToolUseBlock } from '@suga/ai-agent-loop';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { Batch } from '../types/scheduler';

/**
 * 将工具调用列表按并发安全性分区
 *
 * 策略:
 *
 * - 连续 safe 工具合并到一个 batch（并行执行）
 * - unsafe 工具各自独占一个 batch（串行执行）
 *
 * 示例: [Read, Read, Bash, Read, Glob] → Batch(safe, [Read, Read]) — 并行 Batch(unsafe, [Bash]) — 串行
 * Batch(safe, [Read, Glob]) — 并行
 *
 * @param toolUses 工具调用列表
 * @param registry 工具注册表（查找 isConcurrencySafe）
 * @returns 分区后的 Batch 数组
 */
export function partitionToolCalls(
  toolUses: readonly ToolUseBlock[],
  registry: ToolRegistry
): Batch[] {
  return toolUses.reduce<Batch[]>((acc, toolUse) => {
    const tool = registry.get(toolUse.name);
    // 未注册工具默认 unsafe（失败封闭）
    const isConcurrencySafe = tool ? tool.isConcurrencySafe(toolUse.input) : false;

    // 连续 safe 工具合并到前一个 safe batch
    if (isConcurrencySafe && acc.length > 0 && acc[acc.length - 1].isConcurrencySafe) {
      acc[acc.length - 1] = {
        isConcurrencySafe: true,
        blocks: [...acc[acc.length - 1].blocks, toolUse]
      };
    } else {
      // unsafe 或新的 safe 段 → 新 batch
      acc.push({ isConcurrencySafe, blocks: [toolUse] });
    }

    return acc;
  }, []);
}
