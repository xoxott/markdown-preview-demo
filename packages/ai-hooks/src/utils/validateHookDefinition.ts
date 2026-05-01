/** HookDefinition 交叉校验 */

import type { HookDefinition, HookType } from '../types/hooks';

/**
 * validateHookDefinition — 校验 HookDefinition 的 type 与配置字段交叉约束
 *
 * 规则：
 *
 * - type=undefined → handler 必须提供
 * - type='command' → command 必须提供
 * - type='prompt' → prompt 必须提供
 * - type='http' → url 必须提供
 * - type='agent' → agentPrompt 可选（fallback 到 handler 的描述）
 */
export function validateHookDefinition(hook: HookDefinition): void {
  const { type } = hook;

  if (type === undefined) {
    if (hook.handler === undefined) {
      throw new Error(`HookDefinition "${hook.name}": type 为 undefined 时 handler 必须提供`);
    }
    return;
  }

  switch (type) {
    case 'command':
      if (hook.command === undefined) {
        throw new Error(`HookDefinition "${hook.name}": type='command' 时 command 必须提供`);
      }
      break;

    case 'prompt':
      if (hook.prompt === undefined) {
        throw new Error(`HookDefinition "${hook.name}": type='prompt' 时 prompt 必须提供`);
      }
      break;

    case 'http':
      if (hook.url === undefined) {
        throw new Error(`HookDefinition "${hook.name}": type='http' 时 url 必须提供`);
      }
      break;

    case 'agent':
      // agentPrompt 可选 — 如果未提供则 fallback 到 handler 的描述
      // 但至少需要一种执行方式
      if (hook.agentPrompt === undefined && hook.handler === undefined) {
        throw new Error(
          `HookDefinition "${hook.name}": type='agent' 时 agentPrompt 或 handler 至少需提供一种`
        );
      }
      break;

    default:
      throw new Error(`HookDefinition "${hook.name}": 未知的 type "${type}"`);
  }
}

/** 根据 type 获取默认超时（ms） */
export function getDefaultTimeoutForType(type: HookType | undefined): number {
  switch (type) {
    case 'command':
      return 600_000;
    case 'prompt':
      return 30_000;
    case 'agent':
      return 60_000;
    case 'http':
      return 600_000;
    default:
      return 10_000;
  }
}
