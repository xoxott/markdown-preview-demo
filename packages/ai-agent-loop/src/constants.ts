/** Agent Loop 常量定义 */

/** 默认最大循环轮次 */
export const DEFAULT_MAX_TURNS = 10;

/** P88: 硬性循环上限 — 防止 while(true) 无限循环（即使 maxTurns 检查被绕过） */
export const MAX_LOOP_ITERATIONS = 200;

/** 默认工具执行超时时间（毫秒） */
export const DEFAULT_TOOL_TIMEOUT = 30_000;

/** 默认会话 ID */
export const DEFAULT_SESSION_ID = '__agent__';
