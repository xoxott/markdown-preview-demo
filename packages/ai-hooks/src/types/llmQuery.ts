/**
 * LLMQueryService — LLM 查询服务接口（非流式）
 *
 * PromptRunner 和 AgentRunner 需要非流式/多轮的 LLM 查询能力。 LLMProvider 只有流式 callModel，不适合 Hook Runner
 * 的轻量验证场景。 LLMQueryService 是更高层的抽象，由宿主环境注入。
 */

/** LLM 单轮查询结果 */
export interface LLMQueryResult {
  /** 模型输出文本 */
  readonly text: string;
  /** 是否成功 */
  readonly success: boolean;
  /** 错误信息（success=false 时） */
  readonly error?: string;
}

/** LLM 多轮查询结果 */
export interface LLMMultiTurnResult {
  /** 最终输出文本 */
  readonly finalText: string;
  /** 总轮次 */
  readonly totalTurns: number;
  /** 是否成功 */
  readonly success: boolean;
  /** 错误信息 */
  readonly error?: string;
}

/** LLMQueryService — 非流式 LLM 查询接口 */
export interface LLMQueryService {
  /**
   * 单轮查询 — 发送 prompt 并获取完整文本响应
   *
   * PromptRunner 使用此方法做轻量验证。 默认使用小型快速模型，支持 model 参数覆盖。
   */
  querySingle(prompt: string, options?: LLMQueryOptions): Promise<LLMQueryResult>;

  /**
   * 多轮查询 — 带工具的 Agent 验证循环
   *
   * AgentRunner 使用此方法做多轮工具验证。 提供 StructuredOutputTool + 自定义工具列表。
   */
  queryMultiTurn(
    prompt: string,
    tools: readonly LLMToolDefinition[],
    options?: LLMQueryOptions
  ): Promise<LLMMultiTurnResult>;
}

/** LLM 查询选项 */
export interface LLMQueryOptions {
  /** 覆盖使用的模型名称 */
  readonly model?: string;
  /** 强制 JSON 输出 schema（PromptRunner 使用） */
  readonly jsonSchema?: Record<string, unknown>;
  /** 最大轮次（AgentRunner 使用，默认 10） */
  readonly maxTurns?: number;
  /** 中断信号 */
  readonly signal?: AbortSignal;
  /** 超时（ms） */
  readonly timeout?: number;
}

/** LLM 工具定义 — Runner 内部使用 */
export interface LLMToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}
