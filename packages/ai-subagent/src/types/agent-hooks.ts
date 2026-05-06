/**
 * AgentScopedHooks — 子代理scoped hooks配置
 *
 * CC注册frontmatter hooks scoped到agent: 子代理定义中的hooks配置只在该子代理运行时生效， 不会影响父进程或其他子代理的hooks。
 */

/** 单个scoped hook定义 */
export interface AgentScopedHook {
  /** hook事件名称（如 pre-tool-use, post-tool-use） */
  readonly event: string;
  /** hook执行的shell命令 */
  readonly command: string;
  /** 执行超时（ms） */
  readonly timeoutMs?: number;
}

/** 子代理scoped hooks配置 */
export interface AgentScopedHooksConfig {
  /** hook列表 */
  readonly hooks: readonly AgentScopedHook[];
  /** scope固定为'agent'，只在该agent运行时生效 */
  readonly scope: 'agent';
}
