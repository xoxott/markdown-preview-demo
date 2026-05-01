/** Settings 单源描述与依赖注入（Setting Source & Reader） 配置元数据+宿主注入接口 */

import type { SettingLayer } from './settings-layer';

/**
 * 单源配置元数据 — 描述一个 settings 文件的基本信息
 *
 * @example
 *   {
 *     "layer": "project",
 *     "path": "/project/.claude/settings.json",
 *     "timestamp": 1714560000,
 *     "exists": true
 *   }
 */
export interface SettingSourceMetadata {
  /** 合并层标识 */
  readonly layer: SettingLayer;
  /** 文件路径 */
  readonly path: string;
  /** 文件修改时间（可选，用于缓存判断） */
  readonly timestamp?: number;
  /** 文件是否存在 */
  readonly exists: boolean;
}

/**
 * 单源配置内容 — 一个 settings 文件的完整数据
 *
 * 参考 Claude Code 的 per-source 数据结构: metadata 描述来源信息，content 是解析后的 JSON 对象。
 *
 * @example
 *   {
 *     "metadata": { "layer": "project", "path": ".claude/settings.json", "exists": true },
 *     "content": { "permissions": { "allow": ["Read"] } }
 *   }
 */
export interface SettingSource<T = Record<string, unknown>> {
  /** 配置元数据 */
  readonly metadata: SettingSourceMetadata;
  /** 解析后的配置内容 */
  readonly content: T;
}

/**
 * 文件读取依赖注入接口 — 宿主注入文件系统读取能力
 *
 * 参考 Claude Code 的 getSettingsForSource(): ai-tool-core 不实现文件系统读取，仅定义接口。
 * 宿主环境（CLI、IDE）实现此接口提供实际文件读取能力。
 *
 * 设计意图:
 *
 * - 平台无关: ai-tool-core 不依赖 fs/chokidar 等平台模块
 * - 可测试: 宿主可实现 mock reader 用于单元测试
 * - 可扩展: 宿主可添加 MDM、plist 等平台特有读取逻辑
 *
 * @example
 *   // CLI 宿主实现
 *   const reader: SettingsLayerReader = {
 *     async readLayer(layer) {
 *       const path = getSettingsFilePath(layer);
 *       const content = JSON.parse(fs.readFileSync(path, 'utf8'));
 *       return { metadata: { layer, path, exists: true }, content };
 *     }
 *   };
 */
export interface SettingsLayerReader {
  /**
   * 读取指定层的配置文件
   *
   * @param layer 合并层标识
   * @returns 配置内容，文件不存在时返回 null
   */
  readLayer(layer: SettingLayer): Promise<SettingSource | null>;
}
