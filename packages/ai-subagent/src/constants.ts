/** @suga/ai-subagent 常量定义 */

/** AgentTool 工具名称（注册到 ToolRegistry 的名称） */
export const AGENT_TOOL_NAME = 'subagent';

/** 子代理默认超时（ms） */
export const DEFAULT_SUBAGENT_TIMEOUT = 120_000;

/** 默认内存中最大字符数（超出此值持久化到磁盘） */
export const DEFAULT_MAX_IN_MEMORY_CHARS = 50_000;
