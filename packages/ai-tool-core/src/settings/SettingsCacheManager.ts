/**
 * SettingsCacheManager — 缓存读写编排
 *
 * 封装 loadSettingsFromDisk + 缓存生命周期管理。 提供 loadFromDisk / invalidateAndReload / invalidateFile /
 * getMerged 等方法。
 */

import type { SettingLayer } from '../types/settings-layer';
import type { MergedSettings } from '../types/settings-schema';
import type { SettingsCache } from '../types/settings-cache';
import {
  createEmptySettingsCache,
  invalidateSettingsCache,
  invalidateSettingsParseCache,
  invalidateSettingsSourceCache
} from '../types/settings-cache';
import { buildPermissionContextFromSettings } from '../types/settings-bridge';
import type { ToolPermissionContext } from '../types/permission-context';
import { DEFAULT_TOOL_PERMISSION_CONTEXT } from '../types/permission-context';
import {
  type LoadSettingsFromDiskOptions,
  type LoadSettingsFromDiskResult,
  loadSettingsFromDisk
} from './SettingsLoader';

/**
 * SettingsCacheManager — 缓存编排器
 *
 * 管理 Settings 的加载、缓存失效和权限桥接。 调用 loadFromDisk 时自动桥接到 buildPermissionContextFromSettings。
 */
export class SettingsCacheManager {
  private cache: SettingsCache;
  private lastResult: LoadSettingsFromDiskResult | null = null;
  private readonly loadOptions: LoadSettingsFromDiskOptions;

  constructor(loadOptions: LoadSettingsFromDiskOptions) {
    this.loadOptions = loadOptions;
    this.cache = createEmptySettingsCache();
  }

  /** 从磁盘加载配置 → 更新缓存 */
  async loadFromDisk(): Promise<LoadSettingsFromDiskResult> {
    this.lastResult = await loadSettingsFromDisk({
      ...this.loadOptions,
      cache: this.cache
    });
    this.cache = this.lastResult.cache;
    return this.lastResult;
  }

  /** 失效指定层 + 重新加载 */
  async invalidateAndReload(layer?: SettingLayer): Promise<LoadSettingsFromDiskResult> {
    if (layer) {
      this.cache = invalidateSettingsSourceCache(this.cache, layer);
    } else {
      this.cache = invalidateSettingsCache(this.cache);
    }
    return this.loadFromDisk();
  }

  /** 失效文件解析缓存 */
  invalidateFile(path: string): void {
    this.cache = invalidateSettingsParseCache(this.cache, path);
  }

  /** 获取缓存合并结果 */
  getMerged(): MergedSettings | null {
    return this.cache.mergedCache;
  }

  /** 获取内部缓存 */
  getCache(): SettingsCache {
    return this.cache;
  }

  /** 获取有效源层列表 */
  getSourceLayers(): readonly SettingLayer[] {
    return this.lastResult?.sourceLayers ?? [];
  }

  /** 桥接到权限上下文 — 合并配置 → ToolPermissionContext */
  buildPermissionContext(
    baseCtx: ToolPermissionContext = DEFAULT_TOOL_PERMISSION_CONTEXT
  ): ToolPermissionContext {
    if (!this.lastResult) {
      return baseCtx;
    }
    return buildPermissionContextFromSettings(
      this.lastResult.merged,
      this.lastResult.sourceLayers,
      baseCtx
    );
  }
}
