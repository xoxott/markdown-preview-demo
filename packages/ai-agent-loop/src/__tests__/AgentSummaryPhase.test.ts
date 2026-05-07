import { describe, expect, it } from 'vitest';
import { AgentSummaryPhase, DEFAULT_AGENT_SUMMARY_CONFIG } from '../phase/AgentSummaryPhase';

describe('AgentSummaryPhase', () => {
  it('disabled → null', async () => {
    const phase = new AgentSummaryPhase({
      enabled: false,
      intervalMs: 30000,
      maxSummaryLength: 200
    });
    const result = await phase.execute({});
    expect(result).toBeNull();
  });

  it('no summaryFn → null', async () => {
    const phase = new AgentSummaryPhase();
    const result = await phase.execute({});
    expect(result).toBeNull();
  });

  it('generates summary with provided fn', async () => {
    const phase = new AgentSummaryPhase({ enabled: true, intervalMs: 0, maxSummaryLength: 200 });
    const fn = async (_ctx: string, _maxLen: number) => 'Progress: 50% done';
    const result = await phase.execute({
      agentSummaryFn: fn,
      turnCount: 5,
      toolUseCount: 3,
      agentType: 'coder'
    });
    expect(result).not.toBeNull();
    expect(result!.summary).toBe('Progress: 50% done');
    expect(result!.agentType).toBe('coder');
    expect(result!.generatedAt).toBeGreaterThan(0);
  });

  it('intervalMs prevents duplicate calls', async () => {
    const phase = new AgentSummaryPhase({
      enabled: true,
      intervalMs: 60000,
      maxSummaryLength: 200
    });
    const fn = async () => 'summary';
    const ctx = { agentSummaryFn: fn };
    const result1 = await phase.execute(ctx);
    expect(result1).not.toBeNull();
    const result2 = await phase.execute(ctx);
    expect(result2).toBeNull(); // too soon
  });

  it('DEFAULT_AGENT_SUMMARY_CONFIG has sensible defaults', () => {
    expect(DEFAULT_AGENT_SUMMARY_CONFIG.enabled).toBe(true);
    expect(DEFAULT_AGENT_SUMMARY_CONFIG.intervalMs).toBe(30000);
  });
});
