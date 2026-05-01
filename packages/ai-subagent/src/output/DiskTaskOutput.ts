/** DiskTaskOutput — 异步写入队列，将子代理工具输出持久化到磁盘 */

import { DEFAULT_MAX_IN_MEMORY_CHARS } from '../constants';
import type { OutputFileOptions } from '../types/output';

/**
 * DiskTaskOutput — 异步写入队列
 *
 * 子代理工具输出不污染父上下文窗口：
 * 1. 小输出（≤ maxInMemoryChars）保留在内存
 * 2. 大输出（> maxInMemoryChars）持久化到磁盘文件
 * 3. 父只看 summary（截取前 maxPreviewChars 字符）
 * 4. 异步写入队列避免阻塞子代理执行
 *
 * 对齐 Claude Code 的 DiskTaskOutput：
 * - 异步写入队列（MicroTask 队列）
 * - 大结果写入 tool-results/{toolUseId}.{txt|json}
 * - 消息替换为 <persisted-output> 标签（2000 bytes 预览 + filepath）
 */
export class DiskTaskOutput {
  private readonly maxInMemoryChars: number;
  private readonly outputDir: string;
  private readonly writeQueue: Promise<void>[] = [];

  constructor(options?: OutputFileOptions) {
    this.maxInMemoryChars = options?.maxInMemoryChars ?? DEFAULT_MAX_IN_MEMORY_CHARS;
    this.outputDir = options?.outputDir ?? '/tmp/ai-subagent-output';
    this.writeQueue = [];
  }

  /**
   * processOutput — 处理输出，决定保留在内存还是持久化到磁盘
   *
   * @param content 输出内容
   * @param toolUseId 工具调用 ID（用于文件命名）
   * @returns 保留在内存的 content 或持久化后的 summary
   */
  processOutput(content: string, toolUseId: string): string {
    if (content.length <= this.maxInMemoryChars) {
      return content; // 小输出保留在内存
    }

    // 大输出持久化到磁盘
    const filePath = this.buildFilePath(toolUseId);
    this.enqueueWrite(filePath, content);

    // 返回 summary（截取前 2000 字符 + filepath 引用）
    const preview = content.slice(0, 2000);
    return `<persisted-output>\n预览: ${preview}...\n文件: ${filePath}\n</persisted-output>`;
  }

  /** 构建文件路径 */
  private buildFilePath(toolUseId: string): string {
    return `${this.outputDir}/${toolUseId}.txt`;
  }

  /** 入队异步写入 */
  private enqueueWrite(filePath: string, content: string): void {
    const writePromise = this.writeToDisk(filePath, content);
    this.writeQueue.push(writePromise);
  }

  /** 异步写入磁盘 */
  private async writeToDisk(filePath: string, content: string): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    } catch {
      // 写入失败不影响子代理执行（仅日志）
    }
  }

  /** 等待所有写入完成 */
  async flush(): Promise<void> {
    await Promise.all(this.writeQueue);
    this.writeQueue.length = 0;
  }

  /** 清理输出文件 */
  async cleanup(): Promise<void> {
    await this.flush();
    try {
      const { promises: fs } = await import('fs');
      await fs.rm(this.outputDir, { recursive: true, force: true });
    } catch {
      // 清理失败不影响主流程
    }
  }

  /** 获取内存阈值 */
  getMaxInMemoryChars(): number {
    return this.maxInMemoryChars;
  }

  /** 获取输出目录 */
  getOutputDir(): string {
    return this.outputDir;
  }
}
