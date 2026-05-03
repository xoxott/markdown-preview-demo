/**
 * P41 权限管线补全测试 — dontAsk模式 + bypass-immune安全检查 + requiresUserInteraction + headless-agent + denial
 * limits
 */

import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { hasPermissionsToUseTool } from '../permission-pipeline';
import { buildTool } from '../tool';
import type { ToolUseContext } from '../types/context';
import { DEFAULT_TOOL_PERMISSION_CONTEXT } from '../types/permission-context';
import { DEFAULT_DENIAL_TRACKING } from '../types/permission-decision';
import type { PermissionPipelineInput } from '../types/permission-decision';

/** 辅助: 创建最小工具 */
function createTool(name: string, overrides?: Record<string, unknown>) {
  return buildTool({
    name,
    inputSchema: z.object({ path: z.string().optional(), command: z.string().optional() }),
    call: async () => ({ data: 'ok' }),
    description: async () => name,
    ...overrides
  });
}

/** 辅助: 创建最小管线输入 */
function createPipelineInput(
  overrides?: Partial<PermissionPipelineInput>
): PermissionPipelineInput {
  const tool = createTool('bash');
  return {
    tool,
    args: { command: 'ls' },
    context: {} as ToolUseContext,
    permCtx: DEFAULT_TOOL_PERMISSION_CONTEXT,
    ...overrides
  };
}

/** 辅助: 创建 bypass 模式上下文 */
function createBypassContext() {
  return {
    ...DEFAULT_TOOL_PERMISSION_CONTEXT,
    bypassPermissions: true,
    mode: 'bypassPermissions' as const
  };
}

/** 辅助: 创建 dontAsk 模式上下文 */
function createDontAskContext() {
  return { ...DEFAULT_TOOL_PERMISSION_CONTEXT, mode: 'dontAsk' as const };
}

// ===== Step 1.5: bypass-immune 安全检查 =====

describe('Step 1.5: bypass-immune 安全检查', () => {
  it('bypass + .bashrc → ask（不自动 allow）', async () => {
    const tool = createTool('file-write');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { path: '/home/user/.bashrc' },
        permCtx: createBypassContext()
      })
    );
    expect(result.behavior).toBe('ask');
    if (result.behavior === 'ask') {
      expect(result.structuredReason).toBe('safety_check_block');
      expect(result.message).toContain('.bashrc');
    }
  });

  it('bypass + .git/ → ask', async () => {
    const tool = createTool('file-write');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { path: '/project/.git/config' },
        permCtx: createBypassContext()
      })
    );
    expect(result.behavior).toBe('ask');
    if (result.behavior === 'ask') {
      expect(result.structuredReason).toBe('safety_check_block');
    }
  });

  it('bypass + .env → ask', async () => {
    const tool = createTool('file-write');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { path: '.env' },
        permCtx: createBypassContext()
      })
    );
    expect(result.behavior).toBe('ask');
    if (result.behavior === 'ask') {
      expect(result.structuredReason).toBe('safety_check_block');
    }
  });

  it('bypass + 安全文件 /tmp/test.txt → allow（正常 bypass）', async () => {
    const tool = createTool('file-write');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { path: '/tmp/test.txt' },
        permCtx: createBypassContext()
      })
    );
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('mode_bypass');
  });

  it('bypass + bash 安全命令 → allow（命令不含危险文件）', async () => {
    const tool = createTool('bash');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { command: 'ls -la /tmp' },
        permCtx: createBypassContext()
      })
    );
    expect(result.behavior).toBe('allow');
  });

  it('bypass + bash 写 .bashrc → ask', async () => {
    const tool = createTool('bash');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { command: 'echo "export" >> ~/.bashrc' },
        permCtx: createBypassContext()
      })
    );
    expect(result.behavior).toBe('ask');
    if (result.behavior === 'ask') {
      expect(result.structuredReason).toBe('safety_check_block');
    }
  });

  it('bypass + .claude/settings.json → ask（通过危险目录 .claude 匹配）', async () => {
    const tool = createTool('file-write');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { path: '.claude/settings.json' },
        permCtx: createBypassContext()
      })
    );
    // .claude/settings.json → basename="settings.json"不是危险文件，但路径包含 .claude 危险目录
    expect(result.behavior).toBe('ask');
  });
});

// ===== Step 1.6: requiresUserInteraction bypass-immune =====

describe('Step 1.6: requiresUserInteraction bypass-immune', () => {
  it('bypass + requiresUserInteraction=true → ask', async () => {
    const tool = createTool('ask-user');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: {},
        permCtx: createBypassContext(),
        requiresUserInteraction: true
      })
    );
    expect(result.behavior).toBe('ask');
    if (result.behavior === 'ask') {
      expect(result.structuredReason).toBe('requires_user_interaction_block');
    }
  });

  it('bypass + requiresUserInteraction=false → allow', async () => {
    const tool = createTool('bash');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { command: 'ls' },
        permCtx: createBypassContext(),
        requiresUserInteraction: false
      })
    );
    expect(result.behavior).toBe('allow');
  });

  it('bypass + requiresUserInteraction + 安全文件 → requiresUserInteraction优先', async () => {
    const tool = createTool('ask-user');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: {},
        permCtx: createBypassContext(),
        requiresUserInteraction: true
      })
    );
    // requiresUserInteraction 检查在 bypass 快速路径中，优先于 safety check
    expect(result.behavior).toBe('ask');
    if (result.behavior === 'ask') {
      expect(result.structuredReason).toBe('requires_user_interaction_block');
    }
  });
});

// ===== Step 4.8: dontAsk 模式 — ask 转为 deny =====

describe('Step 4.8: dontAsk 模式', () => {
  it('dontAsk 模式 → deny 所有工具', async () => {
    const tool = createTool('bash');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { command: 'ls' },
        permCtx: createDontAskContext()
      })
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') {
      expect(result.structuredReason).toBe('mode_dont_ask_converted_deny');
    }
  });

  it('dontAsk 模式 → deny 只读工具', async () => {
    const tool = createTool('read', { isReadOnly: () => true });
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: {},
        permCtx: createDontAskContext()
      })
    );
    expect(result.behavior).toBe('deny');
  });
});

// ===== Step 4.9: headless-agent =====

describe('Step 4.9: headless-agent', () => {
  it('isHeadlessAgent=true + dontAsk → deny', async () => {
    const tool = createTool('bash');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { command: 'ls' },
        permCtx: createDontAskContext(),
        isHeadlessAgent: true
      })
    );
    expect(result.behavior).toBe('deny');
  });

  it('isHeadlessAgent=true + default模式 → 不自动deny（走正常管线）', async () => {
    const tool = createTool('bash');
    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { command: 'ls' },
        permCtx: DEFAULT_TOOL_PERMISSION_CONTEXT,
        isHeadlessAgent: true
      })
    );
    // headless agent 只在 shouldAvoidPermissionPrompts 时自动 deny
    // default 模式不是 silentDeny → 走正常管线
    expect(result.behavior).not.toBe('deny');
  });
});

// ===== Step 5.7: denial limits 回退 =====

describe('Step 5.7: denial limits 回退到 prompting', () => {
  it('shouldFallbackToPrompting=true + classifier ask → 强制prompting', async () => {
    const tool = createTool('bash');
    const mockClassifier = {
      name: 'mock-classifier',
      classify: vi.fn().mockResolvedValue({
        behavior: 'ask',
        reason: 'network operation unclear',
        confidence: 'low'
      })
    };

    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { command: 'curl https://example.com' },
        permCtx: {
          ...DEFAULT_TOOL_PERMISSION_CONTEXT,
          mode: 'auto',
          classifierFn: mockClassifier
        },
        denialTracking: {
          consecutiveDenials: 3,
          totalDenials: 10,
          shouldFallbackToPrompting: true
        }
      })
    );

    // shouldFallbackToPrompting → 强制走 promptHandler/canUseToolFn
    // 无 handler → 返回 ask，但 reason 是 denial_limit_fallback
    expect(result.behavior).toBe('ask');
    if (result.behavior === 'ask') {
      expect(result.structuredReason).toBe('denial_limit_fallback');
    }
  });

  it('shouldFallbackToPrompting=false + classifier ask → 正常ask', async () => {
    const tool = createTool('bash');
    const mockClassifier = {
      name: 'mock-classifier-2',
      classify: vi.fn().mockResolvedValue({
        behavior: 'ask',
        reason: 'unclear operation',
        confidence: 'low'
      })
    };

    const result = await hasPermissionsToUseTool(
      createPipelineInput({
        tool,
        args: { command: 'curl https://example.com' },
        permCtx: {
          ...DEFAULT_TOOL_PERMISSION_CONTEXT,
          mode: 'auto',
          classifierFn: mockClassifier
        },
        denialTracking: DEFAULT_DENIAL_TRACKING
      })
    );

    expect(result.behavior).toBe('ask');
    if (result.behavior === 'ask') {
      expect(result.structuredReason).toBe('classifier_ask');
    }
  });
});

// ===== permission-mode 新函数测试 =====

describe('P41: permission-mode 新增函数', () => {
  it('isSilentDenyMode("dontAsk") → true', async () => {
    const { isSilentDenyMode } = await import('../types/permission-mode');
    expect(isSilentDenyMode('dontAsk')).toBe(true);
    expect(isSilentDenyMode('auto')).toBe(false);
    expect(isSilentDenyMode('bypassPermissions')).toBe(false);
  });

  it('shouldAvoidPermissionPrompts("dontAsk") → true', async () => {
    const { shouldAvoidPermissionPrompts } = await import('../types/permission-mode');
    expect(shouldAvoidPermissionPrompts('dontAsk')).toBe(true);
    expect(shouldAvoidPermissionPrompts('auto')).toBe(false);
    expect(shouldAvoidPermissionPrompts('default')).toBe(false);
  });

  it('classifyPermissionMode("dontAsk") → silentDeny', async () => {
    const { classifyPermissionMode } = await import('../types/permission-mode');
    expect(classifyPermissionMode('dontAsk')).toBe('silentDeny');
  });
});
