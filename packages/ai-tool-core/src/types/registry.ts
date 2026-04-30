/** 工具注册表类型定义（Tool Registry Types） 工具注册和查找相关类型 */

import type { BuiltTool } from './tool';

/**
 * 运行时工具类型（ heterogeneous container ）
 *
 * 由于 TypeScript 函数参数逆变，BuiltTool<{ path: string }, string> 不能赋给 BuiltTool<unknown, unknown>（call
 * 函数的 args 参数不兼容）。 注册表是异构容器，存储不同 Input/Output 组合的工具， 因此使用 BuiltTool<any, any> 作为运行时存储类型。 类型安全性在
 * buildTool() 时已保证。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBuiltTool = BuiltTool<any, any>;

/** 工具拒绝规则（用于禁止特定工具的执行） */
export interface ToolDenyRule {
  /** 匹配的工具名称模式（支持 * 通配符，如 "fs-*" 匹配所有 fs 开头的工具） */
  pattern: string;
  /** 拒绝原因（用于调试和日志） */
  reason: string;
}

/** 工具注册表配置 */
export interface ToolRegistryOptions {
  /** 初始工具列表 */
  tools?: AnyBuiltTool[];
  /** 拒绝规则列表 */
  denyRules?: ToolDenyRule[];
  /** 是否允许同名工具覆盖注册 */
  allowOverride?: boolean;
}
