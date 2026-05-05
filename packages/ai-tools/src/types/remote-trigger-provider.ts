/** RemoteTrigger Provider 接口 — 宿主注入实现，调用 claude.ai remote-trigger API */

/** RemoteTrigger 操作类型 */
export type RemoteTriggerAction = 'list' | 'get' | 'create' | 'update' | 'run';

/** RemoteTrigger 条目 */
export interface RemoteTriggerEntry {
  readonly id: string;
  readonly name?: string;
  readonly cron?: string;
  readonly prompt?: string;
  readonly status?: string;
}

/** RemoteTrigger 操作结果 */
export interface RemoteTriggerResult {
  readonly id: string;
  readonly action: RemoteTriggerAction;
  readonly data?: Record<string, unknown>;
}

/** RemoteTriggerProvider — 宿主注入接口 */
export interface RemoteTriggerProvider {
  /** 执行 remote-trigger 操作 */
  trigger(
    action: RemoteTriggerAction,
    triggerId?: string,
    body?: Record<string, unknown>
  ): Promise<RemoteTriggerResult>;
}
