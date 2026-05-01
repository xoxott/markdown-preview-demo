/** MockSessionInfoProvider — 测试用的会话信息模拟 */

import type {
  CostInfo,
  SessionInfoProvider,
  SessionStatus,
  TokenUsageInfo
} from '../../types/providers';

const DEFAULT_STATUS: SessionStatus = {
  sessionId: 'test-session-001',
  turnCount: 12,
  status: 'active'
};

const DEFAULT_TOKENS: TokenUsageInfo = {
  inputTokens: 50000,
  outputTokens: 12000,
  totalTokens: 62000
};

const DEFAULT_COST: CostInfo = {
  totalCost: 0.35,
  inputCost: 0.15,
  outputCost: 0.2
};

export class MockSessionInfoProvider implements SessionInfoProvider {
  private _status: SessionStatus = DEFAULT_STATUS;
  private _tokens: TokenUsageInfo = DEFAULT_TOKENS;
  private _cost: CostInfo = DEFAULT_COST;
  private _durationMs: number = 180000; // 3 minutes
  private _model: string = 'claude-sonnet-4-6';

  setStatus(status: SessionStatus): this {
    this._status = status;
    return this;
  }

  setTokenUsage(tokens: TokenUsageInfo): this {
    this._tokens = tokens;
    return this;
  }

  setCost(cost: CostInfo): this {
    this._cost = cost;
    return this;
  }

  setDuration(ms: number): this {
    this._durationMs = ms;
    return this;
  }

  setModel(model: string): this {
    this._model = model;
    return this;
  }

  async getStatus(): Promise<SessionStatus> {
    return this._status;
  }

  async getTokenUsage(): Promise<TokenUsageInfo> {
    return this._tokens;
  }

  async getCost(): Promise<CostInfo> {
    return this._cost;
  }

  async getDuration(): Promise<number> {
    return this._durationMs;
  }

  async getCurrentModel(): Promise<string> {
    return this._model;
  }
}
