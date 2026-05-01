/** CallbackRunner — type=undefined 的默认 Runner（直接调用 handler 回调） */

import type { HookRunner } from '../types/runner';
import type { HookDefinition, HookExecutionContext, HookResult } from '../types/hooks';
import type { HookInput } from '../types/input';

/**
 * CallbackRunner — 函数回调 Runner
 *
 * 当 HookDefinition.type 为 undefined 时使用。 直接调用 hook.handler(input, context) — 与现有 HookExecutor 行204
 * 行为完全一致。 这是最简单的 Runner，作为所有 type 路由的 fallback。
 */
export class CallbackRunner implements HookRunner {
  readonly runnerType = 'callback' as const;

  async run(
    hook: HookDefinition,
    input: HookInput,
    context: HookExecutionContext
  ): Promise<HookResult> {
    // type=undefined 时 handler 必须存在（由 validateHookDefinition 保证）
    return hook.handler!(input, context);
  }
}
