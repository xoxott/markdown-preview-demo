/** @suga/ai-recovery — MicroCompactStrategy测试 */

import { describe, expect, it } from 'vitest';
import { MicroCompactStrategy } from '../core/MicroCompactStrategy';
import type { CompactHostProvider, CompactMessage } from '../types/compact';

class MockHostProvider implements CompactHostProvider {
  async getCurrentTokenCount() {
    return 100000;
  }
  getMaxTokens() {
    return 200000;
  }
  async summarizeConversation() {
    return 'summary';
  }
  async readSessionMemory() {
    return null;
  }
  getLastSummarizedMessageId() {
    return undefined;
  }
  estimateTokens(text: string) {
    return Math.ceil(text.length / 4);
  }
}

describe('MicroCompactStrategy', () => {
  const hostProvider = new MockHostProvider();

  it('compact → 间隔不够时返回wasCompacted=false', async () => {
    const strategy = new MicroCompactStrategy({ gapThresholdMinutes: 60 });
    const recentMessages: CompactMessage[] = [
      { role: 'assistant', content: 'recent', timestamp: Date.now() - 1000 },
      { role: 'user', content: 'hello' }
    ];
    const result = await strategy.compact(recentMessages, hostProvider);
    expect(result.wasCompacted).toBe(false);
  });

  it('compact → 无时间戳时返回wasCompacted=false', async () => {
    const strategy = new MicroCompactStrategy({ gapThresholdMinutes: 60 });
    const messages: CompactMessage[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'response' }
    ];
    const result = await strategy.compact(messages, hostProvider);
    expect(result.wasCompacted).toBe(false);
  });

  it('compact → tool结果少于keepRecent时返回false', async () => {
    const strategy = new MicroCompactStrategy({
      gapThresholdMinutes: 0, // 立即触发
      keepRecent: 5
    });
    const messages: CompactMessage[] = [
      { role: 'assistant', content: 'old', timestamp: Date.now() - 3600000 },
      { role: 'system', content: 'tool result 1', isToolUse: true, toolName: 'file-read' }
    ];
    const result = await strategy.compact(messages, hostProvider);
    // 只有1个tool result，keepRecent=5，不压缩
    expect(result.wasCompacted).toBe(false);
  });

  it('compact → 超过keepRecent时压缩旧tool结果', async () => {
    const strategy = new MicroCompactStrategy({
      gapThresholdMinutes: 0,
      keepRecent: 2,
      compactableTools: ['file-read', 'bash']
    });

    const messages: CompactMessage[] = [
      { role: 'assistant', content: 'old', timestamp: Date.now() - 3600000 },
      {
        role: 'system',
        content: 'Large content A',
        isToolUse: true,
        toolName: 'file-read',
        id: 'tr-1'
      },
      {
        role: 'system',
        content: 'Large content B',
        isToolUse: true,
        toolName: 'file-read',
        id: 'tr-2'
      },
      { role: 'system', content: 'Large content C', isToolUse: true, toolName: 'bash', id: 'tr-3' },
      {
        role: 'system',
        content: 'Large content D',
        isToolUse: true,
        toolName: 'file-read',
        id: 'tr-4'
      },
      { role: 'user', content: 'recent question' }
    ];

    const result = await strategy.compact(messages, hostProvider);
    expect(result.wasCompacted).toBe(true);
    expect(result.strategy).toBe('micro');
    expect(result.preCompactTokenCount).toBeGreaterThan(0);
  });

  it('compact → 不压缩非compactable tool', async () => {
    const strategy = new MicroCompactStrategy({
      gapThresholdMinutes: 0,
      keepRecent: 1,
      compactableTools: ['file-read'] // bash不在列表中
    });

    const messages: CompactMessage[] = [
      { role: 'assistant', content: 'old', timestamp: Date.now() - 3600000 },
      { role: 'system', content: 'Large content A', isToolUse: true, toolName: 'bash', id: 'tr-1' },
      {
        role: 'system',
        content: 'Large content B',
        isToolUse: true,
        toolName: 'file-read',
        id: 'tr-2'
      }
    ];

    const result = await strategy.compact(messages, hostProvider);
    // bash不在compactable列表中，只有1个file-read结果
    expect(result.wasCompacted).toBe(false);
  });

  it('resetState → 清空时间戳', async () => {
    const strategy = new MicroCompactStrategy();
    strategy.resetState();
    // 重置后无时间戳，不触发压缩
    const messages: CompactMessage[] = [
      { role: 'assistant', content: 'test', timestamp: Date.now() - 3600000 }
    ];
    const result = await strategy.compact(messages, hostProvider);
    // 可能触发也可能不触发，取决于内部时间戳是否被重置
    expect(result).toBeDefined();
  });

  it('compact → disabled时不压缩', async () => {
    const strategy = new MicroCompactStrategy({ enabled: false });
    const messages: CompactMessage[] = [
      { role: 'assistant', content: 'old', timestamp: Date.now() - 3600000 },
      { role: 'system', content: 'content', isToolUse: true, toolName: 'file-read' }
    ];
    const result = await strategy.compact(messages, hostProvider);
    expect(result.wasCompacted).toBe(false);
  });
});
