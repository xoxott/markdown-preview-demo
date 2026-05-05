/** Cron 定时任务 Provider 接口 — 宿主注入实现 */

/** Cron 定时任务条目 */
export interface CronEntry {
  /** 任务 ID */
  readonly id: string;
  /** 5-field cron 表达式（本地时区）：M H DoM Mon DoW */
  readonly cron: string;
  /** 触发时执行的 prompt */
  readonly prompt: string;
  /** true=循环触发, false=一次性后自动删除 */
  readonly recurring: boolean;
  /** false=会话级(默认), true=持久化 */
  readonly durable: boolean;
  /** 创建时间戳 */
  readonly createdAt: number;
}

/** Cron 创建结果 */
export interface CronCreateResult {
  readonly id: string;
  readonly cron: string;
  readonly recurring: boolean;
}

/** Cron 删除结果 */
export interface CronDeleteResult {
  readonly id: string;
  readonly deleted: boolean;
}

/** CronProvider — 宿主注入接口 */
export interface CronProvider {
  /** 创建定时任务 */
  createCron(
    cron: string,
    prompt: string,
    recurring: boolean,
    durable?: boolean
  ): Promise<CronCreateResult>;
  /** 删除定时任务 */
  deleteCron(id: string): Promise<CronDeleteResult>;
  /** 列出所有定时任务 */
  listCrons(): Promise<readonly CronEntry[]>;
}
