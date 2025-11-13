/**
 * JavaScript 代码运行 Hook (Web Worker)
 *
 * @module useRunJSCode
 */

import type { Ref } from 'vue';
import { computed, onUnmounted, ref } from 'vue';

/** Worker 消息类型 */
interface WorkerMessage {
  result?: any;
  error?: string;
  logs?: string[];
  warnings?: string[];
  duration: number;
}

/** 运行状态 */
interface RunState {
  /** 是否正在运行 */
  isRunning: boolean;
  /** 运行次数 */
  runCount: number;
  /** 最后运行时间 */
  lastRunTime: number | null;
}

/** 运行结果的返回结构 */
export interface RunResult {
  /** 运行代码 */
  run: () => Promise<void>;
  /** 停止运行 */
  stop: () => void;
  /** 清空结果 */
  clear: () => void;
  /** 运行结果 */
  result: Ref<any>;
  /** 错误信息 */
  error: Ref<string | null>;
  /** 执行时长（毫秒） */
  duration: Ref<number | null>;
  /** 控制台日志 */
  logs: Ref<string[]>;
  /** 警告信息 */
  warnings: Ref<string[]>;
  /** 是否正在运行 */
  isRunning: Ref<boolean>;
  /** 是否有错误 */
  hasError: Ref<boolean>;
  /** 是否有结果 */
  hasResult: Ref<boolean>;
}

/** 配置常量 */
const RUN_CODE_CONFIG = {
  /** 执行超时时间（毫秒） */
  TIMEOUT: 5000,
  /** 最大日志条数 */
  MAX_LOGS: 100
} as const;

/** 创建 Worker 代码 */
const createWorkerCode = (): string => {
  return `
    self.onmessage = async (e) => {
      const start = performance.now();
      const logs = [];
      const warnings = [];

      try {
        // 保存原始 console 方法
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalInfo = console.info;
        const originalDebug = console.debug;

        // 重写 console 方法
        console.log = (...args) => {
          logs.push('[LOG] ' + args.map(arg => {
            try {
              return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
            } catch {
              return String(arg);
            }
          }).join(' '));
        };

        console.warn = (...args) => {
          const msg = args.map(arg => String(arg)).join(' ');
          warnings.push('[WARN] ' + msg);
          logs.push('[WARN] ' + msg);
        };

        console.error = (...args) => {
          const msg = args.map(arg => String(arg)).join(' ');
          logs.push('[ERROR] ' + msg);
        };

        console.info = (...args) => {
          logs.push('[INFO] ' + args.map(arg => String(arg)).join(' '));
        };

        console.debug = (...args) => {
          logs.push('[DEBUG] ' + args.map(arg => String(arg)).join(' '));
        };

        // 执行代码
        const result = await eval(e.data);

        // 恢复原始 console
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        console.info = originalInfo;
        console.debug = originalDebug;

        const duration = performance.now() - start;
        self.postMessage({ result, logs, warnings, duration });
      } catch (err) {
        const duration = performance.now() - start;
        self.postMessage({
          error: err.message || String(err),
          logs,
          warnings,
          duration
        });
      }
    };
  `;
};

/**
 * 使用 Web Worker 运行 JavaScript 代码
 *
 * @example
 *   ```typescript
 *   const { run, result, error, isRunning, stop } = useRunJSCode('return 1 + 1');
 *
 *   await run();
 *   console.log(result.value); // 2
 *   ```;
 *
 * @param code - JavaScript 代码内容
 * @returns 运行函数及相关状态
 */
export function useRunJSCode(code: string): RunResult {
  // ==================== 状态管理 ====================
  const result = ref<any>(null);
  const error = ref<string | null>(null);
  const duration = ref<number | null>(null);
  const logs = ref<string[]>([]);
  const warnings = ref<string[]>([]);
  const runState = ref<RunState>({
    isRunning: false,
    runCount: 0,
    lastRunTime: null
  });

  // Worker 实例和相关资源
  let worker: Worker | null = null;
  let workerBlobUrl: string | null = null;
  let timeoutId: number | null = null;

  // ==================== 辅助函数 ====================
  /** 清理 Worker 资源 */
  const cleanupWorker = (): void => {
    // 清除超时定时器
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // 终止 Worker
    if (worker) {
      try {
        worker.terminate();
      } catch (err) {
        console.warn('终止 Worker 失败:', err);
      }
      worker = null;
    }

    // 释放 Blob URL
    if (workerBlobUrl) {
      try {
        URL.revokeObjectURL(workerBlobUrl);
      } catch (err) {
        console.warn('释放 Blob URL 失败:', err);
      }
      workerBlobUrl = null;
    }
  };

  /** 格式化错误信息 */
  const formatError = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message;
    }
    return String(err);
  };

  /** 限制日志数量 */
  const limitLogs = (logArray: string[]): string[] => {
    if (logArray.length > RUN_CODE_CONFIG.MAX_LOGS) {
      return [
        ...logArray.slice(0, RUN_CODE_CONFIG.MAX_LOGS),
        `... (${logArray.length - RUN_CODE_CONFIG.MAX_LOGS} more logs truncated)`
      ];
    }
    return logArray;
  };

  // ==================== 核心功能 ====================
  /** 运行代码 */
  const run = async (): Promise<void> => {
    // 防止重复运行
    if (runState.value.isRunning) {
      console.warn('代码正在运行中，请等待完成');
      return;
    }

    // 检查代码是否为空
    if (!code || !code.trim()) {
      error.value = '代码内容为空';
      return;
    }

    // 重置状态
    result.value = null;
    error.value = null;
    duration.value = null;
    logs.value = [];
    warnings.value = [];
    runState.value.isRunning = true;

    try {
      // 清理旧的 Worker
      cleanupWorker();

      // 创建新的 Web Worker
      const workerCode = createWorkerCode();
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      workerBlobUrl = URL.createObjectURL(blob);
      worker = new Worker(workerBlobUrl);

      // 创建执行 Promise
      const executePromise = new Promise<WorkerMessage>((resolve, reject) => {
        if (!worker) {
          reject(new Error('Worker 创建失败'));
          return;
        }

        // 监听消息
        worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
          resolve(e.data);
        };

        // 监听错误
        worker.onerror = (e: ErrorEvent) => {
          reject(new Error(e.message || 'Worker 执行错误'));
        };

        // 发送代码
        worker.postMessage(code);
      });

      // 创建超时 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`执行超时 (${RUN_CODE_CONFIG.TIMEOUT}ms)`));
        }, RUN_CODE_CONFIG.TIMEOUT) as unknown as number;
      });

      // 等待执行或超时
      const response = await Promise.race([executePromise, timeoutPromise]);

      // 清除超时定时器
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // 更新结果
      duration.value = Math.round(response.duration * 100) / 100; // 保留两位小数
      logs.value = limitLogs(response.logs || []);
      warnings.value = response.warnings || [];

      if (response.error) {
        error.value = response.error;
      } else {
        result.value = response.result;
      }

      // 更新运行状态
      runState.value.runCount++;
      runState.value.lastRunTime = Date.now();
    } catch (err) {
      error.value = formatError(err);
      console.error('代码运行错误:', err);
    } finally {
      runState.value.isRunning = false;
      // 运行完成后清理 Worker
      cleanupWorker();
    }
  };

  /** 停止运行 */
  const stop = (): void => {
    if (runState.value.isRunning) {
      cleanupWorker();
      runState.value.isRunning = false;
      error.value = '执行已被用户停止';
    }
  };

  /** 清空结果 */
  const clear = (): void => {
    result.value = null;
    error.value = null;
    duration.value = null;
    logs.value = [];
    warnings.value = [];
  };

  // ==================== 计算属性 ====================
  /** 是否正在运行 */
  const isRunning = computed(() => runState.value.isRunning);

  /** 是否有错误 */
  const hasError = computed(() => error.value !== null);

  /** 是否有结果 */
  const hasResult = computed(() => result.value !== null && !hasError.value);

  // ==================== 生命周期 ====================
  onUnmounted(() => {
    cleanupWorker();
  });

  // ==================== 返回 ====================
  return {
    // 方法
    run,
    stop,
    clear,

    // 状态
    result,
    error,
    duration,
    logs,
    warnings,
    isRunning,
    hasError,
    hasResult
  };
}
