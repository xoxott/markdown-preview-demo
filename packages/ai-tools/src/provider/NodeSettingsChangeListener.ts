/**
 * NodeSettingsChangeListener — chokidar 文件监控实现
 *
 * 实现 SettingsChangeListener 接口，使用 chokidar.watch 监控设置文件变更。 支持 debounce（默认 100ms）防止短时间内多次触发。
 */

import type { SettingsChangeListener } from '@suga/ai-tool-core';

/** NodeSettingsChangeListener 配置 */
export interface NodeSettingsChangeListenerConfig {
  /** 要监控的文件路径列表 */
  readonly paths: readonly string[];
  /** debounce 时间（ms，默认 100） */
  readonly debounceMs?: number;
}

/**
 * NodeSettingsChangeListener — chokidar 监控实现
 *
 * chokidar 为可选依赖，如果未安装则 start() 抛出错误。
 */
export class NodeSettingsChangeListener implements SettingsChangeListener {
  private readonly paths: readonly string[];
  private readonly debounceMs: number;
  private readonly listeners: Set<() => void> = new Set();
  private watcher: unknown | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: NodeSettingsChangeListenerConfig) {
    this.paths = config.paths;
    this.debounceMs = config.debounceMs ?? 100;
  }

  /** 开始监控 */
  async start(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const chokidar = require('chokidar');
      this.watcher = chokidar.watch(this.paths, { ignoreInitial: true });
      (this.watcher as { on: (event: string, handler: () => void) => unknown }).on('change', () => {
        this.handleChange();
      });
      (this.watcher as { on: (event: string, handler: () => void) => unknown }).on('add', () => {
        this.handleChange();
      });
    } catch {
      throw new Error(
        'chokidar is required for NodeSettingsChangeListener. Install it: npm install chokidar'
      );
    }
  }

  /** 停止监控 */
  async stop(): Promise<void> {
    if (this.watcher) {
      await (this.watcher as { close: () => Promise<void> }).close();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /** 订阅变更通知 */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** debounce 处理变更 */
  private handleChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      for (const listener of this.listeners) {
        listener();
      }
    }, this.debounceMs);
  }
}
