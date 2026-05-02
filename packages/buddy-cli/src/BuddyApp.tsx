// @ts-nocheck — Vue JSX namespace pollution in monorepo overrides global JSX.Element with VNode, breaking Ink/React JSX
/**
 * BuddyApp — Ink 交互式应用根组件
 *
 * 负责初始化伴侣数据、监听键盘输入、渲染精灵或静默提示。 键盘交互： p — 给伴侣爱心（触发心形动画） h — 显示伴侣属性卡片 q / Esc — 退出交互模式
 */
import React, { useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { CompanionSprite } from './CompanionSprite.js';
import { getCompanion, hatch, renderCard } from './companion.js';
import { getConfig } from './config.js';
import { setBuddyState, useBuddyStore } from './state.js';

export function BuddyApp(): JSX.Element {
  const { exit } = useApp();
  const companion = useBuddyStore(s => s.companion);

  // 初始化：获取已有伴侣或孵化新伴侣
  useEffect(() => {
    const c = getCompanion() ?? hatch();
    setBuddyState({ companion: c });
  }, []);

  // 键盘输入处理
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
      return;
    }

    switch (input) {
      case 'p': {
        // 爱心动画
        const c = getCompanion();
        if (c) {
          setBuddyState({ companionPetAt: Date.now() });
        }
        break;
      }
      case 'h': {
        // 显示属性卡片
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
