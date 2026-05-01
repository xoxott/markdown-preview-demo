/** SubagentDefinition — 子代理定义模板（扩展 P9 AgentDefinition） */

import type { AgentDefinition } from '@suga/ai-coordinator';

/** 子代理来源类型 */
export type SubagentSource = 'builtin' | 'custom' | 'plugin';

/** 子代理权限模式 */
export type SubagentPermissionMode = 'bubble' | 'auto';

/** 子代理运行模式 */
export type SubagentBackground = 'foreground' | 'background';

/**
 * SubagentDefinition — 扩展 P9 AgentDefinition
 *
 * 在 P9 AgentDefinition 基础上添加：
 *
 * - source: 子代理来源（builtin/custom/plugin）
 * - permissionMode: 权限冒泡或自动模式
 * - background: 前台/后台运行
 * - maxResultSizeChars: 结果大小限制
 * - timeout: 执行超时
 * - systemPromptPrefix: 系统提示前缀（用于 cache 共享）
 */
export interface SubagentDefinition extends AgentDefinition {
  /** 子代理来源 */
  readonly source?: SubagentSource;
  /** 权限模式（'bubble' 冒泡到父终端，'auto' 自动判断） */
  readonly permissionMode?: SubagentPermissionMode;
  /** 运行模式（'foreground' 阻塞父，'background' 并行） */
  readonly background?: SubagentBackground;
  /** 结果最大字符数（默认 DEFAULT_MAX_IN_MEMORY_CHARS） */
  readonly maxResultSizeChars?: number;
  /** 执行超时（ms，默认 DEFAULT_SUBAGENT_TIMEOUT） */
  readonly timeout?: number;
  /** 系统提示前缀（用于 prompt cache 共享） */
  readonly systemPromptPrefix?: string;
}
