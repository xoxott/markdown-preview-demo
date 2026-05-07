/** TodoWriteProvider — session级待办清单接口 */

import type { TodoItem } from './tool-inputs';

/** TodoWriteProvider — session级待办清单存储 */
export interface TodoWriteProvider {
  /** 获取当前待办清单 */
  getTodos(): readonly TodoItem[];
  /** 设置完整待办清单（替换） */
  setTodos(todos: readonly TodoItem[]): void;
  /** 清空所有待办 */
  clearTodos(): void;
}
