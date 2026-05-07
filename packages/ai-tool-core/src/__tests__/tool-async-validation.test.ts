/** G11 validateInput/checkPermissions 异步化测试 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ToolExecutor, ToolRegistry, buildTool } from '../index';

const baseContext = {
  abortController: new AbortController(),
  tools: new ToolRegistry(),
  sessionId: 'test-async'
};

describe('G11: validateInput 异步化', () => {
  it('同步 validateInput 应继续正常工作', () => {
    const tool = buildTool({
      name: 'sync-validate',
      inputSchema: z.object({ path: z.string() }),
      call: async args => ({ data: args.path }),
      description: async () => 'desc',
      validateInput: _input => ({
        behavior: 'deny',
        message: '路径不允许',
        reason: 'sync_denied'
      })
    });
    const result = tool.validateInput({ path: '/bad' }, baseContext);
    expect(result.behavior).toBe('deny');
  });

  it('异步 validateInput 应返回 Promise<ValidationResult>', async () => {
    const tool = buildTool({
      name: 'async-validate',
      inputSchema: z.object({ url: z.string() }),
      call: async args => ({ data: args.url }),
      description: async () => 'desc',
      validateInput: async input => {
        // 模拟网络验证
        await new Promise<void>(r => {
          setTimeout(r, 1);
        });
        if (input.url.startsWith('https://')) {
          return { behavior: 'allow' };
        }
        return { behavior: 'deny', message: '仅允许 HTTPS', reason: 'async_https_required' };
      }
    });

    const allowResult = await tool.validateInput({ url: 'https://example.com' }, baseContext);
    expect(allowResult.behavior).toBe('allow');

    const denyResult = await tool.validateInput({ url: 'http://example.com' }, baseContext);
    expect(denyResult.behavior).toBe('deny');
    if (denyResult.behavior === 'deny') {
      expect(denyResult.reason).toBe('async_https_required');
    }
  });

  it('ToolExecutor 应正确 await 异步 validateInput', async () => {
    const tool = buildTool({
      name: 'async-validate-exec',
      inputSchema: z.object({ cmd: z.string() }),
      call: async args => ({ data: `结果: ${args.cmd}` }),
      description: async () => 'desc',
      validateInput: async input => {
        if (input.cmd === 'block') {
          return { behavior: 'deny', message: '命令被阻止', reason: 'async_block' };
        }
        return { behavior: 'allow' };
      }
    });

    const executor = new ToolExecutor();

    // 验证拒绝 → 应返回 error
    const denyResult = await executor.execute(tool, { cmd: 'block' }, baseContext);
    expect(denyResult.result.error).toContain('命令被阻止');
    expect(denyResult.result.metadata?.reason).toBe('async_block');

    // 验证通过 → 应返回 data
    const allowResult = await executor.execute(tool, { cmd: 'run' }, baseContext);
    expect(allowResult.result.data).toBe('结果: run');
  });
});

describe('G11: checkPermissions 异步化', () => {
  it('同步 checkPermissions 应继续正常工作', () => {
    const tool = buildTool({
      name: 'sync-perm',
      inputSchema: z.object({ cmd: z.string() }),
      call: async args => ({ data: args.cmd }),
      description: async () => 'desc',
      checkPermissions: _input => ({
        behavior: 'ask',
        message: '确认执行?'
      })
    });
    const result = tool.checkPermissions({ cmd: 'rm' }, baseContext);
    expect(result.behavior).toBe('ask');
  });

  it('异步 checkPermissions 应返回 Promise<PermissionResult>', async () => {
    const tool = buildTool({
      name: 'async-perm',
      inputSchema: z.object({ resource: z.string() }),
      call: async args => ({ data: args.resource }),
      description: async () => 'desc',
      checkPermissions: async input => {
        // 模拟 MCP 权限网络查询
        await new Promise<void>(r => {
          setTimeout(r, 1);
        });
        if (input.resource === 'protected') {
          return {
            behavior: 'deny',
            message: 'MCP 服务器拒绝访问',
            reason: 'mcp_deny',
            decisionSource: 'classifier'
          };
        }
        return { behavior: 'allow', decisionSource: 'classifier' };
      }
    });

    const allowResult = await tool.checkPermissions({ resource: 'public' }, baseContext);
    expect(allowResult.behavior).toBe('allow');

    const denyResult = await tool.checkPermissions({ resource: 'protected' }, baseContext);
    expect(denyResult.behavior).toBe('deny');
    if (denyResult.behavior === 'deny') {
      expect(denyResult.reason).toBe('mcp_deny');
    }
  });

  it('ToolExecutor 应正确 await 异步 checkPermissions', async () => {
    const tool = buildTool({
      name: 'async-perm-exec',
      inputSchema: z.object({ action: z.string() }),
      call: async args => ({ data: `执行: ${args.action}` }),
      description: async () => 'desc',
      checkPermissions: async input => {
        await new Promise<void>(r => {
          setTimeout(r, 1);
        });
        if (input.action === 'dangerous') {
          return {
            behavior: 'deny',
            message: '异步权限拒绝',
            reason: 'async_perm_deny',
            decisionSource: 'classifier'
          };
        }
        return { behavior: 'allow', decisionSource: 'classifier' };
      }
    });

    const executor = new ToolExecutor();

    // 权限拒绝
    const denyResult = await executor.execute(tool, { action: 'dangerous' }, baseContext);
    expect(denyResult.result.error).toContain('异步权限拒绝');

    // 权限通过
    const allowResult = await executor.execute(tool, { action: 'safe' }, baseContext);
    expect(allowResult.result.data).toBe('执行: safe');
  });
});

describe('G11: 默认值向后兼容', () => {
  it('默认 validateInput 返回的同步值应兼容 Promise 期望', async () => {
    const tool = buildTool({
      name: 'default-validate',
      inputSchema: z.object({ x: z.number() }),
      call: async args => ({ data: args.x }),
      description: async () => 'desc'
    });

    // 默认 validateInput 返回同步值，但类型允许 Promise
    const result = await tool.validateInput({ x: 1 }, baseContext);
    expect(result.behavior).toBe('allow');
  });

  it('默认 checkPermissions 返回的同步值应兼容 Promise 期望', async () => {
    const tool = buildTool({
      name: 'default-perm',
      inputSchema: z.object({ x: z.number() }),
      call: async args => ({ data: args.x }),
      description: async () => 'desc'
    });

    const result = await tool.checkPermissions({ x: 1 }, baseContext);
    expect(result.behavior).toBe('allow');
  });
});
