// ---------------------------------------------------------------------------
// Color utilities — replaces CC's themed color system
// ---------------------------------------------------------------------------

// ANSI color cycle for rainbow text (replaces CC's getRainbowColor)
const ANSI_COLORS = [
  'red',
  'magenta',
  'yellow',
  'green',
  'cyan',
  'blue',
  'redBright',
  'magentaBright',
  'yellowBright',
  'greenBright',
  'cyanBright',
  'blueBright'
];

export function getRainbowColor(index: number): string {
  return ANSI_COLORS[index % ANSI_COLORS.length]!;
}

// Rarity → ANSI color mapping for Ink Text color prop
export const RARITY_ANSI = {
  common: 'gray',
  uncommon: 'green',
  rare: 'magenta',
  epic: 'cyan',
  legendary: 'yellow'
} as const;
