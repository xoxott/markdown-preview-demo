/** AgentTool — 桥接 Tool，LLM 通过 subagent({ subagent_type, task }) 调用子代理 */

import { z } from 'zod';
import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult, ToolUseContext } from '@suga/ai-tool-core';
import type { SubagentRegistry } from '../registry/SubagentRegistry';
import type { Spawner } from '../spawner/SubagentSpawner';
import type { SubagentToolResult } from '../types/result';
import { AGENT_TOOL_NAME } from '../constants';

/** AgentTool 输入 Schema */
const AgentToolInputSchema = z.object({
  subagent_type: z.string().describe('子代理类型标识'),
  task: z.string().describe('任务描述'),
  context: z.string().optional().describe('上下文指令')
});

/** AgentTool 输入类型 */
type AgentToolInput = z.infer<typeof AgentToolInputSchema>;

/**
 * 创建 AgentTool — 桥接 Tool（遵循 SkillTool 的 createSkillTool 模式）
 *
 * 执行路径：
 *
 * 1. inputSchema.safeParse(input) 验证输入
 * 2. 从 SubagentRegistry 查找 definition
 * 3. SubagentSpawner.spawn() 创建子 AgentLoop 并执行
 * 4. 返回 ToolResult({ data: SubagentToolResult })
 *
 * @param subagentRegistry 子代理注册表实例
 * @param spawner 子代理创建器实例
 * @returns BuiltTool 可注册到 ToolRegistry
 */
export function createAgentTool(
  subagentRegistry: SubagentRegistry,
  spawner: Spawner
): ReturnType<typeof buildTool<AgentToolInput, SubagentToolResult>> {
  return buildTool({
    name: AGENT_TOOL_NAME,
    inputSchema: AgentToolInputSchema,
    call: async (
      input: AgentToolInput,
      context: ToolUseContext
    ): Promise<ToolResult<SubagentToolResult>> => {
      const def = subagentRegistry.get(input.subagent_type);

      if (!def) {
        return {
          data: {
            subagentType: input.subagent_type,
            task: input.task,
            summary: `子代理 "${input.subagent_type}" 未找到`,
            error: `未注册的子代理类型: ${input.subagent_type}`,
            success: false
          },
          error: `未注册的子代理类型: ${input.subagent_type}`
        };
      }

      try {
        const result = await spawner.spawn(
          def,
          input.task,
          input.context,
          context.tools,
          context.abortController.signal
        );

        return {
          data: {
            subagentType: result.agentType,
            task: input.task,
            summary: result.summary,
            outputPath: result.outputPath,
            success: result.success,
            error: result.success ? undefined : result.summary
          }
        };
      } catch (err) {
        return {
          data: {
            subagentType: input.subagent_type,
            task: input.task,
            summary: `子代理执行异常: ${err instanceof Error ? err.message : String(err)}`,
            error: err instanceof Error ? err.message : String(err),
            success: false
          },
          error: err instanceof Error ? err.message : String(err)
        };
      }
    },
    description: async (input: AgentToolInput): Promise<string> => {
      const def = subagentRegistry.get(input.subagent_type);
      if (!def) {
        return `子代理 "${input.subagent_type}" 未找到`;
      }
      return def.whenToUse ?? def.description ?? `执行 ${input.subagent_type} 子代理`;
    },
    isConcurrencySafe: () => false,
    isReadOnly: () => false,
    safetyLabel: () => 'system'
  });
}
