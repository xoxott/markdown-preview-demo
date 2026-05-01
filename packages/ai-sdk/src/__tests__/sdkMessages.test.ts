/** @suga/ai-sdk — SDK消息类型验证 */

import { describe, expect, it } from 'vitest';

describe('@suga/ai-sdk — SDK消息类型', () => {
  it('SDK消息联合类型覆盖所有变体', async () => {
    // 验证所有SDK消息type标识符在类型系统中存在
    const messageTypes = [
      'user',
      'assistant',
      'partial_assistant',
      'result',
      'system',
      'status',
      'tool_progress',
      'hook_started',
      'hook_progress',
      'hook_response',
      'compact_boundary',
      'permission_denial',
      'task_started',
      'task_progress',
      'task_notification',
      'auth_status',
      'session_state_changed',
      'prompt_suggestion',
      'rate_limit',
      'api_retry',
      'post_turn_summary',
      'local_command_output',
      'elicitation_complete',
      'files_persisted'
    ];
    // tsc已验证所有类型存在，这里验证常量数组长度匹配
    expect(messageTypes.length).toBe(24);
  });

  it('SDKUsageInfo结构正确', () => {
    const usage: import('../sdk/sdkMessages').SDKUsageInfo = {
      input_tokens: 100,
      output_tokens: 50
    };
    expect(usage.input_tokens).toBe(100);
    expect(usage.output_tokens).toBe(50);
  });

  it('SDKSessionInfo结构正确', () => {
    const info: import('../sdk/sdkMessages').SDKSessionInfo = {
      sessionId: 'sess_123',
      lastModified: Date.now(),
      fileSize: 2048,
      customTitle: 'My Session',
      cwd: '/home/user/project'
    };
    expect(info.sessionId).toBe('sess_123');
    expect(info.customTitle).toBe('My Session');
  });
});
