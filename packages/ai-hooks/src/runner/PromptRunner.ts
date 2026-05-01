/** PromptRunner — type='prompt' 的 LLM 单轮评估 Runner */

import type { HookRunner } from '../types/runner';
import type { LLMQueryService } from '../types/llmQuery';
import type { HookDefinition, HookExecutionContext, HookResult } from '../types/hooks';
import type { HookInput } from '../types/input';
import { DEFAULT_PROMPT_TIMEOUT } from '../constants';

/**
 * PromptRunner — LLM 单轮评估 Runner
 *
 * 执行流程：
 *
 * 1. 从 hook.prompt 读取提示模板
 * 2. $INPUT 占位符替换为 JSON.stringify(input)
 * 3. 通过 LLMQueryService.querySingle() 单轮调用
 * 4. 强制 json_schema 输出: { ok: boolean, reason?: string }
 * 5. ok=true → success, ok=false → blocking
 */
export class PromptRunner implements HookRunner {
  readonly runnerType = 'prompt' as const;
  private readonly llmService: LLMQueryService;

  constructor(llmService: LLMQueryService) {
    this.llmService = llmService;
  }

  async run(
    hook: HookDefinition,
    input: HookInput,
    context: HookExecutionContext
  ): Promise<HookResult> {
    const promptTemplate = hook.prompt!;
    const timeout = hook.timeout ?? DEFAULT_PROMPT_TIMEOUT;

    // $INPUT 占位符替换
    const resolvedPrompt = promptTemplate.replace(/\$INPUT/g, JSON.stringify(input));

    // 单轮 LLM 查询 — 强制 json_schema 输出
    const result = await this.llmService.querySingle(resolvedPrompt, {
      model: hook.model,
      jsonSchema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          reason: { type: 'string' }
        },
        required: ['ok']
      },
      signal: context.abortSignal,
      timeout
    });

    if (!result.success) {
      return {
        outcome: 'non_blocking_error',
        error: result.error ?? 'LLM 查询失败',
        preventContinuation: false
      };
    }

    // 解析 JSON 输出
    const parsed = this.parseOkResponse(result.text);
    if (parsed === undefined) {
      // JSON 解析失败 → non_blocking_error（不阻断流程）
      return {
        outcome: 'non_blocking_error',
        error: `PromptRunner: 无法解析 LLM 输出为 { ok, reason } 格式`,
        preventContinuation: false
      };
    }

    if (parsed.ok) {
      return { outcome: 'success' };
    }

    return {
      outcome: 'blocking',
      stopReason: parsed.reason ?? 'Prompt hook 评估为不安全',
      preventContinuation: true
    };
  }

  /** 解析 { ok: boolean, reason?: string } JSON 输出 */
  private parseOkResponse(text: string): { ok: boolean; reason?: string } | undefined {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null && typeof parsed.ok === 'boolean') {
        return {
          ok: parsed.ok,
          reason: typeof parsed.reason === 'string' ? parsed.reason : undefined
        };
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
}
