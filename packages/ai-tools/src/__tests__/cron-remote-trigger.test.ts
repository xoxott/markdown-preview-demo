/** P94-P95 测试 — Cron 三件套 + RemoteTrigger 工具 */

import { describe, expect, it } from 'vitest';
import { InMemoryCronProvider } from '../provider/InMemoryCronProvider';
import { InMemoryRemoteTriggerProvider } from '../provider/InMemoryRemoteTriggerProvider';
import { cronCreateTool } from '../tools/cron-create';
import { cronDeleteTool } from '../tools/cron-delete';
import { cronListTool } from '../tools/cron-list';
import { remoteTriggerTool } from '../tools/remote-trigger';
import type { ExtendedToolUseContext } from '../context-merge';

/** 创建基础上下文（含 Provider） */
function createContext(providers: Partial<ExtendedToolUseContext> = {}): ExtendedToolUseContext {
  return {
    fsProvider: {} as any,
    ...providers
  } as ExtendedToolUseContext;
}

// ============================================================
// InMemoryCronProvider 测试
// ============================================================

describe('InMemoryCronProvider', () => {
  it('createCron — 创建循环任务', async () => {
    const provider = new InMemoryCronProvider();
    const result = await provider.createCron('*/5 * * * *', 'check deploy', true);

    expect(result.id).toMatch(/^cron_/);
    expect(result.cron).toBe('*/5 * * * *');
    expect(result.recurring).toBe(true);
    expect(provider.size).toBe(1);
  });

  it('createCron — 创建一次性任务 (recurring=false)', async () => {
    const provider = new InMemoryCronProvider();
    const result = await provider.createCron('0 9 5 5 *', 'remind deploy', false);

    expect(result.recurring).toBe(false);
  });

  it('createCron — durable=true', async () => {
    const provider = new InMemoryCronProvider();
    const result = await provider.createCron('0 9 * * 1-5', 'morning check', true, true);

    expect(result.recurring).toBe(true);
  });

  it('deleteCron — 删除成功', async () => {
    const provider = new InMemoryCronProvider();
    const created = await provider.createCron('*/5 * * * *', 'test', true);

    const deleted = await provider.deleteCron(created.id);
    expect(deleted.deleted).toBe(true);
    expect(provider.size).toBe(0);
  });

  it('deleteCron — ID 不存在', async () => {
    const provider = new InMemoryCronProvider();
    const deleted = await provider.deleteCron('nonexistent');
    expect(deleted.deleted).toBe(false);
  });

  it('listCrons — 列出所有任务', async () => {
    const provider = new InMemoryCronProvider();
    await provider.createCron('*/5 * * * *', 'task1', true);
    await provider.createCron('0 9 * * 1-5', 'task2', true);

    const entries = await provider.listCrons();
    expect(entries).toHaveLength(2);
    expect(entries[0].cron).toBe('*/5 * * * *');
    expect(entries[1].cron).toBe('0 9 * * 1-5');
  });

  it('listCrons — 空列表', async () => {
    const provider = new InMemoryCronProvider();
    const entries = await provider.listCrons();
    expect(entries).toHaveLength(0);
  });

  it('reset — 清空所有条目', async () => {
    const provider = new InMemoryCronProvider();
    await provider.createCron('*/5 * * * *', 'test', true);
    await provider.createCron('0 9 * * *', 'test2', true);

    provider.reset();
    expect(provider.size).toBe(0);
  });
});

// ============================================================
// CronCreateTool 测试
// ============================================================

describe('CronCreateTool', () => {
  it('创建定时任务', async () => {
    const provider = new InMemoryCronProvider();
    const context = createContext({ cronProvider: provider });

    const result = await cronCreateTool.call(
      { cron: '*/5 * * * *', prompt: 'check deploy', recurring: true, durable: false },
      context
    );

    expect(result.data.id).toMatch(/^cron_/);
    expect(result.data.cron).toBe('*/5 * * * *');
    expect(result.data.recurring).toBe(true);
  });

  it('一次性任务 (recurring=false)', async () => {
    const provider = new InMemoryCronProvider();
    const context = createContext({ cronProvider: provider });

    const result = await cronCreateTool.call(
      { cron: '30 14 5 5 *', prompt: 'remind me', recurring: false, durable: false },
      context
    );

    expect(result.data.recurring).toBe(false);
  });

  it('durable=true 持久化', async () => {
    const provider = new InMemoryCronProvider();
    const context = createContext({ cronProvider: provider });

    const result = await cronCreateTool.call(
      { cron: '0 9 * * 1-5', prompt: 'morning check', recurring: true, durable: true },
      context
    );

    expect(result.data.recurring).toBe(true);
  });

  it('无 Provider → 返回空 ID', async () => {
    const context = createContext();

    const result = await cronCreateTool.call(
      { cron: '*/5 * * * *', prompt: 'test', recurring: true, durable: false },
      context
    );

    expect(result.data.id).toBe('');
  });

  it('validateInput — 缺少 cron', () => {
    const ctx = createContext();
    const result = cronCreateTool.validateInput(
      {
        cron: '',
        prompt: 'test',
        recurring: true,
        durable: false
      },
      ctx as any
    );
    expect(result.behavior).toBe('deny');
  });

  it('safetyLabel = system', () => {
    expect(
      cronCreateTool.safetyLabel({
        cron: '*/5 * * * *',
        prompt: 'test',
        recurring: true,
        durable: false
      })
    ).toBe('system');
  });
});

// ============================================================
// CronDeleteTool 测试
// ============================================================

describe('CronDeleteTool', () => {
  it('删除已存在的任务', async () => {
    const provider = new InMemoryCronProvider();
    const created = await provider.createCron('*/5 * * * *', 'test', true);
    const context = createContext({ cronProvider: provider });

    const result = await cronDeleteTool.call({ id: created.id }, context);

    expect(result.data.deleted).toBe(true);
  });

  it('删除不存在的 ID', async () => {
    const provider = new InMemoryCronProvider();
    const context = createContext({ cronProvider: provider });

    const result = await cronDeleteTool.call({ id: 'nonexistent' }, context);

    expect(result.data.deleted).toBe(false);
  });

  it('无 Provider → deleted=false', async () => {
    const context = createContext();

    const result = await cronDeleteTool.call({ id: 'some-id' }, context);

    expect(result.data.deleted).toBe(false);
  });

  it('isDestructive = true', () => {
    expect(cronDeleteTool.isDestructive({ id: 'test' })).toBe(true);
  });
});

// ============================================================
// CronListTool 测试
// ============================================================

describe('CronListTool', () => {
  it('列出所有任务', async () => {
    const provider = new InMemoryCronProvider();
    await provider.createCron('*/5 * * * *', 'task1', true);
    await provider.createCron('0 9 * * *', 'task2', true);
    const context = createContext({ cronProvider: provider });

    const result = await cronListTool.call({}, context);

    expect(result.data).toHaveLength(2);
  });

  it('空列表', async () => {
    const provider = new InMemoryCronProvider();
    const context = createContext({ cronProvider: provider });

    const result = await cronListTool.call({}, context);

    expect(result.data).toHaveLength(0);
  });

  it('无 Provider → 返回空数组', async () => {
    const context = createContext();

    const result = await cronListTool.call({}, context);

    expect(result.data).toHaveLength(0);
  });

  it('isReadOnly = true', () => {
    expect(cronListTool.isReadOnly({})).toBe(true);
  });
});

// ============================================================
// InMemoryRemoteTriggerProvider 测试
// ============================================================

describe('InMemoryRemoteTriggerProvider', () => {
  it('action=list — 列出所有 trigger', async () => {
    const provider = new InMemoryRemoteTriggerProvider();
    await provider.trigger('create', undefined, {
      name: 't1',
      cron: '*/5 * * * *',
      prompt: 'check'
    });

    const result = await provider.trigger('list');
    expect(result.action).toBe('list');
    expect((result.data as any)?.triggers).toHaveLength(1);
  });

  it('action=create — 创建 trigger', async () => {
    const provider = new InMemoryRemoteTriggerProvider();

    const result = await provider.trigger('create', undefined, {
      name: 'my-trigger',
      cron: '0 9 * * *',
      prompt: 'morning check'
    });

    expect(result.action).toBe('create');
    expect(result.id).toMatch(/^trigger_/);
    expect((result.data as any)?.trigger.name).toBe('my-trigger');
    expect(provider.size).toBe(1);
  });

  it('action=get — 获取单个 trigger', async () => {
    const provider = new InMemoryRemoteTriggerProvider();
    const created = await provider.trigger('create', undefined, { name: 't1' });

    const result = await provider.trigger('get', created.id);
    expect(result.action).toBe('get');
    expect((result.data as any)?.trigger.id).toBe(created.id);
  });

  it('action=get — ID 不存在', async () => {
    const provider = new InMemoryRemoteTriggerProvider();

    const result = await provider.trigger('get', 'nonexistent');
    expect(result.data).toBeUndefined();
  });

  it('action=update — 更新 trigger', async () => {
    const provider = new InMemoryRemoteTriggerProvider();
    const created = await provider.trigger('create', undefined, { name: 't1', prompt: 'old' });

    const result = await provider.trigger('update', created.id, { prompt: 'new prompt' });

    expect(result.action).toBe('update');
    expect((result.data as any)?.trigger.prompt).toBe('new prompt');
  });

  it('action=run — 运行 trigger', async () => {
    const provider = new InMemoryRemoteTriggerProvider();
    const created = await provider.trigger('create', undefined, { name: 't1' });

    const result = await provider.trigger('run', created.id);
    expect(result.action).toBe('run');
    expect((result.data as any)?.trigger.id).toBe(created.id);
  });

  it('reset — 清空所有 trigger', async () => {
    const provider = new InMemoryRemoteTriggerProvider();
    await provider.trigger('create', undefined, { name: 't1' });
    await provider.trigger('create', undefined, { name: 't2' });

    provider.reset();
    expect(provider.size).toBe(0);
  });
});

// ============================================================
// RemoteTriggerTool 测试
// ============================================================

describe('RemoteTriggerTool', () => {
  it('action=list — 列出 trigger', async () => {
    const provider = new InMemoryRemoteTriggerProvider();
    await provider.trigger('create', undefined, { name: 't1' });
    const context = createContext({ remoteTriggerProvider: provider });

    const result = await remoteTriggerTool.call({ action: 'list' }, context);

    expect(result.data.action).toBe('list');
  });

  it('action=create — 创建 trigger', async () => {
    const provider = new InMemoryRemoteTriggerProvider();
    const context = createContext({ remoteTriggerProvider: provider });

    const result = await remoteTriggerTool.call(
      { action: 'create', body: { name: 'my-trigger', cron: '0 9 * * *', prompt: 'check' } },
      context
    );

    expect(result.data.action).toBe('create');
    expect(result.data.id).toMatch(/^trigger_/);
  });

  it('action=get — 获取 trigger (需要 trigger_id)', async () => {
    const provider = new InMemoryRemoteTriggerProvider();
    const created = await provider.trigger('create', undefined, { name: 't1' });
    const context = createContext({ remoteTriggerProvider: provider });

    const result = await remoteTriggerTool.call({ action: 'get', trigger_id: created.id }, context);

    expect(result.data.action).toBe('get');
  });

  it('validateInput — action=get 无 trigger_id → deny', () => {
    const ctx = createContext();
    const result = remoteTriggerTool.validateInput({ action: 'get' }, ctx as any);
    expect(result.behavior).toBe('deny');
  });

  it('validateInput — action=run 无 trigger_id → deny', () => {
    const ctx = createContext();
    const result = remoteTriggerTool.validateInput({ action: 'run' }, ctx as any);
    expect(result.behavior).toBe('deny');
  });

  it('validateInput — action=list 无 trigger_id → allow', () => {
    const ctx = createContext();
    const result = remoteTriggerTool.validateInput({ action: 'list' }, ctx as any);
    expect(result.behavior).toBe('allow');
  });

  it('isReadOnly — action=list/get → true', () => {
    expect(remoteTriggerTool.isReadOnly({ action: 'list' })).toBe(true);
    expect(remoteTriggerTool.isReadOnly({ action: 'get', trigger_id: 'x' })).toBe(true);
  });

  it('isReadOnly — action=create/update/run → false', () => {
    expect(remoteTriggerTool.isReadOnly({ action: 'create', body: {} })).toBe(false);
    expect(remoteTriggerTool.isReadOnly({ action: 'update', trigger_id: 'x', body: {} })).toBe(
      false
    );
    expect(remoteTriggerTool.isReadOnly({ action: 'run', trigger_id: 'x' })).toBe(false);
  });

  it('无 Provider → 返回空结果', async () => {
    const context = createContext();

    const result = await remoteTriggerTool.call({ action: 'list' }, context);

    expect(result.data.id).toBe('');
    expect(result.data.action).toBe('list');
  });

  it('safetyLabel = system', () => {
    expect(remoteTriggerTool.safetyLabel({ action: 'create' })).toBe('system');
  });
});
