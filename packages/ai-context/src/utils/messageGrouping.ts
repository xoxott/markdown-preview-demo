/** 消息分组辅助 — 按 API round 分组消息（PTL Retry 前置） */

import type { AgentMessage } from '@suga/ai-agent-loop';

/** API Round 分组 — 每个 round = 一组连续的消息（user 开始 + assistant + tool_result） */
export interface ApiRoundGroup {
  /** 分组起始索引（在原消息数组中） */
  readonly startIndex: number;
  /** 分组结束索引（在原消息数组中，inclusive） */
  readonly endIndex: number;
  /** 分组内的消息 */
  readonly messages: readonly AgentMessage[];
}

/**
 * groupByApiRound — 按用户消息位置分组
 *
 * 每个 user 消息开始一个新的 API round， 连续的 assistant 和 tool_result 消息属于同一 round。 PTL Retry 使用此分组来按 round
 * 裁剪最老的 groups。
 */
export function groupByApiRound(messages: readonly AgentMessage[]): ApiRoundGroup[] {
  if (messages.length === 0) return [];

  const groups: ApiRoundGroup[] = [];
  let groupStart = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // user 消息 → 新 round 开始（如果不是第一条 user 消息）
    if (msg.role === 'user' && i > 0) {
      groups.push({
        startIndex: groupStart,
        endIndex: i - 1,
        messages: messages.slice(groupStart, i)
      });
      groupStart = i;
    }
  }

  // 最后一个 group
  groups.push({
    startIndex: groupStart,
    endIndex: messages.length - 1,
    messages: messages.slice(groupStart)
  });

  return groups;
}
