import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS_SYNC_CONFIG, computeSettingsDelta } from '../services/settings-sync';
import {
  DEFAULT_REMOTE_MANAGED_SETTINGS_CONFIG,
  verifyChecksum
} from '../services/remote-managed-settings';
import type { RemoteManagedSettingsData } from '../services/remote-managed-settings';

describe('computeSettingsDelta', () => {
  it('detects additions', () => {
    const delta = computeSettingsDelta({ a: 1 }, { a: 1, b: 2 });
    expect(delta.added).toHaveLength(1);
    expect(delta.added[0].key).toBe('b');
    expect(delta.removed).toHaveLength(0);
  });

  it('detects modifications', () => {
    const delta = computeSettingsDelta({ a: 1 }, { a: 2 });
    expect(delta.modified).toHaveLength(1);
    expect(delta.modified[0].newValue).toBe(2);
  });

  it('detects removals', () => {
    const delta = computeSettingsDelta({ a: 1, b: 2 }, { a: 1 });
    expect(delta.removed).toContain('b');
  });

  it('empty old → all added', () => {
    const delta = computeSettingsDelta({}, { a: 1, b: 2 });
    expect(delta.added).toHaveLength(2);
  });

  it('empty new → all removed', () => {
    const delta = computeSettingsDelta({ a: 1 }, {});
    expect(delta.removed).toContain('a');
  });
});

describe('verifyChecksum', () => {
  it('non-empty checksum → valid', () => {
    const data: RemoteManagedSettingsData = {
      settings: {},
      checksum: 'abc123',
      fetchedAt: Date.now(),
      source: 'remote'
    };
    expect(verifyChecksum(data)).toBe(true);
  });

  it('empty checksum → invalid', () => {
    const data: RemoteManagedSettingsData = {
      settings: {},
      checksum: '',
      fetchedAt: Date.now(),
      source: 'remote'
    };
    expect(verifyChecksum(data)).toBe(false);
  });
});

describe('DEFAULT configs', () => {
  it('DEFAULT_SETTINGS_SYNC_CONFIG', () => {
    expect(DEFAULT_SETTINGS_SYNC_CONFIG.enabled).toBe(false);
    expect(DEFAULT_SETTINGS_SYNC_CONFIG.syncIntervalMs).toBe(60000);
  });

  it('DEFAULT_REMOTE_MANAGED_SETTINGS_CONFIG', () => {
    expect(DEFAULT_REMOTE_MANAGED_SETTINGS_CONFIG.enabled).toBe(false);
  });
});
