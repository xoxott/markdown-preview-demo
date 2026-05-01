/** GlobTool — 文件模式搜索工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { GlobInput } from '../types/tool-inputs';
import type { GlobOutput } from '../types/tool-outputs';
import { GlobInputSchema } from '../types/tool-inputs';

/**
 * GlobTool — Glob 模式文件搜索
 *
 * - isReadOnly: true — 只读操作，无副作用
 * - isConcurrencySafe: true — 多次 glob 互不干扰
 * - safetyLabel: 'readonly' — 安全的只读标签
 * - checkPermissions: allow — 无需权限确认
 * - validateInput: 检查 pattern 非空
 */
export const globTool = buildTool<GlobInput, GlobOutput>({
  name: 'glob',

  inputSchema: GlobInputSchema,

  description: async input =>
    `Search for files matching pattern "${input.pattern}"${input.path ? ` in ${input.path}` : ''}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: GlobInput): ValidationResult => {
    if (input.pattern === '') {
      return {
        behavior: 'deny',
        message: 'Glob pattern must not be empty',
        reason: 'empty_pattern'
      };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: GlobInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<GlobOutput>> => {
    const paths = await context.fsProvider.glob(input.pattern, input.path);
    return { data: paths };
  },

  toAutoClassifierInput: (input: GlobInput) => ({
    toolName: 'glob',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});
