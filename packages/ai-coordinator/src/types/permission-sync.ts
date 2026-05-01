/** 权限同步消息结构（Permission Sync Types） Leader→Worker 权限/Settings广播 */

import type { PermissionBubbleRule } from './permission-bubble';

/**
 * 权限更新广播消息 — Leader 向所有 Worker 广播权限规则变更
 *
 * 参考 Claude Code 的 TeamPermissionUpdateMessage: Leader 的权限上下文变更时（如用户批准了新规则），通过 Mailbox 向所有 Worker
 * 广播更新，Worker 在本地应用此更新。
 *
 * updateType 对齐 ai-tool-core 的 PermissionUpdate 7种操作类型， 但使用简化格式（不引用 ai-tool-core 类型）。
 */
export interface PermissionUpdateMessage {
  readonly type: 'permission_update';
  /** 更新类型（对齐 ai-tool-core PermissionUpdate） */
  readonly updateType:
    | 'addRules'
    | 'removeRules'
    | 'replaceRules'
    | 'setMode'
    | 'addDirs'
    | 'removeDirs'
    | 'reloadFromSettings';
  /** 权限规则数据（简化格式） */
  readonly rules?: readonly PermissionBubbleRule[];
  /** 权限模式 */
  readonly mode?: string;
  /** 目录列表 */
  readonly directories?: readonly string[];
  /** settings 配置（可选） */
  readonly settings?: Record<string, unknown>;
}

/**
 * Settings 变更广播消息 — Leader 向所有 Worker 广播 settings 变更
 *
 * 参考 Claude Code 的 settings 变更通知: 当 settings 文件变更导致权限规则、hooks 等变化时， Leader 通过 Mailbox 通知所有 Worker
 * 重新加载配置。
 */
export interface SettingsUpdateMessage {
  readonly type: 'settings_update';
  /** 变更来源层 */
  readonly sourceLayer?: string;
  /** 变更的 settings 字段路径 */
  readonly changedFields?: readonly string[];
  /** 完整合并配置（可选，宿主注入） */
  readonly mergedSettings?: Record<string, unknown>;
}
