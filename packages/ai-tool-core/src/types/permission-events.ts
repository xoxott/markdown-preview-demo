/** 权限事件类型定义（Permission Events） 审计日志+模式切换+规则更新+用户交互事件 */

import type { PermissionMode } from './permission-mode';
import type { PermissionResult } from './permission';
import type { PermissionUpdate } from './permission-context';
import type { PermissionPromptRequest, PermissionPromptResponse } from './permission-prompt';

/**
 * 权限事件 — 5种事件类型
 *
 * 参考 Claude Code 的权限事件追踪:
 *
 * - permission_decided: 每次权限决策完成
 * - permission_mode_changed: 权限模式切换
 * - permission_rules_updated: 规则增删改
 * - permission_prompt_shown: 用户确认请求发出
 * - permission_prompt_resolved: 用户确认响应返回
 *
 * 宿主可通过 PermissionEventEmitter 订阅这些事件，用于审计日志、UI通知、遥测等。
 */
export type PermissionEvent =
  | {
      readonly type: 'permission_decided';
      readonly toolName: string;
      readonly mode: PermissionMode;
      readonly result: PermissionResult;
      readonly timestamp: number;
    }
  | {
      readonly type: 'permission_mode_changed';
      readonly from: PermissionMode;
      readonly to: PermissionMode;
      readonly timestamp: number;
    }
  | {
      readonly type: 'permission_rules_updated';
      readonly update: PermissionUpdate;
      readonly timestamp: number;
    }
  | {
      readonly type: 'permission_prompt_shown';
      readonly request: PermissionPromptRequest;
      readonly timestamp: number;
    }
  | {
      readonly type: 'permission_prompt_resolved';
      readonly request: PermissionPromptRequest;
      readonly response: PermissionPromptResponse;
      readonly timestamp: number;
    };

/**
 * 权限事件发射器接口 — 宿主注入实现
 *
 * 库只定义接口，不提供具体实现。宿主可使用简单回调、 EventEmitter、 RxJS Subject 等。
 *
 * 使用示例:
 *
 * ```ts
 * // 简单回调实现
 * const emitter: PermissionEventEmitter = {
 *   onPermissionEvent(handler) {
 *     handlers.push(handler);
 *   },
 *   emitPermissionEvent(event) {
 *     handlers.forEach(h => h(event));
 *   }
 * };
 * ```
 */
export interface PermissionEventEmitter {
  /**
   * 注册事件处理器
   *
   * @param handler 事件处理回调函数
   */
  onPermissionEvent(handler: (event: PermissionEvent) => void): void;

  /**
   * 发射权限事件
   *
   * @param event 权限事件
   */
  emitPermissionEvent(event: PermissionEvent): void;
}
