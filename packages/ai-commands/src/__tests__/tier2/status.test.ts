/** /status 命令测试 */

import { describe, expect, it } from 'vitest';
import { buildStatusPrompt, statusSkill } from '../../commands/tier2/status';
import { MockSessionInfoProvider } from '../mocks/MockSessionInfoProvider';

describe('buildStatusPrompt — 纯函数', () => {
  it('标准状态 → 包含会话信息', () => {
    const prompt = buildStatusPrompt({
      sessionStatus: { sessionId: 's1', turnCount: 5, status: 'active' },
      tokenUsage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
      cost: { totalCost: 0.05, inputCost: 0.03, outputCost: 0.02 },
      durationMs: 180000,
      model: 'claude-sonnet-4-6'
    });
    expect(prompt).toContain('s1');
    expect(prompt).toContain('claude-sonnet-4-6');
    expect(prompt).toContain('3m');
  });

  it('verbose → 包含详细 token 信息', () => {
    const prompt = buildStatusPrompt({
      sessionStatus: { sessionId: 's1', turnCount: 5, status: 'active' },
      tokenUsage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
      cost: { totalCost: 0.05, inputCost: 0.03, outputCost: 0.02 },
      durationMs: 180000,
      model: 'sonnet',
      verbose: true
    });
    expect(prompt).toContain('Input tokens');
  });
});

describe('statusSkill — SkillDefinition', () => {
  it('name 和 aliases', () => {
    expect(statusSkill.name).toBe('status');
    expect(statusSkill.aliases).toContain('st');
  });

  it('disableModelInvocation → true', () => {
    expect(statusSkill.disableModelInvocation).toBe(true);
  });

  it('无 sessionInfoProvider → 返回错误', async () => {
    const result = await statusSkill.getPromptForCommand('', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('Error');
    expect(result.content).toContain('SessionInfoProvider');
  });

  it('有 sessionInfoProvider → 生成 status prompt', async () => {
    const sessionProvider = new MockSessionInfoProvider();
    const result = await statusSkill.getPromptForCommand('', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      sessionInfoProvider: sessionProvider
    } as any);
    expect(result.content).toContain('Session Status');
  });

  it('verbose 参数 → 详细输出', async () => {
    const sessionProvider = new MockSessionInfoProvider();
    const result = await statusSkill.getPromptForCommand('verbose', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      sessionInfoProvider: sessionProvider
    } as any);
    expect(result.content).toContain('Input tokens');
  });
});
