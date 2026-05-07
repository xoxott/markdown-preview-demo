/** G1 TodoWrite 工具测试 */

import { afterEach, describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { InMemoryTodoWriteProvider, todoWriteTool } from '../index';
import type { ExtendedToolUseContext } from '../context-merge';

function createContext(provider?: InMemoryTodoWriteProvider): ExtendedToolUseContext {
  return {
    fsProvider: {} as any,
    tools: new ToolRegistry(),
    abortController: new AbortController(),
    sessionId: 'test-g1',
    todoWriteProvider: provider
  } as ExtendedToolUseContext;
}

describe('InMemoryTodoWriteProvider', () => {
  let provider: InMemoryTodoWriteProvider;

  beforeEach(() => {
    provider = new InMemoryTodoWriteProvider();
  });
  afterEach(() => {
    provider.clearTodos();
  });

  it('setTodos → getTodos 返回列表', () => {
    provider.setTodos([
      { content: 'Task 1', completed: false, priority: 'high' },
      { content: 'Task 2', completed: true }
    ]);
    const todos = provider.getTodos();
    expect(todos.length).toBe(2);
    expect(todos[0].content).toBe('Task 1');
    expect(todos[1].completed).toBe(true);
  });

  it('clearTodos → 清空', () => {
    provider.setTodos([{ content: 'x' }]);
    provider.clearTodos();
    expect(provider.getTodos().length).toBe(0);
  });

  it('setTodos → 替换模式（非追加）', () => {
    provider.setTodos([{ content: 'A' }]);
    provider.setTodos([{ content: 'B' }, { content: 'C' }]);
    expect(provider.getTodos().length).toBe(2);
    expect(provider.getTodos()[0].content).toBe('B');
  });
});

describe('todoWriteTool', () => {
  let provider: InMemoryTodoWriteProvider;

  beforeEach(() => {
    provider = new InMemoryTodoWriteProvider();
  });
  afterEach(() => {
    provider.clearTodos();
  });

  it('写入待办清单 → updated=true + reminder', async () => {
    const ctx = createContext(provider);
    const result = await todoWriteTool.call(
      {
        todos: [
          { content: 'Implement feature', completed: false, priority: 'high' },
          { content: 'Write tests', completed: false }
        ]
      },
      ctx
    );
    expect(result.data.updated).toBe(true);
    expect(result.data.todos.length).toBe(2);
    expect(result.data.reminder).toContain('high-priority');
    expect(result.newMessages).toBeDefined();
    expect(result.newMessages![0].meta).toBe(true);
  });

  it('全部完成 → 无 high-priority reminder', async () => {
    const ctx = createContext(provider);
    const result = await todoWriteTool.call(
      {
        todos: [
          { content: 'Task A', completed: true },
          { content: 'Task B', completed: true }
        ]
      },
      ctx
    );
    expect(result.data.updated).toBe(true);
    expect(result.data.reminder).toBeUndefined();
    expect(result.newMessages).toBeUndefined();
  });

  it('无 todoWriteProvider → updated=false + error', async () => {
    const ctx = createContext(); // 无 provider
    const result = await todoWriteTool.call({ todos: [{ content: 'Task' }] }, ctx);
    expect(result.data.updated).toBe(false);
    expect(result.error).toContain('No TodoWriteProvider');
  });

  it('空 todos → validateInput 拒绝', () => {
    const result = todoWriteTool.validateInput(
      { todos: [] },
      { abortController: new AbortController(), tools: new ToolRegistry(), sessionId: 'test' }
    );
    expect(result.behavior).toBe('deny');
  });

  it('空 content → validateInput 拒绝', () => {
    const result = todoWriteTool.validateInput(
      { todos: [{ content: '' }] },
      { abortController: new AbortController(), tools: new ToolRegistry(), sessionId: 'test' }
    );
    expect(result.behavior).toBe('deny');
  });

  it('provider 存储 → 后续读取一致', async () => {
    const ctx = createContext(provider);
    await todoWriteTool.call({ todos: [{ content: 'Remember this', completed: false }] }, ctx);
    const stored = provider.getTodos();
    expect(stored.length).toBe(1);
    expect(stored[0].content).toBe('Remember this');
  });
});
