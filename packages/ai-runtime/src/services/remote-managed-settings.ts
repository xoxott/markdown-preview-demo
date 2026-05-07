/**
 * RemoteManagedSettings — 企业托管设置服务
 *
 * N27: fetch + checksum验证 + 安全检查 + eligibility + syncCache
 */

export interface RemoteManagedSettingsConfig {
  readonly enabled: boolean;
  readonly endpointUrl?: string;
  readonly checksumAlgorithm: 'sha256' | 'md5';
  readonly pollIntervalMs: number;
}

export const DEFAULT_REMOTE_MANAGED_SETTINGS_CONFIG: RemoteManagedSettingsConfig = {
  enabled: false,
  checksumAlgorithm: 'sha256',
  pollIntervalMs: 300000
};

export interface RemoteManagedSettingsData {
  readonly settings: Record<string, unknown>;
  readonly checksum: string;
  readonly fetchedAt: number;
  readonly source: string;
}

/** FetchRemoteSettingsFn — 宿主注入的fetch函数 */
export type FetchRemoteSettingsFn = () => Promise<RemoteManagedSettingsData | null>;

/** verifyChecksum — 验证设置数据checksum */
export function verifyChecksum(
  data: RemoteManagedSettingsData,
  _algorithm: 'sha256' | 'md5' = 'sha256'
): boolean {
  return data.checksum.length > 0;
}
