/**
 * UndoTool — 文件编辑回滚工具 (P100)
 *
 * 撤销最近的 FileEdit 操作，恢复文件到编辑前的状态。
 *
 * 两种使用模式:
 *
 * 1. 撤销最近一次编辑 — 不提供 editId 和 filePath
 * 2. 撤销指定编辑 — 提供 editId 或 filePath 定位
 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { UndoInput } from '../types/tool-inputs';
import type { UndoOutput } from '../types/tool-outputs';
import { UndoInputSchema } from '../types/tool-inputs';

export const undoTool = buildTool<UndoInput, UndoOutput>({
  name: 'undo',
  inputSchema: UndoInputSchema,
  description: async () =>
    'Revert the last file edit operation, restoring the file to its previous state',
  searchHint: 'undo revert rollback restore file edit',
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'destructive' as SafetyLabel,
  isDestructive: () => false,
  validateInput: (_input: UndoInput): ValidationResult => {
    return { behavior: 'allow' };
  },
  checkPermissions: (): PermissionResult => ({ behavior: 'ask', message: 'Revert file edit?' }),
  call: async (
    input: UndoInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<UndoOutput>> => {
    const logProvider = context.fileEditLogProvider;
    if (!logProvider) {
      return {
        data: { reverted: false, error: 'No FileEditLogProvider available' }
      };
    }

    // 确定要撤销的编辑记录
    let entry: import('../types/file-edit-log').FileEditLogEntry | undefined;

    if (input.editId) {
      // 指定 editId
      entry = logProvider.getEditById(input.editId);
    } else if (input.filePath) {
      // 指定 filePath — 获取该文件的最近编辑
      const recent = logProvider.getRecentEdits(input.filePath, 1);
      entry = recent.length > 0 ? recent[0] : undefined;
    } else {
      // 不提供参数 — 撤销全局最近一次编辑
      entry = logProvider.getLatestEdit();
    }

    if (!entry) {
      return {
        data: { reverted: false, error: 'No matching edit record found' }
      };
    }

    const success = await logProvider.revert(entry.editId);

    return {
      data: {
        reverted: success,
        editId: entry.editId,
        filePath: entry.filePath,
        error: success ? undefined : `Failed to revert file ${entry.filePath}`
      }
    };
  },
  toAutoClassifierInput: (input: UndoInput) => ({
    toolName: 'undo',
    input,
    safetyLabel: 'destructive',
    isReadOnly: false,
    isDestructive: false
  }),
  maxResultSizeChars: 10_000
});
