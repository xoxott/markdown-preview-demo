/** GrepTool — 正则表达式搜索工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { GrepInput } from '../types/tool-inputs';
import type { GrepOutput } from '../types/tool-outputs';
import type { GrepOptions } from '../types/fs-provider';
import { GrepInputSchema } from '../types/tool-inputs';

/**
 * GrepTool — 正则表达式文件搜索
 *
 * - isReadOnly: true — 只读操作
 * - isConcurrencySafe: true — 多次搜索互不干扰
 * - safetyLabel: 'readonly' — 安全的只读标签
 * - checkPermissions: allow — 无需权限确认
 * - validateInput: 检查 pattern 非空、context 选项不冲突、headLimit > 0
 */
export const grepTool = buildTool<GrepInput, GrepOutput>({
  name: 'grep',

  inputSchema: GrepInputSchema,

  description: async input => {
    const mode = input.outputMode ?? 'files-with-matches';
    return `Search for pattern "${input.pattern}"${input.path ? ` in ${input.path}` : ''} (${mode} mode)`;
  },

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: GrepInput): ValidationResult => {
    if (input.pattern === '') {
      return {
        behavior: 'deny',
        message: 'Search pattern must not be empty',
        reason: 'empty_pattern'
      };
    }

    const hasExplicitContext =
      input.contextBefore !== undefined || input.contextAfter !== undefined;
    const hasContextLines = input.contextLines !== undefined;
    if (hasExplicitContext && hasContextLines) {
      return {
        behavior: 'deny',
        message: 'Cannot specify both contextBefore/contextAfter and contextLines',
        reason: 'conflicting_context_options'
      };
    }

    if (input.headLimit === 0) {
      return { behavior: 'deny', message: 'headLimit must be > 0', reason: 'zero_head_limit' };
    }

    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: GrepInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<GrepOutput>> => {
    const options: GrepOptions = {
      path: input.path,
      glob: input.glob,
      outputMode: input.outputMode ?? 'files-with-matches',
      caseInsensitive: input.caseInsensitive,
      contextBefore: input.contextBefore ?? input.contextLines,
      contextAfter: input.contextAfter ?? input.contextLines,
      headLimit: input.headLimit,
      excludePatterns: ['.git', 'node_modules']
    };

    const result = await context.fsProvider.grep(input.pattern, options);
    return { data: result };
  },

  toAutoClassifierInput: (input: GrepInput) => ({
    toolName: 'grep',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});
