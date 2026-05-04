/**
 * @suga/ai-runtime
 * Agent 集成运行时 — 聚合P0-P9子包配置，构建完整Phase链，提供工厂和会话层
 */

// Module augmentation — P36 ToolUseContext 扩展（必须在最前面导入以确保augmentation安装）
import './types/tool-context-augmentation';

// 类型导出
export type * from './types';

// 常量导出
export { DEFAULT_RUNTIME_MAX_TURNS, DEFAULT_RUNTIME_TOOL_TIMEOUT } from './constants';

// Factory 层
export { buildRuntimePhases } from './factory/buildRuntimePhases';
export { buildEffectiveToolRegistry } from './factory/buildEffectiveToolRegistry';
export { createRuntimeAgentLoop } from './factory/createRuntimeAgentLoop';
export { createCallModelForSummary } from './factory/createCallModelForSummary';
export { buildProviderMap } from './factory/buildProviderMap';
export { buildClassifierFn } from './factory/buildClassifierFn';
export { createCallModelFnFromProvider } from './factory/createCallModelFnFromProvider';

// Session 层
export { RuntimeSession } from './session/RuntimeSession';
export { createRuntimeSession } from './session/createRuntimeSession';
export { SDKSessionAdapter } from './session/SDKSessionAdapter';
export { SessionEngineImpl, createSessionEngine } from './session/SessionEngineImpl';
export { SessionMetadataStore } from './session/SessionMetadataStore';
export type { SessionMetadata, MetadataPersister } from './session/SessionMetadataStore';

// Permission 层 — RuntimePermissionEngine + buildPermissionContext
export {
  RuntimePermissionEngine,
  buildPermissionContext
} from './permission/RuntimePermissionEngine';
export type { RuntimePermissionEngineConfig } from './permission/RuntimePermissionEngine';

// Swarm 层 — Worker Mailbox 适配器
export { SwarmWorkerMailboxAdapter } from './swarm/SwarmWorkerMailboxAdapter';
export type { SwarmWorkerMailboxAdapterConfig } from './swarm/SwarmWorkerMailboxAdapter';

// SDK 层 — QueryEngine + AgentEvent→SDKMessage 映射 + system prompt 组装
export { QueryEngine } from './sdk/QueryEngine';
export { createQueryEngine } from './sdk/createQueryEngine';
export { createSDKSystemMessage } from './sdk/createSDKSystemMessage';
export { fetchSystemPrompt } from './sdk/fetchSystemPrompt';
export {
  mapAgentEventToSDKMessages,
  createSDKMapContext,
  updateSDKMapContext,
  setSDKMapContextUsage
} from './sdk/mapAgentEventToSDKMessages';
export type { SDKMapContext } from './sdk/mapAgentEventToSDKMessages';
