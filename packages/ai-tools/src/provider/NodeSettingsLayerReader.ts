/**
 * NodeSettingsLayerReader — Node.js 平台的 Settings 文件读取实现
 *
 * 实现 SettingsLayerReader 接口，使用 fs.readFile + JSON.parse + SettingsSchema.safeParse。 6层路径映射逻辑参考
 * Claude Code 的 getSettingsFilePath。
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { SettingLayer, SettingSource, SettingsLayerReader } from '@suga/ai-tool-core';
import { SettingsSchema } from '@suga/ai-tool-core';

/** NodeSettingsLayerReader 配置 */
export interface NodeSettingsLayerReaderConfig {
  /** 用户主目录（默认 os.homedir()） */
  readonly userHomeDir?: string;
  /** 项目目录（默认 process.cwd()） */
  readonly projectDir?: string;
  /** CLI --settings 路径 */
  readonly flagPath?: string;
  /** 企业策略目录 */
  readonly policyDir?: string;
}

/** NodeSettingsLayerReader — 6层路径映射 + fs.readFile 实现 */
export class NodeSettingsLayerReader implements SettingsLayerReader {
  private readonly userHomeDir: string;
  private readonly projectDir: string;
  private readonly flagPath?: string;
  private readonly policyDir?: string;

  constructor(config: NodeSettingsLayerReaderConfig = {}) {
    this.userHomeDir = config.userHomeDir ?? homedir();
    this.projectDir = config.projectDir ?? process.cwd();
    this.flagPath = config.flagPath;
    this.policyDir = config.policyDir;
  }

  /** 读取指定层的配置文件 */
  async readLayer(layer: SettingLayer): Promise<SettingSource | null> {
    const path = this.getLayerPath(layer);
    if (!path) return null; // plugin 层不支持

    try {
      if (!existsSync(path)) return null;

      const content = readFileSync(path, 'utf8');
      if (!content.trim()) return null;

      const parsed = JSON.parse(content);
      const validated = SettingsSchema.safeParse(parsed);
      const timestamp = statSync(path).mtimeMs;

      return {
        metadata: {
          layer,
          path,
          timestamp,
          exists: true
        },
        content: validated.success ? validated.data : parsed
      };
    } catch {
      // ENOENT / JSON.parse error / Zod error → null
      return null;
    }
  }

  /** 获取层对应的文件路径 */
  getLayerPath(layer: SettingLayer): string | null {
    switch (layer) {
      case 'user':
        return join(this.userHomeDir, '.claude', 'settings.json');
      case 'project':
        return join(this.projectDir, '.claude', 'settings.json');
      case 'local':
        return join(this.projectDir, '.claude', 'settings.local.json');
      case 'flag':
        return this.flagPath ?? null;
      case 'policy':
        return this.policyDir ? join(this.policyDir, 'managed-settings.json') : null;
      case 'plugin':
        return null; // plugin 层由宿主直接提供
      default:
        return null;
    }
  }
}
