/** createRuntimeAgentLoop — 工厂函数，创建配置好的 AgentLoop */

import { AgentLoop } from '@suga/ai-agent-loop';
import type { AgentMessage, DeferredToolsDeltaFn, SystemPrompt } from '@suga/ai-agent-loop';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import { buildDeferredToolsSystemReminder, getDeferredToolsDelta } from '@suga/ai-tools';
import type { RuntimeConfig } from '../types/config';
import { buildRuntimePhases } from './buildRuntimePhases';
import {
  type ToolSearchRegistryResult,
  buildEffectiveToolRegistry
} from './buildEffectiveToolRegistry';
import { buildProviderMap } from './buildProviderMap';

/**
 * P99: DeferredToolsDeltaFn 实现 — 封装 getDeferredToolsDelta + buildDeferredToolsSystemReminder
 *
 * 由 ai-runtime 提供此函数注入到 AgentLoop.providers，避免 ai-agent-loop 循环依赖 ai-tools。
 */
const computeDeferredToolsDelta: DeferredToolsDeltaFn = (
  deferredTools: readonly AnyBuiltTool[],
  messages: readonly AgentMessage[]
): string | null => {
  const delta = getDeferredToolsDelta(deferredTools, messages);
  return buildDeferredToolsSystemReminder(delta, deferredTools, 'delta');
};

/**
 * 创建配置好的 AgentLoop 实例
 *
 * 根据 RuntimeConfig 构建 Phase 链，通过 P1 的 phases 字段注入， 绕过默认的 buildPhases() 硬编码。
 *
 * P35: systemPrompt 传入 CallModelPhase，传递到 provider.callModel()。 P36: providers (ProviderMap) 传入
 * AgentConfig，传递到 ToolUseContext，使工具可以访问宿主环境注入的 provider。 P99:
 * deferredTools/searchMode/deferredToolsDeltaFn 通过 providers 传入， 使 AgentLoop.computeToolDefs 能访问
 * delta 信息并计算通知。
 */
export function createRuntimeAgentLoop(
  config: RuntimeConfig,
  systemPrompt?: SystemPrompt
): AgentLoop {
  const effectiveResult = buildEffectiveToolRegistry(config);
  const phases = buildRuntimePhases(config, systemPrompt);
  const providers = buildProviderMap(config);

  // P99: 从 ToolSearchRegistryResult 提取 deferred 信息，注入到 providers
  let effectiveRegistry: import('@suga/ai-tool-core').ToolRegistry | undefined;

  if (effectiveResult && 'deferredTools' in effectiveResult) {
    const tsResult = effectiveResult as ToolSearchRegistryResult;
    effectiveRegistry = tsResult.registry;
    providers.deferredTools = tsResult.deferredTools;
    providers.searchMode = tsResult.searchMode;
    // 注入 delta 计算函数
    providers.deferredToolsDeltaFn = computeDeferredToolsDelta;
  } else if (effectiveResult) {
    effectiveRegistry = effectiveResult as import('@suga/ai-tool-core').ToolRegistry;
  }

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
