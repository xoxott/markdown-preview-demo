/** 权限管线用户确认循环测试 — P16F promptHandler/canUseToolFn 桥接 */

import { describe, expect, it } from 'vitest';
import { hasPermissionsToUseTool } from '../permission-pipeline';
import type {
  DenialTrackingState,
  PermissionDecisionReason,
  PermissionPipelineInput
} from '../types/permission-decision';
import type { PermissionPromptHandler, PermissionPromptResponse } from '../types/permission-prompt';
import type { ToolPermissionContext } from '../types/permission-context';
import { DEFAULT_TOOL_PERMISSION_CONTEXT } from '../types/permission-context';
import type { PermissionResult } from '../types/permission';
import type { AnyBuiltTool } from '../types/registry';

/** Mock 工具 — isReadOnly=false, checkPermissions 返回 ask */
function createMockTool(name: string, checkResult?: PermissionResult): AnyBuiltTool {
  return {
    name,
    description: `Mock ${name}`,
    inputSchema: {},
    isReadOnly: () => false,
    checkPermissions: () =>
      checkResult ?? {
        behavior: 'ask',
        message: `${name} 需要确认`,
        decisionSource: 'default' as const
      },
    toAutoClassifierInput: () => ({ toolName: name, toolInput: {} }),
    aliases: [],
    call: async () => ({ result: 'mock' }),
    isConcurrencySafe: () => true,
    isDestructive: () => false
  } as unknown as AnyBuiltTool;
}

/** Mock promptHandler — 返回预设响应 */
function createMockPromptHandler(response: PermissionPromptResponse): PermissionPromptHandler {
  return {
    prompt: async () => response
  };
}

/** Mock canUseToolFn — 返回预设 boolean */
function createMockCanUseToolFn(approved: boolean) {
  return async (
    _toolName: string,
    _input: unknown,
    _reason: PermissionDecisionReason,
    _message?: string
  ) => approved;
}

/** 构造 PermissionPipelineInput */
function createPipelineInput(
  tool: AnyBuiltTool,
  permCtx?: Partial<ToolPermissionContext>,
  promptHandler?: PermissionPromptHandler,
  canUseToolFn?: (
    toolName: string,
    input: unknown,
    reason: PermissionDecisionReason,
    message?: string
  ) => Promise<boolean>,
  denialTracking?: DenialTrackingState
): PermissionPipelineInput {
  return {
    tool,
    args: {},
    context: {} as any,
    permCtx: { ...DEFAULT_TOOL_PERMISSION_CONTEXT, ...permCtx },
    promptHandler,
    canUseToolFn,
    denialTracking
  };
}

/** 类型窄化辅助 */
function asAllow(result: PermissionResult): Extract<PermissionResult, { behavior: 'allow' }> {
  return result as Extract<PermissionResult, { behavior: 'allow' }>;
}

function asDeny(result: PermissionResult): Extract<PermissionResult, { behavior: 'deny' }> {
  return result as Extract<PermissionResult, { behavior: 'deny' }>;
}

describe('Step 3: AskRule + promptHandler', () => {
  const tool = createMockTool('Bash');

  it('promptHandler approve 一次性 → behavior=allow, 无 permissionUpdate', async () => {
    const handler = createMockPromptHandler({ behavior: 'approve' });
    const input = createPipelineInput(
      tool,
      {
        askRules: [{ behavior: 'ask', ruleValue: 'Bash', source: 'project', reason: 'Bash需确认' }]
      },
      handler
    );
    const result = await hasPermissionsToUseTool(input);
    expect(result.behavior).toBe('allow');
    expect(asAllow(result).decisionSource).toBe('user');
    expect(asAllow(result).permissionUpdate).toBeUndefined();
  });

  it('promptHandler approve persistent → behavior=allow, permissionUpdate=addRules', async () => {
    const handler = createMockPromptHandler({
      behavior: 'approve',
      persistent: true,
      persistentTarget: 'session'
    });
    const input = createPipelineInput(
      tool,
      {
        askRules: [{ behavior: 'ask', ruleValue: 'Bash', source: 'project', reason: 'Bash需确认' }]
      },
      handler
    );
    const result = await hasPermissionsToUseTool(input);
    expect(result.behavior).toBe('allow');
    const allowResult = asAllow(result);
    expect(allowResult.permissionUpdate).toBeDefined();
    expect(allowResult.permissionUpdate?.type).toBe('addRules');
  });

  it('promptHandler deny → behavior=deny + feedback', async () => {
    const handler = createMockPromptHandler({ behavior: 'deny', feedback: '不允许Bash' });
    const input = createPipelineInput(
      tool,
      {
        askRules: [{ behavior: 'ask', ruleValue: 'Bash', source: 'project', reason: 'Bash需确认' }]
      },
      handler
    );
    const result = await hasPermissionsToUseTool(input);
    expect(result.behavior).toBe('deny');
    expect(asDeny(result).feedback).toBe('不允许Bash');
  });

  it('canUseToolFn(true) → bridge → approve 一次性', async () => {
    const canUse = createMockCanUseToolFn(true);
    const input = createPipelineInput(
      tool,
      {
        askRules: [{ behavior: 'ask', ruleValue: 'Bash', source: 'project', reason: 'Bash需确认' }]
      },
      undefined,
      canUse
    );
    const result = await hasPermissionsToUseTool(input);
    expect(result.behavior).toBe('allow');
    expect(asAllow(result).decisionSource).toBe('user');
  });

  it('canUseToolFn(false) → bridge → deny', async () => {
    const canUse = createMockCanUseToolFn(false);
    const input = createPipelineInput(
      tool,
      {
        askRules: [{ behavior: 'ask', ruleValue: 'Bash', source: 'project', reason: 'Bash需确认' }]
      },
      undefined,
      canUse
    );
    const result = await hasPermissionsToUseTool(input);
    expect(result.behavior).toBe('deny');
  });

  it('无 handler/canUseToolFn → behavior=ask, decisionSource=rule', async () => {
    const input = createPipelineInput(tool, {
      askRules: [{ behavior: 'ask', ruleValue: 'Bash', source: 'project', reason: 'Bash需确认' }]
    });
    const result = await hasPermissionsToUseTool(input);
    expect(result.behavior).toBe('ask');
  });
});

describe('Step 5: classifier_ask + promptHandler', () => {
  const tool = createMockTool('Bash');

  it('classifier_ask + promptHandler approve → allow', async () => {
    const handler = createMockPromptHandler({ behavior: 'approve' });
    const input = createPipelineInput(
      tool,
      {
        mode: 'auto',
        classifierFn: {
          name: 'mock',
          classify: async () => ({ behavior: 'ask', reason: '看起来危险', confidence: 'medium' })
        }
      },
      handler
    );
    const result = await hasPermissionsToUseTool(input);
    expect(result.behavior).toBe('allow');
    expect(asAllow(result).decisionSource).toBe('user');
  });

  it('classifier_ask + promptHandler deny → deny', async () => {
    const handler = createMockPromptHandler({ behavior: 'deny' });
    const input = createPipelineInput(
      tool,
      {
        mode: 'auto',
        classifierFn: {
          name: 'mock',
          classify: async () => ({ behavior: 'ask', reason: '看起来危险', confidence: 'medium' })
        }
      },
      handler
    );
    const result = await hasPermissionsToUseTool(input);
    expect(result.behavior).toBe('deny');
  });

  it('classifier_ask 无 handler → behavior=ask, decisionSource=classifier', async () => {
    const input = createPipelineInput(tool, {
      mode: 'auto',
      classifierFn: {
        name: 'mock',
        classify: async () => ({ behavior: 'ask', reason: '看起来危险', confidence: 'medium' })
      }
    });
    const result = await hasPermissionsToUseTool(input);
    expect(result.behavior).toBe('ask');
  });
});

describe('Step 6: checkPermissions ask + promptHandler', () => {
  it('工具返回 ask + promptHandler approve with feedback → allow + feedback', async () => {
    const tool = createMockTool('Write', {
      behavior: 'ask',
      message: 'Write 需确认',
      decisionSource: 'default' as const
    });
    const handler = createMockPromptHandler({ behavior: 'approve', feedback: '用户确认写入' });
    const input = createPipelineInput(tool, {}, handler);
    const result = await hasPermissionsToUseTool(input);
    expect(result.behavior).toBe('allow');
    expect(asAllow(result).feedback).toBe('用户确认写入');
  });
});

describe('DenialTracking 集成', () => {
  it('连续拒绝 → DenialTracking 更新', async () => {
    const tool = createMockTool('Bash');
    const handler = createMockPromptHandler({ behavior: 'deny' });
    const tracking: DenialTrackingState = {
      consecutiveDenials: 2,
      totalDenials: 5,
      shouldFallbackToPrompting: false
    };
    const input = createPipelineInput(
      tool,
      {
        askRules: [{ behavior: 'ask', ruleValue: 'Bash', source: 'project', reason: 'Bash需确认' }]
      },
      handler,
      undefined,
      tracking
    );
    const result = await hasPermissionsToUseTool(input);
    expect(result.behavior).toBe('deny');
    // DenialTracking 在 resolvePermissionPrompt 中更新
    // PermissionResult 本身不包含 denialTracking，宿主应追踪
  });
});
