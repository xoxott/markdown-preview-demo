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
// 内置迁移 — 模型别名
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
