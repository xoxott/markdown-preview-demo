/** InMemoryTodoWriteProvider — 内存实现 */

import type { TodoItem } from '../types/tool-inputs';
import type { TodoWriteProvider } from '../types/todo-provider';

export class InMemoryTodoWriteProvider implements TodoWriteProvider {
  private todos: TodoItem[] = [];

  getTodos(): readonly TodoItem[] {
    return this.todos;
  }

  setTodos(todos: readonly TodoItem[]): void {
    this.todos = [...todos];
  }

  clearTodos(): void {
    this.todos = [];
  }
}
