/** @suga/ai-recovery — SessionMemoryCompact测试 */

import { describe, expect, it } from 'vitest';
import { SessionMemoryCompact } from '../core/SessionMemoryCompact';
import type { CompactHostProvider, CompactMessage } from '../types/compact';

class MockSMHostProvider implements CompactHostProvider {
  private smContent: string | null = null;
  private lastSummarizedId: string | undefined = undefined;

  setSMContent(content: string | null) {
    this.smContent = content;
  }
  setLastSummarizedId(id: string | undefined) {
    this.lastSummarizedId = id;
  }

  async getCurrentTokenCount() {
    return 100000;
  }
  getMaxTokens() {
    return 200000;
  }
  async summarizeConversation() {
    return 'LLM summary';
  }
  async readSessionMemory() {
    return this.smContent;
  }
  getLastSummarizedMessageId() {
    return this.lastSummarizedId;
  }
  estimateTokens(text: string) {
    return Math.ceil(text.length / 4);
  }
}

describe('SessionMemoryCompact', () => {
  const hostProvider = new MockSMHostProvider();
  const smCompact = new SessionMemoryCompact();

  const sampleMessages: CompactMessage[] = [
    { role: 'user', content: 'Hello', id: 'msg-1' },
    { role: 'assistant', content: 'Hi there', id: 'msg-2' },
    { role: 'user', content: 'Do something complex', id: 'msg-3' },
    { role: 'assistant', content: 'Done with the task', id: 'msg-4' }
  ];

  it('compact → SM为空返回wasCompacted=false', async () => {
    hostProvider.setSMContent(null);
    hostProvider.setLastSummarizedId('msg-1');
    const result = await smCompact.compact(sampleMessages, hostProvider);
    expect(result.wasCompacted).toBe(false);
  });

  it('compact → SM为空字符串返回wasCompacted=false', async () => {
    hostProvider.setSMContent('');
    hostProvider.setLastSummarizedId('msg-1');
    const result = await smCompact.compact(sampleMessages, hostProvider);
    expect(result.wasCompacted).toBe(false);
  });

  it('compact → 无lastSummarizedId返回wasCompacted=false', async () => {
    hostProvider.setSMContent('Memory content');
    hostProvider.setLastSummarizedId(undefined);
    const result = await smCompact.compact(sampleMessages, hostProvider);
    expect(result.wasCompacted).toBe(false);
  });

  it('compact → ID不在消息中返回wasCompacted=false', async () => {
    hostProvider.setSMContent('Memory content');
    hostProvider.setLastSummarizedId('nonexistent');
    const result = await smCompact.compact(sampleMessages, hostProvider);
    expect(result.wasCompacted).toBe(false);
  });

  it('compact → 成功使用SM替代折叠段', async () => {
    hostProvider.setSMContent('This is the session memory content');
    hostProvider.setLastSummarizedId('msg-1');
    const result = await smCompact.compact(sampleMessages, hostProvider);
    expect(result.wasCompacted).toBe(true);
    expect(result.strategy).toBe('session_memory');
    expect(result.boundaryMessageId).toBeTruthy();
    expect(result.preCompactTokenCount).toBeGreaterThan(0);
    // 注意：SM摘要可能比原始消息段更长（特别是原始消息很短时）
    // postCompactTokenCount 可能大于 preCompactTokenCount，这是合理的
    expect(result.postCompactTokenCount).toBeGreaterThan(0);
  });

  it('compact → 折叠后仍超threshold返回wasCompacted=false', async () => {
    // 设置很小的maxTokens使SM也超threshold
    class SmallMaxTokensProvider extends MockSMHostProvider {
      getMaxTokens() {
        return 10;
      } // 极小
    }
    const smallProvider = new SmallMaxTokensProvider();
    smallProvider.setSMContent('Memory');
    smallProvider.setLastSummarizedId('msg-1');

    const result = await smCompact.compact(sampleMessages, smallProvider);
    // postCompactTokenCount >= maxTokens * 0.95 → false
    expect(result.wasCompacted).toBe(false);
  });

  it('配置 → 可自定义minTokens/maxTokens', () => {
    const customSM = new SessionMemoryCompact({
      minTokens: 500,
      minTextBlockMessages: 2,
      maxTokens: 5000
    });
    expect(customSM).toBeDefined();
  });
});
