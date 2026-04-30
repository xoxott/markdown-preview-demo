/** formatAnthropicToolDefinition 测试 — 工具定义转换 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { buildTool } from '@suga/ai-tool-core';
import {
  formatAnthropicApiToolDef,
  formatAnthropicToolDefinition
} from '../convert/tool-definition';

describe('formatAnthropicToolDefinition', () => {
  it('应返回 ToolDefinition 格式（inputSchema 字段）', () => {
    const tool = buildTool({
      name: 'calc',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      call: async args => ({ data: args.a + args.b }),
      description: async () => '加法'
    });

    const result = formatAnthropicToolDefinition(tool);

    expect(result.name).toBe('calc');
    expect(result.description).toBe('');
    expect(result.inputSchema).toBeDefined();
    expect((result.inputSchema as any).type).toBe('object');
  });

  it('description 应为静态空占位', () => {
    const tool = buildTool({
      name: 'test',
      inputSchema: z.object({ msg: z.string() }),
      call: async () => ({ data: 'ok' }),
      description: async () => '动态描述'
    });

    const result = formatAnthropicToolDefinition(tool);
    expect(result.description).toBe('');
  });
});

describe('formatAnthropicApiToolDef', () => {
  it('应使用 input_schema 字段名（Anthropic 格式）', () => {
    const tool = buildTool({
      name: 'read',
      inputSchema: z.object({ path: z.string() }),
      call: async () => ({ data: 'content' }),
      description: async () => '读取文件'
    });

    const result = formatAnthropicApiToolDef(tool);

    expect(result.name).toBe('read');
    expect(result.input_schema).toBeDefined();
    expect((result.input_schema as any).type).toBe('object');
  });

  it('input_schema 不应包含 $schema 元字段', () => {
    const tool = buildTool({
      name: 'test',
      inputSchema: z.object({ x: z.number() }),
      call: async () => ({ data: 1 }),
      description: async () => 'test'
    });

    const result = formatAnthropicApiToolDef(tool);
    expect((result.input_schema as any).$schema).toBeUndefined();
  });
});
