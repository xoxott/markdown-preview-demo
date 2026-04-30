/** createRuntimeAgentLoop — 工厂函数，创建配置好的 AgentLoop */

import { AgentLoop } from '@suga/ai-agent-loop';
import type { RuntimeConfig } from '../types/config';
import { buildRuntimePhases } from './buildRuntimePhases';
import { buildEffectiveToolRegistry } from './buildEffectiveToolRegistry';

/**
 * 创建配置好的 AgentLoop 实例
 *
 * 根据 RuntimeConfig 构建 Phase 链，通过 P1 的 phases 字段注入，
 * 绕过默认的 buildPhases() 硬编码。
 */
export function createRuntimeAgentLoop(config: RuntimeConfig): AgentLoop {
  const phases = buildRuntimePhases(config);
  const effectiveRegistry = buildEffectiveToolRegistry(config);

  return new AgentLoop({
    provider: config.provider,
    maxTurns: config.maxTurns,
    toolRegistry: effectiveRegistry ?? config.toolRegistry,
    scheduler: config.scheduler,
    toolTimeout: config.toolTimeout,
    hookRegistry: config.hookRegistry,
    phases
  });
}
