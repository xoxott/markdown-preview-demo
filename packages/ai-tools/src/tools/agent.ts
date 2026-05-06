/** AgentTool — LLM 通过 subagent({ subagent_type, task }) 调用子代理 */

import { buildTool } from '@suga/ai-tool-core';
import type { SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { AgentMemoryScope, SubagentToolResult } from '@suga/ai-subagent';
import { computeScopedMemoryPath } from '@suga/ai-subagent';
import type { ExtendedToolUseContext } from '../context-merge';
import type { AgentInput } from '../types/tool-inputs';
import type { AgentOutput } from '../types/tool-outputs';
import { AgentInputSchema } from '../types/tool-inputs';

export const agentTool = buildTool<AgentInput, AgentOutput>({
  name: 'subagent',

  inputSchema: AgentInputSchema,

  description: async input =>
    `Spawn ${input.subagent_type} subagent for: ${input.task.slice(0, 60)}`,

  isConcurrencySafe: () => false,
  isReadOnly: () => false,
  safetyLabel: () => 'system' as SafetyLabel,

  validateInput: input => {
    if (!input.subagent_type) {
      return { behavior: 'deny', message: 'subagent_type is required' };
    }
    if (!input.task) {
      return { behavior: 'deny', message: 'task is required' };
    }
    return { behavior: 'allow' };
  },

  call: async (
    input: AgentInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<SubagentToolResult>> => {
    const provider = context.subagentProvider;
    if (!provider) {
      return {
        data: {
          subagentType: input.subagent_type,
          task: input.task,
          summary: 'No SubagentProvider',
          success: false,
          error: 'No SubagentProvider'
        }
      };
    }

    const def = provider.getDefinition(input.subagent_type);
    if (!def) {
      return {
        data: {
          subagentType: input.subagent_type,
          task: input.task,
          summary: `子代理 "${input.subagent_type}" 未找到`,
          success: false,
          error: `未注册的子代理类型: ${input.subagent_type}`
        },
        error: `未注册的子代理类型: ${input.subagent_type}`
      };
    }

    // G33+G34: isolation 和 model 覆盖
    // G35: worktree隔离自动启用scoped memory
    const overriddenDef = {
      ...def,
      ...(input.isolation === 'worktree' ? { isolation: 'worktree' as const } : {}),
      ...(input.model ? { model: input.model } : {}),
      ...(input.isolation === 'worktree' && !def.memoryScope
        ? {
            memoryScope: {
              memoryRoot: computeScopedMemoryPath(
                context.memoryRoot ?? '/tmp/.claude/memory',
                def.agentType
              ),
              agentType: def.agentType,
              enabled: true
            } as AgentMemoryScope
          }
        : {})
    };

    try {
      const result = await provider.spawn(overriddenDef, input.task, input.context);
      return { data: result };
    } catch (err) {
      return {
        data: {
          subagentType: input.subagent_type,
          task: input.task,
          summary: `子代理执行异常: ${err instanceof Error ? err.message : String(err)}`,
          success: false,
          error: err instanceof Error ? err.message : String(err)
        },
        error: err instanceof Error ? err.message : String(err)
      };
    }
  },

  toAutoClassifierInput: input => ({
    toolName: 'subagent',
    input,
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 50_000
});
