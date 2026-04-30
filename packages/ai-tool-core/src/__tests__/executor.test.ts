/** ToolExecutor 测试 — 五阶段执行管线（验证 → PreHook → 权限(merged) → 调用 → PostHook） */

import { z } from 'zod';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToolExecutor } from '../executor';
import { ToolRegistry } from '../registry';
import { buildTool } from '../tool';
import type { ToolUseContext } from '../types/context';

/** 辅助函数：创建测试上下文 */
function createTestContext(tools?: ToolRegistry): ToolUseContext {
  return {
    abortController: new AbortController(),
    tools: tools ?? new ToolRegistry(),
    sessionId: 'test-session'
  };
}

describe('ToolExecutor', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    executor = new ToolExecutor();
  });

  describe('完整执行管线', () => {
    it('应该成功执行验证→权限→调用', async () => {
      const tool = buildTool({
        name: 'add',
        inputSchema: z.object({ a: z.number(), b: z.number() }),
        call: async args => ({ data: args.a + args.b }),
        description: async input => `加法: ${input.a}+${input.b}`
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { a: 1, b: 2 }, ctx);

      expect(result.result.data).toBe(3);
      expect(result.result.error).toBeUndefined();
      expect(result.interrupted).toBe(false);
    });

    it('应该返回工具产生的 ToolResult', async () => {
      const tool = buildTool({
        name: 'echo',
        inputSchema: z.object({ msg: z.string() }),
        call: async args => ({ data: args.msg, metadata: { length: args.msg.length } }),
        description: async () => 'echo'
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { msg: 'hello' }, ctx);

      expect(result.result.data).toBe('hello');
      expect(result.result.metadata?.length).toBe(5);
    });
  });

  describe('验证阶段', () => {
    it('Zod 验证失败时应返回错误', async () => {
      const tool = buildTool({
        name: 'number-tool',
        inputSchema: z.object({ n: z.number() }),
        call: async args => ({ data: args.n }),
        description: async () => 'desc'
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { n: 'not-a-number' }, ctx);

      expect(result.result.error).toContain('验证失败');
      expect(result.result.metadata?.phase).toBe('validation');
      expect(result.interrupted).toBe(false);
    });

    it('自定义 validateInput 拒绝时应返回错误', async () => {
      const tool = buildTool({
        name: 'validated-tool',
        inputSchema: z.object({ path: z.string() }),
        call: async args => ({ data: args.path }),
        description: async () => 'desc',
        validateInput: () => ({
          behavior: 'deny',
          message: '路径不允许',
          reason: 'path_not_allowed'
        })
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { path: '/etc/passwd' }, ctx);

      expect(result.result.error).toBe('路径不允许');
      expect(result.result.metadata?.reason).toBe('path_not_allowed');
    });

    it('自定义 validateInput 应能修正输入', async () => {
      const tool = buildTool({
        name: 'normalized-tool',
        inputSchema: z.object({ path: z.string() }),
        call: async args => ({ data: args.path }),
        description: async () => 'desc',
        validateInput: input => ({
          behavior: 'allow',
          updatedInput: { ...input, path: input.path.toLowerCase() }
        })
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { path: '/TEST' }, ctx);

      expect(result.result.data).toBe('/test');
    });

    it('缺少必需字段时应返回验证错误', async () => {
      const tool = buildTool({
        name: 'required-field-tool',
        inputSchema: z.object({ required: z.string() }),
        call: async args => ({ data: args.required }),
        description: async () => 'desc'
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, {}, ctx);

      expect(result.result.error).toContain('验证失败');
    });
  });

  describe('权限阶段', () => {
    it('restricted 模式应拒绝非只读工具', async () => {
      const tool = buildTool({
        name: 'write-tool',
        inputSchema: z.object({ data: z.string() }),
        call: async args => ({ data: args.data }),
        description: async () => 'desc'
        // isReadOnly 默认 false — 失败封闭
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { data: 'test' }, ctx, {
        permissionMode: 'restricted'
      });

      expect(result.result.error).toContain('受限模式');
      expect(result.result.metadata?.phase).toBe('permission');
    });

    it('restricted 模式应允许只读工具', async () => {
      const tool = buildTool({
        name: 'read-tool',
        inputSchema: z.object({ path: z.string() }),
        call: async args => ({ data: args.path }),
        description: async () => 'desc',
        isReadOnly: () => true,
        safetyLabel: () => 'readonly'
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { path: '/test' }, ctx, {
        permissionMode: 'restricted'
      });

      expect(result.result.data).toBe('/test');
      expect(result.interrupted).toBe(false);
    });

    it('auto 模式应自动允许只读工具', async () => {
      const tool = buildTool({
        name: 'auto-readonly',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc',
        isReadOnly: () => true,
        checkPermissions: () => ({ behavior: 'ask', message: '确认?' }) // 即使 ask 也被 auto 跳过
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { x: 42 }, ctx, {
        permissionMode: 'auto'
      });

      expect(result.result.data).toBe(42);
    });

    it('auto 模式下非只读工具应走 checkPermissions', async () => {
      const tool = buildTool({
        name: 'auto-write',
        inputSchema: z.object({ cmd: z.string() }),
        call: async args => ({ data: args.cmd }),
        description: async () => 'desc',
        // isReadOnly 默认 false
        checkPermissions: () => ({ behavior: 'deny', message: '危险操作', reason: 'dangerous' })
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { cmd: 'rm' }, ctx, {
        permissionMode: 'auto'
      });

      expect(result.result.error).toBe('危险操作');
    });

    it('checkPermissions 返回 ask 时应标记 interrupted=true', async () => {
      const tool = buildTool({
        name: 'ask-tool',
        inputSchema: z.object({ cmd: z.string() }),
        call: async args => ({ data: args.cmd }),
        description: async () => 'desc',
        checkPermissions: () => ({ behavior: 'ask', message: '确认执行?' })
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { cmd: 'test' }, ctx);

      expect(result.interrupted).toBe(true);
      expect(result.result.metadata?.permissionNeeded).toBe(true);
      expect(result.result.metadata?.askMessage).toBe('确认执行?');
    });

    it('checkPermissions 返回 deny 时应返回错误', async () => {
      const tool = buildTool({
        name: 'deny-tool',
        inputSchema: z.object({ cmd: z.string() }),
        call: async args => ({ data: args.cmd }),
        description: async () => 'desc',
        checkPermissions: () => ({ behavior: 'deny', message: '禁止执行', reason: 'policy' })
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { cmd: 'test' }, ctx);

      expect(result.result.error).toBe('禁止执行');
      expect(result.interrupted).toBe(false);
    });

    it('checkPermissions 返回 allow 时应修正输入', async () => {
      const tool = buildTool({
        name: 'allow-modify',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc',
        checkPermissions: _input => ({
          behavior: 'allow',
          updatedInput: { x: 100 }
        })
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { x: 1 }, ctx);

      expect(result.result.data).toBe(100);
    });

    it('skipPermissionCheck=true 应跳过权限阶段', async () => {
      const tool = buildTool({
        name: 'skip-perm-tool',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc',
        checkPermissions: () => ({ behavior: 'deny', message: '禁止' })
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { x: 5 }, ctx, {
        skipPermissionCheck: true
      });

      expect(result.result.data).toBe(5);
    });

    it('default 模式应调用工具的 checkPermissions', async () => {
      const tool = buildTool({
        name: 'default-perm',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc',
        checkPermissions: () => ({ behavior: 'allow' })
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { x: 1 }, ctx);

      expect(result.result.data).toBe(1);
    });
  });

  describe('调用阶段', () => {
    it('工具执行成功应返回 ToolResult', async () => {
      const tool = buildTool({
        name: 'success-tool',
        inputSchema: z.object({ msg: z.string() }),
        call: async args => ({ data: args.msg }),
        description: async () => 'desc'
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { msg: 'ok' }, ctx);

      expect(result.result.data).toBe('ok');
      expect(result.interrupted).toBe(false);
    });

    it('AbortSignal 触发时应中断执行', async () => {
      const blockedPromise = new Promise<void>(() => {});

      const tool = buildTool({
        name: 'slow-tool',
        inputSchema: z.object({}),
        call: async () => {
          // 模拟长时间执行（永不 resolve，除非中断）
          await blockedPromise;
          return { data: 'done' };
        },
        description: async () => 'desc'
      });

      const ctx = createTestContext();

      // 开始执行，然后立即触发中断
      const executePromise = executor.execute(tool, {}, ctx);
      ctx.abortController.abort();

      const result = await executePromise;
      expect(result.interrupted).toBe(true);
      expect(result.result.error).toContain('中断');
    });

    it('interruptBehavior=block 时中断应返回错误而非抛出', async () => {
      const blockedPromise = new Promise<void>(() => {});

      const tool = buildTool({
        name: 'block-tool',
        inputSchema: z.object({}),
        call: async () => {
          await blockedPromise;
          return { data: 'done' };
        },
        description: async () => 'desc',
        interruptBehavior: () => 'block'
      });

      const ctx = createTestContext();

      const executePromise = executor.execute(tool, {}, ctx);
      ctx.abortController.abort();

      const result = await executePromise;
      expect(result.interrupted).toBe(true);
      expect(result.result.error).toContain('block 模式');
    });
  });

  describe('工具禁用', () => {
    it('未启用的工具应返回错误', async () => {
      const tool = buildTool({
        name: 'disabled-tool',
        inputSchema: z.object({}),
        call: async () => ({ data: 'never' }),
        description: async () => 'desc',
        isEnabled: () => false
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, {}, ctx);

      expect(result.result.error).toContain('未启用');
      expect(result.interrupted).toBe(false);
    });
  });

  describe('拒绝规则', () => {
    it('被拒绝规则匹配的工具应返回错误', async () => {
      const tool = buildTool({
        name: 'fs-read',
        inputSchema: z.object({ path: z.string() }),
        call: async args => ({ data: args.path }),
        description: async () => 'desc'
      });

      const registry = new ToolRegistry({
        denyRules: [{ pattern: 'fs-*', reason: '禁止文件系统' }]
      });
      registry.register(tool);

      const ctx = createTestContext(registry);
      const result = await executor.execute(tool, { path: '/test' }, ctx);

      expect(result.result.error).toContain('拒绝规则');
      expect(result.result.metadata?.denied).toBe(true);
    });
  });

  describe('结果截断', () => {
    it('超过 maxResultSizeChars 时应截断并添加 metadata', async () => {
      const bigData = { content: 'x'.repeat(200) };
      const tool = buildTool({
        name: 'big-result-tool',
        inputSchema: z.object({}),
        call: async () => ({ data: bigData }),
        description: async () => 'desc',
        maxResultSizeChars: 50
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, {}, ctx);

      expect(result.result.metadata?.truncated).toBe(true);
      expect(typeof result.result.metadata?.originalSize).toBe('number');
      expect(result.result.metadata?.maxAllowedSize).toBe(50);
      expect(result.result.metadata?.originalSize as number).toBeGreaterThan(50);
    });

    it('未超过 maxResultSizeChars 时不应截断', async () => {
      const tool = buildTool({
        name: 'small-result-tool',
        inputSchema: z.object({}),
        call: async () => ({ data: 'small' }),
        description: async () => 'desc',
        maxResultSizeChars: 100_000
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, {}, ctx);

      expect(result.result.metadata?.truncated).toBeUndefined();
    });

    it('ToolCallOptions 的 maxResultSizeChars 应覆盖工具默认值', async () => {
      const tool = buildTool({
        name: 'override-limit-tool',
        inputSchema: z.object({}),
        call: async () => ({ data: { content: 'x'.repeat(200) } }),
        description: async () => 'desc',
        maxResultSizeChars: 100_000 // 工具默认值很大
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, {}, ctx, {
        maxResultSizeChars: 10 // 但调用选项设置了更小的限制
      });

      expect(result.result.metadata?.truncated).toBe(true);
    });
  });

  describe('PreHook 阶段 — Hook-执行链桥接', () => {
    it('无 meta 数据时应跳过 Hook 阶段（向后兼容）', async () => {
      const tool = buildTool({
        name: 'no-meta-tool',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc'
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { x: 42 }, ctx);

      expect(result.result.data).toBe(42);
      expect(result.interrupted).toBe(false);
    });

    it('meta 中 hookPermissionBehavior=deny 应阻止执行', async () => {
      const tool = buildTool({
        name: 'hook-deny-tool',
        inputSchema: z.object({ cmd: z.string() }),
        call: async args => ({ data: args.cmd }),
        description: async () => 'desc'
      });

      const ctx = createTestContext();
      // 模拟 P4 HookBeforeToolPhase 写入的 meta
      (ctx as ToolUseContext & Record<string, unknown>).meta = {
        hookPermissionBehavior: 'deny',
        hookStopReason: '安全策略禁止'
      };

      const result = await executor.execute(tool, { cmd: 'rm' }, ctx);

      expect(result.result.error).toBe('安全策略禁止');
      expect(result.result.metadata?.hookBlocked).toBe(true);
    });

    it('meta 中 hookPermissionBehavior=deny 应覆盖 settings allow', async () => {
      const tool = buildTool({
        name: 'hook-deny-overrides',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc',
        checkPermissions: () => ({ behavior: 'allow' }) // settings 允许
      });

      const ctx = createTestContext();
      (ctx as ToolUseContext & Record<string, unknown>).meta = {
        hookPermissionBehavior: 'deny'
      };

      const result = await executor.execute(tool, { x: 1 }, ctx);

      expect(result.result.error).toContain('Hook');
      expect(result.result.metadata?.decisionSource).toBe('hook');
    });

    it('meta 中 hookPermissionBehavior=allow 不应覆盖 settings deny', async () => {
      const tool = buildTool({
        name: 'hook-allow-not-overwrite',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc',
        checkPermissions: () => ({ behavior: 'deny', message: 'settings禁止' })
      });

      const ctx = createTestContext();
      (ctx as ToolUseContext & Record<string, unknown>).meta = {
        hookPermissionBehavior: 'allow'
      };

      const result = await executor.execute(tool, { x: 1 }, ctx);

      expect(result.result.error).toBe('settings禁止');
      // settings deny 覆盖 hook allow
    });

    it('meta 中 hookPermissionBehavior=allow 不应覆盖 settings ask', async () => {
      const tool = buildTool({
        name: 'hook-allow-not-overwrite-ask',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc',
        checkPermissions: () => ({ behavior: 'ask', message: '确认?' })
      });

      const ctx = createTestContext();
      (ctx as ToolUseContext & Record<string, unknown>).meta = {
        hookPermissionBehavior: 'allow'
      };

      const result = await executor.execute(tool, { x: 1 }, ctx);

      expect(result.interrupted).toBe(true);
      // settings ask 覆盖 hook allow
    });

    it('meta 中 hookUpdatedInputs 应修改工具输入', async () => {
      const tool = buildTool({
        name: 'hook-modify-input',
        inputSchema: z.object({ cmd: z.string() }),
        call: async args => ({ data: args.cmd }),
        description: async () => 'desc'
      });

      const ctx = createTestContext();
      const updatedInputs = new Map<string, Record<string, unknown>>();
      updatedInputs.set('call_1', { cmd: 'ls -la' });
      (ctx as ToolUseContext & Record<string, unknown>).meta = {
        hookPermissionBehavior: 'allow',
        hookUpdatedInputs: updatedInputs
      };

      const result = await executor.execute(tool, { cmd: 'ls' }, ctx, { toolUseId: 'call_1' });

      expect(result.result.data).toBe('ls -la');
    });

    it('meta 中 hookPermissionBehavior=passthrough 应走正常权限流程', async () => {
      const tool = buildTool({
        name: 'hook-passthrough',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc',
        checkPermissions: () => ({ behavior: 'allow' })
      });

      const ctx = createTestContext();
      (ctx as ToolUseContext & Record<string, unknown>).meta = {
        hookPermissionBehavior: 'passthrough'
      };

      const result = await executor.execute(tool, { x: 1 }, ctx);

      expect(result.result.data).toBe(1);
    });

    it('meta 中 hookPreventContinuation=true 应终止执行', async () => {
      const tool = buildTool({
        name: 'hook-prevent',
        inputSchema: z.object({}),
        call: async () => ({ data: 'done' }),
        description: async () => 'desc'
      });

      const ctx = createTestContext();
      (ctx as ToolUseContext & Record<string, unknown>).meta = {
        hookPreventContinuation: true,
        hookStopReason: 'Hook阻止继续'
      };

      const result = await executor.execute(tool, {}, ctx);

      expect(result.result.error).toBe('Hook阻止继续');
      expect(result.result.metadata?.hookBlocked).toBe(true);
    });
  });

  describe('PostHook 阶段 — Hook 输出修改桥接', () => {
    it('无 meta 数据时应返回原始结果（向后兼容）', async () => {
      const tool = buildTool({
        name: 'post-no-meta',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc'
      });

      const ctx = createTestContext();
      const result = await executor.execute(tool, { x: 42 }, ctx);

      expect(result.result.data).toBe(42);
    });

    it('meta 中 hookUpdatedOutputs 应修改工具输出', async () => {
      const tool = buildTool({
        name: 'post-modify-output',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc'
      });

      const ctx = createTestContext();
      const updatedOutputs = new Map<string, unknown>();
      updatedOutputs.set('call_1', 'formatted result');
      (ctx as ToolUseContext & Record<string, unknown>).meta = {
        hookUpdatedOutputs: updatedOutputs
      };

      const result = await executor.execute(tool, { x: 42 }, ctx, { toolUseId: 'call_1' });

      expect(result.result.data).toBe('formatted result');
      expect(result.result.metadata?.hookModifiedOutput).toBe(true);
    });

    it('hookUpdatedOutputs 无匹配 toolUseId 时应保持原始输出', async () => {
      const tool = buildTool({
        name: 'post-no-match',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async () => 'desc'
      });

      const ctx = createTestContext();
      const updatedOutputs = new Map<string, unknown>();
      updatedOutputs.set('other_call', 'other result');
      (ctx as ToolUseContext & Record<string, unknown>).meta = {
        hookUpdatedOutputs: updatedOutputs
      };

      const result = await executor.execute(tool, { x: 42 }, ctx, { toolUseId: 'call_1' });

      expect(result.result.data).toBe(42); // 无匹配 → 保持原始
    });
  });
});
