/** TodoWriteTool — G1 session级轻量待办清单 */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { TodoWriteInput } from '../types/tool-inputs';
import type { TodoWriteOutput } from '../types/tool-outputs';
import { TodoWriteInputSchema } from '../types/tool-inputs';

/**
 * TodoWriteTool — session级轻量待办清单 + 验证提醒
 *
 * 对齐 Claude Code TodoWrite:
 *
 * - 写入完整待办列表（替换模式）
 * - 未完成的 high priority 待办 → reminder 提醒
 * - 不支持持久化（session 级别）
 */
export const todoWriteTool = buildTool<TodoWriteInput, TodoWriteOutput>({
  name: 'todo-write',

  inputSchema: TodoWriteInputSchema,

  description: async input => {
    const total = input.todos.length;
    const completed = input.todos.filter(t => t.completed).length;
    return `Update session todo list: ${total} items (${completed} completed)`;
  },

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'system' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: TodoWriteInput) => {
    if (input.todos.length === 0) {
      return { behavior: 'deny', message: 'todos must not be empty', reason: 'empty_todos' };
    }
    for (const todo of input.todos) {
      if (!todo.content) {
        return {
          behavior: 'deny',
          message: 'Each todo must have content',
          reason: 'empty_todo_content'
        };
      }
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: TodoWriteInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<TodoWriteOutput>> => {
    const provider = context.todoWriteProvider;
    if (!provider) {
      return {
        data: {
          updated: false,
          todos: [],
          reminder: 'No TodoWriteProvider available — todos not persisted'
        },
        error: 'No TodoWriteProvider available'
      };
    }

    provider.setTodos(input.todos);

    // 构造验证提醒：未完成的 high priority 待办
    const incompleteHighPriority = input.todos.filter(t => !t.completed && t.priority === 'high');
    const incompleteCount = input.todos.filter(t => !t.completed).length;

    let reminder: string | undefined;
    if (incompleteHighPriority.length > 0) {
      reminder = `⚠️ ${incompleteHighPriority.length} high-priority items remain incomplete: ${incompleteHighPriority.map(t => t.content).join(', ')}`;
    } else if (incompleteCount > 0) {
      reminder = `${incompleteCount} items remain incomplete`;
    }

    return {
      data: {
        updated: true,
        todos: input.todos.map(t => ({
          content: t.content,
          completed: t.completed ?? false,
          priority: t.priority
        })),
        reminder
      },
      newMessages: reminder
        ? [
            {
              role: 'assistant',
              content: reminder,
              meta: true
            }
          ]
        : undefined
    };
  },

  toAutoClassifierInput: (input: TodoWriteInput) => ({
    toolName: 'todo_write',
    input,
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 10_000
});
