/**
 * @suga/ai-runtime
 * Agent 集成运行时 — 聚合P0-P9子包配置，构建完整Phase链，提供工厂和会话层
 */

// 类型导出
export type * from './types';

// 常量导出
export { DEFAULT_RUNTIME_MAX_TURNS, DEFAULT_RUNTIME_TOOL_TIMEOUT } from './constants';

// Factory 层
export { buildRuntimePhases } from './factory/buildRuntimePhases';
export { buildEffectiveToolRegistry } from './factory/buildEffectiveToolRegistry';
export { createRuntimeAgentLoop } from './factory/createRuntimeAgentLoop';
export { createCallModelForSummary } from './factory/createCallModelForSummary';

// Session 层
export { RuntimeSession } from './session/RuntimeSession';
export { createRuntimeSession } from './session/createRuntimeSession';

// SDK 层 — QueryEngine + AgentEvent→SDKMessage 映射
export { QueryEngine } from './sdk/QueryEngine';
export { createQueryEngine } from './sdk/createQueryEngine';
export { createSDKSystemMessage } from './sdk/createSDKSystemMessage';
export {
  mapAgentEventToSDKMessages,
  createSDKMapContext,
  updateSDKMapContext,
  setSDKMapContextUsage
} from './sdk/mapAgentEventToSDKMessages';
export type { SDKMapContext } from './sdk/mapAgentEventToSDKMessages';
