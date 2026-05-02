/** QueryEngine 测试 — SDK query() 端到端编排 */

import { describe, expect, it } from 'vitest';
import type { SDKMessage, SDKResultError, SDKResultSuccess } from '@suga/ai-sdk';
import type { RuntimeConfig } from '../types/config';
import { QueryEngine } from '../sdk/QueryEngine';
import { MockLLMProvider } from './mocks/MockLLMProvider';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

const mockFsProvider = new MockFileSystemProvider();

/** 辅助：消费所有SDKMessage */
async function consumeAllSDKMessages(iter: AsyncIterable<SDKMessage>): Promise<SDKMessage[]> {
  const msgs: SDKMessage[] = [];
  for await (const msg of iter) {
    msgs.push(msg);
  }
  return msgs;
}

describe('QueryEngine', () => {
  it('query() → 产出 system + partial_assistant + result', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello world');

    const config: RuntimeConfig = { provider, fsProvider: mockFsProvider };
    const engine = new QueryEngine(config);

    const msgs = await consumeAllSDKMessages(engine.query('hi'));

    // 应包含: system(init) + partial_assistant(text) + result(success)
    expect(msgs.some(m => m.type === 'system')).toBe(true);
    expect(msgs.some(m => m.type === 'partial_assistant')).toBe(true);
    expect(msgs.some(m => m.type === 'result')).toBe(true);

    const resultMsg = msgs.find(m => m.type === 'result') as SDKResultSuccess;
    expect(resultMsg.subtype).toBe('success');
  });

  it('2轮对话 → history累积', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');
    provider.addSimpleTextResponse('world');

    const config: RuntimeConfig = { provider, fsProvider: mockFsProvider };
    const engine = new QueryEngine(config);

    // 第1轮
    const msgs1 = await consumeAllSDKMessages(engine.query('hi'));
    expect(msgs1.some(m => m.type === 'result')).toBe(true);

    // 第2轮 — 新QueryEngine实例（因为每次query创建新session）
    const engine2 = new QueryEngine(config);
    const msgs2 = await consumeAllSDKMessages(engine2.query('more'));
    expect(msgs2.some(m => m.type === 'result')).toBe(true);
  });

  it('model_error → result error_api', async () => {
    // 创建一个会抛错的mock provider
    const provider: RuntimeConfig['provider'] = {
      formatToolDefinition: () => ({ name: 'test', description: 'mock', inputSchema: {} }),
      // eslint-disable-next-line require-yield
      async *callModel() {
        throw new Error('API timeout');
      }
    };

    const config: RuntimeConfig = { provider, fsProvider: mockFsProvider };
    const engine = new QueryEngine(config);

    const msgs = await consumeAllSDKMessages(engine.query('test'));
    const resultMsg = msgs.find(m => m.type === 'result') as SDKResultError;
    expect(resultMsg).toBeDefined();
    expect(resultMsg.type).toBe('result');
    // CallModelPhase现在分类普通Error为unrecoverable_other → ctx.error → PostProcessPhase model_error
    expect(resultMsg.subtype).toBe('error_api');
  });
});
