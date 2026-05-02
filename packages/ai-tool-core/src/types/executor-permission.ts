/** Executor 权限桥接 — 通过 interface merging 扩展 ToolUseContext */

import type { ToolPermissionContext } from './permission-context';
import type { CanUseToolFn, DenialTrackingState } from './permission-decision';
import type { PermissionPromptHandler } from './permission-prompt';
import type { MergedSettings } from './settings-schema';

/**
 * 通过 TypeScript interface merging 扩展 ToolUseContext
 *
 * 添加权限相关的可选字段，使 ToolExecutor 可以使用新的权限管线。 新字段全部可选 — 不提供时自动退回旧逻辑，确保向后兼容。
 *
 * 同时添加 meta 字段 — 消除 executor.ts 中的 `(context as ToolUseContext & Record<string, unknown>).meta`
 * 强制类型断言。
 *
 * P39: 新增 promptHandler 字段 — 宿主注入权限确认交互接口。
 */
declare module './context' {
  interface ToolUseContext {
    /** 权限上下文容器（可选，提供时使用新管线） */
    readonly permCtx?: ToolPermissionContext;
    /** 用户确认函数（可选，宿主环境注入） */
    readonly canUseToolFn?: CanUseToolFn;
    /** P39: 权限确认交互接口（可选，宿主注入，TerminalPermissionPromptHandler等） */
    readonly promptHandler?: PermissionPromptHandler;
    /** 拒绝追踪状态（可选） */
    readonly denialTracking?: DenialTrackingState;
    /** 元数据（可选，P4 HookPhase 桥接协议） */
    meta?: Record<string, unknown>;
    /** P16C: 合并后的 settings 配置（可选） */
    readonly settings?: MergedSettings;
  }
}

// 副作用导出 — 确保类型合并生效
export {};
