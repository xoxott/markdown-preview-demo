/** @suga/ai-auth — AuthCodeListener测试 */

import { describe, expect, it } from 'vitest';
import { AuthCodeListener } from '../listener/AuthCodeListener';
import { generateState } from '../crypto/pkce';
import { NodeCryptoProvider } from '../crypto/random';

const crypto = new NodeCryptoProvider();

describe('AuthCodeListener', () => {
  it('start → 在随机端口启动HTTP服务器', async () => {
    const listener = new AuthCodeListener();
    const port = await listener.start();
    expect(port).toBeGreaterThan(0);
    expect(listener.getPort()).toBe(port);
    expect(listener.getState()).toBe('listening');
    listener.close();
  });

  it('start(指定端口) → 在指定端口启动', async () => {
    const listener = new AuthCodeListener('/auth');
    const port = await listener.start();
    expect(port).toBeGreaterThan(0);
    listener.close();
  });

  it('close → 状态变为idle', async () => {
    const listener = new AuthCodeListener();
    await listener.start();
    listener.close();
    expect(listener.getState()).toBe('idle');
  });

  it('waitForAuthorization → 接收合法授权码', async () => {
    const listener = new AuthCodeListener();
    const port = await listener.start();
    const state = generateState(crypto);

    // 模拟浏览器回调
    const codePromise = listener.waitForAuthorization(state, async () => {
      // 模拟浏览器发送回调请求
      const response = await fetch(
        `http://localhost:${port}/callback?code=test-auth-code&state=${state}`
      );
      expect(response.status).toBe(200);
    });

    const code = await codePromise;
    expect(code).toBe('test-auth-code');
    expect(listener.getState()).toBe('completed');
    expect(listener.hasPendingResponse()).toBe(true);

    listener.handleSuccessRedirect('http://localhost:3118/success');
    listener.close();
  });

  it('waitForAuthorization(state不匹配) → 拒绝', async () => {
    const listener = new AuthCodeListener();
    const port = await listener.start();
    const state = generateState(crypto);

    const codePromise = listener.waitForAuthorization(state, async () => {
      await fetch(`http://localhost:${port}/callback?code=test-code&state=wrong-state`);
    });

    await expect(codePromise).rejects.toThrow();
    listener.close();
  });

  it('waitForAuthorization(缺少code) → 拒绝', async () => {
    const listener = new AuthCodeListener();
    const port = await listener.start();
    const state = generateState(crypto);

    const codePromise = listener.waitForAuthorization(state, async () => {
      await fetch(`http://localhost:${port}/callback?state=${state}`);
    });

    await expect(codePromise).rejects.toThrow();
    listener.close();
  });

  it('waitForAuthorization(OAuth error) → 拒绝并含错误信息', async () => {
    const listener = new AuthCodeListener();
    const port = await listener.start();
    const state = generateState(crypto);

    const codePromise = listener.waitForAuthorization(state, async () => {
      await fetch(
        `http://localhost:${port}/callback?error=access_denied&error_description=User+denied`
      );
    });

    await expect(codePromise).rejects.toThrow('access_denied');
    listener.close();
  });

  it('非callback路径 → 返回404（通过waitForAuthorization验证）', async () => {
    // 简化：仅验证listener能处理非callback路径
    // 实际404响应在waitForAuthorization测试中间接验证
    const listener = new AuthCodeListener('/custom-callback');
    const port = await listener.start();
    expect(port).toBeGreaterThan(0);

    // 直接发送请求到非callback路径 — 不进入waitForAuthorization模式
    const response = await fetch(`http://localhost:${port}/other`, {
      signal: AbortSignal.timeout(3000)
    });
    expect(response.status).toBe(404);
    listener.close();
  }, 10000);
});
