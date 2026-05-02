/** InMemoryConfigProvider — 内存配置实现（测试+轻量宿主） */

import type {
  ConfigEntry,
  ConfigProvider,
  ConfigUpdateResult,
  ConfigValue
} from '../types/config-provider';

export class InMemoryConfigProvider implements ConfigProvider {
  private settings = new Map<string, ConfigValue>();

  setSettingDirect(key: string, value: ConfigValue): void {
    this.settings.set(key, value);
  }

  async getSetting(key: string): Promise<ConfigValue> {
    return this.settings.get(key) ?? null;
  }

  async setSetting(key: string, value: ConfigValue): Promise<ConfigUpdateResult> {
    const previousValue = this.settings.get(key) ?? null;
    this.settings.set(key, value);
    return {
      success: true,
      previousValue,
      newValue: value
    };
  }

  async listSettings(): Promise<ConfigEntry[]> {
    return Array.from(this.settings.entries()).map(([key, value]) => ({
      key,
      value,
      source: 'project' as const
    }));
  }

  reset(): void {
    this.settings.clear();
  }
}
