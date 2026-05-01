/** PromptCacheBridge + CacheBreakDetector 测试 */

import { z } from 'zod';
import { ToolRegistry, buildTool } from '@suga/ai-tool-core';
import { describe, expect, it } from 'vitest';
import {
  assembleChildMessages,
  buildPlaceholderResults,
  extractCacheSafeParams
} from '../cache/PromptCacheBridge';
import { detectBreak } from '../cache/CacheBreakDetector';
import type { SubagentDefinition } from '../types/subagent';
import { MockLLMProvider } from './mocks/MockLLMProvider';

const makeTool = (name: string) =>
  buildTool({
    name,
    inputSchema: z.object({}),
    call: async () => ({ data: `${name} result` }),
    description: async () => name,
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    safetyLabel: () => 'readonly'
  });

const makeDef = (
  agentType: string,
  overrides?: Partial<SubagentDefinition>
): SubagentDefinition => ({
  agentType,
  whenToUse: `使用 ${agentType}`,
  ...overrides
});

describe('PromptCacheBridge', () => {
  it('extractCacheSafeParams — useExactTools=true 时继承全部工具', () => {
    const provider = new MockLLMProvider();
    const registry = new ToolRegistry({
      tools: [makeTool('read'), makeTool('write')],
      allowOverride: true
    });
    const def = makeDef('all-tools'); // 无白名单 → useExactTools=true

    const params = extractCacheSafeParams(provider, registry, def);

    expect(params.useExactTools).toBe(true);
    expect(params.toolDefinitions).toHaveLength(2);
    expect(params.systemPrompt).toBe('');
  });

  it('extractCacheSafeParams — 有白名单时筛选工具 + systemPromptPrefix', () => {
    const provider = new MockLLMProvider();
    const registry = new ToolRegistry({
      tools: [makeTool('read'), makeTool('write'), makeTool('search')],
      allowOverride: true
    });
    const def = makeDef('whitelist', {
      tools: ['read', 'search'],
      systemPromptPrefix: '你是一个代码探索器'
    });

    const params = extractCacheSafeParams(provider, registry, def);

    expect(params.useExactTools).toBe(false);
    expect(params.toolDefinitions).toHaveLength(2);
    expect(params.systemPrompt).toBe('你是一个代码探索器');
  });

  it('buildPlaceholderResults — 所有 placeholder 使用同一文本', () => {
    const toolUses = [
      { id: 'tu_1', name: 'search', input: {} },
      { id: 'tu_2', name: 'read', input: {} }
    ];

    const placeholders = buildPlaceholderResults(toolUses);

    expect(placeholders).toHaveLength(2);
    expect(placeholders[0].toolUseId).toBe('tu_1');
    expect(placeholders[0].placeholderText).toBe('Fork started -- processing in background');
    expect(placeholders[0].isPlaceholder).toBe(true);
    expect(placeholders[1].placeholderText).toBe(placeholders[0].placeholderText); // 同一文本
  });

  it('assembleChildMessages — 组装父历史+placeholder+directive', () => {
    const parentHistory = [
      { id: 'msg_1', role: 'user' as const, content: 'hello', timestamp: Date.now() }
    ];
    const placeholders = [
      {
        toolUseId: 'tu_1',
        placeholderText: 'Fork started -- processing in background',
        isPlaceholder: true as const
      }
    ];
    const directive = '搜索代码中的错误处理';

    const messages = assembleChildMessages(parentHistory, placeholders, directive);

    expect(messages).toHaveLength(3); // parent + placeholder + directive
    expect(messages[0]).toEqual(parentHistory[0]); // 父历史保留
    expect(messages[1].role).toBe('tool_result'); // placeholder
    expect(messages[2].role).toBe('user'); // directive
    if (messages[2].role === 'user') {
      expect(messages[2].content).toBe(directive);
    }
  });
});

describe('CacheBreakDetector', () => {
  it('detectBreak — 参数完全相同 → 无 break', () => {
    const params = {
      systemPrompt: '你是一个助手',
      toolDefinitions: [{ name: 'read', description: '读取文件', inputSchema: {} }],
      useExactTools: true
    };

    const result = detectBreak(params, params);
    expect(result.broke).toBe(false);
  });

  it('detectBreak — systemPrompt 变化 → break', () => {
    const parent = {
      systemPrompt: '你是一个助手',
      toolDefinitions: [{ name: 'read', description: '读取文件', inputSchema: {} }],
      useExactTools: true
    };
    const child = {
      systemPrompt: '你是一个代码探索器',
      toolDefinitions: [{ name: 'read', description: '读取文件', inputSchema: {} }],
      useExactTools: true
    };

    const result = detectBreak(parent, child);
    expect(result.broke).toBe(true);
    expect(result.reason).toBe('system_prompt_changed');
    expect(result.estimatedLostTokens).toBeGreaterThan(0);
  });

  it('detectBreak — 工具数量变化 → break', () => {
    const parent = {
      systemPrompt: '相同提示',
      toolDefinitions: [
        { name: 'read', description: '读取文件', inputSchema: {} },
        { name: 'write', description: '写入文件', inputSchema: {} }
      ],
      useExactTools: true
    };
    const child = {
      systemPrompt: '相同提示',
      toolDefinitions: [{ name: 'read', description: '读取文件', inputSchema: {} }],
      useExactTools: true
    };

    const result = detectBreak(parent, child);
    expect(result.broke).toBe(true);
    expect(result.reason).toBe('tool_count_changed');
  });

  it('detectBreak — useExactTools 策略变化 → break', () => {
    const parent = {
      systemPrompt: '相同提示',
      toolDefinitions: [{ name: 'read', description: '读取文件', inputSchema: {} }],
      useExactTools: true
    };
    const child = {
      systemPrompt: '相同提示',
      toolDefinitions: [{ name: 'read', description: '读取文件', inputSchema: {} }],
      useExactTools: false
    };

    const result = detectBreak(parent, child);
    expect(result.broke).toBe(true);
    expect(result.reason).toBe('use_exact_tools_changed');
  });
});
