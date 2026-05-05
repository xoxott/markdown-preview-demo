/** InMemoryRemoteTriggerProvider — RemoteTriggerProvider 内存实现（测试/开发用） */

import type {
  RemoteTriggerAction,
  RemoteTriggerEntry,
  RemoteTriggerProvider,
  RemoteTriggerResult
} from '../types/remote-trigger-provider';

/** InMemory RemoteTrigger Provider */
export class InMemoryRemoteTriggerProvider implements RemoteTriggerProvider {
  private triggers = new Map<string, RemoteTriggerEntry>();

  async trigger(
    action: RemoteTriggerAction,
    triggerId?: string,
    body?: Record<string, unknown>
  ): Promise<RemoteTriggerResult> {
    switch (action) {
      case 'list': {
        const entries = [...this.triggers.values()];
        return { id: '', action, data: { triggers: entries } };
      }

      case 'get': {
        const entry = triggerId ? this.triggers.get(triggerId) : undefined;
        return { id: triggerId ?? '', action, data: entry ? { trigger: entry } : undefined };
      }

      case 'create': {
        const id = `trigger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const entry: RemoteTriggerEntry = {
          id,
          name: (body?.name as string) ?? '',
          cron: (body?.cron as string) ?? '',
          prompt: (body?.prompt as string) ?? '',
          status: 'active'
        };
        this.triggers.set(id, entry);
        return { id, action, data: { trigger: entry } };
      }

      case 'update': {
        if (!triggerId) {
          return { id: '', action, data: undefined };
        }
        const existing = this.triggers.get(triggerId);
        if (!existing) {
          return { id: triggerId, action, data: undefined };
        }
        const updated: RemoteTriggerEntry = {
          ...existing,
          name: (body?.name as string) ?? existing.name,
          cron: (body?.cron as string) ?? existing.cron,
          prompt: (body?.prompt as string) ?? existing.prompt
        };
        this.triggers.set(triggerId, updated);
        return { id: triggerId, action, data: { trigger: updated } };
      }

      case 'run': {
        if (!triggerId) {
          return { id: '', action, data: undefined };
        }
        const entry = this.triggers.get(triggerId);
        return { id: triggerId, action, data: entry ? { trigger: entry } : undefined };
      }

      default:
        return { id: '', action, data: undefined };
    }
  }

  /** 重置（测试辅助） */
  reset(): void {
    this.triggers.clear();
  }

  /** 当前条目数（测试辅助） */
  get size(): number {
    return this.triggers.size;
  }
}
