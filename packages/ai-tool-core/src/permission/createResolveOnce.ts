/**
 * createResolveOnce — 原子竞争守卫原语
 *
 * 参考 Claude Code 的 PermissionContext.ts createResolveOnce:
 *
 * 核心机制: 两个布尔标志 (claimed + delivered) 防止双重 resolve
 *
 * - claim(): 原子 check-and-mark — 在 await 前调用，关闭竞争窗口 如果尚未被其他 racer 抢占，标记为 claimed 并返回 true 如果已被抢占，返回
 *   false（此 racer 应静默退出）
 * - resolve(value): 交付决策值 — 仅第一次生效 检查 delivered 标志作为第二层防护，防止两个 racer 都通过 claim() 后双重 resolve
 * - isResolved(): 只读检查 — 用于 skip-early 快速跳过 比 claim() 更轻量，但不保证原子性（适合在 await 前的快速判断）
 *
 * 使用模式（每个 racer 的标准协议）:
 *
 * ```ts
 * // 1. claim() 原子抢占
 * if (!claim()) return; // 其他 racer 已赢 — 静默退出
 *
 * // 2. 清理其他 racer
 * bridgeCallbacks?.cancelRequest(bridgeRequestId);
 * channelUnsubscribe?.();
 * ctx.removeFromQueue();
 *
 * // 3. resolveOnce() 安全交付
 * resolveOnce(decision);
 * ```
 *
 * 两个标志分离的设计意图:
 *
 * - claimed = true 表示某个 racer 已赢得竞争，但可能还没交付决策值
 * - delivered = true 表示决策值已实际交付给 Promise resolve 函数
 * - 分离允许 racer 在 claim() 和 resolveOnce() 之间执行清理操作 而不用担心另一个 racer 在这个间隙内也通过 isResolved() 检查
 */

import type { ResolveOnce } from '../types/permission-racing';

/**
 * 创建原子竞争守卫
 *
 * @param resolve Promise 的 resolve 函数（仅被调用一次）
 * @returns ResolveOnce 守卫对象
 */
export function createResolveOnce<T>(resolve: (value: T) => void): ResolveOnce<T> {
  let claimed = false;
  let delivered = false;

  return {
    /** 交付决策值（仅第一次生效） */
    resolve(value: T): void {
      if (delivered) return; // 第二层防护: 防止双重交付
      delivered = true;
      claimed = true;
      resolve(value);
    },

    /** 只读检查: 是否已有 racer 赢得竞争 */
    isResolved(): boolean {
      return claimed; // 快速只读检查（不保证原子性，适合 skip-early）
    },

    /** 原子抢占: 如果尚未被其他 racer 抢占，标记为 claimed 并返回 true */
    claim(): boolean {
      if (claimed) return false; // 原子 check-and-mark: 已被抢占
      claimed = true;
      return true; // 此 racer 赢得竞争
    }
  };
}
