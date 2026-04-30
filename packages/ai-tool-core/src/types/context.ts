/** 工具使用上下文类型（Tool Use Context Types） 工具执行时的环境信息 */

import type { ToolRegistry } from '../registry';
import type { ToolProgressData } from './progress';
import type { PermissionMode } from './permission';

/** 工具调用选项 */
export interface ToolCallOptions {
  /** 权限模式（覆盖默认的 'default' 模式） */
  permissionMode?: PermissionMode;
  /** 最大结果字符数限制（覆盖工具默认值） */
  maxResultSizeChars?: number;
  /** 是否跳过权限检查（仅用于内部信任场景） */
  skipPermissionCheck?: boolean;
  /** 工具调用 ID（用于 PreHook/PostHook 桥接 P4 HookPhase 的 Map key） */
  toolUseId?: string;
}

/**
 * 工具使用上下文（传递给每个工具的 call 方法）
 *
 * 设计原则：
 *
 * - 最小化：只包含执行必需的信息
 * - 可扩展：下游包可通过 TypeScript interface merging 添加字段
 *
 * @example
 *   // 在 @suga/ai-agent 中扩展上下文
 *   declare module '@suga/ai-tool-core' {
 *     interface ToolUseContext {
 *       agentId: string;
 *       agentState: AgentState;
 *     }
 *   }
 */
export interface ToolUseContext {
  /** 中断控制器（支持 AbortController 取消正在执行的工具） */
  abortController: AbortController;
  /** 工具注册表（用于工具间相互查找） */
  tools: ToolRegistry;
  /** 会话唯一标识 */
  sessionId: string;
  /** 进度回调函数（可选） */
  onProgress?(progress: ToolProgressData): void;
}
