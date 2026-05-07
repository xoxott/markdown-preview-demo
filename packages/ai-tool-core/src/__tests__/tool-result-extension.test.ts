/** G9+G10 ToolResult.newMessages + contextModifier 测试 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ToolRegistry, buildTool } from '../index';
import type { ToolContextModifier, ToolNewMessage, ToolResult } from '../types/tool';

describe('ToolNewMessage', () => {
  it('应支持 assistant 角色消息', () => {
    const msg: ToolNewMessage = { role: 'assistant', content: '操作已完成' };
    expect(msg.role).toBe('assistant');
    expect(msg.content).toBe('操作已完成');
    expect(msg.meta).toBeUndefined();
  });

  it('应支持 system 角色消息 + meta 标记', () => {
    const msg: ToolNewMessage = { role: 'system', content: '内部提醒', meta: true };
    expect(msg.role).toBe('system');
    expect(msg.meta).toBe(true);
  });

  it('应支持 user 角色消息', () => {
    const msg: ToolNewMessage = { role: 'user', content: '用户确认' };
    expect(msg.role).toBe('user');
  });
});

describe('ToolContextModifier', () => {
  it('应能修改 context 的 meta 字段', () => {
    const modifier: ToolContextModifier = ctx => ({
      ...ctx,
      meta: { ...(ctx.meta as Record<string, unknown>), cwd: '/new/dir' }
    });

    const baseCtx = {
      abortController: new AbortController(),
      tools: new ToolRegistry(),
      sessionId: 'test',
      meta: {} as Record<string, unknown>
    };
    const modified = modifier(baseCtx);
    expect((modified.meta as Record<string, unknown>).cwd).toBe('/new/dir');
  });

  it('应能添加新字段到 context', () => {
    const modifier: ToolContextModifier = ctx => ({
      ...ctx,
      customField: 'added-by-tool'
    });

    const baseCtx = {
      abortController: new AbortController(),
      tools: new ToolRegistry(),
      sessionId: 'test'
    };
    const modified = modifier(baseCtx);
    expect((modified as Record<string, unknown>).customField).toBe('added-by-tool');
  });
});

describe('ToolResult G9/G10 扩展字段', () => {
  it('基础 ToolResult 应向后兼容（无 newMessages/contextModifier）', () => {
    const result: ToolResult<string> = { data: 'hello' };
    expect(result.data).toBe('hello');
    expect(result.newMessages).toBeUndefined();
    expect(result.contextModifier).toBeUndefined();
  });

  it('应支持 newMessages 注入后续消息', () => {
    const result: ToolResult<string> = {
      data: 'command output',
      newMessages: [{ role: 'assistant', content: '注意: 命令执行需要确认' }]
    };
    expect(result.newMessages).toHaveLength(1);
    expect(result.newMessages![0].role).toBe('assistant');
  });

  it('应支持 contextModifier 修改上下文', () => {
    const modifier: ToolContextModifier = ctx => ({
      ...ctx,
      meta: { ...(ctx.meta as Record<string, unknown>), cwd: '/home/user' }
    });
    const result: ToolResult<string> = {
      data: 'cd completed',
      contextModifier: modifier
    };
    expect(result.contextModifier).toBeDefined();

    // 应用 modifier
    const baseCtx = {
      abortController: new AbortController(),
      tools: new ToolRegistry(),
      sessionId: 'test',
      meta: {} as Record<string, unknown>
    };
    const modified = result.contextModifier!(baseCtx);
    expect((modified.meta as Record<string, unknown>).cwd).toBe('/home/user');
  });

  it('应支持同时使用 newMessages + contextModifier', () => {
    const result: ToolResult<string> = {
      data: 'ok',
      newMessages: [{ role: 'system', content: '目录已切换', meta: true }],
      contextModifier: ctx => ({
        ...ctx,
        meta: { ...(ctx.meta as Record<string, unknown>), cwd: '/new' }
      })
    };
    expect(result.newMessages).toHaveLength(1);
    expect(result.contextModifier).toBeDefined();
  });
});

describe('buildTool + ToolResult 扩展', () => {
  it('工具 call 可返回带 newMessages 的结果', async () => {
    const tool = buildTool({
      name: 'bash-cd',
      inputSchema: z.object({ cmd: z.string() }),
      call: async args => ({
        data: `执行: ${args.cmd}`,
        newMessages: [{ role: 'assistant', content: `已切换到目录: ${args.cmd}` }]
      }),
      description: async () => '执行命令'
    });

    const result = await tool.call(
      { cmd: 'cd /home' },
      { abortController: new AbortController(), tools: new ToolRegistry(), sessionId: 'test' }
    );
    expect(result.data).toBe('执行: cd /home');
    expect(result.newMessages).toHaveLength(1);
    expect(result.newMessages![0].content).toBe('已切换到目录: cd /home');
  });

  it('工具 call 可返回带 contextModifier 的结果', async () => {
    const tool = buildTool({
      name: 'env-set',
      inputSchema: z.object({ key: z.string(), value: z.string() }),
      call: async args => ({
        data: `${args.key}=${args.value}`,
        contextModifier: ctx => ({
          ...ctx,
          meta: { ...(ctx.meta as Record<string, unknown>), [args.key]: args.value }
        })
      }),
      description: async () => '设置环境变量'
    });

    const result = await tool.call(
      { key: 'NODE_ENV', value: 'production' },
      {
        abortController: new AbortController(),
        tools: new ToolRegistry(),
        sessionId: 'test',
        meta: {} as Record<string, unknown>
      }
    );
    expect(result.data).toBe('NODE_ENV=production');
    expect(result.contextModifier).toBeDefined();
  });
});
