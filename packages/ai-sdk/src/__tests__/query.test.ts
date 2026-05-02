/** SDK query() 测试 — setQueryEngine 注入 + 真实调用 */

import { describe, expect, it } from 'vitest';
import type { SDKMessage } from '../sdk/sdkMessages';
import { query, setQueryEngine, unstable_v2_prompt } from '../api/query';
import type { QueryEngineLike } from '../api/query';

/** Mock QueryEngine — 返回固定 SDKMessage 序列 */
class MockQueryEngine implements QueryEngineLike {
  private readonly responses: SDKMessage[];

  constructor(responses: SDKMessage[]) {
    this.responses = responses;
  }

  async *query(_prompt: string, _options?: any): AsyncIterable<SDKMessage> {
    for (const msg of this.responses) {
      yield msg;
    }
  }
}

describe('SDK query()', () => {
  it('setQueryEngine注入 + query正常返回', async () => {
    const mockEngine = new MockQueryEngine([
      {
        type: 'system',
        subtype: 'init',
        cwd: '/',
        tools: [],
        model: 'test',
        permissionMode: 'default',
        slash_commands: [],
        mcp_servers: []
      },
      {
        type: 'result',
        subtype: 'success',
        result: 'ok',
        duration_ms: 100,
        is_error: false,
        num_turns: 1
      }
    ]);

    setQueryEngine(mockEngine);

    const msgs: SDKMessage[] = [];
    for await (const msg of query('hello')) {
      msgs.push(msg);
    }

    expect(msgs).toHaveLength(2);
    expect(msgs[0].type).toBe('system');
    expect(msgs[1].type).toBe('result');
  });

  it('未注入 → throw错误', () => {
    // 清除注入
    setQueryEngine(null as any);

    try {
      query('test');
      expect.unreachable('应抛出错误');
    } catch (err) {
      expect((err as Error).message).toContain('setQueryEngine');
    }
  });

  it('unstable_v2_prompt → 同query', async () => {
    const mockEngine = new MockQueryEngine([
      {
        type: 'result',
        subtype: 'success',
        result: 'v2',
        duration_ms: 50,
        is_error: false,
        num_turns: 1
      }
    ]);

    setQueryEngine(mockEngine);

    const msgs: SDKMessage[] = [];
    for await (const msg of unstable_v2_prompt('hello')) {
      msgs.push(msg);
    }

    expect(msgs).toHaveLength(1);
    expect(msgs[0].type).toBe('result');
  });
});
