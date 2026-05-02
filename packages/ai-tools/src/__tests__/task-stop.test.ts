/** @suga/ai-tools — TaskStopTool测试 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { TaskStopInput } from '../types/tool-inputs';
import { InMemoryTaskStoreProvider } from '../provider/InMemoryTaskStoreProvider';
import { taskStopTool } from '../tools/task-stop';

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

describe('TaskStopTool', () => {
  it('stop(存在任务) → 成功停止', async () => {
    const provider = new InMemoryTaskStoreProvider();
    const task = await provider.createTask({ subject: 'Test', description: 'desc' });
    const result = await taskStopTool.call(
      { taskId: task.id } as TaskStopInput,
      createContext(provider)
    );
    expect(result.data.success).toBe(true);
    expect(result.data.taskId).toBe(task.id);
  });

  it('stop(不存在任务) → 返回失败', async () => {
    const provider = new InMemoryTaskStoreProvider();
    const result = await taskStopTool.call(
      { taskId: 'nonexistent' } as TaskStopInput,
      createContext(provider)
    );
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('not found');
  });

  it('stop(无provider) → 返回失败', async () => {
    const result = await taskStopTool.call(
      { taskId: 'task1' } as TaskStopInput,
      {
        abortController: new AbortController(),
        tools: {} as ToolRegistry,
        sessionId: 'test',
        fsProvider: {} as any
      } as ExtendedToolUseContext
    );
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('not available');
  });

  it('stop → 将任务标记为completed', async () => {
    const provider = new InMemoryTaskStoreProvider();
    const task = await provider.createTask({ subject: 'Running', description: 'desc' });
    // 模拟in_progress状态
    await provider.updateTask(task.id, { status: 'in_progress' });

    await taskStopTool.call({ taskId: task.id } as TaskStopInput, createContext(provider));

    const updated = await provider.getTask(task.id);
    expect(updated?.status).toBe('completed');
  });

  it('validateInput(空taskId) → deny', () => {
    const ctx = createContext();
    const result = taskStopTool.validateInput!({ taskId: '' } as TaskStopInput, ctx);
    expect(result.behavior).toBe('deny');
  });

  it('isReadOnly → false', () => {
    expect(taskStopTool.isReadOnly!({ taskId: 'test' } as TaskStopInput)).toBe(false);
  });

  it('isDestructive → true', () => {
    expect(taskStopTool.isDestructive!({ taskId: 'test' } as TaskStopInput)).toBe(true);
  });

  it('safetyLabel → system', () => {
    expect(taskStopTool.safetyLabel!({ taskId: 'test' } as TaskStopInput)).toBe('system');
  });

  it('checkPermissions → ask', () => {
    const ctx = createContext();
    const result = taskStopTool.checkPermissions!({ taskId: 'test' } as TaskStopInput, ctx);
    expect(result.behavior).toBe('ask');
  });
});
