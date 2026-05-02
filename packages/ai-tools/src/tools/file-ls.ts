/** FileLsTool — 目录列表工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { FileLsInput } from '../types/tool-inputs';
import type { FileLsOutput } from '../types/tool-outputs';
import { FileLsInputSchema } from '../types/tool-inputs';

/**
 * FileLsTool — 目录列表
 *
 * - isReadOnly: true — 只读操作
 * - isConcurrencySafe: true — 多次ls互不干扰
 * - safetyLabel: 'readonly' — 安全只读
 */
export const fileLsTool = buildTool<FileLsInput, FileLsOutput>({
  name: 'file-ls',

  inputSchema: FileLsInputSchema,

  description: async input =>
    `List contents of directory ${input.path}${input.recursive ? ' (recursive)' : ''}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: FileLsInput): ValidationResult => {
    if (input.path === '') {
      return {
        behavior: 'deny',
        message: 'Path must not be empty',
        reason: 'empty_path'
      };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: FileLsInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<FileLsOutput>> => {
    const entries = await context.fsProvider.ls(input.path, { recursive: input.recursive });
    return { data: entries };
  },

  toAutoClassifierInput: (input: FileLsInput) => ({
    toolName: 'file_ls',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});
