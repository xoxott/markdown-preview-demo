import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { StoredCompanion } from './types.js';

// ---------------------------------------------------------------------------
// Local config persistence — replaces CC's ~/.claude.json
// ---------------------------------------------------------------------------

const CONFIG_DIR = join(homedir(), '.buddy-cli');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export type BuddyConfig = {
  userId: string;
  companion?: StoredCompanion;
  companionMuted?: boolean;
};

const _DEFAULT_CONFIG: BuddyConfig = {
  userId: ''
};

function generateUserId(): string {
  // Simple UUID v4-like — enough for deterministic companion generation
  const chars = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) id += '-';
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

let configCache: BuddyConfig | undefined;

export function getConfig(): BuddyConfig {
  if (configCache) return configCache;

  if (!existsSync(CONFIG_PATH)) {
    // First run — generate userId and persist
    const initial: BuddyConfig = { userId: generateUserId() };
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    configCache = initial;
    return initial;
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    configCache = JSON.parse(raw) as BuddyConfig;
    // Ensure userId exists (migration from old configs)
    if (!configCache.userId) {
      configCache.userId = generateUserId();
      writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2), 'utf-8');
    }
    return configCache;
  } catch {
    // Corrupted config — start fresh
    const fresh: BuddyConfig = { userId: generateUserId() };
    writeFileSync(CONFIG_PATH, JSON.stringify(fresh, null, 2), 'utf-8');
    configCache = fresh;
    return fresh;
  }
}

export function saveConfig(updater: (current: BuddyConfig) => BuddyConfig): void {
  const current = getConfig();
  const next = updater(current);
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8');
  configCache = next;
}

// Invalidate cache (e.g. after external config changes)
export function invalidateConfigCache(): void {
  configCache = undefined;
}
