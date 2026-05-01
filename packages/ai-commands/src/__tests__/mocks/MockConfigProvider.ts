/** MockConfigProvider — 测试用的配置管理模拟 */

import type { ConfigProvider, ConfigSection, ConfigValue } from '../../types/providers';

const DEFAULT_SECTIONS: ConfigSection[] = [
  { key: 'permissions.mode', value: 'default', source: 'default', description: 'Permission mode' },
  { key: 'permissions.allowedTools', value: ['glob', 'grep', 'read'], source: 'user' },
  { key: 'model', value: 'claude-sonnet-4-6', source: 'project' }
];

export class MockConfigProvider implements ConfigProvider {
  private _sections: ConfigSection[] = DEFAULT_SECTIONS;
  private _setValues: Record<string, unknown> = {};

  /** 设置自定义配置节 */
  setSections(sections: ConfigSection[]): this {
    this._sections = sections;
    return this;
  }

  async list(): Promise<ConfigSection[]> {
    return this._sections;
  }

  async get(key: string): Promise<ConfigValue | undefined> {
    // 先查 set 值，再查默认值
    if (this._setValues[key] !== undefined) {
      return { key, value: this._setValues[key], source: 'user' };
    }
    const section = this._sections.find(s => s.key === key);
    if (section) {
      return { key: section.key, value: section.value, source: section.source };
    }
    return undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    this._setValues[key] = value;
  }

  async reset(key: string): Promise<void> {
    delete this._setValues[key];
  }

  async getAll(): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    for (const section of this._sections) {
      result[section.key] = section.value;
    }
    for (const [key, value] of Object.entries(this._setValues)) {
      result[key] = value;
    }
    return result;
  }
}
