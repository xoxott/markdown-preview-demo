/** InMemoryCronProvider — CronProvider 内存实现（测试/开发用） */

import type {
  CronCreateResult,
  CronDeleteResult,
  CronEntry,
  CronProvider
} from '../types/cron-provider';

/** InMemory Cron Provider */
export class InMemoryCronProvider implements CronProvider {
  private crons = new Map<string, CronEntry>();

  async createCron(
    cron: string,
    prompt: string,
    recurring: boolean,
    durable?: boolean
  ): Promise<CronCreateResult> {
    const id = `cron_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entry: CronEntry = {
      id,
      cron,
      prompt,
      recurring,
      durable: durable ?? false,
      createdAt: Date.now()
    };
    this.crons.set(id, entry);
    return { id, cron, recurring };
  }

  async deleteCron(id: string): Promise<CronDeleteResult> {
    const deleted = this.crons.delete(id);
    return { id, deleted };
  }

  async listCrons(): Promise<readonly CronEntry[]> {
    return [...this.crons.values()];
  }

  /** 重置（测试辅助） */
  reset(): void {
    this.crons.clear();
  }

  /** 当前条目数（测试辅助） */
  get size(): number {
    return this.crons.size;
  }
}
