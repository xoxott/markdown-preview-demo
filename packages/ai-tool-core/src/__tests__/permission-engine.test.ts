/** P75 测试 — PermissionDecisionEngine + 模式切换矩阵 + PlanApproveFlow + PermissionEvent */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { buildTool } from '../tool';
import { ToolRegistry } from '../registry';
import {
  MODE_TRANSITION_MATRIX,
  PermissionDecisionEngine,
  PlanApproveFlow,
  validateModeTransition
} from '../index';
import type {
  PermissionEvent,
  PermissionMode,
  PlanApproveState,
  ToolPermissionContext
} from '../types';

// ============================================================
// 辅助工具和上下文
// ============================================================

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

/** 构建基础 permCtx */
function buildPermCtx(mode: PermissionMode = 'default'): ToolPermissionContext {
  return {
    mode,
    allowRules: [],
    denyRules: [],
    askRules: [],
    workingDirectories: [],
    bypassPermissions: mode === 'bypassPermissions'
  };
}

// ============================================================
// 模式切换合法性矩阵
// ============================================================

describe('validateModeTransition', () => {
  it('default → any 模式都合法', () => {
    const modes: PermissionMode[] = [
      'default',
      'plan',
      'acceptEdits',
      'auto',
      'restricted',
      'dontAsk',
      'bypassPermissions'
    ];
    for (const to of modes) {
      const result = validateModeTransition('default', to);
      expect(result.valid).toBe(true);
    }
  });

  it('bypassPermissions → any 模式都合法', () => {
    const modes: PermissionMode[] = [
      'default',
      'plan',
      'acceptEdits',
      'auto',
      'restricted',
      'dontAsk',
      'bypassPermissions'
    ];
    for (const to of modes) {
      const result = validateModeTransition('bypassPermissions', to);
      expect(result.valid).toBe(true);
    }
  });

  it('plan → acceptEdits 合法（批准后切换）', () => {
    const result = validateModeTransition('plan', 'acceptEdits');
    expect(result.valid).toBe(true);
  });

  it('plan → default 合法（回退）', () => {
    const result = validateModeTransition('plan', 'default');
    expect(result.valid).toBe(true);
  });

  it('plan → auto 非法（必须经过 default）', () => {
    const result = validateModeTransition('plan', 'auto');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('不允许');
  });

  it('acceptEdits → default 合法（执行完成回退）', () => {
    const result = validateModeTransition('acceptEdits', 'default');
    expect(result.valid).toBe(true);
  });

  it('acceptEdits → plan 非法', () => {
    const result = validateModeTransition('acceptEdits', 'plan');
    expect(result.valid).toBe(false);
  });

  it('auto → default 合法（需要恢复 stripped rules）', () => {
    const result = validateModeTransition('auto', 'default');
    expect(result.valid).toBe(true);
    expect(result.needsRestoreStrippedRules).toBe(true);
  });

  it('default → auto 合法（需要剥离危险规则）', () => {
    const result = validateModeTransition('default', 'auto');
    expect(result.valid).toBe(true);
    expect(result.needsStripDangerousRules).toBe(true);
  });

  it('同模式切换合法（无操作）', () => {
    const result = validateModeTransition('plan', 'plan');
    expect(result.valid).toBe(true);
    expect(result.needsRestoreStrippedRules).toBeUndefined();
    expect(result.needsStripDangerousRules).toBeUndefined();
  });
});

describe('MODE_TRANSITION_MATRIX', () => {
  it('每种模式至少能切换到自己', () => {
    const modes: PermissionMode[] = [
      'default',
      'plan',
      'acceptEdits',
      'auto',
      'restricted',
      'dontAsk',
      'bypassPermissions'
    ];
    for (const mode of modes) {
      expect(MODE_TRANSITION_MATRIX[mode]).toContain(mode);
    }
  });

  it('default 能切换到所有模式', () => {
    expect(MODE_TRANSITION_MATRIX.default.length).toBe(7);
  });
});

// ============================================================
// PermissionDecisionEngine
// ============================================================

describe('PermissionDecisionEngine', () => {
  it('bypass模式 — decide返回allow', async () => {
    const engine = new PermissionDecisionEngine(buildPermCtx('bypassPermissions'));
    const tool = buildWriteTool('bash');
    const context = buildToolUseContext(engine.getPermissionContext());

    const result = await engine.decide(tool, {}, context);
    expect(result.behavior).toBe('allow');
    expect(result.decisionSource).toBe('flag');
  });

  it('restricted模式 — decide拒绝非只读工具', async () => {
    const engine = new PermissionDecisionEngine(buildPermCtx('restricted'));
    const tool = buildWriteTool('bash');
    const context = buildToolUseContext(engine.getPermissionContext());

    const result = await engine.decide(tool, {}, context);
    expect(result.behavior).toBe('deny');
    expect(result.structuredReason).toBe('mode_restricted_non_readonly');
  });

  it('restricted模式 — decide允许只读工具', async () => {
    const engine = new PermissionDecisionEngine(buildPermCtx('restricted'));
    const tool = buildReadOnlyTool('read');
    const context = buildToolUseContext(engine.getPermissionContext());

    const result = await engine.decide(tool, {}, context);
    expect(result.behavior).toBe('allow');
  });

  it('审计日志记录每次decide', async () => {
    const engine = new PermissionDecisionEngine(buildPermCtx('bypassPermissions'));
    const tool = buildReadOnlyTool('read');
    const context = buildToolUseContext(engine.getPermissionContext());

    await engine.decide(tool, {}, context);
    await engine.decide(tool, {}, context);

    const log = engine.getDecisionLog();
    expect(log.length).toBe(2);
    expect(log[0].toolName).toBe('read');
    expect(log[0].mode).toBe('bypassPermissions');
    expect(log[0].result.behavior).toBe('allow');
    expect(log[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('resetDecisionLog清空日志', async () => {
    const engine = new PermissionDecisionEngine(buildPermCtx('bypassPermissions'));
    const tool = buildReadOnlyTool('read');
    const context = buildToolUseContext(engine.getPermissionContext());

    await engine.decide(tool, {}, context);
    engine.resetDecisionLog();
    expect(engine.getDecisionLog().length).toBe(0);
  });

  it('applyUpdate更新permCtx', () => {
    const engine = new PermissionDecisionEngine(buildPermCtx('default'));
    engine.applyUpdate({
      type: 'addRules',
      rules: [{ behavior: 'allow', ruleValue: 'Read', source: 'session' }]
    });

    const ctx = engine.getPermissionContext();
    expect(ctx.allowRules.length).toBe(1);
    expect(ctx.allowRules[0].ruleValue).toBe('Read');
  });

  it('switchMode合法切换', () => {
    const engine = new PermissionDecisionEngine(buildPermCtx('default'));
    const result = engine.switchMode('plan');

    expect(result.valid).toBe(true);
    expect(engine.getPermissionContext().mode).toBe('plan');
  });

  it('switchMode非法切换保持原模式', () => {
    const engine = new PermissionDecisionEngine(buildPermCtx('plan'));
    const result = engine.switchMode('auto');

    expect(result.valid).toBe(false);
    expect(engine.getPermissionContext().mode).toBe('plan'); // 模式不变
  });

  it('switchMode auto → default 恢复 stripped rules', () => {
    // 先创建有危险规则的 permCtx，切换到 auto 会剥离
    const permCtx: ToolPermissionContext = {
      mode: 'default',
      allowRules: [
        { behavior: 'allow', ruleValue: 'bash(*)', source: 'session' },
        { behavior: 'allow', ruleValue: 'Read', source: 'session' }
      ],
      denyRules: [],
      askRules: [],
      workingDirectories: [],
      bypassPermissions: false
    };

    const engine = new PermissionDecisionEngine(permCtx);
    // 切换到 auto — 剥离危险规则
    engine.switchMode('auto');
    const autoCtx = engine.getPermissionContext();
    expect(autoCtx.mode).toBe('auto');
    expect(autoCtx.strippedDangerousRules?.length).toBe(1);
    expect(autoCtx.allowRules.length).toBe(1); // 只有 Read 保留

    // 切换回 default — 恢复剥离的规则
    engine.switchMode('default');
    const defaultCtx = engine.getPermissionContext();
    expect(defaultCtx.mode).toBe('default');
    expect(defaultCtx.allowRules.length).toBe(2); // bash(*) + Read 恢复
  });

  it('事件发射 — 注册handler接收事件', async () => {
    const engine = new PermissionDecisionEngine(buildPermCtx('bypassPermissions'));
    const events: PermissionEvent[] = [];
    engine.onPermissionEvent(event => events.push(event));

    const tool = buildReadOnlyTool('read');
    const context = buildToolUseContext(engine.getPermissionContext());

    await engine.decide(tool, {}, context);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('permission_decided');
    expect(events[0].toolName).toBe('read');
  });

  it('applyUpdate发射rules_updated事件', () => {
    const engine = new PermissionDecisionEngine(buildPermCtx('default'));
    const events: PermissionEvent[] = [];
    engine.onPermissionEvent(event => events.push(event));

    engine.applyUpdate({ type: 'setMode', mode: 'plan' });

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('permission_rules_updated');
  });

  it('switchMode发射mode_changed事件', () => {
    const engine = new PermissionDecisionEngine(buildPermCtx('default'));
    const events: PermissionEvent[] = [];
    engine.onPermissionEvent(event => events.push(event));

    engine.switchMode('plan');

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('permission_mode_changed');
    expect(events[0].from).toBe('default');
    expect(events[0].to).toBe('plan');
  });
});

// ============================================================
// PlanApproveFlow
// ============================================================

describe('PlanApproveFlow', () => {
  it('完整流程: idle→planning→awaiting_approval→executing→completed→idle', () => {
    const flow = new PlanApproveFlow(buildPermCtx('default'));

    expect(flow.getState()).toBe('idle');

    flow.startPlanning();
    expect(flow.getState()).toBe('planning');
    expect(flow.getPermissionContext().mode).toBe('plan');

    const result = flow.submitPlan({
      description: '修改配置文件',
      steps: [{ toolName: 'file-edit', args: {}, description: '编辑 config', riskLevel: 'medium' }],
      estimatedImpact: '仅修改本地配置'
    });
    expect(result.submitted).toBe(true);
    expect(flow.getState()).toBe('awaiting_approval');

    const approveResult = flow.approvePlan();
    expect(approveResult.approved).toBe(true);
    expect(approveResult.mode).toBe('acceptEdits');
    expect(flow.getState()).toBe('executing');
    expect(flow.getPermissionContext().mode).toBe('acceptEdits');

    flow.completeExecution();
    expect(flow.getState()).toBe('completed');
    expect(flow.getPermissionContext().mode).toBe('default');

    flow.reset();
    expect(flow.getState()).toBe('idle');
  });

  it('rejectPlan → 回到planning状态（保持plan模式）', () => {
    const flow = new PlanApproveFlow(buildPermCtx('default'));

    flow.startPlanning();
    flow.submitPlan({ description: '危险操作', steps: [], estimatedImpact: '高风险' });

    flow.rejectPlan('风险过高');
    expect(flow.getState()).toBe('planning');
    expect(flow.getPermissionContext().mode).toBe('plan'); // 仍为 plan
    expect(flow.getCurrentPlan()).toBeUndefined();
  });

  it('abort → 从planning回到idle + default模式', () => {
    const flow = new PlanApproveFlow(buildPermCtx('default'));

    flow.startPlanning();
    expect(flow.getState()).toBe('planning');

    flow.abort();
    expect(flow.getState()).toBe('idle');
    expect(flow.getPermissionContext().mode).toBe('default');
  });

  it('abort → 从awaiting_approval回到idle', () => {
    const flow = new PlanApproveFlow(buildPermCtx('default'));

    flow.startPlanning();
    flow.submitPlan({ description: 'test', steps: [], estimatedImpact: 'low' });
    expect(flow.getState()).toBe('awaiting_approval');

    flow.abort();
    expect(flow.getState()).toBe('idle');
    expect(flow.getPermissionContext().mode).toBe('default');
  });

  it('abort → 从executing回到idle', () => {
    const flow = new PlanApproveFlow(buildPermCtx('default'));

    flow.startPlanning();
    flow.submitPlan({ description: 'test', steps: [], estimatedImpact: 'low' });
    flow.approvePlan();
    expect(flow.getState()).toBe('executing');

    flow.abort();
    expect(flow.getState()).toBe('idle');
    expect(flow.getPermissionContext().mode).toBe('default');
  });

  it('非法状态转换抛出错误', () => {
    const flow = new PlanApproveFlow(buildPermCtx('default'));

    // idle 状态下不能 approvePlan
    expect(() => flow.approvePlan()).toThrow('无法在 "idle" 状态下执行 "approvePlan"');
  });

  it('状态变更回调触发', () => {
    const stateChanges: Array<{ from: PlanApproveState; to: PlanApproveState }> = [];
    const flow = new PlanApproveFlow(buildPermCtx('default'), {
      onStateChange: (to, from) => stateChanges.push({ from, to })
    });

    flow.startPlanning();
    expect(stateChanges.length).toBe(1);
    expect(stateChanges[0].from).toBe('idle');
    expect(stateChanges[0].to).toBe('planning');
  });
});
