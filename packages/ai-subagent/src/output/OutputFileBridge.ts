/** OutputFileBridge — 大输出持久化，返回 summary 给父 AgentLoop */

import { DiskTaskOutput } from './DiskTaskOutput';
import { DEFAULT_MAX_IN_MEMORY_CHARS } from '../constants';
import type { SubagentResult } from '../types/result';
import type { OutputFileOptions, OutputSummary } from '../types/output';

/**
 * OutputFileBridge — 连接 SubagentSpawner 和 DiskTaskOutput
 *
 * 处理流程：
 * 1. SubagentSpawner 产出 SubagentResult
 * 2. OutputFileBridge.processResult 判断结果大小
 * 3. 大结果 → DiskTaskOutput.processOutput → 持久化 + 返回 summary
 * 4. 小结果 → 保留在内存
 */
export class OutputFileBridge {
  private readonly diskOutput: DiskTaskOutput;

  constructor(options?: OutputFileOptions) {
    this.diskOutput = new DiskTaskOutput(options);
  }

  /**
   * processResult — 处理子代理结果，大输出持久化到磁盘
   *
   * @param result SubagentResult
   * @returns 处理后的 SubagentResult（summary 可能替换为持久化引用）
   */
  processResult(result: SubagentResult): SubagentResult {
    const summary = this.diskOutput.processOutput(result.summary, `result_${result.agentType}`);

    // 如果 summary 被替换为 persisted-output 标签，需要设置 outputPath
    const outputPath = summary.startsWith('<persisted-output>')
      ? this.diskOutput.getOutputDir()
      : undefined;

    return {
      ...result,
      summary,
      outputPath
    };
  }

  /**
   * createSummary — 为大内容生成 OutputSummary
   *
   * @param content 完整内容
   * @param filePath 持久化文件路径
   * @returns OutputSummary
   */
  createSummary(content: string, filePath: string): OutputSummary {
    const preview = content.slice(0, 2000);
    return {
      preview,
      filePath,
      totalLength: content.length,
      truncated: content.length > DEFAULT_MAX_IN_MEMORY_CHARS
    };
  }

  /** 等待所有写入完成 */
  async flush(): Promise<void> {
    await this.diskOutput.flush();
  }

  /** 清理输出文件 */
  async cleanup(): Promise<void> {
    await this.diskOutput.cleanup();
  }

  /** 获取 DiskTaskOutput 实例 */
  getDiskTaskOutput(): DiskTaskOutput {
    return this.diskOutput;
  }
}
