/** 权限冒泡类型定义（Permission Bubble Types） 子 Worker 权限请求冒泡到 Coordinator/父 Agent */

/**
 * 简化权限规则 — 独立类型，不引用 ai-tool-core
 *
 * 参考 Claude Code 的 PermissionRuleValue: 权限规则是字符串格式（如 "Bash(git push:*)"）， behavior/source/reason
 * 为结构化补充信息。
 */
export interface PermissionBubbleRule {
  /** 规则行为 */
  readonly behavior: 'allow' | 'deny' | 'ask';
  /** 规则值（工具名/命令模式/通配符） */
  readonly ruleValue: string;
  /** 规则来源标记 */
  readonly source?: string;
  /** 规则原因 */
  readonly reason?: string;
}

/**
 * 权限建议选项 — Worker 的 classifier 结果
 *
 * 参考 Claude Code 的 permissionSuggestions: Worker 的 AI 分类器对请求的初步判断， 提供给 Leader 作为决策参考。
 */
export interface PermissionBubbleSuggestion {
  /** 分类器决策 */
  readonly decision: 'allow' | 'deny' | 'ask';
  /** 决策原因 */
  readonly reason: string;
  /** 置信度 */
  readonly confidence?: 'high' | 'medium' | 'low';
}

/**
 * 权限冒泡请求 — 子 Worker 遇到需要更高权限的操作时，通过 Mailbox 向 Coordinator 发送请求
 *
 * 使用简化独立类型，不引用 ai-tool-core 的 ToolPermissionContext/PermissionDecisionReason， 避免在 ai-coordinator
 * 中引入 ai-tool-core 依赖。 宿主应用层负责类型桥接。
 */
export interface PermissionBubbleRequest {
  /** 消息类型标记 */
  readonly type: 'permission_request';
  /** Worker 唯一标识 */
  readonly workerId: string;
  /** Worker 名称 */
  readonly workerName: string;
  /** 请求权限的工具名称 */
  readonly toolName: string;
  /** 工具输入参数 */
  readonly toolInput: unknown;
  /** 权限请求原因（自由文本） */
  readonly reason: string;
  /** 请求消息（面向用户） */
  readonly message?: string;
  /** 连续拒绝计数 */
  readonly consecutiveDenials?: number;
  /** 总拒绝计数 */
  readonly totalDenials?: number;
  /** P16D: 请求唯一标识（用于匹配请求和响应） */
  readonly requestId?: string;
  /** P16D: 权限建议选项（Worker 的 classifier 结果） */
  readonly permissionSuggestions?: readonly PermissionBubbleSuggestion[];
}

/** 权限冒泡响应 — Coordinator/父 Agent 对权限请求的决策 */
export interface PermissionBubbleResponse {
  /** 消息类型标记 */
  readonly type: 'permission_response';
  /** 对应请求的 Worker 唯一标识 */
  readonly workerId: string;
  /** 是否批准执行 */
  readonly approved: boolean;
  /** 决策原因（自由文本） */
  readonly reason?: string;
  /** P16D: 对应请求的 requestId */
  readonly requestId?: string;
  /** P16D: Leader 决策来源 */
  readonly resolvedBy?: 'leader' | 'worker_classifier' | 'rule';
  /** P16D: Leader 反馈信息（传回 Worker） */
  readonly feedback?: string;
  /** P16D: Leader 权限更新（批准后自动追加 allow 规则） */
  readonly permissionUpdates?: readonly PermissionBubbleRule[];
}
