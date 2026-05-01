/** Settings Enterprise 接口预留类型检查测试 */

import { describe, expect, it } from 'vitest';
import type {
  DropInSettingsReader,
  ManagedSettingsPath,
  PlistSettingsReader,
  RemoteSettingsReader
} from '../types/settings-dropin';
import type { SettingSource } from '../types/settings-source';

describe('DropInSettingsReader 接口', () => {
  it('接口应可被宿主实现', () => {
    const reader: DropInSettingsReader = {
      readDropInDirectory: async (_dirPath: string): Promise<SettingSource[]> => []
    };
    expect(reader.readDropInDirectory).toBeInstanceOf(Function);
  });
});

describe('ManagedSettingsPath 接口', () => {
  it('接口应可被宿主实现', () => {
    const path: ManagedSettingsPath = {
      getManagedPath: () => '/etc/claude-code'
    };
    expect(path.getManagedPath()).toBe('/etc/claude-code');
  });
});

describe('PlistSettingsReader 接口', () => {
  it('接口应可被宿主实现', () => {
    const reader: PlistSettingsReader = {
      readPlist: async () => null
    };
    expect(reader.readPlist).toBeInstanceOf(Function);
  });
});

describe('RemoteSettingsReader 接口', () => {
  it('接口应可被宿主实现', () => {
    const reader: RemoteSettingsReader = {
      readRemote: async () => null
    };
    expect(reader.readRemote).toBeInstanceOf(Function);
  });
});
