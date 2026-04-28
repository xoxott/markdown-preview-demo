import { useRef, useState } from 'react';
import figures from 'figures';
import { Box, Text } from 'ink';
import stringWidth from 'string-width';
import { renderSprite, spriteFrameCount } from './sprites.js';
import { RARITY_COLORS } from './types.js';
import { advanceTick, setBuddyState, useBuddyStore } from './state.js';
import { getConfig } from './config.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TICK_MS = 500;
const BUBBLE_SHOW = 20; // ticks → ~10s at 500ms
const FADE_WINDOW = 6; // last ~3s the bubble dims
const PET_BURST_MS = 2500; // how long hearts float after /buddy pet
const SPRITE_BODY_WIDTH = 12;
const NAME_ROW_PAD = 2;

// Idle sequence: mostly rest (frame 0), occasional fidget (frames 1-2), rare blink.
// -1 means "blink on frame 0".
const IDLE_SEQUENCE = [0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0];

// Hearts float up-and-out over 5 ticks (~2.5s)
const H = figures.heart;
const PET_HEARTS = [
  `   ${H}    ${H}   `,
  `  ${H}  ${H}   ${H}  `,
  ` ${H}   ${H}  ${H}   `,
  `${H}  ${H}      ${H} `,
  '·    ·   ·  '
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrap(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur.length + w.length + 1 > width && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function spriteColWidth(nameWidth: number): number {
  return Math.max(SPRITE_BODY_WIDTH, nameWidth + NAME_ROW_PAD);
}

// ---------------------------------------------------------------------------
// SpeechBubble
// ---------------------------------------------------------------------------

function SpeechBubble({
  text,
  color,
  fading,
  tail
}: {
  text: string;
  color: string;
  fading: boolean;
  tail: 'down' | 'right';
}): React.ReactElement {
  const lines = wrap(text, 30);
  const borderColor = fading ? 'gray' : color;

  const bubble = (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      width={34}
    >
      {lines.map((l, i) => (
        <Text key={i} italic dimColor={!fading} color={fading ? 'gray' : undefined}>
          {l}
        </Text>
      ))}
    </Box>
  );

  if (tail === 'right') {
    return (
      <Box flexDirection="row" alignItems="center">
        {bubble}
        <Text color={borderColor}>─</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="flex-end" marginRight={1}>
      {bubble}
      <Box flexDirection="column" alignItems="flex-end" paddingRight={6}>
        <Text color={borderColor}>╲ </Text>
        <Text color={borderColor}>╲</Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// CompanionSprite — the main sprite component with animation
// ---------------------------------------------------------------------------

export function CompanionSprite(): React.ReactElement | null {
  const companion = useBuddyStore(s => s.companion);
  const reaction = useBuddyStore(s => s.companionReaction);
  const petAt = useBuddyStore(s => s.companionPetAt);
  const tick = useBuddyStore(s => s.tick);

  // Sync-during-render for pet animation start
  const [petStart, setPetStart] = useState({ tick: 0, forPetAt: petAt });
  if (petAt !== petStart.forPetAt) {
    setPetStart({ tick, forPetAt: petAt });
  }

  // Animation tick timer
  useEffect(() => {
    const timer = setInterval(() => advanceTick(), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // Reaction clear timer (~10s)
  const lastSpokeTick = useRef(0);
  useEffect(() => {
    if (!reaction) return undefined;
    lastSpokeTick.current = tick;
    const timer = setTimeout(() => {
      setBuddyState({ companionReaction: undefined });
    }, BUBBLE_SHOW * TICK_MS);
    return () => clearTimeout(timer);
  }, [reaction]);

  // Get live companion data
  if (!companion) return null;
  const muted = getConfig().companionMuted;
  if (muted) return null;

  const color = RARITY_COLORS[companion.rarity];
  const colWidth = spriteColWidth(stringWidth(companion.name));
  const bubbleAge = reaction ? tick - lastSpokeTick.current : 0;
  const fading = reaction !== undefined && bubbleAge >= BUBBLE_SHOW - FADE_WINDOW;

  const petAge = petAt ? tick - petStart.tick : Infinity;
  const petting = petAge * TICK_MS < PET_BURST_MS;

  // For now, always use full sprite (no terminal size detection in Ink standalone)
  const frameCount = spriteFrameCount(companion.species);
  const heartFrame = petting ? PET_HEARTS[petAge % PET_HEARTS.length] : null;

  let spriteFrame: number;
  let blink = false;
  if (reaction || petting) {
    // Excited: cycle all fidget frames fast
    spriteFrame = tick % frameCount;
  } else {
    const step = IDLE_SEQUENCE[tick % IDLE_SEQUENCE.length]!;
    if (step === -1) {
      spriteFrame = 0;
      blink = true;
    } else {
      spriteFrame = step % frameCount;
    }
  }

  const body = renderSprite(companion, spriteFrame).map(line =>
    blink ? line.replaceAll(companion.eye, '-') : line
  );
  const sprite = heartFrame ? [heartFrame, ...body] : body;

  const spriteColumn = (
    <Box flexDirection="column" flexShrink={0} alignItems="center" width={colWidth}>
      {sprite.map((line, i) => (
        <Text key={i} color={i === 0 && heartFrame ? 'green' : color}>
          {line}
        </Text>
      ))}
      <Text italic bold color={color}>
        {companion.name}
      </Text>
    </Box>
  );

  if (!reaction) {
    return <Box paddingX={1}>{spriteColumn}</Box>;
  }

  return (
    <Box flexDirection="row" alignItems="flex-end" paddingX={1} flexShrink={0}>
      <SpeechBubble text={reaction} color={color} fading={fading} tail="right" />
      {spriteColumn}
    </Box>
  );
}
