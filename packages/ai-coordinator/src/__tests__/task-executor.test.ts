/** Task执行系统测试 — TaskExecutor + TaskTypeRegistry + 6种TaskType */

import { describe, expect, it } from 'vitest';
import { TaskExecutor } from '../task/TaskExecutor';
import { TaskTypeRegistry } from '../task/TaskTypeRegistry';
import { LocalAgentTask } from '../task/LocalAgentTask';
import { LocalShellTask } from '../task/LocalShellTask';
import { InProcessTeammate } from '../task/InProcessTeammate';
import { LocalWorkflowTask } from '../task/LocalWorkflowTask';
import { RemoteAgentTask } from '../task/RemoteAgentTask';
import { DreamTask } from '../task/DreamTask';
import type { TaskDefinition } from '../types/task';
import { InMemoryMailbox } from '../mailbox/InMemoryMailbox';
import { MockSpawnProvider } from './mocks/MockSpawnProvider';

function makeTask(
  subject: string,
  taskType?: string,
  metadata?: Record<string, unknown>
): TaskDefinition {
  return {
    taskId: `test_task_${Date.now()}`,
    subject,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: { ...(taskType ? { taskType } : {}), ...metadata }
  };
}

describe('TaskTypeRegistry', () => {
  it('注册6种TaskType → getAll返回6', () => {
    const registry = new TaskTypeRegistry();
    registry.register(new LocalAgentTask());
    registry.register(new LocalShellTask());
    registry.register(new InProcessTeammate());
    registry.register(new LocalWorkflowTask());
    registry.register(new RemoteAgentTask());
    registry.register(new DreamTask());
    expect(registry.getAll().length).toBe(6);
  });

  it('重复注册 → 抛出错误', () => {
    const registry = new TaskTypeRegistry();
    registry.register(new LocalAgentTask());
    expect(() => registry.register(new LocalAgentTask())).toThrow('已注册');
  });

  it('查找 → get返回正确类型', () => {
    const registry = new TaskTypeRegistry();
    registry.register(new LocalAgentTask());
    const type = registry.get('local_agent');
    expect(type).not.toBeUndefined();
    expect(type!.identifier).toBe('local_agent');
  });

  it('移除 → get返回undefined', () => {
    const registry = new TaskTypeRegistry();
    registry.register(new LocalAgentTask());
    registry.remove('local_agent');
    expect(registry.get('local_agent')).toBeUndefined();
  });
});

describe('TaskExecutor — execute', () => {
  it('LocalAgentTask → spawnAgent调用成功', async () => {
    const spawnProvider = new MockSpawnProvider();
    const executor = new TaskExecutor(spawnProvider);

    // 注册TaskType
    executor.typeRegistry.register(new LocalAgentTask());

    const task = makeTask('Research the API', 'local_agent');
    const result = await executor.execute(task);

    expect(result.success).toBe(true);
    expect(result.output).toContain('Mock agent output');
    expect(spawnProvider.getSpawnHistory().length).toBe(1);
  });

  it('LocalShellTask → callModel调用成功', async () => {
    const spawnProvider = new MockSpawnProvider();
    const executor = new TaskExecutor(spawnProvider);

    executor.typeRegistry.register(new LocalShellTask());

    const task = makeTask('Run git status', 'local_shell');
    const result = await executor.execute(task);

    expect(result.success).toBe(true);
    expect(spawnProvider.getCallHistory().length).toBe(1);
    expect(spawnProvider.getCallHistory()[0].prompt).toContain('git status');
  });

  it('DreamTask → callModel调用成功', async () => {
    const spawnProvider = new MockSpawnProvider();
    const executor = new TaskExecutor(spawnProvider);

    executor.typeRegistry.register(new DreamTask());

    const task = makeTask('Integrate session memories', 'dream');
    const result = await executor.execute(task);

    expect(result.success).toBe(true);
    expect(spawnProvider.getCallHistory().length).toBe(1);
  });

  it('InProcessTeammate → spawnAgent调用成功', async () => {
    const spawnProvider = new MockSpawnProvider();
    const executor = new TaskExecutor(spawnProvider);

    executor.typeRegistry.register(new InProcessTeammate());

    const task = makeTask('Implement feature X', 'in_process_teammate');
    const result = await executor.execute(task);

    expect(result.success).toBe(true);
    expect(spawnProvider.getSpawnHistory().length).toBe(1);
  });

  it('未注册类型 → 抛出错误', async () => {
    const spawnProvider = new MockSpawnProvider();
    const executor = new TaskExecutor(spawnProvider);

    const task = makeTask('Test', 'unknown_type');
    const result = await executor.execute(task);

    expect(result.success).toBe(false);
    expect(result.error).toContain('未注册');
  });

  it('spawnAgent失败 → 返回失败结果', async () => {
    const spawnProvider = new MockSpawnProvider();
    spawnProvider.setAgentResult({
      output: '',
      toolCalls: 0,
      tokensUsed: { input: 0, output: 0 },
      success: false,
      error: 'Agent failed'
    });

    const executor = new TaskExecutor(spawnProvider);
    executor.typeRegistry.register(new LocalAgentTask());

    const task = makeTask('Research', 'local_agent');
    const result = await executor.execute(task);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Agent failed');
  });
});

describe('TaskExecutor — executeBatch', () => {
  it('并行模式 → 同时执行3个任务', async () => {
    const spawnProvider = new MockSpawnProvider();
    const executor = new TaskExecutor(spawnProvider);

    executor.typeRegistry.register(new LocalAgentTask());
    executor.typeRegistry.register(new DreamTask());

    const tasks = [
      makeTask('Task 1', 'local_agent'),
      makeTask('Task 2', 'dream'),
      makeTask('Task 3', 'local_agent')
    ];

    const results = await executor.executeBatch(tasks, 'parallel');

    expect(results.length).toBe(3);
    expect(results.every(r => r.success)).toBe(true);
  });

  it('串行模式 → 顺序执行', async () => {
    const spawnProvider = new MockSpawnProvider();
    const executor = new TaskExecutor(spawnProvider);

    executor.typeRegistry.register(new LocalAgentTask());

    const tasks = [makeTask('Task 1', 'local_agent'), makeTask('Task 2', 'local_agent')];

    const results = await executor.executeBatch(tasks, 'sequential');

    expect(results.length).toBe(2);
  });
});

describe('RemoteAgentTask — Mailbox', () => {
  it('无Mailbox → 返回错误', async () => {
    const spawnProvider = new MockSpawnProvider();
    const executor = new TaskExecutor(spawnProvider);

    executor.typeRegistry.register(new RemoteAgentTask());

    const task = makeTask('Remote task', 'remote_agent');
    const result = await executor.execute(task);

    expect(result.success).toBe(false);
    expect(result.error).toContain('no Mailbox');
  });

  it('有Mailbox → 发送消息', async () => {
    const spawnProvider = new MockSpawnProvider();
    const mailbox = new InMemoryMailbox();
    const executor = new TaskExecutor(spawnProvider, mailbox);

    executor.typeRegistry.register(new RemoteAgentTask());

    const task = makeTask('Remote task', 'remote_agent', { timeoutMs: 500 });
    // RemoteAgentTask会超时因为没有Worker回复（短timeout确保测试快速完成）
    const result = await executor.execute(task);

    expect(result.error).toContain('timeout');
  });
});
