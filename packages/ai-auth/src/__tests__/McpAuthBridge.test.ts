/** @suga/ai-auth — McpAuthBridge测试 */

import { describe, expect, it } from 'vitest';
import { McpAuthBridge } from '../flow/McpAuthBridge';
import { createInMemoryAuthProvider } from '../provider/InMemoryAuthImpl';

const defaultConfig = {
  serverName: 'test-server',
  serverUrl: 'https://mcp.example.com',
  redirectUri: 'http://localhost:3118/callback'
};

describe('McpAuthBridge', () => {
  it('构造 → 创建bridge实例', () => {
    const { provider, crypto } = createInMemoryAuthProvider(defaultConfig);
    const bridge = new McpAuthBridge(provider, crypto, defaultConfig);
    expect(bridge).toBeDefined();
  });

  it('构造 → 带onAuthComplete回调', () => {
    const { provider, crypto } = createInMemoryAuthProvider(defaultConfig);
    const completions: string[] = [];
    const bridge = new McpAuthBridge(provider, crypto, defaultConfig, async name => {
      completions.push(name);
    });
    expect(bridge).toBeDefined();
  });

  it('markNeedsAuth → 无错误', () => {
    const { provider, crypto } = createInMemoryAuthProvider(defaultConfig);
    const bridge = new McpAuthBridge(provider, crypto, defaultConfig);
    bridge.markNeedsAuth('test-server');
  });

  it('markAuthComplete → 调用回调', async () => {
    const { provider, crypto } = createInMemoryAuthProvider(defaultConfig);
    const completions: string[] = [];
    const bridge = new McpAuthBridge(provider, crypto, defaultConfig, async name => {
      completions.push(name);
    });

    await bridge.markAuthComplete('test-server');
    expect(completions).toEqual(['test-server']);
  });

  it('markAuthComplete → 无回调时无错误', async () => {
    const { provider, crypto } = createInMemoryAuthProvider(defaultConfig);
    const bridge = new McpAuthBridge(provider, crypto, defaultConfig);
    await bridge.markAuthComplete('test-server');
  });

  it('handleStepUpRequired → markStepUpPending', async () => {
    const { provider, storage, crypto } = createInMemoryAuthProvider(defaultConfig);
    const serverKey = provider.getServerKey();

    // 保存初始token
    storage.update({
      [serverKey]: {
        serverName: 'test-server',
        serverUrl: 'https://mcp.example.com',
        accessToken: 'atk',
        refreshToken: 'rtk',
        expiresAt: Date.now() + 3600000,
        scope: 'openid'
      }
    });

    const bridge = new McpAuthBridge(provider, crypto, defaultConfig);
    bridge.handleStepUpRequired('test-server', 'admin');

    // step-up pending时tokens()返回不含refreshToken
    const tokens = await provider.tokens();
    expect(tokens?.refreshToken).toBe('');
  });

  it('handleStepUpRequired → markNeedsAuth', () => {
    const { provider, crypto } = createInMemoryAuthProvider(defaultConfig);
    const bridge = new McpAuthBridge(provider, crypto, defaultConfig);

    // 不应抛出错误
    bridge.handleStepUpRequired('test-server', 'admin');
  });
});
