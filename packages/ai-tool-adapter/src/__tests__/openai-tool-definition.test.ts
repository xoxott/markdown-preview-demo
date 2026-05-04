/** openai-tool-definition 测试 — AnyBuiltTool → OpenAI ToolDefinition / OpenAIToolDef */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { buildTool } from '@suga/ai-tool-core';
import {
  formatOpenAIApiToolDef,
  formatOpenAIToolDefinition
} from '../convert/openai-tool-definition';

describe('formatOpenAIToolDefinition', () => {
  it('应返回包含 name 和 inputSchema 的 ToolDefinition', () => {
    const tool = buildTool({
      name: 'calc',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      call: async args => ({ data: args.a + args.b }),
      description: async () => '加法'
    });

    const result = formatOpenAIToolDefinition(tool);

    expect(result.name).toBe('calc');
    expect(result.inputSchema).toBeDefined();
    expect((result.inputSchema as any).type).toBe('object');
  });
});

describe('formatOpenAIApiToolDef', () => {
  it('应返回 OpenAI API 格式 { type: function, function: { name, description, parameters } }', () => {
    const tool = buildTool({
      name: 'search',
      inputSchema: z.object({ query: z.string() }),
      call: async args => ({ data: args.query }),
      description: async () => '搜索'
    });

    const result = formatOpenAIApiToolDef(tool);

    expect(result.type).toBe('function');
    expect(result.function.name).toBe('search');
    expect(result.function.parameters).toBeDefined();
    expect((result.function.parameters as any).type).toBe('object');
  });

  it('parameters 对应 inputSchema（字段名不同）', () => {
    const tool = buildTool({
      name: 'get_weather',
      inputSchema: z.object({ city: z.string() }),
      call: async args => ({ data: args.city }),
      description: async () => '天气'
    });

    const toolDef = formatOpenAIToolDefinition(tool);
    const apiDef = formatOpenAIApiToolDef(tool);

    // ToolDefinition.inputSchema === OpenAIToolDef.function.parameters
    expect(toolDef.inputSchema).toEqual(apiDef.function.parameters);
  });
});
