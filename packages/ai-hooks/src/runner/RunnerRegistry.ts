/** RunnerRegistryImpl — Runner 工厂 + 查找 */

import type { HookRunner, RunnerRegistry as RunnerRegistryType } from '../types/runner';
import type { HookType } from '../types/hooks';

/**
 * RunnerRegistryImpl — Runner 查找 + 注册
 *
 * 根据 HookDefinition.type 路由到对应 Runner：
 *
 * - undefined → 'callback'（CallbackRunner fallback）
 * - 'command'/'prompt'/'http'/'agent' → 对应 Runner
 */
export class RunnerRegistryImpl implements RunnerRegistryType {
  private readonly runners = new Map<HookType | 'callback', HookRunner>();

  /** 注册 Runner 实现 */
  register(runner: HookRunner): void {
    this.runners.set(runner.runnerType, runner);
  }

  /**
   * 根据 HookDefinition.type 查找 Runner
   *
   * - undefined → CallbackRunner
   * - 已注册 → 对应 Runner
   * - 未注册 → CallbackRunner fallback
   */
  resolve(type: HookType | undefined): HookRunner {
    if (type === undefined) {
      const callback = this.runners.get('callback');
      if (callback) return callback;
      throw new Error('RunnerRegistry: 无可用 Runner，至少需注册 CallbackRunner');
    }

    const runner = this.runners.get(type);
    if (runner !== undefined) return runner;

    // 未注册的 type → fallback 到 callback Runner
    const callback = this.runners.get('callback');
    if (callback) return callback;
    throw new Error(`RunnerRegistry: type="${type}" 无对应 Runner，也无 CallbackRunner fallback`);
  }
}
