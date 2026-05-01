/**
 * HeadlessIO.ts — stdin/stdout JSON流通信层
 *
 * 对齐Claude Code cli/structuredIO.ts的核心功能：
 * stdin读取JSON消息（newline-delimited），stdout写入JSON消息。
 * 是daemon/headless模式的核心通信机制。
 */

import type { HeadlessIO, HeadlessIOOptions } from '../types/server';

/**
 * NodeHeadlessIO — Node.js环境的stdin/stdout JSON流实现
 *
 * 消息格式：每行一个JSON对象（newline-delimited JSON）
 * 对齐Claude Code的stream-json输入/输出格式。
 */
export class NodeHeadlessIO implements HeadlessIO {
  private readonly inputStream: NodeJS.ReadableStream;
  private readonly outputStream: NodeJS.WritableStream;
  private readonly errorStream: NodeJS.WritableStream;
  private readonly outputFormat: string;
  private _closed = false;
  private messageBuffer: unknown[] = [];
  private resolveRead?: (value: unknown) => void;

  constructor(options?: HeadlessIOOptions) {
    this.inputStream = options?.inputStream ?? process.stdin;
    this.outputStream = options?.outputStream ?? process.stdout;
    this.errorStream = options?.errorStream ?? process.stderr;
    this.outputFormat = options?.outputFormat ?? 'stream-json';

    // 设置stdin为raw模式（逐行读取）
    if (this.inputStream === process.stdin && process.stdin.isTTY) {
      // 不设raw模式 — headless模式通常不是TTY
    }

    // 监听stdin数据
    this.inputStream.on('data', (chunk: Buffer | string) => {
      this.handleInput(chunk);
    });

    this.inputStream.on('end', () => {
      this._closed = true;
      // 释放等待中的read
      if (this.resolveRead) {
        this.resolveRead(null);
        this.resolveRead = undefined;
      }
    });

    this.inputStream.on('error', (err: Error) => {
      this.writeError(`Input stream error: ${err.message}`);
    });
  }

  get closed(): boolean { return this._closed; }

  /** 读取stdin的下一行JSON消息 */
  readMessage(): Promise<unknown> {
    // 如果buffer中有消息，直接返回
    if (this.messageBuffer.length > 0) {
      return Promise.resolve(this.messageBuffer.shift());
    }

    if (this._closed) {
      return Promise.resolve(null);
    }

    // 等待下一条消息
    return new Promise((resolve) => {
      this.resolveRead = resolve;
    });
  }

  /** 写入stdout的JSON消息（newline-delimited） */
  writeMessage(message: unknown): void {
    if (this._closed) return;

    const serialized = this.serializeMessage(message);
    this.outputStream.write(serialized + '\n');
  }

  /** 写入stderr */
  writeError(error: string): void {
    if (this._closed) return;
    this.errorStream.write(error + '\n');
  }

  /** 关闭IO通道 */
  close(): void {
    if (this._closed) return;
    this._closed = true;

    // 不主动关闭stdin/stdout — 这些是全局资源
    // 只标记为closed，停止读取
    if (this.resolveRead) {
      this.resolveRead(null);
      this.resolveRead = undefined;
    }
  }

  // === 私有方法 ===

  /** 处理stdin输入数据 */
  private handleInput(chunk: Buffer | string): void {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed);
        if (this.resolveRead) {
          this.resolveRead(parsed);
          this.resolveRead = undefined;
        } else {
          this.messageBuffer.push(parsed);
        }
      } catch {
        // 非JSON行 → 作为原始文本消息处理
        const rawMessage = { type: 'raw_input', content: trimmed };
        if (this.resolveRead) {
          this.resolveRead(rawMessage);
          this.resolveRead = undefined;
        } else {
          this.messageBuffer.push(rawMessage);
        }
      }
    }
  }

  /** 序列化消息 */
  private serializeMessage(message: unknown): string {
    if (this.outputFormat === 'text') {
      return typeof message === 'string' ? message : String(message);
    }

    if (this.outputFormat === 'json') {
      // 单次JSON输出（整个响应作为一个JSON对象）
      return JSON.stringify(message);
    }

    // stream-json — newline-delimited JSON
    return JSON.stringify(message);
  }
}