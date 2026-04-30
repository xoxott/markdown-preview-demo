/** 权限类型定义（Permission Types） 工具执行权限相关类型 */

/**
 * 权限模式
 *
 * - default: 默认交互模式，通过 checkPermissions 决策
 * - auto: 自动模式，只读工具自动允许
 * - restricted: 受限模式，只允许只读工具
 */
export type PermissionMode = 'default' | 'auto' | 'restricted';

/**
 * 安全标签（用于标记工具的安全级别）
 *
 * - readonly: 只读操作，无副作用
 * - destructive: 破坏性操作（删除、覆盖等）
 * - network: 网络请求操作
 * - database: 数据库操作
 * - system: 系统级操作（最保守默认值）
 */
export type SafetyLabel = 'readonly' | 'destructive' | 'network' | 'database' | 'system';

/** 权限允许 */
export interface PermissionAllow {
  behavior: 'allow';
  /** 允许执行后的修正输入（可选，权限检查可以修正参数） */
  updatedInput?: unknown;
}

/** 权限拒绝 */
export interface PermissionDeny {
  behavior: 'deny';
  /** 拒绝消息（面向用户） */
  message: string;
  /** 拒绝原因（面向开发者，用于调试和日志） */
  reason?: string;
}

/** 权限询问（需要用户确认，由调用方决策） */
export interface PermissionAsk {
  behavior: 'ask';
  /** 询问消息（面向用户） */
  message: string;
}

/** 权限结果（判别联合类型，基于 behavior 字段判别） */
export type PermissionResult = PermissionAllow | PermissionDeny | PermissionAsk;
