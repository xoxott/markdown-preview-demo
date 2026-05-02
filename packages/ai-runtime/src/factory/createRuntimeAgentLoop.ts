/** createRuntimeAgentLoop — 工厂函数，创建配置好的 AgentLoop */

import { AgentLoop } from '@suga/ai-agent-loop';
import type { SystemPrompt } from '@suga/ai-agent-loop';
import type { RuntimeConfig } from '../types/config';
import { buildRuntimePhases } from './buildRuntimePhases';
import { buildEffectiveToolRegistry } from './buildEffectiveToolRegistry';
import { buildProviderMap } from './buildProviderMap';

/**
 * 创建配置好的 AgentLoop 实例
 *
 * 根据 RuntimeConfig 构建 Phase 链，通过 P1 的 phases 字段注入， 绕过默认的 buildPhases() 硬编码。
 *
 * P35: systemPrompt 传入 CallModelPhase，传递到 provider.callModel()。 P36: providers (ProviderMap) 传入
 * AgentConfig，传递到 ToolUseContext，使工具可以访问宿主环境注入的 provider。
 */
export function createRuntimeAgentLoop(
  config: RuntimeConfig,
  systemPrompt?: SystemPrompt
): AgentLoop {
  const phases = buildRuntimePhases(config, systemPrompt);
  const effectiveRegistry = buildEffectiveToolRegistry(config);
  const providers = buildProviderMap(config);

  return new AgentLoop({
    provider: config.provider,
    maxTurns: config.maxTurns,
    toolRegistry: effectiveRegistry ?? config.toolRegistry,
    scheduler: config.scheduler,
    toolTimeout: config.toolTimeout,
    hookRegistry: config.hookRegistry,
    phases,
    systemPrompt,
    providers
  });
}
