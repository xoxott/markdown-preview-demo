/**
 * Team Memory Watcher — 监视团队内存目录并防抖触发同步
 *
 * 对齐 CC services/teamMemorySync/watcher.ts。监听本地团队内存目录的文件变更， 防抖（默认 2s）后触发增量推送到服务端；启动时先做一次拉取保证状态一致。
 *
 * 这里只提供调度核心（防抖、永久失败抑制、push 锁），实际文件监听和 HTTP 请求由宿主 `WatcherDriver` 实现，便于在 Node/浏览器/测试环境中复用。
 */

// ============================================================
// 类型
// ============================================================

/** 推送结果（HTTP 响应抽象） */
export interface TeamMemoryPushResult {
  readonly success: boolean;
  readonly httpStatus?: number;
  readonly errorType?:
    | 'auth'
    | 'timeout'
    | 'network'
    | 'conflict'
    | 'unknown'
    | 'no_oauth'
    | 'no_repo';
  readonly error?: string;
}

/**
 * 永久失败：重试不会有进展（需要用户介入或重启 session）
 *
 * - no_oauth / no_repo：客户端预检失败，没有 status code
 * - 4xx 除 409/429：客户端错误（404 missing repo, 413 too many entries, 403 permission）
 * - 409 是临时冲突，下次 pull 后重新 push 可能成功
 * - 429 是速率限制，watcher 自带退避机制
 */
export function isPermanentFailure(r: TeamMemoryPushResult): boolean {
  if (r.errorType === 'no_oauth' || r.errorType === 'no_repo') return true;
  if (
    r.httpStatus !== undefined &&
    r.httpStatus >= 400 &&
    r.httpStatus < 500 &&
    r.httpStatus !== 409 &&
    r.httpStatus !== 429
  ) {
    return true;
  }
  return false;
}

// ============================================================
// Driver 抽象
// ============================================================

/** Watcher Driver — 由宿主实现 */
export interface WatcherDriver {
  /** 启动文件监视，返回取消函数 */
  watch(dir: string, onChange: (eventType: string, filename: string | null) => void): () => void;
  /** 触发一次 push（实际网络请求） */
  push(): Promise<TeamMemoryPushResult>;
  /** 触发一次 pull（启动时初始化） */
  pull(): Promise<{ success: boolean; error?: string }>;
  /** 当前用户是否启用了 team memory feature */
  isEnabled(): boolean;
  /** 团队内存目录（绝对路径） */
  getTeamMemDir(): string | null;
}

// ============================================================
// 状态
// ============================================================

interface WatcherInternalState {
  cancelWatch: (() => void) | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  pushInProgress: boolean;
  hasPendingChanges: boolean;
  currentPushPromise: Promise<void> | null;
  watcherStarted: boolean;
  pushSuppressedReason: string | null;
}

function createInternalState(): WatcherInternalState {
  return {
    cancelWatch: null,
    debounceTimer: null,
    pushInProgress: false,
    hasPendingChanges: false,
    currentPushPromise: null,
    watcherStarted: false,
    pushSuppressedReason: null
  };
}

// ============================================================
// Watcher
// ============================================================

export interface TeamMemoryWatcherOptions {
  readonly driver: WatcherDriver;
  /** 防抖延迟（毫秒），默认 2000 */
  readonly debounceMs?: number;
  /** 日志回调 */
  readonly onLog?: (message: string) => void;
}

/** TeamMemoryWatcher — 文件变更监视 + 防抖推送 */
export class TeamMemoryWatcher {
  private readonly state = createInternalState();
  private readonly options: TeamMemoryWatcherOptions;
  private readonly debounceMs: number;

  constructor(options: TeamMemoryWatcherOptions) {
    this.options = options;
    this.debounceMs = options.debounceMs ?? 2000;
  }

  /** 启动 watcher（先 pull 再开始 watch） */
  async start(): Promise<void> {
    if (this.state.watcherStarted) return;
    if (!this.options.driver.isEnabled()) {
      this.log('Team memory not enabled — skip watcher start');
      return;
    }

    const dir = this.options.driver.getTeamMemDir();
    if (!dir) {
      this.log('No team memory directory available — skip watcher start');
      return;
    }

    const pullResult = await this.options.driver.pull();
    if (!pullResult.success) {
      this.log(`Initial pull failed: ${pullResult.error ?? 'unknown'}`);
    }

    this.state.cancelWatch = this.options.driver.watch(dir, () => {
      this.scheduleDebouncedPush();
    });
    this.state.watcherStarted = true;
    this.log(`Watcher started on ${dir}`);
  }

  /** 停止 watcher */
  stop(): void {
    if (this.state.cancelWatch) {
      this.state.cancelWatch();
      this.state.cancelWatch = null;
    }
    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer);
      this.state.debounceTimer = null;
    }
    this.state.watcherStarted = false;
    this.log('Watcher stopped');
  }

  /** 是否正在运行 */
  isRunning(): boolean {
    return this.state.watcherStarted;
  }

  /** 是否有待处理变更 */
  hasPendingChanges(): boolean {
    return this.state.hasPendingChanges || this.state.pushInProgress;
  }

  /** 是否被永久失败抑制 */
  isSuppressed(): boolean {
    return this.state.pushSuppressedReason !== null;
  }

  /** 重置永久失败抑制（用户介入后调用） */
  clearSuppression(): void {
    this.state.pushSuppressedReason = null;
  }

  /** 等待当前 push 完成（如果有的话） */
  async waitForCurrentPush(): Promise<void> {
    if (this.state.currentPushPromise) {
      await this.state.currentPushPromise;
    }
  }

  /** 立即触发一次 push（绕过防抖） */
  async forcePush(): Promise<void> {
    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer);
      this.state.debounceTimer = null;
    }
    await this.executePush();
  }

  private scheduleDebouncedPush(): void {
    if (this.state.pushSuppressedReason !== null) {
      this.log(`Push suppressed: ${this.state.pushSuppressedReason}`);
      return;
    }

    this.state.hasPendingChanges = true;

    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer);
    }

    this.state.debounceTimer = setTimeout(() => {
      this.state.debounceTimer = null;
      this.executePush().catch(err => {
        this.log(`Push failed: ${(err as Error).message}`);
      });
    }, this.debounceMs);
  }

  private async executePush(): Promise<void> {
    if (this.state.pushInProgress) {
      this.state.hasPendingChanges = true;
      return;
    }

    this.state.pushInProgress = true;
    this.state.hasPendingChanges = false;

    const promise = this.runPushOnce();
    this.state.currentPushPromise = promise;

    try {
      await promise;
    } finally {
      this.state.pushInProgress = false;
      this.state.currentPushPromise = null;

      if (this.state.hasPendingChanges && !this.state.pushSuppressedReason) {
        this.scheduleDebouncedPush();
      }
    }
  }

  private async runPushOnce(): Promise<void> {
    try {
      const result = await this.options.driver.push();
      if (!result.success) {
        if (isPermanentFailure(result)) {
          const reason = result.errorType ?? `http_${result.httpStatus}`;
          this.state.pushSuppressedReason = reason;
          this.log(`Permanent failure detected: ${reason} — suppressing further pushes`);
        } else {
          this.log(`Push failed (transient): ${result.error ?? 'unknown'}`);
        }
      } else {
        this.log('Push succeeded');
      }
    } catch (err) {
      this.log(`Push exception: ${(err as Error).message}`);
    }
  }

  private log(msg: string): void {
    this.options.onLog?.(`[teamMemoryWatcher] ${msg}`);
  }
}
