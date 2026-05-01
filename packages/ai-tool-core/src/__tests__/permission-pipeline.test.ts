/** hasPermissionsToUseTool 6步管线测试 */

import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { hasPermissionsToUseTool, resolveHookPermissionWithPipeline } from '../permission-pipeline';
import type { HookPermissionDecision, PermissionResult } from '../types/permission';
import type { ToolPermissionContext } from '../types/permission-context';
import { buildTool } from '../tool';
import { ToolRegistry } from '../registry';

// 创建测试工具
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

function createBashTool() {
  return buildTool({
    name: 'bash',
    inputSchema: z.object({ command: z.string() }),
    call: async args => ({ data: `executed: ${args.command}` }),
    description: async input => `执行命令: ${input.command}`,
    isReadOnly: () => false,
    safetyLabel: () => 'system'
  });
}

function createTestContext() {
  const registry = new ToolRegistry();
  return {
    abortController: new AbortController(),
    tools: registry,
    sessionId: 'test-session'
  };
}

const defaultPermCtx: ToolPermissionContext = {
  mode: 'default',
  allowRules: [],
  denyRules: [],
  askRules: [],
  workingDirectories: [],
  bypassPermissions: false
};

describe('hasPermissionsToUseTool', () => {
  describe('Step 1: bypassPermissions', () => {
    it('bypassPermissions=true → allow', async () => {
      const tool = createBashTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { command: 'rm -rf /' },
        context: createTestContext(),
        permCtx: { ...defaultPermCtx, bypassPermissions: true }
      });
      expect(result.behavior).toBe('allow');
      expect(result.structuredReason).toBe('mode_bypass');
    });
  });

  describe('Step 2: DenyRule 匹配', () => {
    it('deny 规则匹配 → deny', async () => {
      const tool = createBashTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { command: 'rm -rf /' },
        context: createTestContext(),
        permCtx: {
          ...defaultPermCtx,
          denyRules: [
            { behavior: 'deny', ruleValue: 'bash', source: 'project', reason: '禁止bash' }
          ]
        }
      });
      expect(result.behavior).toBe('deny');
      expect(result.structuredReason).toBe('deny_rule_match');
    });

    it('deny 规则不匹配 → 继续后续步骤', async () => {
      const tool = createReadTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { path: '/tmp' },
        context: createTestContext(),
        permCtx: {
          ...defaultPermCtx,
          denyRules: [
            { behavior: 'deny', ruleValue: 'bash', source: 'project', reason: '禁止bash' }
          ]
        }
      });
      // Read 不匹配 Bash deny 规则 → 落到 Step 5 checkPermissions (默认 allow)
      expect(result.behavior).toBe('allow');
    });
  });

  describe('Step 3: AskRule 匹配', () => {
    it('ask 规则匹配且无 CanUseToolFn → ask', async () => {
      const tool = createWriteTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { path: '/tmp', content: 'hello' },
        context: createTestContext(),
        permCtx: {
          ...defaultPermCtx,
          askRules: [{ behavior: 'ask', ruleValue: 'write', source: 'session' }]
        }
      });
      expect(result.behavior).toBe('ask');
      expect(result.structuredReason).toBe('ask_rule_match');
    });

    it('ask 规则匹配且有 CanUseToolFn → 用户允许', async () => {
      const canUseToolFn = vi.fn().mockResolvedValue(true);
      const tool = createWriteTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { path: '/tmp', content: 'hello' },
        context: createTestContext(),
        permCtx: {
          ...defaultPermCtx,
          askRules: [{ behavior: 'ask', ruleValue: 'write', source: 'session' }]
        },
        canUseToolFn
      });
      expect(result.behavior).toBe('allow');
      expect(result.decisionSource).toBe('user');
      expect(canUseToolFn).toHaveBeenCalledOnce();
    });

    it('ask 规则匹配且有 CanUseToolFn → 用户拒绝', async () => {
      const canUseToolFn = vi.fn().mockResolvedValue(false);
      const tool = createWriteTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { path: '/tmp', content: 'hello' },
        context: createTestContext(),
        permCtx: {
          ...defaultPermCtx,
          askRules: [{ behavior: 'ask', ruleValue: 'write', source: 'session' }]
        },
        canUseToolFn
      });
      expect(result.behavior).toBe('deny');
      expect(result.decisionSource).toBe('user');
    });
  });

  describe('Step 4: ModeOverride', () => {
    it('restricted + 非只读 → deny', async () => {
      const tool = createWriteTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { path: '/tmp', content: 'hello' },
        context: createTestContext(),
        permCtx: { ...defaultPermCtx, mode: 'restricted' }
      });
      expect(result.behavior).toBe('deny');
      expect(result.structuredReason).toBe('mode_restricted_non_readonly');
    });

    it('restricted + 只读 → 继续到 checkPermissions', async () => {
      const tool = createReadTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { path: '/tmp' },
        context: createTestContext(),
        permCtx: { ...defaultPermCtx, mode: 'restricted' }
      });
      // restricted 模式不拒绝只读 → 落到 checkPermissions (默认 allow)
      expect(result.behavior).toBe('allow');
    });

    it('plan + 不在白名单 → deny', async () => {
      const tool = createBashTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { command: 'npm test' },
        context: createTestContext(),
        permCtx: { ...defaultPermCtx, mode: 'plan' }
      });
      expect(result.behavior).toBe('deny');
      expect(result.structuredReason).toBe('mode_plan_disallowed');
    });

    it('plan + 在白名单 → 继续', async () => {
      const tool = createReadTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { path: '/tmp' },
        context: createTestContext(),
        permCtx: { ...defaultPermCtx, mode: 'plan' }
      });
      expect(result.behavior).toBe('allow');
    });

    it('acceptEdits + Bash(黑名单) → deny', async () => {
      const tool = createBashTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { command: 'npm test' },
        context: createTestContext(),
        permCtx: { ...defaultPermCtx, mode: 'acceptEdits' }
      });
      expect(result.behavior).toBe('deny');
      expect(result.structuredReason).toBe('mode_accept_edits_disallowed');
    });

    it('auto + 只读 → allow', async () => {
      const tool = createReadTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { path: '/tmp' },
        context: createTestContext(),
        permCtx: { ...defaultPermCtx, mode: 'auto' }
      });
      expect(result.behavior).toBe('allow');
      expect(result.structuredReason).toBe('mode_auto_approve_readonly');
    });
  });

  describe('Step 5: checkPermissions', () => {
    it('工具自定义 checkPermissions 默认 → allow', async () => {
      const tool = createReadTool();
      const result = await hasPermissionsToUseTool({
        tool,
        args: { path: '/tmp' },
        context: createTestContext(),
        permCtx: defaultPermCtx
      });
      expect(result.behavior).toBe('allow');
      expect(result.structuredReason).toBe('tool_check_permissions');
    });
  });
});

describe('resolveHookPermissionWithPipeline', () => {
  it('hook deny → 绝对覆盖', () => {
    const hook: HookPermissionDecision = { permissionBehavior: 'deny', stopReason: 'Hook拒绝' };
    const pipelineResult: PermissionResult = {
      behavior: 'allow',
      decisionSource: 'mode',
      structuredReason: 'mode_auto_approve_readonly'
    };
    const result = resolveHookPermissionWithPipeline(hook, pipelineResult);
    expect(result.behavior).toBe('deny');
    expect(result.structuredReason).toBe('hook_deny');
  });

  it('hook allow + pipeline deny → deny', () => {
    const hook: HookPermissionDecision = { permissionBehavior: 'allow' };
    const pipelineResult: PermissionResult = {
      behavior: 'deny',
      message: '规则拒绝',
      reason: 'rule_deny',
      decisionSource: 'rule',
      structuredReason: 'deny_rule_match'
    };
    const result = resolveHookPermissionWithPipeline(hook, pipelineResult);
    expect(result.behavior).toBe('deny');
  });

  it('hook allow + pipeline allow → allow', () => {
    const hook: HookPermissionDecision = { permissionBehavior: 'allow' };
    const pipelineResult: PermissionResult = {
      behavior: 'allow',
      decisionSource: 'mode',
      structuredReason: 'mode_auto_approve_readonly'
    };
    const result = resolveHookPermissionWithPipeline(hook, pipelineResult);
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('hook_allow');
  });

  it('hook ask → 强制用户确认', () => {
    const hook: HookPermissionDecision = { permissionBehavior: 'ask', stopReason: '确认一下' };
    const pipelineResult: PermissionResult = {
      behavior: 'allow',
      decisionSource: 'mode',
      structuredReason: 'mode_auto_approve_readonly'
    };
    const result = resolveHookPermissionWithPipeline(hook, pipelineResult);
    expect(result.behavior).toBe('ask');
    expect(result.structuredReason).toBe('hook_ask');
  });

  it('hook passthrough → 交由管线', () => {
    const hook: HookPermissionDecision = { permissionBehavior: 'passthrough' };
    const pipelineResult: PermissionResult = {
      behavior: 'deny',
      message: '规则拒绝',
      reason: 'rule_deny',
      decisionSource: 'rule',
      structuredReason: 'deny_rule_match'
    };
    const result = resolveHookPermissionWithPipeline(hook, pipelineResult);
    expect(result).toEqual(pipelineResult);
  });
});
