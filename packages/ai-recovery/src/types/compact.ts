/** Compact策略类型 — 上下文压缩系统宿主注入接口 */

// === CompactMessage ===

/** 消息条目（compact策略输入） */
export interface CompactMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
  timestamp?: number;
  /** 是否是tool_use消息（MicroCompact策略用） */
  isToolUse?: boolean;
  /** 工具名（MicroCompact策略用） */
  toolName?: string;
}

// === CompactResult ===

/** Compact策略执行结果 */
export interface CompactResult {
  wasCompacted: boolean;
  strategy?: 'auto' | 'micro' | 'session_memory' | 'llm';
  preCompactTokenCount?: number;
  postCompactTokenCount?: number;
  summary?: string;
  boundaryMessageId?: string;
}

// === CompactHostProvider ===

/**
 * CompactHostProvider — LLM调用+状态查询宿主注入
 *
 * Compact策略通过此接口获取宿主状态和执行LLM摘要调用， 宿主注入具体实现（运行时桥接真实LLM API）。
 */
export interface CompactHostProvider {
  /** 获取当前token计数 */
  getCurrentTokenCount(): Promise<number>;
  /** 获取最大token数 */
  getMaxTokens(): number;
  /** 执行LLM摘要调用 */
  summarizeConversation(messages: CompactMessage[], customInstructions?: string): Promise<string>;
  /** 读取session memory文件 */
  readSessionMemory(): Promise<string | null>;
  /** 获取最后摘要消息ID */
  getLastSummarizedMessageId(): string | undefined;
  /** token估算 */
  estimateTokens(text: string): number;
}

// === AutoCompactConfig ===

/** AutoCompact策略配置 */
export interface AutoCompactConfig {
  /** 强制折叠阈值（默认 0.95） */
  drainThreshold: number;
  /** 折叠计划阈值（默认 0.90） */
  planThreshold: number;
  /** 最大连续失败次数（默认 3） */
  maxConsecutiveFailures: number;
}

export const DEFAULT_AUTO_COMPACT_CONFIG: AutoCompactConfig = {
  drainThreshold: 0.95,
  planThreshold: 0.9,
  maxConsecutiveFailures: 3
};

// === MicroCompactConfig ===

/** MicroCompact策略配置 */
export interface MicroCompactConfig {
  /** 是否启用（默认 true） */
  enabled: boolean;
  /** 时间间隔阈值（分钟，默认 60） */
  gapThresholdMinutes: number;
  /** 保留最近N个tool结果（默认 5） */
  keepRecent: number;
  /** 可压缩的工具名列表 */
  compactableTools: string[];
}

export const DEFAULT_MICRO_COMPACT_CONFIG: MicroCompactConfig = {
  enabled: true,
  gapThresholdMinutes: 60,
  keepRecent: 5,
  compactableTools: [
    'file-read',
    'bash',
    'grep',
    'glob',
    'web-fetch',
    'web-search',
    'file-edit',
    'file-write'
  ]
};

// === SessionMemoryCompactConfig ===

/** SessionMemoryCompact策略配置 */
export interface SessionMemoryCompactConfig {
  /** 最小保留token数（默认 10_000） */
  minTokens: number;
  /** 最小保留文本块消息数（默认 5） */
  minTextBlockMessages: number;
  /** 最大保留token数（默认 40_000） */
  maxTokens: number;
}

export const DEFAULT_SESSION_MEMORY_COMPACT_CONFIG: SessionMemoryCompactConfig = {
  minTokens: 10_000,
  minTextBlockMessages: 5,
  maxTokens: 40_000
};
