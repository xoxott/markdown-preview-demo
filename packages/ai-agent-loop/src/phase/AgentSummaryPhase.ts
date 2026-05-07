/**
 * AgentSummaryPhase — coordinator模式下定期生成进度摘要
 *
 * N24: 每隔30s用forked agent为子agent生成进度摘要， 供协调器/用户了解各worker进度。
 */

/** AgentSummary 配置 */
export interface AgentSummaryConfig {
  readonly enabled: boolean;
  readonly intervalMs: number;
  readonly maxSummaryLength: number;
}

export const DEFAULT_AGENT_SUMMARY_CONFIG: AgentSummaryConfig = {
  enabled: true,
  intervalMs: 30000,
  maxSummaryLength: 200
};

/** AgentSummary 结果 */
export interface AgentSummaryResult {
  readonly agentType: string;
  readonly summary: string;
  readonly progressPercent?: number;
  readonly generatedAt: number;
}

/** AgentSummaryFn — 宿主注入的摘要生成函数 */
export type AgentSummaryFn = (context: string, maxLength: number) => Promise<string>;

/** AgentSummaryPhase — 生成进度摘要 */
export class AgentSummaryPhase {
  readonly name = 'AgentSummary';
  private lastSummaryTime = 0;

  constructor(private readonly config: AgentSummaryConfig = DEFAULT_AGENT_SUMMARY_CONFIG) {}

  async execute(ctx: Record<string, unknown>): Promise<AgentSummaryResult | null> {
    if (!this.config.enabled) return null;

    const now = Date.now();
    if (now - this.lastSummaryTime < this.config.intervalMs) return null;

    this.lastSummaryTime = now;

    const summaryFn = ctx.agentSummaryFn as AgentSummaryFn | undefined;
    if (!summaryFn) return null;

    const contextStr = JSON.stringify({
      turnsCompleted: ctx.turnCount ?? 0,
      toolsUsed: ctx.toolUseCount ?? 0
    });

    const summary = await summaryFn(contextStr, this.config.maxSummaryLength);

    return {
      agentType: (ctx.agentType as string) ?? 'unknown',
      summary,
      generatedAt: now
    };
  }
}
