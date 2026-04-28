// ---------------------------------------------------------------------------
// Buddy types — ported from Claude Code, simplified for standalone CLI
// ---------------------------------------------------------------------------
// Original used String.fromCharCode to avoid build-output canary checks.
// We use plain string literals since we don't have that constraint.

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export const SPECIES = [
  'duck',
  'goose',
  'blob',
  'cat',
  'dragon',
  'octopus',
  'owl',
  'penguin',
  'turtle',
  'snail',
  'ghost',
  'axolotl',
  'capybara',
  'cactus',
  'robot',
  'rabbit',
  'mushroom',
  'chonk'
] as const;
export type Species = (typeof SPECIES)[number];

export const EYES = ['·', '✦', '×', '◉', '@', '°'] as const;
export type Eye = (typeof EYES)[number];

export const HATS = [
  'none',
  'crown',
  'tophat',
  'propeller',
  'halo',
  'wizard',
  'beanie',
  'tinyduck'
] as const;
export type Hat = (typeof HATS)[number];

export const STAT_NAMES = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'] as const;
export type StatName = (typeof STAT_NAMES)[number];

// Deterministic parts — derived from hash(userId)
export type CompanionBones = {
  rarity: Rarity;
  species: Species;
  eye: Eye;
  hat: Hat;
  shiny: boolean;
  stats: Record<StatName, number>;
};

// User-editable soul — stored in config after first hatch
export type CompanionSoul = {
  name: string;
  personality: string;
};

export type Companion = CompanionBones &
  CompanionSoul & {
    hatchedAt: number;
  };

// What actually persists in config. Bones are regenerated from hash(userId)
// on every read so species renames don't break stored companions and users
// can't edit their way to a legendary.
export type StoredCompanion = CompanionSoul & { hatchedAt: number };

export const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1
} as const satisfies Record<Rarity, number>;

export const RARITY_STARS = {
  common: '★',
  uncommon: '★★',
  rare: '★★★',
  epic: '★★★★',
  legendary: '★★★★★'
} as const satisfies Record<Rarity, string>;

// ANSI color mapping — original mapped to CC theme keys (inactive/success/...)
// Here we map to Ink-compatible ANSI color names
export const RARITY_COLORS = {
  common: 'gray',
  uncommon: 'green',
  rare: 'magenta',
  epic: 'cyan',
  legendary: 'yellow'
} as const satisfies Record<Rarity, string>;
