/** FileWriteTool — 文件写入工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { FileWriteInput } from '../types/tool-inputs';
import type { FileWriteOutput } from '../types/tool-outputs';
import { FileWriteInputSchema } from '../types/tool-inputs';
import { normalizeContent } from '../utils/path-normalize';

/**
 * FileWriteTool — 全覆盖写入文件
 *
 * - isReadOnly: false — 写操作
 * - isConcurrencySafe: false — 写入有副作用
 * - safetyLabel: 'destructive' — 破坏性标签（覆盖文件）
 * - isDestructive: true — 覆盖已存在文件
 * - checkPermissions: ask — 需要用户确认（新建/覆盖）
 * - validateInput: 路径非空+绝对+弯引号/LF 规范化
 */
export const fileWriteTool = buildTool<FileWriteInput, FileWriteOutput>({
  name: 'file-write',

  inputSchema: FileWriteInputSchema,

  description: async input =>
    `Write content to file ${input.filePath} (${input.content.length} chars)`,

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'destructive' as SafetyLabel,
  isDestructive: () => true,

  validateInput: (input: FileWriteInput): ValidationResult => {
    if (input.filePath === '') {
      return { behavior: 'deny', message: 'File path must not be empty', reason: 'empty_path' };
    }

    if (!input.filePath.startsWith('/')) {
      return { behavior: 'deny', message: 'File path must be absolute', reason: 'relative_path' };
    }

    // 规范化: 弯引号 + LF 行尾
    const normalizedContent = normalizeContent(input.content);
    if (normalizedContent !== input.content) {
      return {
        behavior: 'allow',
        updatedInput: { ...input, content: normalizedContent }
      };
    }

    return { behavior: 'allow' };
  },

  checkPermissions: (input: FileWriteInput): PermissionResult => {
    // 写入文件总是需要权限确认
    // 宿主的权限管线根据文件是否已存在来决定具体消息
    return {
      behavior: 'ask',
      message: `Write to file "${input.filePath}"?`
    };
  },

  call: async (
    input: FileWriteInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<FileWriteOutput>> => {
    await context.fsProvider.writeFile(input.filePath, input.content);
    return {
      data: { written: true, bytesWritten: new TextEncoder().encode(input.content).length }
    };
  },

  toAutoClassifierInput: (input: FileWriteInput) => ({
    toolName: 'file-write',
    input,
    safetyLabel: 'destructive',
    isReadOnly: false,
    isDestructive: true
  }),

  maxResultSizeChars: 100_000
});
