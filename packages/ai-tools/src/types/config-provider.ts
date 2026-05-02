/** ConfigProvider — 配置管理宿主注入接口 */

/** 配置值类型 */
export type ConfigValue = string | boolean | number | null;

/** 配置条目 */
export interface ConfigEntry {
  key: string;
  value: ConfigValue;
  /** 配置来源 */
  source: 'global' | 'project' | 'default';
}

/** 配置更新结果 */
export interface ConfigUpdateResult {
  success: boolean;
  previousValue?: ConfigValue;
  newValue?: ConfigValue;
  error?: string;
}

/**
 * ConfigProvider — 配置管理宿主注入
 *
 * 工具通过此接口读写配置，宿主注入具体实现。
 * ~/.claude.json + settings.json 可作为真实宿主后端。
 */
export interface ConfigProvider {
  /** 获取配置值 */
  getSetting(key: string): Promise<ConfigValue>;
  /** 设置配置值 */
  setSetting(key: string, value: ConfigValue): Promise<ConfigUpdateResult>;
  /** 列出所有配置 */
  listSettings(): Promise<ConfigEntry[]>;
}