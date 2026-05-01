/** 权限管线 classifier 步骤 + iron gate + 快速路径白名单测试 */

import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { hasPermissionsToUseTool } from '../permission-pipeline';
import type { ToolPermissionContext } from '../types/permission-context';
import type {
  ClassifierResult,
  IronGate,
  PermissionClassifier
} from '../types/permission-classifier';
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
  return { abortController: new AbortController(), tools: registry, sessionId: 'test-session' };
}

const basePermCtx: ToolPermissionContext = {
  mode: 'auto',
  allowRules: [],
  denyRules: [],
  askRules: [],
  workingDirectories: [],
  bypassPermissions: false
};

// Mock 分类器工厂
function createMockClassifier(result: ClassifierResult): PermissionClassifier {
  return {
    name: 'mock-classifier',
    classify: vi.fn().mockResolvedValue(result)
  };
}

describe('Step 4.5: acceptEdits 快速路径', () => {
  it('acceptEdits + read(快速路径白名单) + checkPermissions=allow → allow', async () => {
    const tool = createReadTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { path: '/tmp' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, mode: 'acceptEdits' }
    });
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('mode_auto_approve_readonly');
  });

  it('acceptEdits + write(非快速路径) → 落到 checkPermissions', async () => {
    const tool = createWriteTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { path: '/tmp', content: 'hello' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, mode: 'acceptEdits' }
    });
    // Write 不在快速路径白名单 → 落到 Step 6 checkPermissions (默认 allow)
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('tool_check_permissions');
  });
});

describe('Step 4.7: CLASSIFIER_SAFE_ALLOWLIST', () => {
  it('auto + read(安全白名单) → allow (跳过分类器)', async () => {
    const tool = createReadTool();
    const classifier = createMockClassifier({
      behavior: 'deny',
      reason: 'test',
      confidence: 'high'
    });
    const result = await hasPermissionsToUseTool({
      tool,
      args: { path: '/tmp' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier }
    });
    // Read 在安全白名单中 → 跳过分类器直接 allow
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('mode_auto_approve_readonly');
    expect(classifier.classify).not.toHaveBeenCalled();
  });

  it('auto + bash(非安全白名单) → 进入分类器', async () => {
    const classifier = createMockClassifier({
      behavior: 'allow',
      reason: '安全命令',
      confidence: 'high'
    });
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'ls' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier }
    });
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('classifier_allow');
    expect(classifier.classify).toHaveBeenCalledOnce();
  });
});

describe('Step 5: PermissionClassifier', () => {
  it('classifier allow → allow (structuredReason: classifier_allow)', async () => {
    const classifier = createMockClassifier({
      behavior: 'allow',
      reason: '安全命令',
      confidence: 'high'
    });
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'ls' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier }
    });
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('classifier_allow');
    expect(result.decisionSource).toBe('classifier');
  });

  it('classifier deny → deny (structuredReason: classifier_deny)', async () => {
    const classifier = createMockClassifier({
      behavior: 'deny',
      reason: '危险命令',
      confidence: 'high'
    });
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'rm -rf /' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier }
    });
    expect(result.behavior).toBe('deny');
    expect(result.structuredReason).toBe('classifier_deny');
    expect(result.decisionSource).toBe('classifier');
  });

  it('classifier ask + CanUseToolFn 允许 → allow', async () => {
    const classifier = createMockClassifier({
      behavior: 'ask',
      reason: '需要确认',
      confidence: 'medium'
    });
    const canUseToolFn = vi.fn().mockResolvedValue(true);
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'npm test' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier },
      canUseToolFn
    });
    expect(result.behavior).toBe('allow');
    expect(result.decisionSource).toBe('user');
    expect(result.structuredReason).toBe('classifier_ask');
  });

  it('classifier ask + CanUseToolFn 拒绝 → deny', async () => {
    const classifier = createMockClassifier({
      behavior: 'ask',
      reason: '需要确认',
      confidence: 'medium'
    });
    const canUseToolFn = vi.fn().mockResolvedValue(false);
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'npm test' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier },
      canUseToolFn
    });
    expect(result.behavior).toBe('deny');
    expect(result.decisionSource).toBe('user');
  });

  it('classifier ask 无 CanUseToolFn → ask', async () => {
    const classifier = createMockClassifier({
      behavior: 'ask',
      reason: '需要确认',
      confidence: 'medium'
    });
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'npm test' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier }
    });
    expect(result.behavior).toBe('ask');
    expect(result.decisionSource).toBe('classifier');
  });

  it('auto + 只读工具 → 不进入分类器 (isReadOnly 快速路径)', async () => {
    const classifier = createMockClassifier({
      behavior: 'allow',
      reason: 'test',
      confidence: 'high'
    });
    const tool = createReadTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { path: '/tmp' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier }
    });
    // auto 模式只读工具 → Step 4 (modeOverride) 直接 allow
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('mode_auto_approve_readonly');
    expect(classifier.classify).not.toHaveBeenCalled();
  });

  it('default 模式 → 不进入分类器 (仅 auto 模式有分类器)', async () => {
    const classifier = createMockClassifier({
      behavior: 'allow',
      reason: 'test',
      confidence: 'high'
    });
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'ls' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, mode: 'default', classifierFn: classifier }
    });
    // default 模式不触发分类器 → 落到 Step 6 checkPermissions
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('tool_check_permissions');
    expect(classifier.classify).not.toHaveBeenCalled();
  });

  it('无 classifierFn → 落到 Step 6 checkPermissions', async () => {
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'ls' },
      context: createTestContext(),
      permCtx: basePermCtx
    });
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('tool_check_permissions');
  });
});

describe('Step 5.5: Iron Gate', () => {
  it('分类器不可用 + failClosed → deny', async () => {
    const classifier = createMockClassifier({
      behavior: 'deny',
      reason: 'API 错误',
      confidence: 'low',
      unavailable: true
    });
    const ironGate: IronGate = { failClosed: true };
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'ls' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier, ironGate }
    });
    expect(result.behavior).toBe('deny');
    expect(result.structuredReason).toBe('classifier_unavailable_deny');
    expect(result.decisionSource).toBe('classifier');
  });

  it('分类器不可用 + failOpen → 落到 Step 6 checkPermissions', async () => {
    const classifier = createMockClassifier({
      behavior: 'deny',
      reason: 'API 错误',
      confidence: 'low',
      unavailable: true
    });
    const ironGate: IronGate = { failClosed: false };
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'ls' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier, ironGate }
    });
    // fail-open → 退回 Step 6 checkPermissions (默认 allow)
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('tool_check_permissions');
  });

  it('分类器不可用 + 无 IronGate → 默认 fail-open', async () => {
    const classifier = createMockClassifier({
      behavior: 'deny',
      reason: 'API 错误',
      confidence: 'low',
      unavailable: true
    });
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'ls' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier }
    });
    // 无 IronGate → 默认 fail-open → Step 6
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('tool_check_permissions');
  });

  it('转录过长 → 始终 fail-open (退回 Step 6)', async () => {
    const classifier = createMockClassifier({
      behavior: 'deny',
      reason: '上下文溢出',
      confidence: 'low',
      transcriptTooLong: true
    });
    const ironGate: IronGate = { failClosed: true };
    const tool = createBashTool();
    const result = await hasPermissionsToUseTool({
      tool,
      args: { command: 'ls' },
      context: createTestContext(),
      permCtx: { ...basePermCtx, classifierFn: classifier, ironGate }
    });
    // transcriptTooLong 即使 failClosed 也退回 Step 6
    expect(result.behavior).toBe('allow');
    expect(result.structuredReason).toBe('tool_check_permissions');
  });
});
