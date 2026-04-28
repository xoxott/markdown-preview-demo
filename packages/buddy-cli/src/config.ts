/**
 * config.ts — 本地配置持久化
 *
 * 将伴侣配置存储在 ~/.buddy-cli/config.json 中：
 *
 * - userId：用户唯一标识，用于确定性生成伴侣属性
 * - companion：存储的伴侣灵魂属性（名称、性格、孵化时间）
 * - companionMuted：静默标记（可选）
 *
 * 伴侣骨骼属性（稀有度、物种、眼睛等）不在配置中存储， 而是基于 userId 哈希确定性重新生成，防止用户篡改稀有度。
 *
 * 原始实现使用 Claude Code 的 ~/.claude.json，此处独立为 ~/.buddy-cli。
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { StoredCompanion } from './types.js';

const CONFIG_DIR = join(homedir(), '.buddy-cli');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export type BuddyConfig = {
  userId: string;
  companion?: StoredCompanion;
  companionMuted?: boolean;
  forcedSpecies?: string; // 强制物种覆盖（buddy species 命令设置）
};

/** 生成 UUID v4 格式的用户ID（仅用于确定性伴侣生成，非安全用途） */
export function generateUserId(): string {
  const chars = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) id += '-';
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// 配置缓存：避免频繁读文件
let configCache: BuddyConfig | undefined;

/** 获取配置：首次运行时自动生成 userId 并持久化 */
export function getConfig(): BuddyConfig {
  if (configCache) return configCache;

  if (!existsSync(CONFIG_PATH)) {
    // 首次运行：生成 userId 并写入配置文件
    const initial: BuddyConfig = { userId: generateUserId() };
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    configCache = initial;
    return initial;
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    configCache = JSON.parse(raw) as BuddyConfig;
    // 兼容旧配置：确保 userId 存在
    if (!configCache.userId) {
      configCache.userId = generateUserId();
      writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2), 'utf-8');
    }
    return configCache;
  } catch {
    // 配置损坏：重新生成
    const fresh: BuddyConfig = { userId: generateUserId() };
    writeFileSync(CONFIG_PATH, JSON.stringify(fresh, null, 2), 'utf-8');
    configCache = fresh;
    return fresh;
  }
}

/** 保存配置：接受更新函数，写入文件并更新缓存 */
export function saveConfig(updater: (current: BuddyConfig) => BuddyConfig): void {
  const current = getConfig();
  const next = updater(current);
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8');
  configCache = next;
}

/** 清除配置缓存（外部修改配置后调用） */
export function invalidateConfigCache(): void {
  configCache = undefined;
}
