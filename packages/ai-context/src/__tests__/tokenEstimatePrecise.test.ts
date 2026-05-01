/** estimateTokensPrecise 测试 — 分 block 类型精确估算 */

import { describe, expect, it } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import {
  TOKEN_ESTIMATE_COEFFICIENTS,
  estimateTokens,
  estimateTokensPrecise,
  looksLikeJson
} from '../utils/tokenEstimate';

const userMsg = (content: string): AgentMessage => ({
  id: 'u1',
  role: 'user',
  content,
  timestamp: Date.now()
});

const assistantMsg = (
  content: string,
  toolUses: { id: string; name: string; input: Record<string, unknown> }[] = []
): AgentMessage => ({
  id: 'a1',
  role: 'assistant',
  content,
  toolUses,
  timestamp: Date.now()
});

const toolResultMsg = (result: string, toolUseId: string): AgentMessage => ({
  id: 'tr1',
  role: 'tool_result',
  toolUseId,
  toolName: 'test',
  result,
  isSuccess: true,
  timestamp: Date.now()
});

describe('estimateTokensPrecise', () => {
  it('普通文本 — chars/4 * 4/3 padding', () => {
    const msg = userMsg('Hello world test message');
    const result = estimateTokensPrecise([msg]);
    // 24 chars / 4 = 6 → 6 * 4/3 = 8 → 8
    expect(result).toBe(8);
  });

  it('JSON 内容 — chars/2 * 4/3 padding', () => {
    const jsonContent = '{"key": "value", "data": [1, 2, 3]}';
    const msg = userMsg(jsonContent);
    const result = estimateTokensPrecise([msg]);
    expect(result).toBe(24);
  });

  it('tool_use block — input JSON chars/2 + 50 overhead * 4/3', () => {
    const msg = assistantMsg('result', [
      { id: 'tu1', name: 'read', input: { path: '/src/index.ts' } }
    ]);
    const result = estimateTokensPrecise([msg]);
    // content: 6 chars / 4 = 2
    // tool_use input JSON: 24 chars / 2 = 12 + 50 overhead = 62
    // total: 2 + 62 = 64 * 4/3 = 85.33 → 86
    expect(result).toBe(86);
  });

  it('tool_result JSON — chars/2 * 4/3', () => {
    const msg = toolResultMsg('{ "output": "file content here" }', 'tu1');
    const result = estimateTokensPrecise([msg]);
    // 33 chars / 2 = 16.5 → 17, * 4/3 = 22.67 → 23
    expect(result).toBe(23);
  });

  it('混合消息精确估算 vs 旧估算差异', () => {
    const messages: AgentMessage[] = [
      userMsg('Search for files'),
      assistantMsg('Found 3 files', [{ id: 'tu1', name: 'search', input: { pattern: '*.ts' } }]),
      toolResultMsg('{ "files": ["a.ts", "b.ts", "c.ts"] }', 'tu1')
    ];

    const rough = estimateTokens(messages);
    const precise = estimateTokensPrecise(messages);

    // 精确估算应更高（4/3 padding + JSON 密度）
    expect(precise).toBeGreaterThanOrEqual(rough);
  });

  it('looksLikeJson 辅助函数', () => {
    expect(looksLikeJson('{"key": "value"}')).toBe(true);
    expect(looksLikeJson('[1, 2, 3]')).toBe(true);
    expect(looksLikeJson('normal text')).toBe(false);
    expect(looksLikeJson('"":value')).toBe(true);
  });

  it('TOKEN_ESTIMATE_COEFFICIENTS 常量验证', () => {
    expect(TOKEN_ESTIMATE_COEFFICIENTS.textRatio).toBe(4);
    expect(TOKEN_ESTIMATE_COEFFICIENTS.jsonRatio).toBe(2);
    expect(TOKEN_ESTIMATE_COEFFICIENTS.conservativePadding).toBeCloseTo(4 / 3);
    expect(TOKEN_ESTIMATE_COEFFICIENTS.toolUseOverhead).toBe(50);
    expect(TOKEN_ESTIMATE_COEFFICIENTS.imageTokenEstimate).toBe(2000);
  });

  it('向后兼容 — 旧 estimateTokens 仍可用', () => {
    const msg = userMsg('Hello');
    const oldResult = estimateTokens([msg]);
    expect(oldResult).toBe(2); // 5 chars / 4 = 1.25 → 2
  });
});
