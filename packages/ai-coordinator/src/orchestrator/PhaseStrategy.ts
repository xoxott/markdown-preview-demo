/** DefaultPhaseStrategy — 默认4阶段编排策略 */

import type { OrchestrationPhase, OrchestrationStep, OrchestrationContext, PhaseStrategy } from '../types/orchestrator';

/**
 * 默认4阶段编排策略
 *
 * Research: 为包含 "research" 关键词的 agentType 创建步骤
 * Synthesis: Coordinator 自己综合，不创建 Worker
 * Implementation: 为包含 "implement/coder/develop" 关键词的 agentType 创建步骤
 * Verification: 为包含 "verify/test/check" 关键词的 agentType 创建步骤
 */
export class DefaultPhaseStrategy implements PhaseStrategy {
  plan(phase: OrchestrationPhase, context: OrchestrationContext): OrchestrationStep[] {
    switch (phase) {
      case 'research': {
        const agents = context.availableAgents.filter(a =>
          a.whenToUse.toLowerCase().includes('research') ||
          a.agentType.includes('research')
        );
        return agents.map(a => ({
          phase: 'research',
          agentType: a.agentType,
          prompt: `研究以下问题: ${context.userRequest}`,
        }));
      }

      case 'synthesis': {
        // Coordinator 自己综合，不创建 Worker
        return [];
      }

      case 'implementation': {
        const agents = context.availableAgents.filter(a =>
          a.whenToUse.toLowerCase().includes('implement') ||
          a.whenToUse.toLowerCase().includes('code') ||
          a.whenToUse.toLowerCase().includes('develop') ||
          a.agentType.includes('coder') ||
          a.agentType.includes('implement')
        );
        return agents.map(a => ({
          phase: 'implementation',
          agentType: a.agentType,
          prompt: `实现以下需求: ${context.userRequest}\n基于研究结果: ${context.completedSteps.filter(s => s.step.phase === 'research').map(s => s.output).join('\n')}`,
        }));
      }

      case 'verification': {
        const agents = context.availableAgents.filter(a =>
          a.whenToUse.toLowerCase().includes('verify') ||
          a.whenToUse.toLowerCase().includes('test') ||
          a.whenToUse.toLowerCase().includes('check') ||
          a.agentType.includes('test') ||
          a.agentType.includes('verify')
        );
        return agents.map(a => ({
          phase: 'verification',
          agentType: a.agentType,
          prompt: `验证以下实现: ${context.userRequest}\n实现结果: ${context.completedSteps.filter(s => s.step.phase === 'implementation').map(s => s.output).join('\n')}`,
        }));
      }

      default:
        return [];
    }
  }
}