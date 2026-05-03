/** P54 测试 — ToolSearch 工具搜索发现引擎 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ToolRegistry, buildTool } from '@suga/ai-tool-core';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import {
  isDeferredTool,
  parseQuery,
  parseToolName,
  scoreTool,
  searchToolsWithKeywords,
  toolSearchTool
} from '../tools/tool-search';
import type { ParsedQuery } from '../tools/tool-search';

// ============================================================
// 工具名解析测试
// ============================================================

describe('parseToolName', () => {
  it('MCP 工具名 — mcp__server__tool', () => {
    expect(parseToolName('mcp__slack__send_message')).toEqual(['mcp', 'slack', 'send_message']);
  });

  it('CamelCase — FileReadTool', () => {
    expect(parseToolName('FileRead')).toEqual(['file', 'read']);
  });

  it('kebab-case — file-read', () => {
    expect(parseToolName('file-read')).toEqual(['file', 'read']);
  });

  it('kebab-case — tool-search', () => {
    expect(parseToolName('tool-search')).toEqual(['tool', 'search']);
  });

  it('单词名 — bash', () => {
    expect(parseToolName('bash')).toEqual(['bash']);
  });

  it('MCP双段 — mcp__github', () => {
    expect(parseToolName('mcp__github')).toEqual(['mcp', 'github']);
  });
});

// ============================================================
// 查询解析测试
// ============================================================

describe('parseQuery', () => {
  it('select 模式 — select:Read,Edit', () => {
    const result = parseQuery('select:Read,Edit,Grep');
    expect(result.mode).toBe('select');
    expect(result.names).toEqual(['Read', 'Edit', 'Grep']);
  });

  it('+prefix 模式 — +slack send', () => {
    const result = parseQuery('+slack send');
    expect(result.mode).toBe('prefix');
    expect(result.required).toEqual(['slack']);
    expect(result.optional).toEqual(['send']);
  });

  it('keyword 模式 — notebook jupyter', () => {
    const result = parseQuery('notebook jupyter');
    expect(result.mode).toBe('keyword');
    expect(result.keywords).toEqual(['notebook', 'jupyter']);
  });

  it('单关键词 — file', () => {
    const result = parseQuery('file');
    expect(result.mode).toBe('keyword');
    expect(result.keywords).toEqual(['file']);
  });

  it('多个 +prefix — +mcp +slack send', () => {
    const result = parseQuery('+mcp +slack send');
    expect(result.mode).toBe('prefix');
    expect(result.required).toEqual(['mcp', 'slack']);
    expect(result.optional).toEqual(['send']);
  });
});

// ============================================================
// 评分算法测试
// ============================================================

describe('scoreTool', () => {
  const mockTool = buildTool({
    name: 'file-read',
    inputSchema: z.object({ path: z.string() }),
    call: async () => ({ data: '' }),
    description: async () => 'Read file content',
    searchHint: 'read file content view',
    isReadOnly: () => true,
    safetyLabel: () => 'readonly'
  });

  const mockMcpTool = buildTool({
    name: 'mcp__slack__send_message',
    inputSchema: z.object({ channel: z.string() }),
    call: async () => ({ data: '' }),
    description: async () => 'Send message to Slack channel',
    searchHint: 'slack messaging communication'
  });

  it('精确名匹配 — file-read vs "file-read"', () => {
    expect(scoreTool(mockTool, ['file-read'])).toBe(10);
  });

  it('词段匹配 — file-read vs "file"', () => {
    expect(scoreTool(mockTool, ['file'])).toBeGreaterThanOrEqual(5);
  });

  it('MCP server名匹配 — mcp__slack__send_message vs "slack"', () => {
    const score = scoreTool(mockMcpTool, ['slack']);
    expect(score).toBeGreaterThanOrEqual(12);
  });

  it('searchHint匹配 — file-read vs "view"', () => {
    const score = scoreTool(mockTool, ['view']);
    expect(score).toBeGreaterThanOrEqual(4);
  });

  it('多关键词累计评分', () => {
    const score = scoreTool(mockTool, ['file', 'read']);
    expect(score).toBeGreaterThanOrEqual(5);
  });

  it('无匹配 → 0分', () => {
    expect(scoreTool(mockTool, ['docker'])).toBe(0);
  });
});

// ============================================================
// 延迟加载判定测试
// ============================================================

describe('isDeferredTool', () => {
  it('alwaysLoad=true → 从不延迟', () => {
    const tool = buildTool({
      name: 'bash',
      inputSchema: z.object({ command: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Execute bash command',
      alwaysLoad: true
    });
    expect(isDeferredTool(tool)).toBe(false);
  });

  it('ToolSearch 本身从不延迟', () => {
    expect(isDeferredTool(toolSearchTool)).toBe(false);
  });

  it('MCP 工具 → 默认延迟', () => {
    const mcpTool = buildTool({
      name: 'mcp__github__create_issue',
      inputSchema: z.object({ title: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Create GitHub issue'
    });
    expect(isDeferredTool(mcpTool)).toBe(true);
  });

  it('shouldDefer=true → 延迟', () => {
    const tool = buildTool({
      name: 'expensive-tool',
      inputSchema: z.object({ input: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Expensive tool',
      shouldDefer: true
    });
    expect(isDeferredTool(tool)).toBe(true);
  });

  it('普通工具 → 不延迟', () => {
    const tool = buildTool({
      name: 'file-read',
      inputSchema: z.object({ path: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Read file'
    });
    expect(isDeferredTool(tool)).toBe(false);
  });
});

// ============================================================
// 搜索算法测试
// ============================================================

describe('searchToolsWithKeywords', () => {
  // 创建一组测试工具
  const tools: AnyBuiltTool[] = [
    buildTool({
      name: 'file-read',
      inputSchema: z.object({ path: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Read file content',
      searchHint: 'read file content view',
      alwaysLoad: true,
      isReadOnly: () => true,
      safetyLabel: () => 'readonly'
    }),
    buildTool({
      name: 'file-write',
      inputSchema: z.object({ path: z.string(), content: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Write file content',
      searchHint: 'write file create save',
      alwaysLoad: true
    }),
    buildTool({
      name: 'file-edit',
      inputSchema: z.object({ path: z.string(), old: z.string(), new: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Edit file with old/new replacement',
      searchHint: 'edit modify replace file',
      alwaysLoad: true
    }),
    buildTool({
      name: 'bash',
      inputSchema: z.object({ command: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Execute shell commands',
      searchHint: 'shell execute run command terminal',
      alwaysLoad: true
    }),
    buildTool({
      name: 'glob',
      inputSchema: z.object({ pattern: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Search files by pattern',
      searchHint: 'file search pattern glob find',
      isReadOnly: () => true,
      safetyLabel: () => 'readonly'
    }),
    buildTool({
      name: 'grep',
      inputSchema: z.object({ pattern: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Search file contents',
      searchHint: 'search grep content pattern regex',
      isReadOnly: () => true,
      safetyLabel: () => 'readonly'
    }),
    buildTool({
      name: 'mcp__slack__send_message',
      inputSchema: z.object({ channel: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Send Slack message',
      searchHint: 'slack messaging communication',
      shouldDefer: true
    }),
    buildTool({
      name: 'notebook-edit',
      inputSchema: z.object({ path: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Edit Jupyter notebook cells',
      searchHint: 'notebook jupyter cell edit'
    })
  ];

  it('select 模式 — 精确名匹配', () => {
    const query: ParsedQuery = { mode: 'select', names: ['file-read', 'bash'] };
    const results = searchToolsWithKeywords(tools, query);
    expect(results).toContain('file-read');
    expect(results).toContain('bash');
    expect(results.length).toBe(2);
  });

  it('select 模式 — 部分匹配', () => {
    const query: ParsedQuery = { mode: 'select', names: ['Read', 'Edit'] };
    const results = searchToolsWithKeywords(tools, query);
    expect(results).toContain('file-read');
    expect(results).toContain('file-edit');
  });

  it('keyword 模式 — "file" 匹配多个文件工具', () => {
    const query: ParsedQuery = { mode: 'keyword', keywords: ['file'] };
    const results = searchToolsWithKeywords(tools, query, 5);
    expect(results.length).toBeGreaterThan(0);
    // file-read, file-write, file-edit 应排在前面
    expect(results).toContain('file-read');
  });

  it('keyword 模式 — "notebook" 匹配 notebook-edit', () => {
    const query: ParsedQuery = { mode: 'keyword', keywords: ['notebook'] };
    const results = searchToolsWithKeywords(tools, query, 3);
    expect(results).toContain('notebook-edit');
  });

  it('keyword 模式 — "jupyter" 匹配 notebook-edit（searchHint）', () => {
    const query: ParsedQuery = { mode: 'keyword', keywords: ['jupyter'] };
    const results = searchToolsWithKeywords(tools, query, 3);
    expect(results).toContain('notebook-edit');
  });

  it('prefix 模式 — +slack 匹配 MCP 工具', () => {
    const query: ParsedQuery = { mode: 'prefix', required: ['slack'], optional: [] };
    const results = searchToolsWithKeywords(tools, query, 5);
    expect(results).toContain('mcp__slack__send_message');
  });

  it('prefix 模式 — +file read 必须包含file', () => {
    const query: ParsedQuery = { mode: 'prefix', required: ['file'], optional: ['read'] };
    const results = searchToolsWithKeywords(tools, query, 3);
    // 所有结果必须包含 "file" 相关
    expect(results.length).toBeGreaterThan(0);
    expect(results).toContain('file-read');
  });

  it('maxResults 限制返回数量', () => {
    const query: ParsedQuery = { mode: 'keyword', keywords: ['file'] };
    const results = searchToolsWithKeywords(tools, query, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('空查询 → 无结果', () => {
    const query: ParsedQuery = { mode: 'keyword', keywords: ['xyznonexistent'] };
    const results = searchToolsWithKeywords(tools, query, 5);
    expect(results).toEqual([]);
  });
});

// ============================================================
// ToolSearchTool 工具定义测试
// ============================================================

describe('ToolSearchTool 定义', () => {
  it('name 为 tool-search', () => {
    expect(toolSearchTool.name).toBe('tool-search');
  });

  it('isReadOnly 为 true', () => {
    expect(toolSearchTool.isReadOnly({} as any)).toBe(true);
  });

  it('shouldDefer 为 false', () => {
    expect(toolSearchTool.shouldDefer).toBe(false);
  });

  it('alwaysLoad 为 true', () => {
    expect(toolSearchTool.alwaysLoad).toBe(true);
  });

  it('searchHint 包含搜索关键词', () => {
    expect(toolSearchTool.searchHint).toContain('search');
    expect(toolSearchTool.searchHint).toContain('discover');
  });

  it('validateInput — 空查询被拒绝', () => {
    const result = toolSearchTool.validateInput({ query: '', max_results: 5 }, {} as any);
    expect(result.behavior).toBe('deny');
  });

  it('validateInput — 正常查询被允许', () => {
    const result = toolSearchTool.validateInput({ query: 'file', max_results: 5 }, {} as any);
    expect(result.behavior).toBe('allow');
  });

  it('call — 无 registry → 返回空结果 + error', async () => {
    const context = {
      abortController: new AbortController(),
      tools: null as unknown as ToolRegistry,
      sessionId: 'test'
    };
    const result = await toolSearchTool.call({ query: 'file', max_results: 5 }, context as any);
    expect(result.data.matches).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it('call — 有 registry → 搜索返回结果', async () => {
    const registry = new ToolRegistry();
    const testTool = buildTool({
      name: 'file-read',
      inputSchema: z.object({ path: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Read file',
      searchHint: 'read file view',
      alwaysLoad: true,
      isReadOnly: () => true,
      safetyLabel: () => 'readonly'
    });
    registry.register(testTool);

    const context = {
      abortController: new AbortController(),
      tools: registry,
      sessionId: 'test'
    };
    const result = await toolSearchTool.call({ query: 'file', max_results: 5 }, context as any);
    expect(result.data.matches).toContain('file-read');
    expect(result.data.query).toBe('file');
    expect(result.data.totalDeferredTools).toBe(0);
  });

  it('call — select 模式精确查找', async () => {
    const registry = new ToolRegistry();
    registry.register(
      buildTool({
        name: 'file-read',
        inputSchema: z.object({ path: z.string() }),
        call: async () => ({ data: '' }),
        description: async () => 'Read file',
        alwaysLoad: true,
        isReadOnly: () => true,
        safetyLabel: () => 'readonly'
      })
    );
    registry.register(
      buildTool({
        name: 'bash',
        inputSchema: z.object({ command: z.string() }),
        call: async () => ({ data: '' }),
        description: async () => 'Execute command',
        alwaysLoad: true
      })
    );

    const context = {
      abortController: new AbortController(),
      tools: registry,
      sessionId: 'test'
    };
    const result = await toolSearchTool.call(
      { query: 'select:file-read,bash', max_results: 5 },
      context as any
    );
    expect(result.data.matches).toEqual(['file-read', 'bash']);
  });
});
