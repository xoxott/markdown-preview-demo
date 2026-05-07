/**
 * TeamMemorySync — 团队记忆同步服务
 *
 * pull/push/delta同步 + watcher + secretScanner + secretGuard
 */

/** TeamMemorySync 操作类型 */
export type TeamMemorySyncOp = 'pull' | 'push' | 'delta';

/** Secret 扫描结果 */
export interface SecretScanResult {
  readonly hasSecrets: boolean;
  readonly secretPatterns: readonly {
    readonly pattern: string;
    readonly line: number;
    readonly severity: 'critical' | 'high' | 'medium';
  }[];
}

/** TeamMemorySync 配置 */
export interface TeamMemorySyncConfig {
  readonly enabled: boolean;
  readonly syncIntervalMs: number; // 同步间隔（默认60000）
  readonly enableSecretScan: boolean; // 是否扫描敏感信息（默认true）
}

export const DEFAULT_TEAM_MEMORY_SYNC_CONFIG: TeamMemorySyncConfig = {
  enabled: true,
  syncIntervalMs: 60000,
  enableSecretScan: true
};

/** 已知敏感模式（简化版 gitleaks 规则） */
const SECRET_PATTERNS: readonly { pattern: RegExp; severity: 'critical' | 'high' | 'medium' }[] = [
  { pattern: /(?:password|passwd|pwd)\s*[=:]\s*\S+/i, severity: 'critical' },
  { pattern: /(?:api_key|apikey|secret_key)\s*[=:]\s*\S+/i, severity: 'high' },
  { pattern: /(?:token|auth_token|access_token)\s*[=:]\s*\S+/i, severity: 'high' },
  { pattern: /(?:private_key|privatekey)\s*[=:]\s*\S+/i, severity: 'critical' },
  { pattern: /AKIA[0-9A-Z]{16}/, severity: 'high' } // AWS access key
];

/** scanForSecrets — 扫描内容中的敏感信息 */
export function scanForSecrets(content: string): SecretScanResult {
  const found: { pattern: string; line: number; severity: 'critical' | 'high' | 'medium' }[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const { pattern, severity } of SECRET_PATTERNS) {
      if (pattern.test(lines[i])) {
        found.push({ pattern: pattern.source, line: i + 1, severity });
      }
    }
  }

  return {
    hasSecrets: found.length > 0,
    secretPatterns: found
  };
}

/** TeamMemoryDelta — 团队记忆增量变更 */
export interface TeamMemoryDelta {
  readonly added: readonly string[];
  readonly modified: readonly string[];
  readonly removed: readonly string[];
}

/** computeDelta — 计算两个版本间的增量变更 */
export function computeDelta(
  oldEntries: readonly string[],
  newEntries: readonly string[]
): TeamMemoryDelta {
  const oldSet = new Set(oldEntries);
  const newSet = new Set(newEntries);

  const added = newEntries.filter(e => !oldSet.has(e));
  const removed = oldEntries.filter(e => !newSet.has(e));
  const modified = newEntries.filter(e => oldSet.has(e));

  return { added, modified, removed };
}
