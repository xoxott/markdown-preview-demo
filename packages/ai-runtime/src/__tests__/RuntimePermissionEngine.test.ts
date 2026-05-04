/** P75 C2 测试 — RuntimePermissionEngine + buildPermissionContext */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ToolRegistry, buildTool } from '@suga/ai-tool-core';
import type { PermissionEvent, ToolPermissionContext } from '@suga/ai-tool-core';
import {
  RuntimePermissionEngine,
  buildPermissionContext
} from '../permission/RuntimePermissionEngine';

/** 构建只读测试工具 */
function buildReadOnlyTool(name: string) {
  return buildTool({
    name,
    inputSchema: z.object({}),
    call: async () => ({ data: 'ok' }),
    description: async () => name,
    isReadOnly: () => true
  });
}

/** 构建写操作测试工具 */
function buildWriteTool(name: string) {
  return buildTool({
    name,
    inputSchema: z.object({}),
    call: async () => ({ data: 'written' }),
    description: async () => name
  });
}

/** 构建基础 ToolUseContext */
function buildToolUseContext(permCtx?: ToolPermissionContext) {
  const registry = new ToolRegistry();
  const abortController = new AbortController();
  return {
    tools: registry,
    abortController,
    sessionId: 'test_session',
    toolUseId: 'test_tool_use',
    permCtx: permCtx ?? {
      mode: 'default',
      allowRules: [],
      denyRules: [],
      askRules: [],
      workingDirectories: [],
      bypassPermissions: false
    }
  };
}

// ============================================================
// buildPermissionContext
// ============================================================

describe('buildPermissionContext', () => {
  it('默认配置 → mode=default, bypass=false', () => {
    const ctx = buildPermissionContext({});
    expect(ctx.mode).toBe('default');
    expect(ctx.bypassPermissions).toBe(false);
    expect(ctx.allowRules.length).toBe(0);
  });

  it('permissionMode=plan → mode=plan', () => {
    const ctx = buildPermissionContext({ permissionMode: 'plan' });
    expect(ctx.mode).toBe('plan');
  });

  it('bypassPermissions=true → bypass=true', () => {
    const ctx = buildPermissionContext({ bypassPermissions: true });
    expect(ctx.bypassPermissions).toBe(true);
  });

  it('mergedSettings + settingsLayers → 提取规则', () => {
    const ctx = buildPermissionContext({
      mergedSettings: {
        permissions: {
          allow: ['Read', 'Glob'],
          deny: ['Bash(rm -rf *)'],
          ask: ['Write']
        }
      },
      settingsLayers: ['project']
    });

    expect(ctx.allowRules.length).toBe(2);
    expect(ctx.denyRules.length).toBe(1);
    expect(ctx.askRules.length).toBe(1);
  });

  it('permissionMode=auto → 剥离危险规则', () => {
    const ctx = buildPermissionContext({
      permissionMode: 'auto',
      mergedSettings: {
        permissions: {
          allow: ['bash(*)', 'Read'],
          deny: [],
          ask: []
        }
      },
      settingsLayers: ['project']
    });

    expect(ctx.mode).toBe('auto');
    expect(ctx.strippedDangerousRules?.length).toBe(1); // bash(*) 被剥离
    expect(ctx.allowRules.length).toBe(1); // 只有 Read 保留
  });
});

// ============================================================
// RuntimePermissionEngine
// ============================================================

describe('RuntimePermissionEngine', () => {
  it('bypass模式 — decidePermission返回allow', async () => {
    const engine = new RuntimePermissionEngine({ bypassPermissions: true });
    const tool = buildWriteTool('bash');
    const context = buildToolUseContext(engine.getPermissionContext());

    const result = await engine.decidePermission(tool, {}, context);
    expect(result.behavior).toBe('allow');
  });

  it('restricted模式 — decidePermission拒绝非只读工具', async () => {
    const engine = new RuntimePermissionEngine({ permissionMode: 'restricted' });
    const tool = buildWriteTool('bash');
    const context = buildToolUseContext(engine.getPermissionContext());

    const result = await engine.decidePermission(tool, {}, context);
    expect(result.behavior).toBe('deny');
  });

  it('switchMode合法切换', () => {
    const engine = new RuntimePermissionEngine({ permissionMode: 'default' });
    const result = engine.switchMode('plan');

    expect(result.valid).toBe(true);
    expect(engine.getPermissionContext().mode).toBe('plan');
  });

  it('switchMode非法切换保持原模式', () => {
    const engine = new RuntimePermissionEngine({ permissionMode: 'plan' });
    const result = engine.switchMode('auto');

    expect(result.valid).toBe(false);
    expect(engine.getPermissionContext().mode).toBe('plan');
  });

  it('applyUpdate更新permCtx', () => {
    const engine = new RuntimePermissionEngine({ permissionMode: 'default' });
    engine.applyUpdate({
      type: 'addRules',
      rules: [{ behavior: 'allow', ruleValue: 'Read', source: 'session' }]
    });

    const ctx = engine.getPermissionContext();
    expect(ctx.allowRules.length).toBe(1);
  });

  it('onPermissionEvent注册事件处理器', async () => {
    const engine = new RuntimePermissionEngine({ bypassPermissions: true });
    const events: PermissionEvent[] = [];
    engine.onPermissionEvent(event => events.push(event));

    const tool = buildReadOnlyTool('read');
    const context = buildToolUseContext(engine.getPermissionContext());

    await engine.decidePermission(tool, {}, context);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('permission_decided');
  });

  it('getDecisionLog返回审计日志', async () => {
    const engine = new RuntimePermissionEngine({ bypassPermissions: true });
    const tool = buildReadOnlyTool('read');
    const context = buildToolUseContext(engine.getPermissionContext());

    await engine.decidePermission(tool, {}, context);

    const log = engine.getDecisionLog();
    expect(log.length).toBe(1);
    expect(log[0].toolName).toBe('read');
  });

  it('onSettingsChange重新提取规则', () => {
    const engine = new RuntimePermissionEngine({ permissionMode: 'default' });

    // 初始: 无规则
    expect(engine.getPermissionContext().allowRules.length).toBe(0);

    // Settings 变更 → 重新加载规则
    engine.onSettingsChange({ permissions: { allow: ['Read', 'Glob'], deny: [], ask: [] } }, [
      'project'
    ]);

    expect(engine.getPermissionContext().allowRules.length).toBe(2);
  });
});
