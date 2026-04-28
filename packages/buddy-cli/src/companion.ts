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

// Mulberry32 — tiny seeded PRNG, good enough for picking ducks
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

function hashString(s: string): number {
  // FNV-1a — JS-only, no Bun dependency
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function rollRarity(rng: () => number): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let randomRoll = rng() * total;
  for (const rarity of RARITIES) {
    randomRoll -= RARITY_WEIGHTS[rarity];
    if (randomRoll < 0) return rarity;
  }
  return 'common';
}

const RARITY_FLOOR: Record<Rarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50
};

// One peak stat, one dump stat, rest scattered. Rarity bumps the floor.
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

const SALT = 'friend-2026-401';

type Roll = {
  bones: CompanionBones;
  inspirationSeed: number;
};

function rollFrom(rng: () => number): Roll {
  const rarity = rollRarity(rng);
  const bones: CompanionBones = {
    rarity,
    species: pick(rng, SPECIES),
    eye: pick(rng, EYES),
    hat: rarity === 'common' ? 'none' : pick(rng, HATS),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity)
  };
  return { bones, inspirationSeed: Math.floor(rng() * 1e9) };
}

// Cache deterministic result for same userId
let rollCache: { key: string; value: Roll } | undefined;

export function roll(userId: string): Roll {
  const key = userId + SALT;
  if (rollCache?.key === key) return rollCache.value;
  const value = rollFrom(mulberry32(hashString(key)));
  rollCache = { key, value };
  return value;
}

export function companionUserId(): string {
  return getConfig().userId;
}

// Regenerate bones from userId, merge with stored soul.
export function getCompanion(): Companion | undefined {
  const stored = getConfig().companion;
  if (!stored) return undefined;
  const { bones } = roll(companionUserId());
  return { ...stored, ...bones };
}

// ---------------------------------------------------------------------------
// Hatch / render card
// ---------------------------------------------------------------------------

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

function pickName(seed: number): string {
  return NAME_POOL[seed % NAME_POOL.length]!;
}

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

export function hatch(): Companion {
  const uid = companionUserId();
  const { bones, inspirationSeed } = roll(uid);
  const stored: StoredCompanion = {
    name: pickName(inspirationSeed),
    personality: DEFAULT_PERSONALITY,
    hatchedAt: Date.now()
  };
  // Clear companionMuted on fresh hatch
  saveConfig(cfg => {
    const { companionMuted: _m, ...rest } = cfg;
    return { ...rest, companion: stored };
  });
  return { ...stored, ...bones };
}

export { MAX_NAME_LEN, pickName };
