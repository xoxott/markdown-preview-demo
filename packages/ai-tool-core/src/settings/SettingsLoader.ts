/**
 * SettingsLoader — 从磁盘加载并合并配置的编排函数
 *
 * 接收 SettingsLayerReader（宿主注入）作为参数， 逐层读取 → 过滤 → 合并 → 返回完整结果。
 *
 * ai-tool-core 不依赖平台模块（fs/chokidar），编排逻辑通过参数注入。
 */

import type { SettingLayer } from '../types/settings-layer';
import { SETTING_LAYERS } from '../types/settings-layer';
import type { SettingSource, SettingsLayerReader } from '../types/settings-source';
import type { MergedSettings } from '../types/settings-schema';
import { mergeSettingsLayers } from '../types/settings-merge';
import type { SettingsCache } from '../types/settings-cache';
import { createEmptySettingsCache } from '../types/settings-cache';

/** loadSettingsFromDisk 参数 */
export interface LoadSettingsFromDiskOptions {
  /** 依赖注入: 文件读取器（宿主提供 fs 读取能力） */
  readonly reader: SettingsLayerReader;
  /** 要读取的层列表（默认 SETTING_LAYERS 全量） */
  readonly layers?: readonly SettingLayer[];
  /** 初始缓存（可选，用于增量加载） */
  readonly cache?: SettingsCache;
  /** 项目路径（用于 project/local 层的路径计算） */
  readonly projectPath?: string;
}

/** loadSettingsFromDisk 返回 */
export interface LoadSettingsFromDiskResult {
  /** 合并后的最终配置 */
  readonly merged: MergedSettings;
  /** 有效源列表（排除 null 结果） */
  readonly sourceLayers: readonly SettingLayer[];
  /** 更新后的缓存 */
  readonly cache: SettingsCache;
}

/**
 * loadSettingsFromDisk — 从磁盘加载并合并配置
 *
 * 编排流程:
 *
 * 1. 逐层调用 reader.readLayer(layer) → 过滤 null
 * 2. 构建 perSourceCache（缓存每层原始结果）
 * 3. 调用 mergeSettingsLayers(sources) → 获取 MergedSettings
 * 4. 更新 mergedCache
 * 5. 返回 { merged, sourceLayers, cache }
 *
 * @param options 加载选项（含 reader 依赖注入）
 * @returns 合并结果 + 缓存
 */
export async function loadSettingsFromDisk(
  options: LoadSettingsFromDiskOptions
): Promise<LoadSettingsFromDiskResult> {
  const { reader } = options;
  const layers = options.layers ?? SETTING_LAYERS;
  const initialCache = options.cache ?? createEmptySettingsCache();

  // 1. 逐层读取
  const sources: SettingSource[] = [];
  const effectiveLayers: SettingLayer[] = [];
  const newPerSourceCache = new Map(initialCache.perSourceCache);

  for (const layer of layers) {
    const source = await reader.readLayer(layer);
    if (source) {
      sources.push(source);
      effectiveLayers.push(layer);
      newPerSourceCache.set(layer, source);
    }
  }

  // 2. 合并
  const merged = mergeSettingsLayers(sources);

  // 3. 构建新缓存
  const cache: SettingsCache = {
    mergedCache: merged,
    perSourceCache: newPerSourceCache,
    parseFileCache: initialCache.parseFileCache
  };

  return {
    merged,
    sourceLayers: effectiveLayers,
    cache
  };
}
