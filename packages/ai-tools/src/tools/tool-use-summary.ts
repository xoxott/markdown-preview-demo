/**
 * ToolUseSummary — 用小型模型生成工具批次摘要
 *
 * N32: 对 SDK 进度更新，将一组工具调用压缩为单行摘要。 实际LLM调用由宿主注入。
 */

import { z } from 'zod/v4';

export const ToolUseSummaryInputSchema = z.strictObject({
  toolCalls: z
    .array(
      z.object({
        name: z.string(),
        inputSummary: z.string().optional(),
        resultSummary: z.string().optional()
      })
    )
    .min(1)
});

export type ToolUseSummaryInput = z.infer<typeof ToolUseSummaryInputSchema>;

export interface ToolUseSummaryOutput {
  readonly summary: string;
  readonly toolCount: number;
}

/** ToolUseSummaryFn — 宿主注入的摘要生成函数 */
export type ToolUseSummaryFn = (
  calls: readonly { name: string; inputSummary?: string; resultSummary?: string }[]
) => Promise<string>;

/** generateToolUseSummary — 生成工具使用摘要 */
export async function generateToolUseSummary(
  calls: readonly { name: string; inputSummary?: string; resultSummary?: string }[],
  summaryFn: ToolUseSummaryFn
): Promise<ToolUseSummaryOutput> {
  const summary = await summaryFn(calls);
  return { summary, toolCount: calls.length };
}

/** formatToolCallsForSummary — 格式化工具调用列表用于摘要 */
export function formatToolCallsForSummary(
  calls: readonly { name: string; inputSummary?: string; resultSummary?: string }[]
): string {
  return calls
    .map(c => {
      const parts = [c.name];
      if (c.inputSummary) parts.push(`in: ${c.inputSummary}`);
      if (c.resultSummary) parts.push(`out: ${c.resultSummary}`);
      return parts.join(' ');
    })
    .join(', ');
}
