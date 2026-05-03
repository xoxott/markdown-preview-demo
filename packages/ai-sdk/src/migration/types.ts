/**
 * Migrations — 配置迁移系统
 *
 * 对齐 Claude Code src/migrations/:
 *
 * - MigrationRunner: 编排迁移执行（幂等，记录已执行迁移）
 * - 模型别名迁移: fennec→opus, sonnet1m→sonnet45→sonnet46 等
 * - 设置格式迁移: autoUpdates→settings, bypassPermissions→settings 等
 *
 * 所有迁移都是幂等的配置文件读写，无数据库/schema变更。
 */

// ============================================================
// 类型定义
// ============================================================

/** 迁移定义 */
export interface Migration {
  /** 迁移ID（唯一标识） */
  readonly id: string;
  /** 描述 */
  readonly description: string;
  /** 执行迁移（幂等） */
  run(): MigrationResult;
}

/** 迁移结果 */
export interface MigrationResult {
  /** 是否执行了变更 */
  readonly applied: boolean;
  /** 变更详情 */
  readonly details?: string;
}

/** 迁移记录 */
export interface MigrationRecord {
  /** 迁移ID */
  readonly id: string;
  /** 执行时间 */
  readonly executedAt: number;
  /** 是否成功 */
  readonly success: boolean;
  /** 变更详情 */
  readonly details?: string;
}

/** 迁移存储接口 */
export interface MigrationStore {
  /** 获取已执行的迁移记录 */
  getRecords(): Promise<MigrationRecord[]>;
  /** 保存迁移记录 */
  saveRecord(record: MigrationRecord): Promise<void>;
  /** 检查迁移是否已执行 */
  hasRun(id: string): Promise<boolean>;
}

// ============================================================
// MigrationRunner — 编排迁移执行
// ============================================================

/**
 * MigrationRunner — 配置迁移编排器
 *
 * 按顺序执行迁移列表，记录已执行的迁移ID，确保幂等性。 已执行的迁移不会重复执行。
 */
export class MigrationRunner {
  private readonly migrations: Migration[];
  private readonly store: MigrationStore;

  constructor(migrations: Migration[], store: MigrationStore) {
    this.migrations = migrations;
    this.store = store;
  }

  /**
   * 执行所有待执行的迁移
   *
   * @returns 执行结果列表
   */
  async runAll(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];

    for (const migration of this.migrations) {
      const alreadyRun = await this.store.hasRun(migration.id);
      if (alreadyRun) {
        results.push({ applied: false, details: `Migration ${migration.id} already executed` });
        continue;
      }

      try {
        const result = migration.run();
        await this.store.saveRecord({
          id: migration.id,
          executedAt: Date.now(),
          success: true,
          details: result.details
        });
        results.push(result);
      } catch (error) {
        await this.store.saveRecord({
          id: migration.id,
          executedAt: Date.now(),
          success: false,
          details: (error as Error).message
        });
        results.push({ applied: false, details: (error as Error).message });
      }
    }

    return results;
  }
}

// ============================================================
// 内置迁移 — 设置格式
// ============================================================

/** 设置读写注入接口 — 所有设置迁移共用 */
export interface SettingsAccessor {
  /** 获取指定设置键的值 */
  getSetting(key: string): unknown;
  /** 设置指定设置键的值 */
  setSetting(key: string, value: unknown): void;
  /** 删除指定设置键 */
  deleteSetting(key: string): void;
}

/**
 * AutoUpdatesMigration — autoUpdates flag迁移到settings.autoUpdates
 *
 * Claude Code早期版本将 autoUpdates 作为独立flag，
 * 新版本合并到 settings.json 的 permissions 区域。
 * 迁移策略: 读取旧flag值 → 写入settings → 删除旧flag
 */
export class AutoUpdatesMigration implements Migration {
  readonly id = 'auto-updates-to-settings';
  readonly description = 'Migrate autoUpdates flag to settings.autoUpdates';

  private readonly accessor: SettingsAccessor;

  constructor(accessor: SettingsAccessor) {
    this.accessor = accessor;
  }

  run(): MigrationResult {
    const autoUpdates = this.accessor.getSetting('autoUpdates');
    if (autoUpdates === undefined || autoUpdates === null) {
      return { applied: false, details: 'No autoUpdates flag found' };
    }

    // 已经在settings中存在 → 不迁移
    const existing = this.accessor.getSetting('settings.autoUpdates');
    if (existing !== undefined) {
      return { applied: false, details: 'settings.autoUpdates already exists' };
    }

    // 写入settings + 删除旧flag
    this.accessor.setSetting('settings.autoUpdates', autoUpdates);
    this.accessor.deleteSetting('autoUpdates');

    return { applied: true, details: `Migrated autoUpdates=${autoUpdates} to settings.autoUpdates` };
  }
}

/**
 * BypassPermissionsMigration — bypassPermissions flag迁移到settings
 *
 * bypassPermissions 旧flag → settings.permissions.bypassPermissions
 * 或 settings.permissionMode = 'bypassPermissions'
 */
export class BypassPermissionsMigration implements Migration {
  readonly id = 'bypass-permissions-to-settings';
  readonly description = 'Migrate bypassPermissions flag to settings.permissions';

  private readonly accessor: SettingsAccessor;

  constructor(accessor: SettingsAccessor) {
    this.accessor = accessor;
  }

  run(): MigrationResult {
    const bypass = this.accessor.getSetting('bypassPermissions');
    if (bypass === undefined || bypass === null) {
      return { applied: false, details: 'No bypassPermissions flag found' };
    }

    const existing = this.accessor.getSetting('settings.permissions.bypassPermissions');
    if (existing !== undefined) {
      return { applied: false, details: 'settings.permissions.bypassPermissions already exists' };
    }

    this.accessor.setSetting('settings.permissions.bypassPermissions', bypass);
    this.accessor.deleteSetting('bypassPermissions');

    return {
      applied: true,
      details: `Migrated bypassPermissions=${bypass} to settings.permissions.bypassPermissions`
    };
  }
}

/**
 * EnableAllProjectMcpMigration — enableAllProjectMcp flag迁移到settings
 *
 * enableAllProjectMcp → settings.mcp.enableAllProjectServers
 */
export class EnableAllProjectMcpMigration implements Migration {
  readonly id = 'enable-all-project-mcp-to-settings';
  readonly description = 'Migrate enableAllProjectMcp flag to settings.mcp';

  private readonly accessor: SettingsAccessor;

  constructor(accessor: SettingsAccessor) {
    this.accessor = accessor;
  }

  run(): MigrationResult {
    const enableFlag = this.accessor.getSetting('enableAllProjectMcp');
    if (enableFlag === undefined || enableFlag === null) {
      return { applied: false, details: 'No enableAllProjectMcp flag found' };
    }

    const existing = this.accessor.getSetting('settings.mcp.enableAllProjectServers');
    if (existing !== undefined) {
      return { applied: false, details: 'settings.mcp.enableAllProjectServers already exists' };
    }

    this.accessor.setSetting('settings.mcp.enableAllProjectServers', enableFlag);
    this.accessor.deleteSetting('enableAllProjectMcp');

    return {
      applied: true,
      details: `Migrated enableAllProjectMcp=${enableFlag} to settings.mcp.enableAllProjectServers`
    };
  }
}

// ============================================================
// 内置迁移 — 模型别名(补充)
// ============================================================

/**
 * FennecToOpusMigration — fennec旧代号迁移到opus-4-6
 *
 * Claude Code早期内部代号 "fennec" 对应 opus 模型线。
 * fennec → claude-opus-4-6
 */
export class FennecToOpusMigration implements Migration {
  readonly id = 'fennec-to-opus';
  readonly description = 'Migrate legacy fennec model alias to claude-opus-4-6';

  private readonly getModelSetting: () => string | undefined;
  private readonly setModelSetting: (value: string) => void;

  constructor(getModelSetting: () => string | undefined, setModelSetting: (value: string) => void) {
    this.getModelSetting = getModelSetting;
    this.setModelSetting = setModelSetting;
  }

  run(): MigrationResult {
    const current = this.getModelSetting();
    if (!current) return { applied: false, details: 'No model setting found' };

    if (!current.includes('fennec')) {
      return { applied: false, details: `Model ${current} does not need migration` };
    }

    const migrated = current.replace(/fennec/gi, 'claude-opus-4-6');
    this.setModelSetting(migrated);

    return { applied: true, details: `Migrated model from ${current} to ${migrated}` };
  }
}

/**
 * Sonnet1mToSonnet45Migration — sonnet-1m迁移到claude-sonnet-4-5
 *
 * sonnet-1m → claude-sonnet-4-5 (再由 P57 Sonnet45→46 迁移链完成)
 * 注: 这是一个链式迁移，执行顺序需排在 Sonnet45ToSonnet46 之前。
 */
export class Sonnet1mToSonnet45Migration implements Migration {
  readonly id = 'sonnet-1m-to-sonnet-45';
  readonly description = 'Migrate legacy sonnet-1m alias to claude-sonnet-4-5';

  private readonly getModelSetting: () => string | undefined;
  private readonly setModelSetting: (value: string) => void;

  constructor(getModelSetting: () => string | undefined, setModelSetting: (value: string) => void) {
    this.getModelSetting = getModelSetting;
    this.setModelSetting = setModelSetting;
  }

  run(): MigrationResult {
    const current = this.getModelSetting();
    if (!current) return { applied: false, details: 'No model setting found' };

    if (!current.includes('sonnet-1m')) {
      return { applied: false, details: `Model ${current} does not need migration` };
    }

    const migrated = current.replace(/sonnet-1m/gi, 'sonnet-4-5');
    this.setModelSetting(migrated);

    return { applied: true, details: `Migrated model from ${current} to ${migrated}` };
  }
}

// ============================================================
// 内置迁移 — 模型别名(原有)
// ============================================================

/**
 * 模型别名迁移 — 对齐 Claude Code migrateSonnet45ToSonnet46.ts
 *
 * sonnet-4-5 → sonnet-4-6（当前最新）
 */
export class Sonnet45ToSonnet46Migration implements Migration {
  readonly id = 'sonnet-45-to-sonnet-46';
  readonly description = 'Migrate model alias sonnet-4-5 to sonnet-4-6';

  private readonly getModelSetting: () => string | undefined;
  private readonly setModelSetting: (value: string) => void;

  constructor(getModelSetting: () => string | undefined, setModelSetting: (value: string) => void) {
    this.getModelSetting = getModelSetting;
    this.setModelSetting = setModelSetting;
  }

  run(): MigrationResult {
    const current = this.getModelSetting();
    if (!current) return { applied: false, details: 'No model setting found' };

    // 检查是否需要迁移
    const needsMigration = this.checkAlias(current);
    if (!needsMigration) {
      return { applied: false, details: `Model ${current} does not need migration` };
    }

    // 执行迁移
    const migrated = this.migrate(current);
    this.setModelSetting(migrated);

    return { applied: true, details: `Migrated model from ${current} to ${migrated}` };
  }

  private checkAlias(model: string): boolean {
    return model.includes('sonnet-4-5') || model.includes('sonnet-45');
  }

  private migrate(model: string): string {
    return model.replace('sonnet-4-5', 'sonnet-4-6').replace('sonnet-45', 'sonnet-4-6');
  }
}

/**
 * Opus别名迁移 — 对齐 Claude Code migrateLegacyOpusToCurrent.ts
 *
 * opus-4-5 → opus-4-6
 */
export class OpusLegacyMigration implements Migration {
  readonly id = 'opus-legacy-to-current';
  readonly description = 'Migrate legacy opus aliases to current opus-4-6';

  private readonly getModelSetting: () => string | undefined;
  private readonly setModelSetting: (value: string) => void;

  constructor(getModelSetting: () => string | undefined, setModelSetting: (value: string) => void) {
    this.getModelSetting = getModelSetting;
    this.setModelSetting = setModelSetting;
  }

  run(): MigrationResult {
    const current = this.getModelSetting();
    if (!current) return { applied: false, details: 'No model setting found' };

    if (!current.includes('opus-4-5') && !current.includes('opus-45')) {
      return { applied: false, details: `Model ${current} does not need migration` };
    }

    const migrated = current.replace('opus-4-5', 'opus-4-6').replace('opus-45', 'opus-4-6');

    this.setModelSetting(migrated);
    return { applied: true, details: `Migrated model from ${current} to ${migrated}` };
  }
}

// ============================================================
// InMemoryMigrationStore — 内存存储（测试用）
// ============================================================

export class InMemoryMigrationStore implements MigrationStore {
  private readonly records: MigrationRecord[] = [];

  async getRecords(): Promise<MigrationRecord[]> {
    return [...this.records];
  }

  async saveRecord(record: MigrationRecord): Promise<void> {
    this.records.push(record);
  }

  async hasRun(id: string): Promise<boolean> {
    return this.records.some(r => r.id === id && r.success);
  }

  reset(): void {
    this.records.length = 0;
  }
}

// ============================================================
// JsonFileMigrationStore — JSON文件持久化存储
// ============================================================

/** JSON文件持久化存储的文件读写接口 — 宿主注入 */
export interface JsonFileStoreIO {
  /** 读取JSON文件内容 */
  readFile(path: string): Promise<string | null>;
  /** 写入JSON文件内容 */
  writeFile(path: string, content: string): Promise<void>;
}

/**
 * JsonFileMigrationStore — 基于JSON文件的持久化迁移记录存储
 *
 * 对齐 Claude Code 的文件级持久化:
 * - 迁移记录保存在 ~/.claude/migration_records.json
 * - 避免每次启动都重新执行已完成的迁移
 * - 通过 JsonFileStoreIO 注入解耦文件系统依赖
 *
 * 注: 此类不依赖 Node.js fs 模块，通过 IO 接口可适配任何运行时。
 */
export class JsonFileMigrationStore implements MigrationStore {
  private readonly filePath: string;
  private readonly io: JsonFileStoreIO;
  private cachedRecords: MigrationRecord[] | null = null;

  constructor(filePath: string, io: JsonFileStoreIO) {
    this.filePath = filePath;
    this.io = io;
  }

  async getRecords(): Promise<MigrationRecord[]> {
    if (this.cachedRecords !== null) {
      return [...this.cachedRecords];
    }

    const content = await this.io.readFile(this.filePath);
    if (!content) {
      this.cachedRecords = [];
      return [];
    }

    try {
      this.cachedRecords = JSON.parse(content) as MigrationRecord[];
    } catch {
      this.cachedRecords = [];
    }

    return [...this.cachedRecords!];
  }

  async saveRecord(record: MigrationRecord): Promise<void> {
    const records = await this.getRecords();
    records.push(record);
    this.cachedRecords = records;
    await this.io.writeFile(this.filePath, JSON.stringify(records, null, 2));
  }

  async hasRun(id: string): Promise<boolean> {
    const records = await this.getRecords();
    return records.some(r => r.id === id && r.success);
  }
}
