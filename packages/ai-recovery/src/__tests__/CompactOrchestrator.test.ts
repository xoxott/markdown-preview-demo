/** @suga/ai-recovery — CompactOrchestrator测试 */

import { describe, expect, it } from 'vitest';
import { CompactOrchestrator } from '../core/CompactOrchestrator';
import type { CompactHostProvider, CompactMessage } from '../types/compact';

class MockOrchestratorHostProvider implements CompactHostProvider {
  private tokenCount = 100000;
  private maxTokens = 200000;

  setTokenCount(count: number) {
    this.tokenCount = count;
  }
  setMaxTokens(max: number) {
    this.maxTokens = max;
  }

  async getCurrentTokenCount() {
    return this.tokenCount;
  }
  getMaxTokens() {
    return this.maxTokens;
  }
  async summarizeConversation() {
    return 'LLM summary';
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

describe('CompactOrchestrator', () => {
  const hostProvider = new MockOrchestratorHostProvider();
  const orchestrator = new CompactOrchestrator();

  const sampleMessages: CompactMessage[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Response' }
  ];

  it('compact → 无需压缩时返回wasCompacted=false', async () => {
    hostProvider.setTokenCount(150000);
    hostProvider.setMaxTokens(200000);
    const result = await orchestrator.compact(sampleMessages, hostProvider);
    expect(result.wasCompacted).toBe(false);
  });

  it('shouldAutoCompact → threshold以上返回true', () => {
    expect(orchestrator.shouldAutoCompact(195000, 200000)).toBe(true);
  });

  it('shouldAutoCompact → threshold以下返回false', () => {
    expect(orchestrator.shouldAutoCompact(150000, 200000)).toBe(false);
  });

  it('compact → 超threshold时触发LLM压缩', async () => {
    hostProvider.setTokenCount(195000);
    hostProvider.setMaxTokens(200000);
    const result = await orchestrator.compact(sampleMessages, hostProvider);
    expect(result.wasCompacted).toBe(true);
    expect(result.strategy).toBe('llm');
  });

  it('reset → 重置所有状态', () => {
    orchestrator.reset();
    expect(orchestrator.shouldAutoCompact(195000, 200000)).toBe(true);
  });

  it('配置 → 自定义threshold', () => {
    const custom = new CompactOrchestrator({
      autoCompact: { drainThreshold: 0.8 }
    });
    expect(custom.shouldAutoCompact(160000, 200000)).toBe(true);
    expect(custom.shouldAutoCompact(150000, 200000)).toBe(false);
  });
});
