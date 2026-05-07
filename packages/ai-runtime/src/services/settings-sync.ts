/**
 * SettingsSync — 用户设置跨环境增量同步
 *
 * N28: 只上传变更的设置条目
 */

export interface SettingsSyncConfig {
  readonly enabled: boolean;
  readonly syncIntervalMs: number;
}

export const DEFAULT_SETTINGS_SYNC_CONFIG: SettingsSyncConfig = {
  enabled: false,
  syncIntervalMs: 60000
};

export interface SettingsSyncDelta {
  readonly added: readonly { key: string; value: unknown }[];
  readonly modified: readonly { key: string; oldValue: unknown; newValue: unknown }[];
  readonly removed: readonly string[];
}

/** computeSettingsDelta — 计算两个设置版本的增量 */
export function computeSettingsDelta(
  oldSettings: Record<string, unknown>,
  newSettings: Record<string, unknown>
): SettingsSyncDelta {
  const added: { key: string; value: unknown }[] = [];
  const modified: { key: string; oldValue: unknown; newValue: unknown }[] = [];
  const removed: string[] = [];

  for (const [key, value] of Object.entries(newSettings)) {
    if (!(key in oldSettings)) {
      added.push({ key, value });
    } else if (oldSettings[key] !== value) {
      modified.push({ key, oldValue: oldSettings[key], newValue: value });
    }
  }

  for (const key of Object.keys(oldSettings)) {
    if (!(key in newSettings)) {
      removed.push(key);
    }
  }

  return { added, modified, removed };
}
