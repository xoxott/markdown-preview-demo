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
import { FILE_UNCHANGED_STUB } from '../utils/file-read-state-cache';
import { validateFileReadSecurity } from './file-read-security';

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

    // FileRead安全验证 — 设备保护+二进制拒绝+UNC路径
    // 注: 当pages参数存在时，PDF等文件允许读取（FileRead有PDF读取能力）
    const securityResult = validateFileReadSecurity(input.filePath);
    if (!securityResult.safe) {
      // 如果是二进制文件但有pages参数（如PDF）→ 允许
      if (securityResult.blockedReason?.includes('binary') && input.pages) {
        // PDF有pages参数 → 允许读取（通过pages参数指定页面）
      } else {
        return {
          behavior: 'deny',
          message: securityResult.blockedReason ?? 'File read blocked by security check',
          reason: 'file_read_security_blocked'
        };
      }
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
    // === 去重检查 ===
    // 如果缓存中有记录 + offset/limit匹配 + mtime一致 → 返回file_unchanged stub
    if (context.readFileState) {
      const stat = await context.fsProvider.stat(input.filePath);
      const dedupResult = context.readFileState.checkDedup(
        input.filePath,
        input.offset,
        input.limit,
        stat.mtimeMs
      );

      if (dedupResult.dedupHit) {
        return {
          data: {
            type: 'file_unchanged',
            file: { filePath: input.filePath }
          },
          metadata: { dedup: true, stubMessage: FILE_UNCHANGED_STUB }
        };
      }
    }

    // === 正常读取 ===
    const content = await context.fsProvider.readFile(input.filePath, {
      offset: input.offset,
      limit: input.limit
    });

    // 记录读取状态到缓存(供后续去重判断)
    if (context.readFileState) {
      const stat = await context.fsProvider.stat(input.filePath);
      context.readFileState.set(input.filePath, {
        content: content.content,
        timestamp: Math.floor(stat.mtimeMs),
        offset: input.offset ?? 0,
        limit: input.limit,
        isPartialView: false
      });
    }

    const maxSize = 100_000;
    if (content.content.length > maxSize) {
      const truncated = truncateOutput(content.content, maxSize);
      return {
        data: { type: 'text', file: { ...content, content: truncated.content } },
        metadata: { truncated: true, originalSize: truncated.originalSize }
      };
    }

    return { data: { type: 'text', file: content } };
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
