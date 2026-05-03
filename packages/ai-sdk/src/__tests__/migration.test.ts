/** P57/P74 测试 — Migrations 配置迁移系统 */

import { describe, expect, it } from 'vitest';
import {
  InMemoryMigrationStore,
  MigrationRunner,
  OpusLegacyMigration,
  Sonnet45ToSonnet46Migration,
  FennecToOpusMigration,
  Sonnet1mToSonnet45Migration,
  AutoUpdatesMigration,
  BypassPermissionsMigration,
  EnableAllProjectMcpMigration,
  JsonFileMigrationStore
} from '../../src/migration/types';
import type { Migration, SettingsAccessor, JsonFileStoreIO } from '../../src/migration/types';

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

// ============================================================
// P74: 设置格式迁移测试
// ============================================================

/** 测试用 SettingsAccessor — Map 实现 */
class MockSettingsAccessor implements SettingsAccessor {
  private readonly data: Map<string, unknown> = new Map();

  getSetting(key: string): unknown {
    return this.data.get(key);
  }

  setSetting(key: string, value: unknown): void {
    this.data.set(key, value);
  }

  deleteSetting(key: string): void {
    this.data.delete(key);
  }

  /** 辅助: 批量初始化 */
  init(entries: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(entries)) {
      this.data.set(k, v);
    }
  }
}

describe('AutoUpdatesMigration', () => {
  it('有autoUpdates flag → 迁移到settings', () => {
    const accessor = new MockSettingsAccessor();
    accessor.init({ autoUpdates: true });
    const migration = new AutoUpdatesMigration(accessor);
    const result = migration.run();
    expect(result.applied).toBe(true);
    expect(accessor.getSetting('settings.autoUpdates')).toBe(true);
    expect(accessor.getSetting('autoUpdates')).toBeUndefined();
  });

  it('autoUpdates=false → 也迁移', () => {
    const accessor = new MockSettingsAccessor();
    accessor.init({ autoUpdates: false });
    const migration = new AutoUpdatesMigration(accessor);
    const result = migration.run();
    expect(result.applied).toBe(true);
    expect(accessor.getSetting('settings.autoUpdates')).toBe(false);
  });

  it('无autoUpdates → 不迁移', () => {
    const accessor = new MockSettingsAccessor();
    const migration = new AutoUpdatesMigration(accessor);
    const result = migration.run();
    expect(result.applied).toBe(false);
  });

  it('settings.autoUpdates已存在 → 不迁移', () => {
    const accessor = new MockSettingsAccessor();
    accessor.init({ autoUpdates: true, 'settings.autoUpdates': true });
    const migration = new AutoUpdatesMigration(accessor);
    const result = migration.run();
    expect(result.applied).toBe(false);
    // 旧flag保留（不删除）
    expect(accessor.getSetting('autoUpdates')).toBe(true);
  });
});

describe('BypassPermissionsMigration', () => {
  it('有bypassPermissions → 迁移到settings.permissions', () => {
    const accessor = new MockSettingsAccessor();
    accessor.init({ bypassPermissions: true });
    const migration = new BypassPermissionsMigration(accessor);
    const result = migration.run();
    expect(result.applied).toBe(true);
    expect(accessor.getSetting('settings.permissions.bypassPermissions')).toBe(true);
    expect(accessor.getSetting('bypassPermissions')).toBeUndefined();
  });

  it('无bypassPermissions → 不迁移', () => {
    const accessor = new MockSettingsAccessor();
    const migration = new BypassPermissionsMigration(accessor);
    const result = migration.run();
    expect(result.applied).toBe(false);
  });

  it('已存在 → 不迁移', () => {
    const accessor = new MockSettingsAccessor();
    accessor.init({ bypassPermissions: true, 'settings.permissions.bypassPermissions': true });
    const migration = new BypassPermissionsMigration(accessor);
    const result = migration.run();
    expect(result.applied).toBe(false);
  });
});

describe('EnableAllProjectMcpMigration', () => {
  it('有enableAllProjectMcp → 迁移到settings.mcp', () => {
    const accessor = new MockSettingsAccessor();
    accessor.init({ enableAllProjectMcp: true });
    const migration = new EnableAllProjectMcpMigration(accessor);
    const result = migration.run();
    expect(result.applied).toBe(true);
    expect(accessor.getSetting('settings.mcp.enableAllProjectServers')).toBe(true);
    expect(accessor.getSetting('enableAllProjectMcp')).toBeUndefined();
  });

  it('无flag → 不迁移', () => {
    const accessor = new MockSettingsAccessor();
    const migration = new EnableAllProjectMcpMigration(accessor);
    const result = migration.run();
    expect(result.applied).toBe(false);
  });
});

describe('FennecToOpusMigration', () => {
  it('fennec → claude-opus-4-6', () => {
    let model = 'fennec';
    const migration = new FennecToOpusMigration(
      () => model,
      v => { model = v; }
    );
    const result = migration.run();
    expect(result.applied).toBe(true);
    expect(model).toBe('claude-opus-4-6');
  });

  it('claude-fennec-1 → claude-opus-4-6-1 (不匹配, fennec不在中间)', () => {
    let model = 'claude-opus-4-6';
    const migration = new FennecToOpusMigration(
      () => model,
      v => { model = v; }
    );
    const result = migration.run();
    expect(result.applied).toBe(false);
  });

  it('无设置 → 不迁移', () => {
    const migration = new FennecToOpusMigration(
      () => undefined,
      () => {}
    );
    const result = migration.run();
    expect(result.applied).toBe(false);
  });
});

describe('Sonnet1mToSonnet45Migration', () => {
  it('sonnet-1m → sonnet-4-5', () => {
    let model = 'sonnet-1m';
    const migration = new Sonnet1mToSonnet45Migration(
      () => model,
      v => { model = v; }
    );
    const result = migration.run();
    expect(result.applied).toBe(true);
    expect(model).toBe('sonnet-4-5');
  });

  it('claude-sonnet-1m → claude-sonnet-4-5', () => {
    let model = 'claude-sonnet-1m';
    const migration = new Sonnet1mToSonnet45Migration(
      () => model,
      v => { model = v; }
    );
    const result = migration.run();
    expect(result.applied).toBe(true);
    expect(model).toBe('claude-sonnet-4-5');
  });

  it('sonnet-4-6 → 不迁移', () => {
    let model = 'claude-sonnet-4-6';
    const migration = new Sonnet1mToSonnet45Migration(
      () => model,
      v => { model = v; }
    );
    const result = migration.run();
    expect(result.applied).toBe(false);
  });

  it('链式迁移: sonnet-1m → sonnet-4-5 → claude-sonnet-4-6', async () => {
    let model = 'sonnet-1m';
    const store = new InMemoryMigrationStore();

    const runner = new MigrationRunner([
      new Sonnet1mToSonnet45Migration(() => model, v => { model = v; }),
      new Sonnet45ToSonnet46Migration(() => model, v => { model = v; })
    ], store);

    const results = await runner.runAll();
    expect(results[0].applied).toBe(true);
    expect(results[1].applied).toBe(true);
    // sonnet-1m → sonnet-4-5 → sonnet-4-6 (45→46 替换 sonnet-4-5 → sonnet-4-6)
    expect(model).toBe('sonnet-4-6');
  });
});

// ============================================================
// JsonFileMigrationStore 测试
// ============================================================

describe('JsonFileMigrationStore', () => {
  /** 测试用 IO — 内存Map实现 */
  class MockJsonFileIO implements JsonFileStoreIO {
    private readonly files: Map<string, string> = new Map();

    async readFile(path: string): Promise<string | null> {
      return this.files.get(path) ?? null;
    }

    async writeFile(path: string, content: string): Promise<void> {
      this.files.set(path, content);
    }
  }

  it('空文件 → 无记录', async () => {
    const io = new MockJsonFileIO();
    const store = new JsonFileMigrationStore('/migrations.json', io);
    const records = await store.getRecords();
    expect(records).toEqual([]);
  });

  it('保存记录 → 持久化到文件', async () => {
    const io = new MockJsonFileIO();
    const store = new JsonFileMigrationStore('/migrations.json', io);

    await store.saveRecord({ id: 'm-1', executedAt: 1000, success: true, details: 'ok' });

    const content = await io.readFile('/migrations.json');
    expect(content).toContain('m-1');

    const hasRun = await store.hasRun('m-1');
    expect(hasRun).toBe(true);
  });

  it('多次保存 → 累积记录', async () => {
    const io = new MockJsonFileIO();
    const store = new JsonFileMigrationStore('/migrations.json', io);

    await store.saveRecord({ id: 'm-1', executedAt: 1000, success: true });
    await store.saveRecord({ id: 'm-2', executedAt: 2000, success: true });

    expect(await store.hasRun('m-1')).toBe(true);
    expect(await store.hasRun('m-2')).toBe(true);
    expect(await store.hasRun('m-3')).toBe(false);
  });

  it('失败记录 → 不标记为已执行', async () => {
    const io = new MockJsonFileIO();
    const store = new JsonFileMigrationStore('/migrations.json', io);

    await store.saveRecord({ id: 'm-1', executedAt: 1000, success: false });
    expect(await store.hasRun('m-1')).toBe(false);
  });

  it('已有文件 → 正确读取', async () => {
    const io = new MockJsonFileIO();
    await io.writeFile('/migrations.json', JSON.stringify([
      { id: 'existing-1', executedAt: 500, success: true }
    ]));

    const store = new JsonFileMigrationStore('/migrations.json', io);
    expect(await store.hasRun('existing-1')).toBe(true);
  });

  it('损坏JSON → 返回空记录', async () => {
    const io = new MockJsonFileIO();
    await io.writeFile('/migrations.json', 'not valid json');

    const store = new JsonFileMigrationStore('/migrations.json', io);
    const records = await store.getRecords();
    expect(records).toEqual([]);
  });
});
