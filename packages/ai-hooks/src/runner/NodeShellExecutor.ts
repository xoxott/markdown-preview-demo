/** NodeShellExecutor — ShellExecutor 的 Node.js child_process 实现 */

import { spawn } from 'node:child_process';
import type { ShellExecuteOptions, ShellExecutor, ShellResult } from '../types/runner';

/**
 * NodeShellExecutor — 使用 child_process.spawn 执行 Shell 命令
 *
 * 默认配置：
 *
 * - shell=true（使用系统 shell）
 * - 合并宿主环境变量 + 注入 env
 * - 支持 AbortSignal 中断
 * - 支持 timeout 超时
 */
export class NodeShellExecutor implements ShellExecutor {
  async execute(command: string, options: ShellExecuteOptions = {}): Promise<ShellResult> {
    const { shell = true, env: extraEnv, signal, timeout, cwd } = options;

    // 合并环境变量
    const mergedEnv = { ...process.env, ...extraEnv };

    // 超时 AbortController
    const timeoutController = timeout ? new AbortController() : undefined;
    const timeoutId = timeout ? setTimeout(() => timeoutController!.abort(), timeout) : undefined;

    // 级联外部 signal + timeout signal
    const combinedController = new AbortController();

    if (signal) {
      signal.addEventListener('abort', () => combinedController.abort(), { once: true });
      if (signal.aborted) combinedController.abort();
    }

    if (timeoutController) {
      timeoutController.signal.addEventListener('abort', () => combinedController.abort(), {
        once: true
      });
    }

    try {
      const child = spawn(command, [], {
        shell,
        env: mergedEnv,
        cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // 中断信号 → kill 子进程
      combinedController.signal.addEventListener(
        'abort',
        () => {
          child.kill('SIGTERM');
        },
        { once: true }
      );

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: unknown) => {
        stdout += String(data);
      });

      child.stderr?.on('data', (data: unknown) => {
        stderr += String(data);
      });

      return await new Promise<ShellResult>((resolve, reject) => {
        child.on('close', (code: number | null) => {
          resolve({
            exitCode: code ?? 1,
            stdout,
            stderr
          });
        });

        child.on('error', (err: Error) => {
          reject(err);
        });
      });
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }
}
