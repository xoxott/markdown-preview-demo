/** Settings 三层缓存与变更通知（Settings Cache） 合并缓存+单源缓存+文件缓存+回环保护 */

import type { SettingLayer } from './settings-layer';
import type { SettingSource } from './settings-source';
import type { MergedSettings } from './settings-schema';

/**
 * Settings 缓存层类型
 *
 * 三层缓存架构，参考 Claude Code 的 settingsCache.ts:
 *
 * - merged: 所有层合并后的最终结果（最粗粒度）
 * - perSource: 单个 SettingSource 的合并结果（中粒度）
 * - parseFile: 单个文件路径的解析结果（最细粒度）
 */
export type SettingsCacheLayer = 'merged' | 'perSource' | 'parseFile';

/**
 * 三层缓存容器
 *
 * 参考 Claude Code 的三层缓存:
 *
 * - mergedCache: 全量合并结果，变更时全部失效
 * - perSourceCache: 单源结果，按 SettingLayer 索引
 * - parseFileCache: 文件解析结果，按文件路径索引
 *
 * 缓存失效策略:
 *
 * - 全量失效: resetSettingsCache() 清除全部三层
 * - 单层失效: invalidateSettingsSourceCache() 清除单源 + merged + 该层 parseFile
 * - 文件失效: invalidateSettingsParseCache() 清除单文件 + 所属源 + merged
 */
export interface SettingsCache {
  /** 全量合并结果缓存 */
  readonly mergedCache: MergedSettings | null;
  /** 单源结果缓存 (layer → parsed source) */
  readonly perSourceCache: ReadonlyMap<SettingLayer, SettingSource>;
  /** 文件解析缓存 (path → {content, timestamp}) */
  readonly parseFileCache: ReadonlyMap<string, SettingsParseFileEntry>;
}

/** 文件解析缓存条目 */
export interface SettingsParseFileEntry {
  /** 解析后的原始内容 */
  readonly content: unknown;
  /** 文件修改时间 */
  readonly timestamp: number;
}

/**
 * 创建空缓存
 *
 * @returns 空 SettingsCache 容器
 */
export function createEmptySettingsCache(): SettingsCache {
  return {
    mergedCache: null,
    perSourceCache: new Map(),
    parseFileCache: new Map()
  };
}

/**
 * 全量缓存失效 — 清除全部三层缓存
 *
 * 参考 Claude Code 的 resetSettingsCache(): 任何设置文件变更都应触发全量失效， 然后按需重新加载和合并。
 *
 * @param cache 当前缓存
 * @returns 清空后的新缓存
 */
export function invalidateSettingsCache(cache: SettingsCache): SettingsCache {
  return createEmptySettingsCache();
}

/**
 * 单层缓存失效 — 清除指定层的单源缓存 + 合并结果
 *
 * 当某个层的设置文件发生变更时，只需失效该层的单源缓存 和全量合并结果。文件解析缓存保留（除非文件本身被修改）。
 *
 * @param cache 当前缓存
 * @param layer 需要失效的层
 * @returns 失效后的新缓存
 */
export function invalidateSettingsSourceCache(
  cache: SettingsCache,
  layer: SettingLayer
): SettingsCache {
  const newPerSource = new Map(cache.perSourceCache);
  newPerSource.delete(layer);

  return {
    mergedCache: null, // 单层变更需重新合并
    perSourceCache: newPerSource,
    parseFileCache: cache.parseFileCache // 文件解析缓存保留
  };
}

/**
 * 文件解析缓存失效 — 清除指定文件的解析缓存
 *
 * @param cache 当前缓存
 * @param path 文件路径
 * @returns 失效后的新缓存
 */
export function invalidateSettingsParseCache(cache: SettingsCache, path: string): SettingsCache {
  const newParseFile = new Map(cache.parseFileCache);
  newParseFile.delete(path);

  return {
    mergedCache: null, // 文件变更需重新合并
    perSourceCache: cache.perSourceCache, // 单源缓存保留
    parseFileCache: newParseFile
  };
}

/**
 * 内部写入回环保护 — 检测是否在保护窗口内
 *
 * 参考 Claude Code 的 internalWrites 保护: 当宿主主动写入设置文件时（updateSettingsForSource），
 * 文件监控不应立即触发重读，否则会形成写入→监控→重读→写入的死循环。
 *
 * 保护机制: 写入时标记时间戳，5 秒内的文件变更视为自身写入， 不触发重读和缓存失效。
 *
 * @param lastWriteTimestamp 最后内部写入时间（ms）
 * @param now 当前时间（ms，默认 Date.now()）
 * @param protectionWindowMs 保护窗口（ms，默认 5000）
 * @returns true = 在保护窗口内（应跳过重读），false = 可安全重读
 */
export function isInternalWriteProtection(
  lastWriteTimestamp: number,
  now: number = Date.now(),
  protectionWindowMs: number = 5000
): boolean {
  return now - lastWriteTimestamp < protectionWindowMs;
}

/**
 * 文件变更通知接口 — 宿主注入文件监控能力
 *
 * 参考 Claude Code 的 chokidar + settingsChanged 事件: 宿主环境（CLI、IDE）实现此接口提供文件变更通知。 变更触发后: 清除缓存 → 重新加载 →
 * 推送到 Store/Context。
 *
 * 此接口仅定义订阅能力，不定义具体监控机制。 宿主可使用 chokidar（Node.js）、FileSystemWatcher（IDE）等。
 */
export interface SettingsChangeListener {
  /**
   * 订阅设置文件变更通知
   *
   * @param listener 变更回调函数
   * @returns 取消订阅函数
   */
  subscribe(listener: () => void): () => void;
}
