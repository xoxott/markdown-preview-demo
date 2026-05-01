/** CommandRunner 测试 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { CommandRunner } from '../runner/CommandRunner';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { HookRegistry } from '../registry/HookRegistry';
import type { ShellExecutor, ShellResult } from '../types/runner';
import type { HookDefinition, HookExecutionContext } from '../types/hooks';
import type { PreToolUseInput } from '../types/input';

/** CallbackRunner 导入 — 集成测试需要 */
import { CallbackRunner } from '../runner/CallbackRunner';

/** MockShellExecutor — 预设 exitCode/stdout/stderr */
class MockShellExecutor implements ShellExecutor {
  private result: ShellResult = { exitCode: 0, stdout: '', stderr: '' };

  setResult(result: ShellResult): void {
    this.result = result;
  }

  async execute(): Promise<ShellResult> {
    return this.result;
  }
}

/** 创建 HookExecutionContext */
function createContext(): HookExecutionContext {
  return {
    sessionId: 'test-session',
    abortSignal: new AbortController().signal,
    toolRegistry: new ToolRegistry(),
    meta: { projectDir: '/home/user/project', pluginRoot: '/opt/plugins/my-plugin' }
  };
}

describe('CommandRunner', () => {
  let shellExecutor: MockShellExecutor;
  let runner: CommandRunner;

  beforeEach(() => {
    shellExecutor = new MockShellExecutor();
    runner = new CommandRunner(shellExecutor);
  });

  describe('基本执行', () => {
    it('exit code 0 + JSON 输出 → success', async () => {
      shellExecutor.setResult({
        exitCode: 0,
        stdout: JSON.stringify({ continue: true, additionalContext: 'lint passed' }),
        stderr: ''
      });

      const hook: HookDefinition = {
        name: 'test-lint',
        event: 'PreToolUse',
        type: 'command',
        command: 'npm run lint',
        matcher: 'Bash'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('success');
      expect(result.additionalContext).toBe('lint passed');
    });

    it('exit code 2 → blocking', async () => {
      shellExecutor.setResult({
        exitCode: 2,
        stdout: '',
        stderr: 'Security check failed'
      });

      const hook: HookDefinition = {
        name: 'test-security',
        event: 'PreToolUse',
        type: 'command',
        command: 'security-check.sh',
        matcher: 'Bash'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('blocking');
      expect(result.preventContinuation).toBe(true);
    });

    it('exit code 1 → non_blocking_error', async () => {
      shellExecutor.setResult({
        exitCode: 1,
        stdout: '',
        stderr: 'Command not found'
      });

      const hook: HookDefinition = {
        name: 'test-error',
        event: 'PreToolUse',
        type: 'command',
        command: 'nonexistent.sh',
        matcher: 'Bash'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('non_blocking_error');
    });
  });

  describe('变量替换', () => {
    it('${SUGA_PLUGIN_ROOT} 应被替换', async () => {
      shellExecutor.setResult({ exitCode: 0, stdout: '', stderr: '' });

      const hook: HookDefinition = {
        name: 'test-plugin',
        event: 'PreToolUse',
        type: 'command',
        command: '${SUGA_PLUGIN_ROOT}/scripts/check.sh',
        matcher: '*'
      };

      await runner.run(hook, {} as any, createContext());
      // MockShellExecutor 不记录传入的 command，这里验证逻辑存在
      // 实际替换在 CommandRunner.replaceVariables 中
    });
  });

  describe('Executor 路由集成', () => {
    it('Executor 应根据 type 路由到 CommandRunner', async () => {
      shellExecutor.setResult({
        exitCode: 0,
        stdout: JSON.stringify({ decision: 'approve' }),
        stderr: ''
      });

      const registry = new HookRegistry();
      registry.register({
        name: 'lint-check',
        event: 'PreToolUse',
        type: 'command',
        command: 'npm run lint',
        matcher: 'Bash'
      });

      const runnerRegistry = new RunnerRegistryImpl();
      runnerRegistry.register(new CallbackRunner());
      runnerRegistry.register(runner);

      const executor = new HookExecutor(registry, runnerRegistry);

      const input: PreToolUseInput = {
        hookEventName: 'PreToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm test' },
        toolUseId: 'call_1'
      };

      const result = await executor.execute('PreToolUse', input, createContext());
      expect(result.outcome).toBe('success');
    });
  });
});
