/** RunnerRegistry 测试 */

import { describe, expect, it } from 'vitest';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

describe('RunnerRegistryImpl', () => {
  it('resolve(undefined) 应返回 CallbackRunner', () => {
    const registry = new RunnerRegistryImpl();
    registry.register(new CallbackRunner());
    const runner = registry.resolve(undefined);
    expect(runner.runnerType).toBe('callback');
  });

  it('resolve(command) 无注册时应 fallback 到 CallbackRunner', () => {
    const registry = new RunnerRegistryImpl();
    registry.register(new CallbackRunner());
    const runner = registry.resolve('command');
    expect(runner.runnerType).toBe('callback');
  });

  it('resolve(command) 有注册时应返回 CommandRunner', () => {
    const registry = new RunnerRegistryImpl();
    registry.register(new CallbackRunner());
    const mockRunner = {
      runnerType: 'command' as const,
      run: async () => ({ outcome: 'success' }) as any
    };
    registry.register(mockRunner);
    const runner = registry.resolve('command');
    expect(runner.runnerType).toBe('command');
  });

  it('无 CallbackRunner 时 resolve 应抛错', () => {
    const registry = new RunnerRegistryImpl();
    expect(() => registry.resolve(undefined)).toThrow();
  });
});
