/** createSDKSystemMessage — SDK会话初始化系统消息构造 */

import type { SDKSystemMessage } from '@suga/ai-sdk';
import type { RuntimeConfig } from '../types/config';

/**
 * 创建 SDK 系统初始化消息
 *
 * 在 query() 首次 yield 前产出，告知 SDK 消费者会话的环境配置： cwd、可用工具、模型、权限模式等。
 *
 * 对齐 Claude Code 的 SDKSystemMessage(init) 格式。
 */
export function createSDKSystemMessage(config: RuntimeConfig): SDKSystemMessage {
  const effectiveRegistry = config.toolRegistry;
  const toolNames = effectiveRegistry ? effectiveRegistry.getAll().map(t => t.name) : [];

  return {
    type: 'system',
    subtype: 'init',
    cwd: typeof process !== 'undefined' && process.cwd ? process.cwd() : '/',
    tools: toolNames,
    model: 'unknown', // model信息需从provider获取，当前LLMProvider接口无model字段
    permissionMode: 'default',
    slash_commands: [],
    mcp_servers: []
  };
}
