/** 输出文件类型 — DiskTaskOutput 噪声隔离配置和结果 */

/** 输出文件选项 — DiskTaskOutput 和 OutputFileBridge 配置 */
export interface OutputFileOptions {
  /** 内存中保留的最大字符数（超出则持久化到磁盘） */
  readonly maxInMemoryChars?: number;
  /** 输出文件目录（默认项目目录下） */
  readonly outputDir?: string;
  /** 是否异步写入（默认 true） */
  readonly asyncWrite?: boolean;
}

/** 输出摘要 — 大输出持久化后返回给父的信息 */
export interface OutputSummary {
  /** 预览文本（前 maxPreviewChars 字符） */
  readonly preview: string;
  /** 持久化文件路径 */
  readonly filePath: string;
  /** 完整内容长度 */
  readonly totalLength: number;
  /** 是否被截断 */
  readonly truncated: boolean;
}
