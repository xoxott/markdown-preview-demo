/**
 * types.ts — 伴侣类型定义与常量
 *
 * 定义伴侣系统的所有核心类型和常量：
 *
 * - 稀有度层级：common → uncommon → rare → epic → legendary
 * - 物种列表：18种ASCII精灵物种
 * - 眼睛样式：6种眼睛字符
 * - 帽子列表：7种帽子 + none
 * - 属性名称：DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK
 * - 稀有度权重：用于随机滚动稀有度的概率分布
 *
 * 从 Claude Code buddy 彩蛋移植，简化为独立 CLI 所需的最小类型集。 原始实现使用 String.fromCharCode 避免构建输出金丝雀检查，
 * 此处使用普通字符串字面量，因为不受该约束限制。
 */
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

// 确定性骨骼属性：基于 hash(userId) 生成，不在配置中存储
export type CompanionBones = {
  rarity: Rarity;
  species: Species;
  eye: Eye;
  hat: Hat;
  shiny: boolean;
  stats: Record<StatName, number>;
};

// 用户可编辑的灵魂属性：孵化后存储在配置中
export type CompanionSoul = {
  name: string;
  personality: string;
};

// 完整伴侣：骨骼属性 + 灵魂属性 + 孵化时间
export type Companion = CompanionBones &
  CompanionSoul & {
    hatchedAt: number;
  };

// 配置中实际存储的内容：骨骼属性不在配置中存储（防止篡改稀有度）
// 每次读取时从 hash(userId) 确定性重新生成
export type StoredCompanion = CompanionSoul & { hatchedAt: number };

// 稀有度权重：用于随机滚动稀有度的概率分布
export const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1
} as const satisfies Record<Rarity, number>;

// 稀有度星级标记
export const RARITY_STARS = {
  common: '★',
  uncommon: '★★',
  rare: '★★★',
  epic: '★★★★',
  legendary: '★★★★★'
} as const satisfies Record<Rarity, string>;

// 稀有度 → ANSI颜色映射（Ink Text color 属性兼容）
export const RARITY_COLORS = {
  common: 'gray',
  uncommon: 'green',
  rare: 'magenta',
  epic: 'cyan',
  legendary: 'yellow'
} as const satisfies Record<Rarity, string>;
