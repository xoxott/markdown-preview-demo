/** AgentRunner — type='agent' 的 LLM 多轮验证 Runner */

import type { HookRunner } from '../types/runner';
import type { LLMQueryService, LLMToolDefinition } from '../types/llmQuery';
import type { HookDefinition, HookExecutionContext, HookResult } from '../types/hooks';
import type { HookInput } from '../types/input';
import { DEFAULT_AGENT_MAX_TURNS, DEFAULT_AGENT_TIMEOUT } from '../constants';

/** StructuredOutputTool 定义 — 强制输出 { ok: boolean, reason?: string } */
const STRUCTURED_OUTPUT_TOOL: LLMToolDefinition = {
  name: 'structured_output',
  description: '输出验证结果。你必须调用此工具返回最终决策。',
  inputSchema: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: '是否允许操作继续' },
      reason: { type: 'string', description: '阻止原因（ok=false 时）' }
    },
    required: ['ok']
  }
};

/**
 * AgentRunner — LLM 多轮验证 Runner
 *
 * 执行流程：
 *
 * 1. 从 hook.agentPrompt 读取验证任务描述
 * 2. 构建 structured_output 工具（强制输出 ok/reason）
 * 3. 过滤 disallowedTools（如果指定）
 * 4. 通过 LLMQueryService.queryMultiTurn() 多轮执行
 * 5. 收集 structured_output 工具的最终输出 → 映射 HookResult
 */
export class AgentRunner implements HookRunner {
  readonly runnerType = 'agent' as const;
  private readonly llmService: LLMQueryService;

  constructor(llmService: LLMQueryService) {
    this.llmService = llmService;
  }

  async run(
    hook: HookDefinition,
    input: HookInput,
    context: HookExecutionContext
  ): Promise<HookResult> {
    const agentPrompt = hook.agentPrompt ?? '验证此操作是否安全';
    const timeout = hook.timeout ?? DEFAULT_AGENT_TIMEOUT;
    const maxTurns = hook.maxTurns ?? DEFAULT_AGENT_MAX_TURNS;

    // 构建输入描述
    const fullPrompt = `${agentPrompt}\n\n输入:\n${JSON.stringify(input)}\n\n你必须调用 structured_output 工具返回最终决策。`;

    // 构建工具列表 — 只有 structured_output
    const tools: LLMToolDefinition[] = [STRUCTURED_OUTPUT_TOOL];

    // 多轮 LLM 查询
    const result = await this.llmService.queryMultiTurn(fullPrompt, tools, {
      model: hook.model,
      maxTurns,
      signal: context.abortSignal,
      timeout
    });

    if (!result.success) {
      return {
        outcome: 'non_blocking_error',
        error: result.error ?? 'Agent 多轮查询失败',
        preventContinuation: false
      };
    }

    // 解析 structured_output 输出
    const parsed = this.parseStructuredOutput(result.finalText);
    if (parsed === undefined) {
      // 无法解析 → 回退为 non_blocking_error
      return {
        outcome: 'non_blocking_error',
        error: 'AgentRunner: 无法解析 structured_output 输出',
        preventContinuation: false
      };
    }

    if (parsed.ok) {
      return { outcome: 'success' };
    }

    return {
      outcome: 'blocking',
      stopReason: parsed.reason ?? 'Agent hook 验证为不安全',
      preventContinuation: true
    };
  }

  /** 解析 structured_output 的 JSON 输出 */
  private parseStructuredOutput(text: string): { ok: boolean; reason?: string } | undefined {
    // 尝试从文本中提取 JSON（可能被包裹在其他文本中）
    const jsonMatch = text.match(/\{[^{}]*"ok"\s*:\s*(true|false)[^{}]*\}/);
    if (!jsonMatch) {
      // 直接 JSON.parse 尝试
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null && typeof parsed.ok === 'boolean') {
          return { ok: parsed.ok, reason: parsed.reason };
        }
      } catch {
        return undefined;
      }
      return undefined;
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ok: parsed.ok,
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined
      };
    } catch {
      return undefined;
    }
  }
}
