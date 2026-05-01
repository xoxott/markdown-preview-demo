/** FileEditTool — 文件精确编辑工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { FileEditInput } from '../types/tool-inputs';
import type { FileEditOutput } from '../types/tool-outputs';
import { FileEditInputSchema } from '../types/tool-inputs';
import { normalizeContent } from '../utils/path-normalize';

/**
 * FileEditTool — 精确字符串替换编辑文件
 *
 * - isReadOnly: false — 写操作
 * - isConcurrencySafe: false — 编辑有副作用
 * - safetyLabel: 'destructive' — 修改性标签
 * - isDestructive: false — 编辑保留内容（修改而非销毁）
 * - checkPermissions: ask — 需要用户确认
 * - validateInput: 路径+空oldString+双字符串弯引号/LF规范化
 */
export const fileEditTool = buildTool<FileEditInput, FileEditOutput>({
  name: 'file-edit',

  inputSchema: FileEditInputSchema,

  description: async input => {
    const scope = input.replaceAll ? 'all occurrences' : 'one occurrence';
    const oldPreview = input.oldString.substring(0, 50);
    const newPreview = input.newString.substring(0, 50);
    return `Edit file ${input.filePath}: replace ${scope} of "${oldPreview}" with "${newPreview}"`;
  },

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'destructive' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: FileEditInput): ValidationResult => {
    if (input.filePath === '') {
      return { behavior: 'deny', message: 'File path must not be empty', reason: 'empty_path' };
    }

    if (!input.filePath.startsWith('/')) {
      return { behavior: 'deny', message: 'File path must be absolute', reason: 'relative_path' };
    }

    if (input.oldString === '') {
      return {
        behavior: 'deny',
        message: 'oldString must not be empty',
        reason: 'empty_old_string'
      };
    }

    // 双字符串规范化: 弯引号 + LF 行尾
    const normalizedOld = normalizeContent(input.oldString);
    const normalizedNew = normalizeContent(input.newString);

    if (normalizedOld !== input.oldString || normalizedNew !== input.newString) {
      return {
        behavior: 'allow',
        updatedInput: {
          ...input,
          oldString: normalizedOld,
          newString: normalizedNew
        }
      };
    }

    return { behavior: 'allow' };
  },

  checkPermissions: (input: FileEditInput): PermissionResult => {
    return {
      behavior: 'ask',
      message: `Edit file "${input.filePath}"?`
    };
  },

  call: async (
    input: FileEditInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<FileEditOutput>> => {
    // 检查文件是否存在
    const stat = await context.fsProvider.stat(input.filePath);
    if (!stat.exists) {
      return {
        data: {
          applied: false,
          replacementCount: 0,
          error: `File "${input.filePath}" does not exist`
        },
        error: `File "${input.filePath}" does not exist`
      };
    }

    // 执行编辑
    const result = await context.fsProvider.editFile(
      input.filePath,
      input.oldString,
      input.newString,
      input.replaceAll
    );

    if (!result.applied) {
      return {
        data: result,
        error: result.error ?? 'Edit failed: oldString not found or not unique'
      };
    }

    return { data: result };
  },

  toAutoClassifierInput: (input: FileEditInput) => ({
    toolName: 'file-edit',
    input,
    safetyLabel: 'destructive',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});
