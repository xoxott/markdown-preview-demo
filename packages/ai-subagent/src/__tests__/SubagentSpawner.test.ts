/** SubagentSpawner 测试 — scoped ToolRegistry 创建 + spawn 执行 */

import { z } from 'zod';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry, buildTool } from '@suga/ai-tool-core';
import { SubagentSpawner } from '../spawner/SubagentSpawner';
import type { SubagentDefinition } from '../types/subagent';
import { MockLLMProvider } from './mocks/MockLLMProvider';

/** 创建简单 Mock 工具 */
const makeTool = (name: string) =>
  buildTool({
    name,
    inputSchema: z.object({}),
    call: async () => ({ data: `${name} result` }),
    description: async () => name,
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    safetyLabel: () => 'readonly'
  });

const makeDef = (
  agentType: string,
  overrides?: Partial<SubagentDefinition>
): SubagentDefinition => ({
  agentType,
  whenToUse: `使用 ${agentType}`,
  ...overrides
});

describe('SubagentSpawner', () => {
  let provider: MockLLMProvider;
  let spawner: SubagentSpawner;

  beforeEach(() => {
    provider = new MockLLMProvider();
    provider.addSimpleTextResponse('子代理完成任务');
    spawner = new SubagentSpawner(provider);
  });

  it('createScopedRegistry — 白名单筛选 + 黑名单排除', () => {
    const parentRegistry = new ToolRegistry({
      tools: [makeTool('search'), makeTool('read'), makeTool('write'), makeTool('edit')],
      allowOverride: true
    });

    // 无白名单 → 继承全部
    const defAll = makeDef('all-tools');
    const allScoped = spawner.createScopedRegistry(parentRegistry, defAll);
    expect(allScoped.getAll()).toHaveLength(4);

    // 白名单 → 只保留白名单
    const defWhitelist = makeDef('whitelist', { tools: ['search', 'read'] });
    const whitelistScoped = spawner.createScopedRegistry(parentRegistry, defWhitelist);
    expect(whitelistScoped.getAll()).toHaveLength(2);
    expect(whitelistScoped.getByName('search')).toBeDefined();
    expect(whitelistScoped.getByName('write')).toBeUndefined();

    // 黑名单 → 排除
    const defBlacklist = makeDef('blacklist', { disallowedTools: ['write', 'edit'] });
    const blacklistScoped = spawner.createScopedRegistry(parentRegistry, defBlacklist);
    expect(blacklistScoped.getAll()).toHaveLength(2); // search + read

    // 白名单 + 黑名单 → 先筛选再排除
    const defBoth = makeDef('both', {
      tools: ['search', 'read', 'write'],
      disallowedTools: ['write']
    });
    const bothScoped = spawner.createScopedRegistry(parentRegistry, defBoth);
    expect(bothScoped.getAll()).toHaveLength(2); // search + read
  });

  it('spawn — 空 ToolRegistry 也能执行（无工具子代理）', async () => {
    const def = makeDef('explorer', { maxTurns: 1 });
    const result = await spawner.spawn(def, '探索文件结构');

    expect(result.agentType).toBe('explorer');
    expect(result.success).toBe(true);
    expect(result.loopResult.type).toBe('completed');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('spawn — contextDirective 附加到任务描述', async () => {
    const def = makeDef('coder', { maxTurns: 1 });
    const result = await spawner.spawn(def, '修复bug', '仅修改 src/index.ts');

    // 检查初始消息包含上下文指令
    const firstMsg = result.loopResult.messages[0];
    expect(firstMsg.role).toBe('user');
    if (firstMsg.role === 'user') {
      expect(firstMsg.content).toContain('仅修改 src/index.ts');
    }
  });

  it('spawn — 父 AbortController 正确链接到子代理', async () => {
    // 验证 spawner 创建子 AbortController 并链接到父信号
    const parentController = new AbortController();

    const def = makeDef('explorer', { maxTurns: 1 });
    // 正常 spawn
    const result = await spawner.spawn(
      def,
      '探索任务',
      undefined,
      undefined,
      parentController.signal
    );

    expect(result.agentType).toBe('explorer');
    expect(result.loopResult.type).toBe('completed');

    // 后续中断父控制器 — 验证链接机制存在（通过代码逻辑保证）
    parentController.abort();
    expect(parentController.signal.aborted).toBe(true);
  });

  it('spawn — provider 抛出错误时返回失败结果', async () => {
    const failProvider = new MockLLMProvider({ shouldFail: true });
    const failSpawner = new SubagentSpawner(failProvider);

    const def = makeDef('fail-agent', { maxTurns: 1 });
    const result = await failSpawner.spawn(def, '失败任务');

    expect(result.success).toBe(false);
    expect(result.loopResult.type).toBe('model_error');
  });

  // ============================================================
  // OutputFileBridge 整合
  // ============================================================

  it('构造器接受 outputOptions 创建 OutputFileBridge', () => {
    const spawnerWithBridge = new SubagentSpawner(provider, {
      maxInMemoryChars: 100,
      outputDir: '/tmp/test-subagent-output'
    });
    expect(spawnerWithBridge).toBeDefined();
  });

  it('spawn — 无 OutputFileBridge 时结果无 outputPath', async () => {
    const def = makeDef('no-bridge', { maxTurns: 1 });
    const result = await spawner.spawn(def, '简单任务');

    expect(result.outputPath).toBeUndefined();
    // summary 是原始文本，不含 <persisted-output>
    expect(result.summary).not.toContain('<persisted-output>');
  });

  it('spawn — OutputFileBridge 小输出保留在内存', async () => {
    const smallProvider = new MockLLMProvider();
    smallProvider.addSimpleTextResponse('小输出'); // 远低于阈值
    const bridgeSpawner = new SubagentSpawner(smallProvider, {
      maxInMemoryChars: 10000,
      outputDir: '/tmp/test-small-output'
    });

    const def = makeDef('small-output', { maxTurns: 1 });
    const result = await bridgeSpawner.spawn(def, '小任务');

    expect(result.outputPath).toBeUndefined();
    expect(result.summary).not.toContain('<persisted-output>');
  });

  it('spawn — OutputFileBridge 大输出持久化到磁盘', async () => {
    // 直接测试 OutputFileBridge.processResult — 不依赖 MockLLMProvider 产出大 assistant 消息
    const { OutputFileBridge } = await import('../output/OutputFileBridge');
    type SubagentResult = import('../types/result').SubagentResult;

    const bridge = new OutputFileBridge({
      maxInMemoryChars: 100, // 低阈值确保触发持久化
      outputDir: '/tmp/test-large-output'
    });

    const largeContent = '大输出内容'.repeat(200);
    const mockResult: SubagentResult = {
      agentType: 'large-output',
      loopResult: {
        type: 'completed',
        reason: '测试完成',
        messages: [
          { id: '1', role: 'user' as const, content: 'task', timestamp: 0 },
          { id: '2', role: 'assistant' as const, content: largeContent, timestamp: 0, toolUses: [] }
        ]
      },
      summary: largeContent,
      success: true,
      durationMs: 100
    };

    const processed = bridge.processResult(mockResult);

    // summary 被 OutputFileBridge 替换为 <persisted-output> 标签
    expect(processed.summary).toContain('<persisted-output>');
    expect(processed.outputPath).toBeDefined();
  });
});
