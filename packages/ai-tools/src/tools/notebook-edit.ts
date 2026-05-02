/** NotebookEditTool — Jupyter notebook cell编辑工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { NotebookEditInput } from '../types/tool-inputs';
import type { NotebookEditOutput } from '../types/tool-outputs';
import { NotebookEditInputSchema } from '../types/tool-inputs';

// ─── Notebook JSON类型 ───

interface NotebookCell {
  cell_type: 'code' | 'markdown';
  id: string;
  metadata: Record<string, unknown>;
  source: string[];
  outputs?: Record<string, unknown>[];
  execution_count?: number | null;
}

interface NotebookContent {
  cells: NotebookCell[];
  metadata: Record<string, unknown>;
  nbformat: number;
  nbformat_minor: number;
}

/** 解析.ipynb JSON */
function parseNotebook(json: string): NotebookContent {
  return JSON.parse(json) as NotebookContent;
}

/** 序列化.ipynb JSON */
function serializeNotebook(nb: NotebookContent): string {
  return JSON.stringify(nb, null, 1);
}

/**
 * NotebookEditTool — Jupyter notebook cell CRUD
 *
 * - isReadOnly: false — 修改文件
 * - isConcurrencySafe: false — 并发修改可能冲突
 * - safetyLabel: 'destructive' — 修改.ipynb文件
 */
export const notebookEditTool = buildTool<NotebookEditInput, NotebookEditOutput>({
  name: 'notebook-edit',

  inputSchema: NotebookEditInputSchema,

  description: async input => `${input.edit_mode} cell in notebook ${input.notebook_path}`,

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'destructive' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: NotebookEditInput): ValidationResult => {
    if (input.edit_mode === 'insert' && !input.cell_type) {
      return {
        behavior: 'deny',
        message: 'cell_type is required for insert mode',
        reason: 'missing_cell_type'
      };
    }
    if (input.edit_mode === 'delete' && !input.cell_id) {
      return {
        behavior: 'deny',
        message: 'cell_id is required for delete mode',
        reason: 'missing_cell_id'
      };
    }
    if (input.edit_mode === 'replace' && !input.cell_id) {
      return {
        behavior: 'deny',
        message: 'cell_id is required for replace mode',
        reason: 'missing_cell_id'
      };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: NotebookEditInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<NotebookEditOutput>> => {
    // 读取notebook文件
    const fileContent = await context.fsProvider.readFile(input.notebook_path);
    const nb = parseNotebook(fileContent.content);

    const editMode = input.edit_mode ?? 'replace';
    const cellId = input.cell_id ?? '';

    try {
      if (editMode === 'replace') {
        // 替换cell内容
        const cellIndex = nb.cells.findIndex(c => c.id === cellId);
        if (cellIndex === -1) {
          return {
            data: {
              applied: false,
              cellId,
              editMode,
              error: `Cell with id "${cellId}" not found`
            }
          };
        }

        nb.cells[cellIndex] = {
          ...nb.cells[cellIndex],
          source: input.new_source.split('\n'),
          cell_type: input.cell_type ?? nb.cells[cellIndex].cell_type
        };
      } else if (editMode === 'insert') {
        // 插入新cell
        const newCell: NotebookCell = {
          cell_type: input.cell_type!,
          id: generateCellId(),
          metadata: {},
          source: input.new_source.split('\n'),
          ...(input.cell_type === 'code' ? { outputs: [], execution_count: null } : {})
        };

        if (cellId) {
          const insertIndex = nb.cells.findIndex(c => c.id === cellId);
          if (insertIndex === -1) {
            return {
              data: {
                applied: false,
                cellId,
                editMode,
                error: `Cell with id "${cellId}" not found`
              }
            };
          }
          nb.cells.splice(insertIndex + 1, 0, newCell);
        } else {
          nb.cells.unshift(newCell);
        }

        // 写回notebook
        await context.fsProvider.writeFile(input.notebook_path, serializeNotebook(nb));

        return {
          data: {
            applied: true,
            cellId: newCell.id,
            editMode
          }
        };
      } else if (editMode === 'delete') {
        // 删除cell
        const cellIndex = nb.cells.findIndex(c => c.id === cellId);
        if (cellIndex === -1) {
          return {
            data: {
              applied: false,
              cellId,
              editMode,
              error: `Cell with id "${cellId}" not found`
            }
          };
        }

        nb.cells.splice(cellIndex, 1);
      }

      // 写回notebook
      await context.fsProvider.writeFile(input.notebook_path, serializeNotebook(nb));

      return {
        data: {
          applied: true,
          cellId,
          editMode
        }
      };
    } catch (error) {
      return {
        data: {
          applied: false,
          cellId,
          editMode,
          error: (error as Error).message
        }
      };
    }
  },

  toAutoClassifierInput: (input: NotebookEditInput) => ({
    toolName: 'notebook_edit',
    input,
    safetyLabel: 'destructive',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});

/** 生成唯一cell ID */
function generateCellId(): string {
  return `cell_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
