/** SpeculationState — 推测性执行状态 */

export type SpeculationPhase = 'idle' | 'running' | 'completed' | 'failed';

export interface SpeculationResult {
  readonly phase: SpeculationPhase;
  readonly estimatedTokens?: number;
  readonly estimatedCostUsd?: number;
  readonly startTime?: number;
  readonly endTime?: number;
}

/** 空闲推测状态 */
export const IDLE_SPECULATION_STATE: SpeculationResult = {
  phase: 'idle'
};
