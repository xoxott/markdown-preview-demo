// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck — Vue JSX namespace pollution in monorepo overrides global JSX.Element with VNode, breaking Ink/React JSX
/**
 * CompanionSprite — 精灵动画 + 气泡组件
 *
 * 渲染 ASCII 精灵动画，包含：
 *
 * - 空闲动画：静息帧为主，偶尔小动作帧，罕见眨眼
 * - 反应气泡：文字气泡从精灵右侧伸出，~10秒后淡出消失
 * - 爱心动画：pet 命令触发心形符号向上漂浮，持续~2.5秒
 * - 稀有度颜色：根据伴侣稀有度渲染 ANSI 颜色
 *
 * 使用 Ink 的 Box/Text 组件实现终端布局和样式。
 */
import React, { useEffect, useRef, useState } from 'react';
import figures from 'figures';
import { Box, Text } from 'ink';
import stringWidth from 'string-width';
import { renderSprite, spriteFrameCount } from './sprites.js';
import { RARITY_COLORS } from './types.js';
import { advanceTick, setBuddyState, useBuddyStore } from './state.js';
import { getConfig } from './config.js';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const TICK_MS = 500; // 动画帧间隔
const BUBBLE_SHOW = 20; // 气泡显示时长（tick数 → ~10秒）
const FADE_WINDOW = 6; // 气泡淡出窗口（最后~3秒变灰）
const PET_BURST_MS = 2500; // 爱心漂浮持续时间
const SPRITE_BODY_WIDTH = 12; // 精灵体宽度
const NAME_ROW_PAD = 2; // 名称行额外padding

// 空闲动画序列：以静息帧(0)为主，偶尔小动作帧(1-2)，罕见眨眼(-1)
// -1 表示"在第0帧眨眼"
const IDLE_SEQUENCE = [0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0];

// 爱心漂浮帧：5帧从密集到稀疏，持续~2.5秒
const H = figures.heart;
const PET_HEARTS = [
  `   ${H}    ${H}   `,
  `  ${H}  ${H}   ${H}  `,
  ` ${H}   ${H}  ${H}   `,
  `${H}  ${H}      ${H} `,
  '·    ·   ·  '
];

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

/** 文本自动换行，按指定宽度拆分为多行 */
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

/** 计算精灵列宽度：确保名称和精灵体都能容纳 */
function spriteColWidth(nameWidth: number): number {
  return Math.max(SPRITE_BODY_WIDTH, nameWidth + NAME_ROW_PAD);
}

// ---------------------------------------------------------------------------
// SpeechBubble — 气泡组件
// ---------------------------------------------------------------------------

/** 反应气泡：带圆角边框的文字气泡，支持右侧或下方尾巴 */
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
}): JSX.Element {
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

  // 右侧尾巴：气泡在精灵左侧，尾巴指向精灵
  if (tail === 'right') {
    return (
      <Box flexDirection="row" alignItems="center">
        {bubble}
        <Text color={borderColor}>─</Text>
      </Box>
    );
  }

  // 下方尾巴：气泡在精灵上方，尾巴指向精灵
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
// CompanionSprite — 精灵动画主组件
// ---------------------------------------------------------------------------

export function CompanionSprite(): JSX.Element | null {
  const companion = useBuddyStore(s => s.companion);
  const reaction = useBuddyStore(s => s.companionReaction);
  const petAt = useBuddyStore(s => s.companionPetAt);
  const tick = useBuddyStore(s => s.tick);

  // 爱心动画起始tick：pet触发时同步记录当前tick用于计算动画进度
  const [petStart, setPetStart] = useState({ tick: 0, forPetAt: petAt });
  if (petAt !== petStart.forPetAt) {
    setPetStart({ tick, forPetAt: petAt });
  }

  // 动画帧定时器：每500ms推进一个tick
  useEffect(() => {
    const timer = setInterval(() => advanceTick(), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // 气泡自动消失：反应气泡显示约10秒后清除
  const lastSpokeTick = useRef(0);
  useEffect(() => {
    if (!reaction) return undefined;
    lastSpokeTick.current = tick;
    const timer = setTimeout(() => {
      setBuddyState({ companionReaction: undefined });
    }, BUBBLE_SHOW * TICK_MS);
    return () => clearTimeout(timer);
  }, [reaction]);

  // 静默或无伴侣时不渲染
  if (!companion) return null;
  const muted = getConfig().companionMuted;
  if (muted) return null;

  const color = RARITY_COLORS[companion.rarity];
  const colWidth = spriteColWidth(stringWidth(companion.name));
  const bubbleAge = reaction ? tick - lastSpokeTick.current : 0;
  const fading = reaction !== undefined && bubbleAge >= BUBBLE_SHOW - FADE_WINDOW;

  const petAge = petAt ? tick - petStart.tick : Infinity;
  const petting = petAge * TICK_MS < PET_BURST_MS;

  const frameCount = spriteFrameCount(companion.species);
  const heartFrame = petting ? PET_HEARTS[petAge % PET_HEARTS.length] : null;

  // 帧选择逻辑：有反应或爱心时快速循环小动作帧，否则按空闲序列
  let spriteFrame: number;
  let blink = false;
  if (reaction || petting) {
    // 兴奋状态：快速循环所有小动作帧
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

  // 渲染精灵：眨眼时将眼睛替换为 '-'
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

  // 无反应时只显示精灵列
  if (!reaction) {
    return <Box paddingX={1}>{spriteColumn}</Box>;
  }

  // 有反应时：气泡 + 精灵并排
  return (
    <Box flexDirection="row" alignItems="flex-end" paddingX={1} flexShrink={0}>
      <SpeechBubble text={reaction} color={color} fading={fading} tail="right" />
      {spriteColumn}
    </Box>
  );
}
