#!/usr/bin/env tsx
import React from 'react';
import { cac } from 'cac';
import { render } from 'ink';
import { BuddyApp } from './src/BuddyApp.js';
import { getCompanion, hatch, renderCard } from './src/companion.js';
import { invalidateConfigCache, saveConfig } from './src/config.js';

const cli = cac('buddy');

// ---------------------------------------------------------------------------
// /buddy — main command: start interactive Ink mode
// ---------------------------------------------------------------------------
cli.command('', 'Meet your coding companion').action(async () => {
  const { waitUntilExit } = render(React.createElement(BuddyApp));
  await waitUntilExit();
});

// ---------------------------------------------------------------------------
// /buddy hatch — hatch or show companion card
// ---------------------------------------------------------------------------
cli.command('hatch', 'Hatch a companion or show current one').action(() => {
  const existing = getCompanion();
  if (!existing) {
    const fresh = hatch();
    console.log(`A companion appeared!\n\n${renderCard(fresh)}`);
  } else {
    console.log(renderCard(existing));
  }
});

// ---------------------------------------------------------------------------
// /buddy pet — pet the companion
// ---------------------------------------------------------------------------
cli.command('pet', 'Give your companion some love').action(() => {
  const c = getCompanion();
  if (!c) {
    console.log('No companion yet — run `buddy hatch` first.');
    return;
  }
  console.log(`You gave ${c.name} some love. ♡`);
});

// ---------------------------------------------------------------------------
// /buddy rename <name>
// ---------------------------------------------------------------------------
// cac passes positional args as the first argument to action()
cli.command('rename <name>', 'Rename your companion').action((name: string) => {
  const newName = name;
  if (!newName) {
    console.log('Usage: buddy rename <new name>');
    return;
  }
  const c = getCompanion();
  if (!c) {
    console.log('No companion yet — run `buddy hatch` first.');
    return;
  }
  saveConfig(cfg => {
    if (!cfg.companion) return cfg;
    return { ...cfg, companion: { ...cfg.companion, name: newName.slice(0, 24) } };
  });
  invalidateConfigCache();
  console.log(`Renamed to ${newName.slice(0, 24)}.`);
});

// ---------------------------------------------------------------------------
// /buddy mute
// ---------------------------------------------------------------------------
cli.command('mute', 'Mute your companion').action(() => {
  saveConfig(cfg => ({ ...cfg, companionMuted: true }));
  invalidateConfigCache();
  console.log('Companion muted. Run `buddy unmute` to bring them back.');
});

// ---------------------------------------------------------------------------
// /buddy unmute
// ---------------------------------------------------------------------------
cli.command('unmute', 'Unmute your companion').action(() => {
  saveConfig(cfg => {
    const { companionMuted: _m, ...rest } = cfg;
    return rest;
  });
  invalidateConfigCache();
  console.log('Companion unmuted.');
});

// ---------------------------------------------------------------------------
// /buddy release
// ---------------------------------------------------------------------------
cli.command('release', 'Release your companion back into the wild').action(() => {
  const c = getCompanion();
  if (!c) {
    console.log('No companion to release.');
    return;
  }
  saveConfig(cfg => {
    const { companion: _c, ...rest } = cfg;
    return rest;
  });
  invalidateConfigCache();
  console.log(`Released ${c.name} back into the wild. Run \`buddy hatch\` to get a new one.`);
});

cli.help();
cli.parse();
