import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { CompanionSprite } from './CompanionSprite.js';
import { getCompanion, hatch, renderCard } from './companion.js';
import { getConfig } from './config.js';
import { setBuddyState, useBuddyStore } from './state.js';

// ---------------------------------------------------------------------------
// BuddyApp — top-level Ink app with sprite + keyboard interaction
// ---------------------------------------------------------------------------

export function BuddyApp(): React.ReactElement {
  const { exit } = useApp();
  const companion = useBuddyStore(s => s.companion);

  // Initialize companion on first render
  React.useEffect(() => {
    const c = getCompanion() ?? hatch();
    setBuddyState({ companion: c });
  }, []);

  // Keyboard input
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
      return;
    }

    switch (input) {
      case 'p': {
        // Pet
        const c = getCompanion();
        if (c) {
          setBuddyState({ companionPetAt: Date.now() });
        }
        break;
      }
      case 'h': {
        // Show card
        const c = getCompanion();
        if (c) {
          console.log(renderCard(c));
        }
        break;
      }
      default:
        break;
    }
  });

  const muted = getConfig().companionMuted;

  return (
    <Box flexDirection="column" padding={1}>
      {companion && !muted ? (
        <CompanionSprite />
      ) : (
        <Text dimColor>No companion — muted or not hatched yet.</Text>
      )}
      <Box marginTop={1}>
        <Text dimColor>p = pet | h = card | q = quit</Text>
      </Box>
    </Box>
  );
}
