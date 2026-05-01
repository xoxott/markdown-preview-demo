/** FunctionHook 适配层 — 将 FunctionHookCallback 包装为 HookHandler */

import type { FunctionHook } from '../types/session';
import type { HookDefinition, HookExecutionContext, HookResult } from '../types/hooks';
import type { HookInput } from '../types/input';

/**
 * adaptFunctionHook — 将 FunctionHook 转为虚拟 HookDefinition
 *
 * FunctionHookCallback 返回 boolean（true=成功, false=阻止）， 而 HookHandler 返回 HookResult 结构。 此适配层将 boolean
 * 映射到 HookResult，使 FunctionHook 可通过 CallbackRunner 进入正常执行流程。
 */
export function adaptFunctionHook(fnHook: FunctionHook): HookDefinition {
  return {
    name: fnHook.id,
    event: fnHook.event,
    matcher: fnHook.matcher,
    handler: async (input: unknown, context: HookExecutionContext): Promise<HookResult> => {
      // HookInput 是判别联合，FunctionHookCallback 接受 HookInput + signal
      // 但 HookDefinition<unknown, unknown> 的 handler 参数是 unknown
      // 将 unknown cast 到 HookInput 满足 FunctionHookCallback 签名
      const hookInput = input as HookInput;
      const result = await fnHook.callback(hookInput, context.abortSignal);

      if (result === true) {
        return { outcome: 'success' };
      }

      return {
        outcome: 'blocking',
        stopReason: fnHook.errorMessage ?? 'Function hook 阻止了执行',
        preventContinuation: true
      };
    },
    timeout: fnHook.timeout
  };
}
