/** MockSpawnProvider — 测试用SpawnProvider模拟 */

import type {
  AgentResult,
  AgentSessionHandle,
  SpawnCallOptions,
  SpawnProvider
} from '../../types/task-executor';
import type { AgentDefinition } from '../../types/agent';

/** Mock SpawnProvider 默认结果 */
const DEFAULT_MODEL_RESPONSE = 'Mock model response: task completed successfully';
const DEFAULT_AGENT_RESULT: AgentResult = {
  output: 'Mock agent output: task executed successfully',
  toolCalls: 3,
  tokensUsed: { input: 1000, output: 500 },
  success: true
};

export class MockSpawnProvider implements SpawnProvider {
  private _callModelResponse: string = DEFAULT_MODEL_RESPONSE;
  private _agentResult: AgentResult = DEFAULT_AGENT_RESULT;
  private _callHistory: Array<{ prompt: string; options?: SpawnCallOptions }> = [];
  private _spawnHistory: Array<{ def: AgentDefinition; task: string; options?: SpawnCallOptions }> =
    [];

  /** 设置自定义callModel响应 */
  setCallModelResponse(response: string): this {
    this._callModelResponse = response;
    return this;
  }

  /** 设置自定义spawnAgent结果 */
  setAgentResult(result: AgentResult): this {
    this._agentResult = result;
    return this;
  }

  /** 获取callModel调用历史 */
  getCallHistory(): Array<{ prompt: string; options?: SpawnCallOptions }> {
    return this._callHistory;
  }

  /** 获取spawnAgent调用历史 */
  getSpawnHistory(): Array<{ def: AgentDefinition; task: string; options?: SpawnCallOptions }> {
    return this._spawnHistory;
  }

  async callModel(prompt: string, options?: SpawnCallOptions): Promise<string> {
    this._callHistory.push({ prompt, options });
    return this._callModelResponse;
  }

  async spawnAgent(
    def: AgentDefinition,
    task: string,
    options?: SpawnCallOptions
  ): Promise<AgentResult> {
    this._spawnHistory.push({ def, task, options });
    return this._agentResult;
  }

  async abortSession(handle: AgentSessionHandle): Promise<void> {
    // Mock: 无操作
  }
}
