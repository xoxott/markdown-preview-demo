/** 集成测试 — 全 SkillExecutor 管线 + registerAll + provider 注入 */

import { describe, expect, it } from 'vitest';
import { SkillExecutor, SkillRegistry } from '@suga/ai-skill';
import { ToolRegistry } from '@suga/ai-tool-core';
import { registerAllCommands } from '../catalog';
import type { ExtendedSkillExecutionContext } from '../context-merge';
import {
  MockConfigProvider,
  MockDiagnosticProvider,
  MockGitProvider,
  MockMemoryProvider
} from './mocks';

function makeContext(
  providers?: Partial<ExtendedSkillExecutionContext>
): ExtendedSkillExecutionContext {
  return {
    sessionId: 'integration-test',
    toolRegistry: new ToolRegistry(),
    abortSignal: new AbortController().signal,
    meta: {},
    ...providers
  };
}

describe('集成 — SkillExecutor 管线', () => {
  it('registerAll → SkillExecutor 执行 /commit', async () => {
    const registry = new SkillRegistry();
    registerAllCommands(registry);
    const executor = new SkillExecutor(registry);

    const gitProvider = new MockGitProvider();
    const context = makeContext({ gitProvider });

    const result = await executor.execute('commit', '', context);
    expect(result.content).toContain('## Git Commit');
  });

  it('registerAll → SkillExecutor 执行 /commit via alias "ci"', async () => {
    const registry = new SkillRegistry();
    registerAllCommands(registry);
    const executor = new SkillExecutor(registry);

    const gitProvider = new MockGitProvider();
    const context = makeContext({ gitProvider });

    const result = await executor.execute('ci', '', context);
    expect(result.content).toContain('## Git Commit');
  });

  it('registerAll → SkillExecutor 执行 /compact（无 provider）', async () => {
    const registry = new SkillRegistry();
    registerAllCommands(registry);
    const executor = new SkillExecutor(registry);

    const context = makeContext();
    const result = await executor.execute('compact', '', context);
    expect(result.content).toContain('## Context Compaction');
    expect(result.contextModifier).toBeDefined();
  });

  it('registerAll → SkillExecutor 执行 /memory recall', async () => {
    const registry = new SkillRegistry();
    registerAllCommands(registry);
    const executor = new SkillExecutor(registry);

    const memoryProvider = new MockMemoryProvider();
    const context = makeContext({ memoryProvider });

    const result = await executor.execute('memory', 'recall dark', context);
    expect(result.content).toContain('Prefs');
  });

  it('registerAll → SkillExecutor 执行 /config list', async () => {
    const registry = new SkillRegistry();
    registerAllCommands(registry);
    const executor = new SkillExecutor(registry);

    const configProvider = new MockConfigProvider();
    const context = makeContext({ configProvider });

    const result = await executor.execute('config', 'list', context);
    expect(result.content).toContain('Configuration');
  });

  it('registerAll → SkillExecutor 执行 /doctor', async () => {
    const registry = new SkillRegistry();
    registerAllCommands(registry);
    const executor = new SkillExecutor(registry);

    const diagProvider = new MockDiagnosticProvider();
    const context = makeContext({ diagnosticProvider: diagProvider });

    const result = await executor.execute('doctor', '', context);
    expect(result.content).toContain('Diagnostic Report');
  });

  it('缺少 provider → SkillExecutor 执行返回错误 prompt', async () => {
    const registry = new SkillRegistry();
    registerAllCommands(registry);
    const executor = new SkillExecutor(registry);

    const context = makeContext(); // 无 gitProvider
    const result = await executor.execute('commit', '', context);
    expect(result.content).toContain('Error');
    expect(result.content).toContain('GitProvider');
  });
});
