/** 压缩相关消息类型扩展 */

/** 压缩标记 — ToolResultBudget 层的压缩内容格式 */
export interface CompressedToolResultContent {
  /** 原始大小（字节） */
  readonly originalSize: number;
  /** 压缩类型标记 */
  readonly compressionType: 'budget' | 'time_cleared' | 'reactive';
  /** 持久化文件路径（budget 类型有） */
  readonly persistedPath?: string;
  /** 预览内容（budget 类型有，首 2KB） */
  readonly preview?: string;
}

/** AutoCompact 摘要产出 */
export interface CompactSummary {
  /** 摘要文本 */
  readonly summaryText: string;
  /** 摘要覆盖的消息范围起始索引 */
  readonly compactedFromIndex: number;
  /** 摘要覆盖的消息数量 */
  readonly compactedMessageCount: number;
  /** 摘要生成时间戳 */
  readonly timestamp: number;
}

/** 摘要段结构（映射 Claude Code 的 9 段 prompt） */
export interface SummarySections {
  primaryRequest?: string;
  keyTechnicalConcepts?: string;
  filesAndCodeSections?: string;
  errorsAndFixes?: string;
  problemSolving?: string;
  allUserMessages?: string;
  pendingTasks?: string;
  currentWork?: string;
  optionalNextStep?: string;
}