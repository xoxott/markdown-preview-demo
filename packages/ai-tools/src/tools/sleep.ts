/** SleepTool — 简单延迟工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { SleepInput } from '../types/tool-inputs';
import type { SleepOutput } from '../types/tool-outputs';
import { SleepInputSchema } from '../types/tool-inputs';

/**
 * SleepTool — 简单延迟
 *
 * - isReadOnly: true — 不修改任何状态
 * - safetyLabel: 'readonly' — 无破坏性
 * - 不实际sleep — 返回结构化结果让宿主决定如何处理延迟
 */
export const sleepTool = buildTool<SleepInput, SleepOutput>({
  name: 'sleep',

  inputSchema: SleepInputSchema,

  description: async input => `Sleep for ${input.seconds} seconds`,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: SleepInput): ValidationResult => {
    if (input.seconds < 0) {
      return { behavior: 'deny', message: 'Duration must be non-negative', reason: 'invalid_duration' };
    }
    if (input.seconds > 300) {
      return { behavior: 'deny', message: 'Duration must be ≤ 300 seconds', reason: 'duration_exceeded' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => ({ behavior: 'allow' }),

  call: async (input: SleepInput, _context: any): Promise<ToolResult<SleepOutput>> => {
    // 不实际sleep — 返回结果让宿主处理延迟
    return {
      data: {
        slept: true,
        seconds: input.seconds
      }
    };
  },

  toAutoClassifierInput: (input: SleepInput) => ({
    toolName: 'sleep',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 100
});