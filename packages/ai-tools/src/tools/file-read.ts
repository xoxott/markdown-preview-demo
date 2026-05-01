/** FileReadTool — 文件读取工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { FileReadInput } from '../types/tool-inputs';
import type { FileReadOutput } from '../types/tool-outputs';
import { FileReadInputSchema } from '../types/tool-inputs';
import { truncateOutput } from '../utils/output-truncate';

/**
 * FileReadTool — 读取文件内容
 *
 * - isReadOnly: true — 只读操作
 * - isConcurrencySafe: true — 多次读取互不干扰
 * - safetyLabel: 'readonly' — 安全的只读标签
 * - checkPermissions: allow — 无需权限确认
 * - validateInput: 检查路径非空、绝对路径、offset/pages 不冲突
 * - 大文件截断: 超过 maxResultSizeChars 时截断
 */
export const fileReadTool = buildTool<FileReadInput, FileReadOutput>({
  name: 'file-read',

  inputSchema: FileReadInputSchema,

  description: async input => {
    const rangeInfo =
      input.offset !== undefined
        ? ` lines ${input.offset}-${input.limit !== undefined ? input.offset + input.limit : 'end'}`
        : '';
    const pageInfo = input.pages ? ` pages ${input.pages}` : '';
    return `Read file ${input.filePath}${rangeInfo}${pageInfo}`;
  },

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: FileReadInput): ValidationResult => {
    if (input.filePath === '') {
      return { behavior: 'deny', message: 'File path must not be empty', reason: 'empty_path' };
    }

    if (!input.filePath.startsWith('/')) {
      return { behavior: 'deny', message: 'File path must be absolute', reason: 'relative_path' };
    }

    if (input.offset !== undefined && input.pages !== undefined) {
      return {
        behavior: 'deny',
        message: 'Cannot specify both offset/limit (text) and pages (PDF)',
        reason: 'conflicting_read_options'
      };
    }

    if (input.limit !== undefined && input.pages !== undefined) {
      return {
        behavior: 'deny',
        message: 'Cannot specify both limit (text) and pages (PDF)',
        reason: 'conflicting_read_options'
      };
    }

    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: FileReadInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<FileReadOutput>> => {
    const content = await context.fsProvider.readFile(input.filePath, {
      offset: input.offset,
      limit: input.limit
    });

    const maxSize = 100_000;
    if (content.content.length > maxSize) {
      const truncated = truncateOutput(content.content, maxSize);
      return {
        data: { ...content, content: truncated.content },
        metadata: { truncated: true, originalSize: truncated.originalSize }
      };
    }

    return { data: content };
  },

  toAutoClassifierInput: (input: FileReadInput) => ({
    toolName: 'file-read',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: Infinity // Read self-bounds via truncateOutput
});
