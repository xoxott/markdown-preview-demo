/**
 * companion.ts — 伴侣生成与卡片渲染
 *
 * 核心功能：
 *
 * - 基于用户ID确定性生成伴侣属性（稀有度、物种、眼睛、帽子、属性值）
 * - 孵化新伴侣并持久化到配置文件
 * - 渲染伴侣属性卡片（纯文本格式）
 *
 * 生成算法： 使用 FNV-1a 哈希 + Mulberry32 PRNG，同一 userId 总是生成相同伴侣。 属性值分配：一个峰值属性、一个低谷属性，其余随机散布。
 * 稀有度影响属性最低值（common=5, legendary=50）。
 */
import {
  type Companion,
  type CompanionBones,
  EYES,
  HATS,
  RARITIES,
  RARITY_STARS,
  RARITY_WEIGHTS,
  type Rarity,
  SPECIES,
  STAT_NAMES,
  type StatName,
  type StoredCompanion
} from './types.js';
import { getConfig, saveConfig } from './config.js';

// Mulberry32 — 小型种子PRNG，足够用于确定性生成伴侣
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function mulberry() {
    a |= 0;
    a ^= 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    // eslint-disable-next-line operator-assignment
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a 哈希 — 纯JS实现，无外部依赖
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 从数组中随机选取一个元素 */
function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** 按稀有度权重随机滚动稀有度 */
function rollRarity(rng: () => number): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let randomRoll = rng() * total;
  for (const rarity of RARITIES) {
    randomRoll -= RARITY_WEIGHTS[rarity];
    if (randomRoll < 0) return rarity;
  }
  return 'common';
}

// 稀有度对应的属性最低值
const RARITY_FLOOR: Record<Rarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50
};

/** 属性值分配：一个峰值属性，一个低谷属性，其余随机散布。稀有度提升最低值 */
function rollStats(rng: () => number, rarity: Rarity): Record<StatName, number> {
  const floor = RARITY_FLOOR[rarity];
  const peak = pick(rng, STAT_NAMES);
  let dump = pick(rng, STAT_NAMES);
  while (dump === peak) dump = pick(rng, STAT_NAMES);

  const stats = {} as Record<StatName, number>;
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    } else {
      stats[name] = floor + Math.floor(rng() * 40);
    }
  }
  return stats;
}

// 盐值：确保不同应用间的哈希结果不重复
const SALT = 'friend-2026-401';

// 一次完整滚动的结果
type Roll = {
  bones: CompanionBones;
  inspirationSeed: number;
};

/** 从PRNG生成完整的伴侣骨骼属性 */
function rollFrom(rng: () => number): Roll {
  const rarity = rollRarity(rng);
  const bones: CompanionBones = {
    rarity,
    species: pick(rng, SPECIES),
    eye: pick(rng, EYES),
    hat: rarity === 'common' ? 'none' : pick(rng, HATS),
    shiny: rng() < 0.01, // 1%概率闪亮
    stats: rollStats(rng, rarity)
  };
  return { bones, inspirationSeed: Math.floor(rng() * 1e9) };
}

// 缓存确定性结果：同一 userId 总是返回相同伴侣
let rollCache: { key: string; value: Roll } | undefined;

/** 基于用户ID确定性生成伴侣骨骼属性 */
export function roll(userId: string): Roll {
  const key = userId + SALT;
  if (rollCache?.key === key) return rollCache.value;
  const value = rollFrom(mulberry32(hashString(key)));
  rollCache = { key, value };
  return value;
}

/** 获取当前用户的 userId（从配置读取） */
export function companionUserId(): string {
  return getConfig().userId;
}

/** 获取已有伴侣：重新从 userId 生成骨骼属性，与存储的灵魂属性合并 */
export function getCompanion(): Companion | undefined {
  const stored = getConfig().companion;
  if (!stored) return undefined;
  const { bones } = roll(companionUserId());
  return { ...stored, ...bones };
}

// ---------------------------------------------------------------------------
// 孵化 / 卡片渲染
// ---------------------------------------------------------------------------

// 名称池：24个可选伴侣名称
const NAME_POOL = [
  'Pip',
  'Mochi',
  'Ziggy',
  'Puck',
  'Bramble',
  'Juniper',
  'Clove',
  'Waffle',
  'Pebble',
  'Fern',
  'Tofu',
  'Biscuit',
  'Nimbus',
  'Quill',
  'Basil',
  'Olive',
  'Sprout',
  'Sable',
  'Hazel',
  'Cinder',
  'Jasper',
  'Nova',
  'Echo',
  'Bean'
] as const;

const DEFAULT_PERSONALITY = 'A curious little friend.';
const MAX_NAME_LEN = 24;

/** 根据灵感种子选取名称 */
function pickName(seed: number): string {
  return NAME_POOL[seed % NAME_POOL.length]!;
}

/** 渲染伴侣属性卡片（纯文本格式，用于 hatch/card 命令输出） */
export function renderCard(c: Companion): string {
  const stars = RARITY_STARS[c.rarity];
  const shinyTag = c.shiny ? ' ✦shiny' : '';
  const hatTag = c.hat === 'none' ? '' : `  hat:${c.hat}`;
  const statsLine = STAT_NAMES.map(s => `${s} ${c.stats[s]}`).join('  ');
  return [
    `  ${c.name} — ${c.rarity} ${c.species}${shinyTag}`,
    `    ${stars}   eye:${c.eye}${hatTag}`,
    `    ${statsLine}`,
    ``,
    `    ${c.personality}`
  ].join('\n');
}

/** 孵化新伴侣：生成名称和灵魂属性，持久化到配置文件 */
export function hatch(): Companion {
  const uid = companionUserId();
  const { bones, inspirationSeed } = roll(uid);
  const stored: StoredCompanion = {
    name: pickName(inspirationSeed),
    personality: DEFAULT_PERSONALITY,
    hatchedAt: Date.now()
  };
  // 孵化时清除 companionMuted 标记
  saveConfig(cfg => {
    const { companionMuted: _m, ...rest } = cfg;
    return { ...rest, companion: stored };
  });
  return { ...stored, ...bones };
}

export { MAX_NAME_LEN, pickName };
