/** P57 测试 — Migrations 配置迁移系统 */

import { describe, expect, it } from 'vitest';
import {
  InMemoryMigrationStore,
  MigrationRunner,
  OpusLegacyMigration,
  Sonnet45ToSonnet46Migration
} from '../../src/migration/types';
import type { Migration } from '../../src/migration/types';

// ============================================================
// MigrationRunner 测试
// ============================================================

describe('MigrationRunner', () => {
  it('空迁移列表 → 无结果', async () => {
    const store = new InMemoryMigrationStore();
    const runner = new MigrationRunner([], store);
    const results = await runner.runAll();
    expect(results).toEqual([]);
  });

  it('单个迁移 → 执行成功', async () => {
    const store = new InMemoryMigrationStore();
    let value = 'old';
    const migration: Migration = {
      id: 'test-1',
      description: 'Test migration',
      run: () => {
        value = 'new';
        return { applied: true, details: 'Changed value' };
      }
    };

    const runner = new MigrationRunner([migration], store);
    const results = await runner.runAll();

    expect(results.length).toBe(1);
    expect(results[0].applied).toBe(true);
    expect(value).toBe('new');

    // 已执行 → store 有记录
    const hasRun = await store.hasRun('test-1');
    expect(hasRun).toBe(true);
  });

  it('已执行迁移 → 跳过（幂等）', async () => {
    const store = new InMemoryMigrationStore();
    await store.saveRecord({ id: 'test-1', executedAt: Date.now(), success: true });

    let callCount = 0;
    const migration: Migration = {
      id: 'test-1',
      description: 'Test migration',
      run: () => {
        callCount++;
        return { applied: true };
      }
    };

    const runner = new MigrationRunner([migration], store);
    const results = await runner.runAll();

    expect(results[0].applied).toBe(false);
    expect(callCount).toBe(0); // 不调用 run()
  });

  it('迁移失败 → 记录失败但不影响后续', async () => {
    const store = new InMemoryMigrationStore();

    const failMigration: Migration = {
      id: 'fail-1',
      description: 'Failing migration',
      run: () => {
        throw new Error('Migration failed');
      }
    };

    let value = 'old';
    const successMigration: Migration = {
      id: 'success-1',
      description: 'Success migration',
      run: () => {
        value = 'new';
        return { applied: true };
      }
    };

    const runner = new MigrationRunner([failMigration, successMigration], store);
    const results = await runner.runAll();

    expect(results[0].applied).toBe(false);
    expect(results[0].details).toBe('Migration failed');
    expect(results[1].applied).toBe(true);
    expect(value).toBe('new');
  });

  it('多个迁移 → 按顺序执行', async () => {
    const store = new InMemoryMigrationStore();
    const order: string[] = [];

    const m1: Migration = {
      id: 'm-1',
      description: 'Migration 1',
      run: () => {
        order.push('1');
        return { applied: true };
      }
    };

    const m2: Migration = {
      id: 'm-2',
      description: 'Migration 2',
      run: () => {
        order.push('2');
        return { applied: true };
      }
    };

    const runner = new MigrationRunner([m1, m2], store);
    await runner.runAll();

    expect(order).toEqual(['1', '2']);
  });
});

// ============================================================
// 模型别名迁移测试
// ============================================================

describe('Sonnet45ToSonnet46Migration', () => {
  it('sonnet-4-5 → sonnet-4-6', () => {
    let model = 'claude-sonnet-4-5';
    const migration = new Sonnet45ToSonnet46Migration(
      () => model,
      v => {
        model = v;
      }
    );

    const result = migration.run();
    expect(result.applied).toBe(true);
    expect(model).toBe('claude-sonnet-4-6');
  });

  it('sonnet-4-5-fast → sonnet-4-6-fast', () => {
    let model = 'claude-sonnet-4-5-fast';
    const migration = new Sonnet45ToSonnet46Migration(
      () => model,
      v => {
        model = v;
      }
    );

    const result = migration.run();
    expect(result.applied).toBe(true);
    expect(model).toBe('claude-sonnet-4-6-fast');
  });

  it('sonnet-4-6 → 不需要迁移', () => {
    let model = 'claude-sonnet-4-6';
    const migration = new Sonnet45ToSonnet46Migration(
      () => model,
      v => {
        model = v;
      }
    );

    const result = migration.run();
    expect(result.applied).toBe(false);
    expect(model).toBe('claude-sonnet-4-6');
  });

  it('无设置 → 不需要迁移', () => {
    const migration = new Sonnet45ToSonnet46Migration(
      () => undefined,
      () => {}
    );

    const result = migration.run();
    expect(result.applied).toBe(false);
  });
});

describe('OpusLegacyMigration', () => {
  it('opus-4-5 → opus-4-6', () => {
    let model = 'claude-opus-4-5';
    const migration = new OpusLegacyMigration(
      () => model,
      v => {
        model = v;
      }
    );

    const result = migration.run();
    expect(result.applied).toBe(true);
    expect(model).toBe('claude-opus-4-6');
  });

  it('opus-4-6 → 不需要迁移', () => {
    let model = 'claude-opus-4-6';
    const migration = new OpusLegacyMigration(
      () => model,
      v => {
        model = v;
      }
    );

    const result = migration.run();
    expect(result.applied).toBe(false);
    expect(model).toBe('claude-opus-4-6');
  });
});

// ============================================================
// InMemoryMigrationStore 测试
// ============================================================

describe('InMemoryMigrationStore', () => {
  it('初始状态 → 无记录', async () => {
    const store = new InMemoryMigrationStore();
    const records = await store.getRecords();
    expect(records).toEqual([]);
  });

  it('保存记录 → 可查询', async () => {
    const store = new InMemoryMigrationStore();
    await store.saveRecord({ id: 'm-1', executedAt: Date.now(), success: true });
    expect(await store.hasRun('m-1')).toBe(true);
    expect(await store.hasRun('m-2')).toBe(false);
  });

  it('失败记录 → 不标记为已执行', async () => {
    const store = new InMemoryMigrationStore();
    await store.saveRecord({ id: 'm-1', executedAt: Date.now(), success: false });
    expect(await store.hasRun('m-1')).toBe(false);
  });

  it('reset → 清空所有记录', async () => {
    const store = new InMemoryMigrationStore();
    await store.saveRecord({ id: 'm-1', executedAt: Date.now(), success: true });
    store.reset();
    expect(await store.hasRun('m-1')).toBe(false);
  });
});
