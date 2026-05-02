/** @suga/ai-tools — TaskOutputTool测试 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { TaskOutputInput } from '../types/tool-inputs';
import { InMemoryTaskStoreProvider } from '../provider/InMemoryTaskStoreProvider';
import { taskOutputTool } from '../tools/task-output';

function createContext(provider?: InMemoryTaskStoreProvider): ExtendedToolUseContext {
  const taskStoreProvider = provider ?? new InMemoryTaskStoreProvider();
  return {
    abortController: new AbortController(),
    tools: {} as ToolRegistry,
    sessionId: 'test',
    fsProvider: {} as any,
    taskStoreProvider
  };
}

describe('TaskOutputTool', () => {
  it('getOutput(存在任务) → 返回输出', async () => {
    const provider = new InMemoryTaskStoreProvider();
    const task = await provider.createTask({ subject: 'Test', description: 'desc' });
    provider.setTaskOutput(task.id, 'Task output content');
    const result = await taskOutputTool.call(
      { taskId: task.id } as TaskOutputInput,
      createContext(provider)
    );
    expect(result.data.taskId).toBe(task.id);
    expect(result.data.output).toBe('Task output content');
  });

  it('getOutput(不存在任务) → 返回not_found', async () => {
    const provider = new InMemoryTaskStoreProvider();
    const result = await taskOutputTool.call(
      { taskId: 'nonexistent' } as TaskOutputInput,
      createContext(provider)
    );
    expect(result.data.status).toBe('not_found');
  });

  it('getOutput(无provider) → 返回not_found', async () => {
    const result = await taskOutputTool.call(
      { taskId: 'task1' } as TaskOutputInput,
      {
        abortController: new AbortController(),
        tools: {} as ToolRegistry,
        sessionId: 'test',
        fsProvider: {} as any
      } as ExtendedToolUseContext
    );
    expect(result.data.status).toBe('not_found');
  });

  it('getOutput(无输出) → output为undefined', async () => {
    const provider = new InMemoryTaskStoreProvider();
    const task = await provider.createTask({ subject: 'Test', description: 'desc' });
    const result = await taskOutputTool.call(
      { taskId: task.id } as TaskOutputInput,
      createContext(provider)
    );
    expect(result.data.output).toBeUndefined();
  });

  it('validateInput(空taskId) → deny', () => {
    const ctx = createContext();
    const result = taskOutputTool.validateInput!({ taskId: '' } as TaskOutputInput, ctx);
    expect(result.behavior).toBe('deny');
  });

  it('isReadOnly → true', () => {
    expect(taskOutputTool.isReadOnly!({ taskId: 'test' } as TaskOutputInput)).toBe(true);
  });

  it('isDestructive → false', () => {
    expect(taskOutputTool.isDestructive!({ taskId: 'test' } as TaskOutputInput)).toBe(false);
  });
});
