/**
 * MCP Stdio 传输实现
 *
 * 通过 spawn 子进程 + stdin/stdout pipe 实现 MCP 协议通信。 消息帧格式为 newline-delimited JSON（MCP spec 标准）。
 *
 * 基于 Claude Code services/mcp/StdioClientTransport 模式提取
 */

import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import type { McpTransport } from '../types/mcp-transport';
import type { McpStdioServerConfig } from '../types/mcp-config';
import { expandEnvVarsInString } from '../config/envExpansion';

/** StdioTransport 选项 */
export interface StdioTransportOptions {
  /** stderr 数据回调（逐行） */
  onStderrData?: (line: string) => void;
  /** 工作目录覆盖（优先于 config.cwd） */
  cwd?: string;
}

/**
 * MCP Stdio 传输 — spawn 子进程 + stdin/stdout pipe
 *
 * 使用 newline-delimited JSON 帧格式：
 *
 * - 发送: JSON.stringify(message) + '\n' → stdin
 * - 接收: stdout 逐行读取 → JSON.parse → onmessage
 * - stderr: 逐行转发到 onStderrData 回调
 */
export class StdioTransport implements McpTransport {
  private process: ChildProcess | null = null;
  private closed = false;
  private lineBuffer = '';

  onmessage?: (message: unknown) => void;
  onerror?: (error: Error) => void;
  onclose?: () => void;

  constructor(
    private readonly config: McpStdioServerConfig,
    private readonly options?: StdioTransportOptions
  ) {}

  /** 启动子进程 + 建立 stdin/stdout/stderr pipe */
  async start(): Promise<void> {
    if (this.closed) {
      throw new Error('StdioTransport is closed');
    }

    // 环境变量展开
    const { expanded: command, missingVars: cmdMissing } = expandEnvVarsInString(
      this.config.command
    );
    const expandedArgs = (this.config.args ?? []).map(arg => {
      const { expanded } = expandEnvVarsInString(arg);
      return expanded;
    });

    // 缺失变量警告（不阻止启动）
    if (cmdMissing.length > 0) {
      console.warn(
        `StdioTransport: command contains unresolved env vars: ${cmdMissing.join(', ')}`
      );
    }

    // 合并环境变量
    const env: Record<string, string | undefined> = this.config.env
      ? { ...process.env, ...this.config.env }
      : process.env;

    const cwd = this.options?.cwd ?? this.config.cwd ?? process.cwd();

    this.process = spawn(command, expandedArgs, {
      env,
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // stderr → 行分割 → onStderrData 回调
    this.process.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      const lines = text.split('\n').filter(l => l !== '');
      for (const line of lines) {
        this.options?.onStderrData?.(line);
      }
    });

    // stdout → 行缓冲 → JSON 解析 → onmessage
    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.lineBuffer += chunk.toString();
      const lines = this.lineBuffer.split('\n');
      // 最后元素可能不完整（或为空字符串如果末尾有\n）
      this.lineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const message = JSON.parse(line);
          this.onmessage?.(message);
        } catch {
          this.onerror?.(new Error(`StdioTransport: failed to parse MCP message: ${line}`));
        }
      }
    });

    // 进程异常退出 → onerror + onclose
    this.process.on('exit', (code, signal) => {
      if (!this.closed) {
        this.closed = true;
        if (code !== 0 && code !== null) {
          this.onerror?.(
            new Error(
              `StdioTransport: MCP server process exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`
            )
          );
        }
        this.onclose?.();
      }
    });

    // spawn 失败 → onerror
    this.process.on('error', (err: Error) => {
      this.onerror?.(err);
    });
  }

  /** 发送消息 → stdin pipe */
  async send(message: unknown): Promise<void> {
    if (this.closed || !this.process?.stdin) {
      throw new Error('StdioTransport is closed or not started');
    }
    const data = `${JSON.stringify(message)}\n`;
    this.process.stdin.write(data);
  }

  /** 关闭传输 — kill 子进程 + emit onclose */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.process?.kill();
    this.process = null;
    this.onclose?.();
  }
}
