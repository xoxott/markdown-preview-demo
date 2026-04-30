/** Hook 结果聚合 — deny > ask > allow > passthrough 优先级 */

import type { AggregatedHookResult, AggregatedOutcome, PermissionBehavior, HookResult } from '../types/hooks';

/** 权限行为优先级排序: deny(最高) > ask > allow > passthrough(最低) */
const PERMISSION_PRIORITY: Record<PermissionBehavior, number> = {
  deny: 3,
  ask: 2,
  allow: 1,
  passthrough: 0
};

/**
 * 聚合多个 HookResult 为单一 AggregatedHookResult
 *
 * 策略:
 * - 权限行为: deny > ask > allow > passthrough（参考 Claude Code）
 * - updatedInput: 取最后一个非 undefined 值
 * - updatedOutput: 取最后一个非 undefined 值
 * - additionalContexts: 汇集所有
 * - preventContinuation: 任一为 true 则 true
 * - errors: 汇集所有非阻断错误
 * - outcome: 全 success → success, 任一 blocking → blocking, 混合 → mixed
 */
export function aggregateHookResults(results: HookResult[]): AggregatedHookResult {
  if (results.length === 0) {
    return {
      outcome: 'success',
      preventContinuation: false,
      additionalContexts: [],
      errors: []
    };
  }

  let highestPermission: PermissionBehavior | undefined = undefined;
  let highestPriority = -1;
  let updatedInput: Record<string, unknown> | undefined = undefined;
  let updatedOutput: unknown = undefined;
  let preventContinuation = false;
  let stopReason: string | undefined = undefined;
  const additionalContexts: string[] = [];
  const errors: string[] = [];
  let hasBlocking = false;
  let hasSuccess = false;

  for (const result of results) {
    // 权限行为聚合: 取最高优先级
    if (result.permissionBehavior !== undefined) {
      const priority = PERMISSION_PRIORITY[result.permissionBehavior];
      if (priority > highestPriority) {
        highestPriority = priority;
        highestPermission = result.permissionBehavior;
      }
    }

    // 输入修改: 取最后一个
    if (result.updatedInput !== undefined) {
      updatedInput = result.updatedInput;
    }

    // 输出修改: 取最后一个
    if (result.updatedOutput !== undefined) {
      updatedOutput = result.updatedOutput;
    }

    // 阻止继续: 任一为 true 或 outcome 为 blocking 则 true
    if (result.preventContinuation === true || result.outcome === 'blocking') {
      preventContinuation = true;
    }
    if (result.preventContinuation === true) {
      preventContinuation = true;
    }

    // 停止原因: 取最后一个
    if (result.stopReason !== undefined) {
      stopReason = result.stopReason;
    }

    // 附加上下文: 汇集
    if (result.additionalContext !== undefined) {
      additionalContexts.push(result.additionalContext);
    }

    // 状态分类
    if (result.outcome === 'blocking') {
      hasBlocking = true;
    } else if (result.outcome === 'success') {
      hasSuccess = true;
    }

    // 错误: 汇集非阻断错误
    if (result.outcome === 'non_blocking_error' && result.error !== undefined) {
      errors.push(result.error);
    }
  }

  // 聚合 outcome
  let outcome: AggregatedOutcome;
  if (hasBlocking && hasSuccess) {
    outcome = 'mixed';
  } else if (hasBlocking) {
    outcome = 'blocking';
  } else {
    outcome = 'success';
  }

  return {
    outcome,
    preventContinuation,
    permissionBehavior: highestPermission,
    updatedInput,
    updatedOutput,
    additionalContexts,
    stopReason,
    errors
  };
}