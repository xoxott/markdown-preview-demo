/**
 * postCompactCleanup — 压缩后的缓存清理
 *
 * 对齐 CC services/compact/postCompactCleanup.ts。在 auto-compact / 手动 /compact 完成后清理被压缩失效的缓存（系统提示分组 /
 * 内存文件 / classifier 审批 / bash speculative checks 等）。子代理与主线程共享 module-level 状态时不能 reset 主线程独有的
 * cache，否则会污染主线程。
 */

// ============================================================
// 类型
// ============================================================

/** Post-compact 清理的 query 来源（与 @suga/ai-tool-adapter.QuerySource 区分） */
export type PostCompactQuerySource =
  | 'repl_main_thread'
  | 'repl_main_thread_initial'
  | 'sdk'
  | string;

/** 一个可选的清理动作 */
export interface CleanupAction {
  /** 动作名（用于日志/排序） */
  readonly name: string;
  /** 是否仅在主线程 compact 时执行 */
  readonly mainThreadOnly?: boolean;
  /** 实际执行 */
  readonly run: () => void | Promise<void>;
}

// ============================================================
// 主线程检测
// ============================================================

/**
 * 是否为主线程 compact（querySource 为空时按主线程处理 — 仅 /compact /clear 等）
 *
 * 子代理 querySource 形如 `agent:explore` 等，与主线程的 `repl_main_thread*` / `sdk` 区分。
 */
export function isMainThreadCompact(querySource?: PostCompactQuerySource): boolean {
  if (querySource === undefined) return true;
  return querySource.startsWith('repl_main_thread') || querySource === 'sdk';
}

// ============================================================
// 注册器
// ============================================================

/**
 * PostCompactCleanupRegistry — 集中管理 cleanup 动作
 *
 * 不同模块可以在初始化时注册自己的 cleanup 动作，避免硬编码到 compact 服务中（保持模块解耦）。
 */
export class PostCompactCleanupRegistry {
  private readonly actions: CleanupAction[] = [];

  register(action: CleanupAction): void {
    this.actions.push(action);
  }

  unregister(name: string): boolean {
    const idx = this.actions.findIndex(a => a.name === name);
    if (idx === -1) return false;
    this.actions.splice(idx, 1);
    return true;
  }

  list(): readonly CleanupAction[] {
    return this.actions;
  }

  /** 运行所有 cleanup（按注册顺序） */
  async run(querySource?: PostCompactQuerySource): Promise<void> {
    const isMain = isMainThreadCompact(querySource);
    for (const action of this.actions) {
      if (action.mainThreadOnly && !isMain) continue;
      try {
        await action.run();
      } catch {
        // 静默吞下 — 一个 cleanup 失败不应影响其他
      }
    }
  }

  clear(): void {
    this.actions.length = 0;
  }

  get size(): number {
    return this.actions.length;
  }
}

// ============================================================
// 全局单例
// ============================================================

let globalRegistry: PostCompactCleanupRegistry | null = null;

/** 获取全局注册器 */
export function getGlobalPostCompactCleanupRegistry(): PostCompactCleanupRegistry {
  if (!globalRegistry) {
    globalRegistry = new PostCompactCleanupRegistry();
  }
  return globalRegistry;
}

/** 重置全局注册器（测试用） */
export function resetGlobalPostCompactCleanupRegistry(): void {
  globalRegistry = null;
}

/** 注册一个 cleanup 动作到全局注册器 */
export function registerPostCompactCleanup(action: CleanupAction): void {
  getGlobalPostCompactCleanupRegistry().register(action);
}

/** 运行 post-compact cleanup（接入 compact 服务的入口） */
export async function runPostCompactCleanup(querySource?: PostCompactQuerySource): Promise<void> {
  await getGlobalPostCompactCleanupRegistry().run(querySource);
}
