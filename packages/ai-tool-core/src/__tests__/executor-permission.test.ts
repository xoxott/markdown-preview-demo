/** Executor 双分支改造测试 — 验证旧逻辑和新管线切换 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ToolExecutor } from '../executor';
import { buildTool } from '../tool';
import { ToolRegistry } from '../registry';
import type { ToolPermissionContext } from '../types/permission-context';

function createReadTool() {
  return buildTool({
    name: 'read',
    inputSchema: z.object({ path: z.string() }),
    call: async args => ({ data: `content of ${args.path}` }),
    description: async input => `读取文件: ${input.path}`,
    isReadOnly: () => true,
    safetyLabel: () => 'readonly'
  });
}

function createWriteTool() {
  return buildTool({
    name: 'write',
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    call: async args => ({ data: `wrote to ${args.path}` }),
    description: async input => `写入文件: ${input.path}`,
    isReadOnly: () => false,
    isDestructive: () => true,
    safetyLabel: () => 'destructive'
  });
}

describe('Executor 双分支逻辑', () => {
  describe('无 permCtx → 旧逻辑', () => {
    it('旧 restricted 模式仍正常工作', async () => {
      const executor = new ToolExecutor();
      const registry = new ToolRegistry({ tools: [createWriteTool()] });
      const context = {
        abortController: new AbortController(),
        tools: registry,
        sessionId: 'test-session'
      };

      const result = await executor.execute(
        registry.get('write')!,
        { path: '/tmp', content: 'hello' },
        context,
        { permissionMode: 'restricted' }
      );

      expect(result.result.error).toContain('受限模式');
      expect(result.interrupted).toBe(false);
    });

    it('旧 auto 模式仍正常工作', async () => {
      const executor = new ToolExecutor();
      const registry = new ToolRegistry({ tools: [createReadTool()] });
      const context = {
        abortController: new AbortController(),
        tools: registry,
        sessionId: 'test-session'
      };

      const result = await executor.execute(registry.get('read')!, { path: '/tmp' }, context, {
        permissionMode: 'auto'
      });

      expect(result.result.data).toBe('content of /tmp');
    });
  });

  describe('有 permCtx → 新管线', () => {
    it('新管线 bypassPermissions → allow', async () => {
      const executor = new ToolExecutor();
      const registry = new ToolRegistry({ tools: [createWriteTool()] });
      const permCtx: ToolPermissionContext = {
        mode: 'default',
        allowRules: [],
        denyRules: [],
        askRules: [],
        workingDirectories: [],
        bypassPermissions: true
      };
      const context = {
        abortController: new AbortController(),
        tools: registry,
        sessionId: 'test-session',
        permCtx
      };

      const result = await executor.execute(
        registry.get('write')!,
        { path: '/tmp', content: 'hello' },
        context
      );

      expect(result.result.data).toBe('wrote to /tmp');
    });

    it('新管线 restricted → deny 非只读', async () => {
      const executor = new ToolExecutor();
      const registry = new ToolRegistry({ tools: [createWriteTool()] });
      const permCtx: ToolPermissionContext = {
        mode: 'restricted',
        allowRules: [],
        denyRules: [],
        askRules: [],
        workingDirectories: [],
        bypassPermissions: false
      };
      const context = {
        abortController: new AbortController(),
        tools: registry,
        sessionId: 'test-session',
        permCtx
      };

      const result = await executor.execute(
        registry.get('write')!,
        { path: '/tmp', content: 'hello' },
        context
      );

      expect(result.result.error).toContain('受限模式');
    });

    it('新管线 denyRule → deny', async () => {
      const executor = new ToolExecutor();
      const registry = new ToolRegistry({ tools: [createWriteTool()] });
      const permCtx: ToolPermissionContext = {
        mode: 'default',
        allowRules: [],
        denyRules: [
          { behavior: 'deny', ruleValue: 'write', source: 'project', reason: '禁止写入' }
        ],
        askRules: [],
        workingDirectories: [],
        bypassPermissions: false
      };
      const context = {
        abortController: new AbortController(),
        tools: registry,
        sessionId: 'test-session',
        permCtx
      };

      const result = await executor.execute(
        registry.get('write')!,
        { path: '/tmp', content: 'hello' },
        context
      );

      expect(result.result.error).toContain('拒绝规则');
    });
  });
});
