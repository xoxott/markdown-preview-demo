/**
 * AgentMemoryScope — 子代理记忆范围配置
 *
 * 对齐 Claude Code per-agent scoped memory: 每个子代理有独立的记忆目录，不影响父代理的记忆。
 */

/** AgentMemoryScope — 子代理记忆范围配置 */
export interface AgentMemoryScope {
  /** 记忆根路径（scoped到子代理） */
  readonly memoryRoot: string;
  /** 子代理类型名（用于目录名） */
  readonly agentType: string;
  /** 是否启用 scoped memory（默认true） */
  readonly enabled: boolean;
}

/**
 * 计算子代理的scoped记忆路径
 *
 * 将基础记忆路径与子代理类型拼接为 scoped 路径: /home/user/.claude/memory + explorer →
 * /home/user/.claude/memory/agents/explorer
 */
export function computeScopedMemoryPath(baseMemoryRoot: string, agentType: string): string {
  // 规范化 baseMemoryRoot（去除末尾斜杠）
  const normalized = baseMemoryRoot.replace(/\/+$/, '');
  return `${normalized}/agents/${agentType}`;
}
