/**
 * @suga/ai-agent-loop
 * 框架无关的 Agent 循环引擎 — AsyncGenerator 状态机、流式处理、中断机制和工具调度
 */

// 类型导出
export type * from './types';

// 常量
export { DEFAULT_MAX_TURNS, DEFAULT_TOOL_TIMEOUT, DEFAULT_SESSION_ID } from './constants';

// 上下文
export { createMutableAgentContext } from './context/AgentContext';
export type { AgentContext, MutableAgentContext } from './context/AgentContext';
export { createAgentToolUseContext } from './context/ToolUseContext';
export type { AgentToolUseContext } from './context/ToolUseContext';

// Phase 阶段
export type { LoopPhase } from './phase/LoopPhase';
export { composePhases } from './phase/LoopPhase';
export { PreProcessPhase } from './phase/PreProcessPhase';
export { CallModelPhase } from './phase/CallModelPhase';
export { CheckInterruptPhase } from './phase/CheckInterruptPhase';
export { ExecuteToolsPhase } from './phase/ExecuteToolsPhase';
export { PostProcessPhase } from './phase/PostProcessPhase';

// 调度器
export { ParallelScheduler, SerialScheduler } from './scheduler/ToolScheduler';

// 核心引擎
export { AgentLoop } from './loop/AgentLoop';
export { advanceState } from './loop/stateMachine';
