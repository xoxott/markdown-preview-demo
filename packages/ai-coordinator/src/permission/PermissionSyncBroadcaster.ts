/** PermissionSyncBroadcaster — Leader→Worker 权限/Settings广播 */

import type { Mailbox, StructuredMessage } from '../types/mailbox';
import type { PermissionUpdateMessage, SettingsUpdateMessage } from '../types/permission-sync';

/**
 * PermissionSyncBroadcaster — Leader 端广播器
 *
 * 当 Leader 的权限上下文变更时（用户批准新规则、settings 文件变更等），
 * 通过 Mailbox 向所有 Worker 广播更新消息。
 *
 * 广播流程:
 * 1. Leader 权限变更 → broadcastPermissionUpdate / broadcastSettingsUpdate
 * 2. Mailbox.broadcast(from, content) → 投递到所有 Worker inbox
 * 3. Worker 端 pollPermissionUpdates 接收并应用
 *
 * 参考 Claude Code 的 TeamPermissionSyncBroadcaster:
 * - 权限规则变更（addRules/removeRules/setMode 等）→ PermissionUpdateMessage
 * - Settings 文件变更 → SettingsUpdateMessage
 * - 都通过 Mailbox 广播，Worker 端异步 poll
 */
export class PermissionSyncBroadcaster {
  private readonly mailbox: Mailbox;
  private readonly leaderName: string;

  constructor(mailbox: Mailbox, leaderName: string) {
    this.mailbox = mailbox;
    this.leaderName = leaderName;
  }

  /** 广播权限更新 — Leader 权限规则变更时调用 */
  async broadcastPermissionUpdate(message: PermissionUpdateMessage): Promise<void> {
    const structured: StructuredMessage = { type: 'permission_update', payload: message };
    await this.mailbox.broadcast(this.leaderName, structured, this.buildSummary(message));
  }

  /** 广播 Settings 更新 — Settings 文件变更时调用 */
  async broadcastSettingsUpdate(message: SettingsUpdateMessage): Promise<void> {
    const structured: StructuredMessage = { type: 'settings_update', payload: message };
    await this.mailbox.broadcast(this.leaderName, structured, this.buildSettingsSummary(message));
  }

  /** 构建权限更新摘要 */
  private buildSummary(message: PermissionUpdateMessage): string {
    switch (message.updateType) {
      case 'addRules':
        return `权限规则新增: ${message.rules?.length ?? 0} 条规则`;
      case 'removeRules':
        return `权限规则移除: ${message.rules?.length ?? 0} 条规则`;
      case 'replaceRules':
        return `权限规则替换: ${message.rules?.length ?? 0} 条规则`;
      case 'setMode':
        return `权限模式设置: ${message.mode ?? 'default'}`;
      case 'addDirs':
        return `目录新增: ${message.directories?.join(', ') ?? '无'}`;
      case 'removeDirs':
        return `目录移除: ${message.directories?.join(', ') ?? '无'}`;
      case 'reloadFromSettings':
        return '从 Settings 文件重新加载权限';
      default:
        return '权限更新';
    }
  }

  /** 构建 Settings 更新摘要 */
  private buildSettingsSummary(message: SettingsUpdateMessage): string {
    const fields = message.changedFields?.join(', ') ?? '全部';
    const source = message.sourceLayer ?? '未知';
    return `Settings 变更 (${source}): ${fields}`;
  }
}

// ============================================================
// Worker 端接收器
// ============================================================

/**
 * PermissionSyncReceiver — Worker 端权限同步接收器
 *
 * Worker 通过 poll 模式从 Mailbox 接收 Leader 的广播消息:
 * 1. 定期 pollPermissionUpdates → 从 Mailbox 接收广播消息
 * 2. 过滤 PermissionUpdateMessage 和 SettingsUpdateMessage
 * 3. 返回给宿主应用层进行本地权限/Settings 应用
 */
export class PermissionSyncReceiver {
  private readonly mailbox: Mailbox;
  private readonly workerName: string;

  constructor(mailbox: Mailbox, workerName: string) {
    this.mailbox = mailbox;
    this.workerName = workerName;
  }

  /** Poll 权限更新 — 返回所有未处理的广播消息 */
  async pollPermissionUpdates(): Promise<(PermissionUpdateMessage | SettingsUpdateMessage)[]> {
    const messages = await this.mailbox.receive(this.workerName);
    const updates: (PermissionUpdateMessage | SettingsUpdateMessage)[] = [];

    for (const msg of messages) {
      const content = msg.content;
      if (typeof content === 'object' && content !== null && 'type' in content) {
        // StructuredMessage: { type: 'permission_sync'|'settings_sync', payload: ... }
        const structured = content as StructuredMessage;
        if (structured.type === 'permission_update') {
          updates.push(structured.payload as PermissionUpdateMessage);
        } else if (structured.type === 'settings_update') {
          updates.push(structured.payload as SettingsUpdateMessage);
        }
      }
    }

    return updates;
  }

  /** 仅 poll PermissionUpdateMessage */
  async pollPermissionUpdateMessages(): Promise<PermissionUpdateMessage[]> {
    const all = await this.pollPermissionUpdates();
    return all.filter(m => m.type === 'permission_update') as PermissionUpdateMessage[];
  }

  /** 仅 poll SettingsUpdateMessage */
  async pollSettingsUpdateMessages(): Promise<SettingsUpdateMessage[]> {
    const all = await this.pollPermissionUpdates();
    return all.filter(m => m.type === 'settings_update') as SettingsUpdateMessage[];
  }
}