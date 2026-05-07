/**
 * AwaySummary — "while you were away" 的会话简短回顾
 *
 * 对齐 CC services/awaySummary.ts。当用户离开并重新打开 Cursor 时，把最近 N 条消息 喂给小模型，得到 1–3 句的"上次离开时你在做什么 /
 * 接下来该做什么"卡片文案。
 *
 * 设计目标：纯函数 + 注入式依赖，支持任意 LLM 后端。
 */

// ============================================================
// 类型
// ============================================================

/** 简化的对话消息形态 */
export interface AwaySummaryMessage {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: unknown;
}

/** 注入式调用 LLM 的函数签名 */
export type AwaySummaryQueryFn = (params: {
  readonly messages: readonly AwaySummaryMessage[];
  readonly signal: AbortSignal;
}) => Promise<{ readonly text: string | null; readonly isError: boolean }>;

/** AwaySummary 配置 */
export interface AwaySummaryConfig {
  /** 仅取最近 N 条消息（避免 prompt too long） */
  readonly recentMessageWindow?: number;
  /** 用户附加的"会话记忆"字符串（可选 — 由宿主从 SessionMemory 读取） */
  readonly sessionMemory?: string | null;
  /** 自定义 prompt 模板（接收 memory 字符串） */
  readonly buildPrompt?: (memory: string | null) => string;
}

// ============================================================
// 默认 prompt
// ============================================================

const DEFAULT_RECENT_WINDOW = 30;

const DEFAULT_BUILD_PROMPT = (memory: string | null): string => {
  const memoryBlock = memory ? `Session memory (broader context):\n${memory}\n\n` : '';
  return `${memoryBlock}The user stepped away and is coming back. Write exactly 1-3 short sentences. Start by stating the high-level task — what they are building or debugging, not implementation details. Next: the concrete next step. Skip status reports and commit recaps.`;
};

// ============================================================
// 主 API
// ============================================================

/**
 * 生成 "while you were away" 简短回顾
 *
 * 返回 null 表示：消息为空 / 用户中断 / 模型返回错误。调用方应回退到默认文案。
 */
export async function generateAwaySummary(
  messages: readonly AwaySummaryMessage[],
  query: AwaySummaryQueryFn,
  signal: AbortSignal,
  config: AwaySummaryConfig = {}
): Promise<string | null> {
  if (messages.length === 0) return null;

  const window = config.recentMessageWindow ?? DEFAULT_RECENT_WINDOW;
  const buildPrompt = config.buildPrompt ?? DEFAULT_BUILD_PROMPT;
  const memory = config.sessionMemory ?? null;

  const recent: AwaySummaryMessage[] = messages.slice(-window).slice();
  recent.push({ role: 'user', content: buildPrompt(memory) });

  try {
    const result = await query({ messages: recent, signal });
    if (result.isError) return null;
    return result.text;
  } catch (err) {
    if (signal.aborted) return null;
    if (err instanceof Error && err.name === 'AbortError') return null;
    return null;
  }
}
