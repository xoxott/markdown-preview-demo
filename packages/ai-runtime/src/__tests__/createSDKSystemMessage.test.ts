/** createSDKSystemMessage 测试 — SDK系统初始化消息构造 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import type { RuntimeConfig } from '../types/config';
import { createSDKSystemMessage } from '../sdk/createSDKSystemMessage';
import { MockLLMProvider } from './mocks/MockLLMProvider';

describe('createSDKSystemMessage', () => {
  it('默认配置 → 系统初始化消息', () => {
    const config: RuntimeConfig = { provider: new MockLLMProvider() };
    const msg = createSDKSystemMessage(config);

    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('init');
    expect(msg.cwd).toBeDefined();
    expect(msg.tools).toEqual([]);
    expect(msg.permissionMode).toBe('default');
  });

  it('带toolRegistry → 工具名列表', () => {
    const registry = new ToolRegistry();
    // ToolRegistry默认有skill工具（SkillTool）
    const tools = registry.getAll();
    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
      toolRegistry: registry
    };
    const msg = createSDKSystemMessage(config);

    expect(msg.tools.length).toBe(tools.length);
    if (tools.length > 0) {
      expect(msg.tools).toContain(tools[0].name);
    }
  });
});
