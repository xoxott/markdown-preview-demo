/**
 * Plugin Installation Manager — 后台安装 / 协调 marketplace + plugin
 *
 * 对齐 CC services/plugins/PluginInstallationManager.ts。CC 端把"声明的 marketplace" 与"已物化的 marketplace"做
 * diff，背景安装缺失项；安装完成后清缓存并刷新激活的 plugin 列表。本包不直接管 git clone / fs 操作，而是通过依赖注入让 CLI/IDE 各自 实现 reconcile
 * 与 refresh 逻辑。
 */

// ============================================================
// 状态机
// ============================================================

export type InstallationStatus = 'pending' | 'installing' | 'installed' | 'failed';

export interface MarketplaceInstallation {
  readonly name: string;
  readonly status: InstallationStatus;
  readonly error?: string;
}

export interface PluginInstallationState {
  readonly marketplaces: readonly MarketplaceInstallation[];
  readonly plugins: readonly MarketplaceInstallation[];
  readonly needsRefresh?: boolean;
}

/** 状态变更监听器（由 IDE 用于驱动 React UI / CLI 用于刷新 spinner） */
export type SetInstallationState = (
  updater: (prev: PluginInstallationState) => PluginInstallationState
) => void;

// ============================================================
// 安装事件 / 协调结果
// ============================================================

export type InstallationProgressEvent =
  | { readonly type: 'installing'; readonly name: string }
  | { readonly type: 'installed'; readonly name: string }
  | { readonly type: 'failed'; readonly name: string; readonly error: string };

export interface ReconcileResult {
  readonly installed: readonly string[];
  readonly updated: readonly string[];
  readonly failed: readonly { readonly name: string; readonly error: string }[];
  readonly upToDate: readonly string[];
}

// ============================================================
// 注入式依赖
// ============================================================

/** 由宿主提供：声明的 marketplace 列表（来自 settings.json + 项目配置） */
export type LoadDeclaredMarketplaces = () => readonly { readonly name: string }[];
/** 由宿主提供：已物化（落盘）的 marketplace 列表 */
export type LoadMaterializedMarketplaces = () => Promise<Readonly<Record<string, unknown>>>;
/** 由宿主提供：reconcile 主流程（git clone / fs install） */
export type ReconcileMarketplacesFn = (params: {
  readonly onProgress: (event: InstallationProgressEvent) => void;
}) => Promise<ReconcileResult>;
/** 由宿主提供：清空 marketplace cache */
export type ClearMarketplacesCache = () => void;
/** 由宿主提供：清空 plugin cache（带原因） */
export type ClearPluginCache = (reason: string) => void;
/** 由宿主提供：刷新激活的 plugin 列表（重新连接 MCP 等） */
export type RefreshActivePlugins = (setState: SetInstallationState) => Promise<void>;
/** 注入式日志器 */
export type LogFn = (
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  metadata?: Record<string, unknown>
) => void;

export interface PluginInstallationDeps {
  readonly loadDeclared: LoadDeclaredMarketplaces;
  readonly loadMaterialized: LoadMaterializedMarketplaces;
  readonly reconcile: ReconcileMarketplacesFn;
  readonly clearMarketplacesCache: ClearMarketplacesCache;
  readonly clearPluginCache: ClearPluginCache;
  readonly refreshActivePlugins: RefreshActivePlugins;
  readonly log?: LogFn;
}

// ============================================================
// Diff
// ============================================================

export interface MarketplaceDiff {
  readonly missing: readonly string[];
  readonly sourceChanged: readonly { readonly name: string }[];
}

/**
 * 对比"声明的 marketplace"与"已物化的 marketplace"
 *
 * 这是简化版（只做名字 missing 检查），实际 CC 还会比对 source URL；宿主可以 选择重写本函数或在 reconcile 内部做 source 对比。
 */
export function diffMarketplaces(
  declared: readonly { readonly name: string }[],
  materialized: Readonly<Record<string, unknown>>
): MarketplaceDiff {
  const materializedSet = new Set(Object.keys(materialized));
  const missing: string[] = [];
  for (const m of declared) {
    if (!materializedSet.has(m.name)) missing.push(m.name);
  }
  return { missing, sourceChanged: [] };
}

// ============================================================
// 状态写入
// ============================================================

function updateMarketplaceStatus(
  setState: SetInstallationState,
  name: string,
  status: InstallationStatus,
  error?: string
): void {
  setState(prev => ({
    ...prev,
    marketplaces: prev.marketplaces.map(m => (m.name === name ? { ...m, status, error } : m))
  }));
}

// ============================================================
// 主流程
// ============================================================

/**
 * 后台安装入口 — 与 CC performBackgroundPluginInstallations 等价
 *
 * 流程：
 *
 * 1. 计算 diff，把 missing 名字打成 "pending" 写入 state
 * 2. 调 reconcile，根据 onProgress 把 state 更新为 installing/installed/failed
 * 3. 如果有新装的 marketplace，自动 refresh active plugins；refresh 失败回退到 needsRefresh
 * 4. 如果只是 update（已存在但版本变更），写 needsRefresh 让用户手动 /reload-plugins
 */
export async function performBackgroundPluginInstallations(
  setState: SetInstallationState,
  deps: PluginInstallationDeps
): Promise<void> {
  const log = deps.log ?? (() => {});
  log('debug', 'performBackgroundPluginInstallations called');

  try {
    const declared = deps.loadDeclared();
    const materialized = await deps.loadMaterialized().catch(() => ({}));
    const diff = diffMarketplaces(declared, materialized);
    const pendingNames = [...diff.missing, ...diff.sourceChanged.map(c => c.name)];

    setState(prev => ({
      ...prev,
      marketplaces: pendingNames.map(name => ({ name, status: 'pending' as const })),
      plugins: []
    }));

    if (pendingNames.length === 0) return;

    log('debug', `Installing ${pendingNames.length} marketplace(s) in background`);

    const result = await deps.reconcile({
      onProgress: event => {
        switch (event.type) {
          case 'installing':
            updateMarketplaceStatus(setState, event.name, 'installing');
            break;
          case 'installed':
            updateMarketplaceStatus(setState, event.name, 'installed');
            break;
          case 'failed':
            updateMarketplaceStatus(setState, event.name, 'failed', event.error);
            break;
          default:
            break;
        }
      }
    });

    log('info', 'tengu_marketplace_background_install', {
      installed_count: result.installed.length,
      updated_count: result.updated.length,
      failed_count: result.failed.length,
      up_to_date_count: result.upToDate.length
    });

    if (result.installed.length > 0) {
      deps.clearMarketplacesCache();
      log(
        'debug',
        `Auto-refreshing plugins after ${result.installed.length} new marketplace(s) installed`
      );
      try {
        await deps.refreshActivePlugins(setState);
      } catch (refreshError) {
        log('warn', `Auto-refresh failed, falling back to needsRefresh: ${refreshError}`);
        deps.clearPluginCache('performBackgroundPluginInstallations: auto-refresh failed');
        setState(prev => (prev.needsRefresh ? prev : { ...prev, needsRefresh: true }));
      }
    } else if (result.updated.length > 0) {
      deps.clearMarketplacesCache();
      deps.clearPluginCache('performBackgroundPluginInstallations: marketplaces reconciled');
      setState(prev => (prev.needsRefresh ? prev : { ...prev, needsRefresh: true }));
    }
  } catch (error) {
    log('error', `performBackgroundPluginInstallations failed: ${String(error)}`);
  }
}
