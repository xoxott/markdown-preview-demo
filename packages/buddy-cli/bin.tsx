#!/usr/bin/env tsx
/**
 * buddy-cli 入口文件
 *
 * 终端宠物伴侣 CLI 工具，从 Claude Code buddy 彩蛋移植而来。 使用 cac 解析命令行参数，Ink 渲染交互式精灵动画。
 *
 * 命令列表： buddy — 启动交互式 Ink 模式（精灵动画 + 键盘交互） buddy hatch — 孵化伴侣或显示当前伴侣卡片 buddy pet — 给伴侣爱心 buddy
 * rename — 重命名伴侣（最多24字符） buddy mute — 静默伴侣（隐藏精灵） buddy unmute — 解除静默 buddy release — 释放伴侣（删除配置）
 */
import React from 'react';
import { cac } from 'cac';
import { render } from 'ink';
import { BuddyApp } from './src/BuddyApp.js';
import { getCompanion, hatch, renderCard } from './src/companion.js';
import { invalidateConfigCache, saveConfig } from './src/config.js';

const cli = cac('buddy');

// ---------------------------------------------------------------------------
// buddy（默认命令）— 启动交互式 Ink 精灵动画模式
// ---------------------------------------------------------------------------
cli.command('', 'Meet your coding companion').action(async () => {
  const { waitUntilExit } = render(<BuddyApp />);
  await waitUntilExit();
});

// ---------------------------------------------------------------------------
// buddy hatch — 孵化新伴侣或显示当前伴侣属性卡片
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
// buddy pet — 给伴侣爱心（纯文本输出）
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
// buddy rename <name> — 重命名伴侣
// cac 将位置参数作为 action() 的第一个参数传入
// ---------------------------------------------------------------------------
cli.command('rename <name>', 'Rename your companion').action((name: string) => {
  if (!name) {
    console.log('Usage: buddy rename <new name>');
    return;
  }
  const c = getCompanion();
  if (!c) {
    console.log('No companion yet — run `buddy hatch` first.');
    return;
  }
  // 名称最长24字符，超出部分截断
  const trimmed = name.slice(0, 24);
  saveConfig(cfg => {
    if (!cfg.companion) return cfg;
    return { ...cfg, companion: { ...cfg.companion, name: trimmed } };
  });
  invalidateConfigCache();
  console.log(`Renamed to ${trimmed}.`);
});

// ---------------------------------------------------------------------------
// buddy mute — 静默伴侣（精灵不再显示）
// ---------------------------------------------------------------------------
cli.command('mute', 'Mute your companion').action(() => {
  saveConfig(cfg => ({ ...cfg, companionMuted: true }));
  invalidateConfigCache();
  console.log('Companion muted. Run `buddy unmute` to bring them back.');
});

// ---------------------------------------------------------------------------
// buddy unmute — 解除静默
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
// buddy release — 释放伴侣（从配置中删除，可重新 hatch）
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
