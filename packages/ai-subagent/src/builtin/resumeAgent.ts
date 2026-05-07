/**
 * resumeAgent — 后台 sub-agent 恢复执行
 *
 * 对齐 CC tools/AgentTool/resumeAgent.ts，提供根据 agentId 重新加载已暂停/完成 agent 的 transcript
 * 并继续执行的能力。本实现解耦了具体的存储/调度，由宿主提供 `AgentResumeProvider`。
 */

import type { SubagentDefinition } from '../types/subagent';

// ============================================================
// 类型定义
// ============================================================

/** Agent transcript 条目（持久化的消息历史） */
export interface AgentTranscript {
  readonly agentId: string;
  readonly agentType: string;
  readonly messages: readonly unknown[];
  readonly contentReplacements?: readonly unknown[];
  readonly createdAt: number;
  readonly lastActiveAt: number;
}

/** Agent metadata（持久化的元数据） */
export interface AgentMetadata {
  readonly agentId: string;
  readonly agentType: string;
  readonly description: string;
  readonly status: 'running' | 'completed' | 'failed' | 'stopped';
  readonly cwd?: string;
  readonly worktreePath?: string;
  readonly outputFilePath?: string;
  readonly model?: string;
  readonly parentSessionId?: string;
}

/** Resume Provider — 由宿主实现 */
export interface AgentResumeProvider {
  /** 读取 agent transcript */
  getAgentTranscript(agentId: string): Promise<AgentTranscript | null>;
  /** 读取 agent metadata */
  readAgentMetadata(agentId: string): Promise<AgentMetadata | null>;
  /** 读取 agent definition（按 agentType 解析为 SubagentDefinition） */
  readAgentDefinition(agentType: string): Promise<SubagentDefinition | null>;
  /** 重新派遣 agent — 提供 prompt + 历史，返回新的 outputFile/runtime 信息 */
  dispatchResume(args: {
    readonly agentId: string;
    readonly definition: SubagentDefinition;
    readonly resumedMessages: readonly unknown[];
    readonly newPrompt: string;
    readonly metadata: AgentMetadata;
  }): Promise<{ readonly outputFile: string; readonly runtime: unknown }>;
}

/** Resume 结果 */
export interface ResumeAgentResult {
  readonly agentId: string;
  readonly agentType: string;
  readonly description: string;
  readonly outputFile: string;
  readonly resumedMessageCount: number;
  readonly elapsedMs: number;
}

/** Resume 错误类型 */
export class AgentResumeError extends Error {
  constructor(
    public readonly code:
      | 'agent_not_found'
      | 'transcript_missing'
      | 'definition_missing'
      | 'agent_terminal'
      | 'dispatch_failed',
    message: string
  ) {
    super(message);
    this.name = 'AgentResumeError';
  }
}

// ============================================================
// 消息过滤 — 对齐 CC utils/messages.ts
// ============================================================

interface MessageWithRole {
  role?: string;
  content?: unknown;
}

/** 过滤未解析的 tool_use（无 tool_result 配对的） */
export function filterUnresolvedToolUses(messages: readonly unknown[]): unknown[] {
  const toolUseIds = new Set<string>();
  const toolResultIds = new Set<string>();

  for (const msg of messages) {
    const m = msg as MessageWithRole;
    if (!Array.isArray(m.content)) continue;
    for (const block of m.content as Array<Record<string, unknown>>) {
      if (block.type === 'tool_use' && typeof block.id === 'string') {
        toolUseIds.add(block.id);
      }
      if (block.type === 'tool_result' && typeof block.tool_use_id === 'string') {
        toolResultIds.add(block.tool_use_id);
      }
    }
  }

  const unresolved = new Set<string>();
  for (const id of toolUseIds) {
    if (!toolResultIds.has(id)) unresolved.add(id);
  }

  return messages.filter(msg => {
    const m = msg as MessageWithRole;
    if (!Array.isArray(m.content)) return true;
    return !(m.content as Array<Record<string, unknown>>).some(
      b => b.type === 'tool_use' && typeof b.id === 'string' && unresolved.has(b.id)
    );
  });
}

/** 过滤孤立的 thinking-only assistant 消息 */
export function filterOrphanedThinkingOnlyMessages(messages: readonly unknown[]): unknown[] {
  return messages.filter(msg => {
    const m = msg as MessageWithRole;
    if (m.role !== 'assistant' || !Array.isArray(m.content)) return true;
    const blocks = m.content as Array<Record<string, unknown>>;
    if (blocks.length === 0) return false;
    return !blocks.every(b => b.type === 'thinking' || b.type === 'redacted_thinking');
  });
}

/** 过滤纯空白的 assistant 消息 */
export function filterWhitespaceOnlyAssistantMessages(messages: readonly unknown[]): unknown[] {
  return messages.filter(msg => {
    const m = msg as MessageWithRole;
    if (m.role !== 'assistant') return true;

    if (typeof m.content === 'string') {
      return m.content.trim().length > 0;
    }
    if (!Array.isArray(m.content)) return true;

    const blocks = m.content as Array<Record<string, unknown>>;
    return blocks.some(b => {
      if (b.type === 'text' && typeof b.text === 'string') {
        return b.text.trim().length > 0;
      }
      return b.type !== 'text';
    });
  });
}

// ============================================================
// 核心：resumeAgent
// ============================================================

/** Resume 选项 */
export interface ResumeAgentOptions {
  readonly agentId: string;
  readonly prompt: string;
  readonly provider: AgentResumeProvider;
}

/**
 * resumeAgent — 恢复后台 agent 执行
 *
 * 流程：
 *
 * 1. 读取 transcript + metadata
 * 2. 过滤未解析 tool_use / 孤立 thinking / 空白消息
 * 3. 通过 provider.dispatchResume 调度新一轮执行
 *
 * @throws AgentResumeError 如果 agent 不存在、状态不可恢复或派遣失败
 */
export async function resumeAgent(options: ResumeAgentOptions): Promise<ResumeAgentResult> {
  const startTime = Date.now();
  const { agentId, prompt, provider } = options;

  const [transcript, metadata] = await Promise.all([
    provider.getAgentTranscript(agentId),
    provider.readAgentMetadata(agentId)
  ]);

  if (!metadata) {
    throw new AgentResumeError('agent_not_found', `Agent ${agentId} not found`);
  }

  if (!transcript) {
    throw new AgentResumeError('transcript_missing', `No transcript for agent ${agentId}`);
  }

  if (metadata.status === 'failed' || metadata.status === 'stopped') {
    throw new AgentResumeError(
      'agent_terminal',
      `Agent ${agentId} is in terminal state '${metadata.status}'`
    );
  }

  const definition = await provider.readAgentDefinition(metadata.agentType);
  if (!definition) {
    throw new AgentResumeError(
      'definition_missing',
      `Definition for agent type '${metadata.agentType}' not found`
    );
  }

  const resumedMessages = filterWhitespaceOnlyAssistantMessages(
    filterOrphanedThinkingOnlyMessages(filterUnresolvedToolUses(transcript.messages))
  );

  let dispatchResult: { outputFile: string; runtime: unknown };
  try {
    dispatchResult = await provider.dispatchResume({
      agentId,
      definition,
      resumedMessages,
      newPrompt: prompt,
      metadata
    });
  } catch (err) {
    throw new AgentResumeError(
      'dispatch_failed',
      `Failed to dispatch resume for agent ${agentId}: ${(err as Error).message}`
    );
  }

  return {
    agentId,
    agentType: metadata.agentType,
    description: metadata.description,
    outputFile: dispatchResult.outputFile,
    resumedMessageCount: resumedMessages.length,
    elapsedMs: Date.now() - startTime
  };
}
