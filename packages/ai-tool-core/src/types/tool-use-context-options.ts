/**
 * ToolUseContext 完整 options 层类型
 *
 * 对齐 CC Tool.ts options 定义，补全 @suga 缺少的字段。
 *
 * 设计原则：所有字段可选 — 宿主按需注入，库层不强制。 下游包可通过 interface merging 将这些字段合并到 ToolUseContext。
 */

/** Thinking 模式配置 */
export interface ThinkingConfig {
  readonly enabled: boolean;
  readonly budgetTokens?: number;
  readonly type?: 'enabled' | 'disabled';
}

/** MCP Client 引用类型 */
export interface McpClientRef {
  readonly serverName: string;
  readonly toolNames: readonly string[];
}

/** Agent Definition 引用 */
export interface AgentDefinitionRef {
  readonly agentType: string;
  readonly description: string;
}

/** Elicitation 请求 */
export interface ElicitationRequest {
  readonly message: string;
  readonly options?: readonly string[];
}

/** Elicitation 响应 */
export interface ElicitationResponse {
  readonly answer: string;
  readonly cancelled?: boolean;
}

/** RefreshTools 回调 */
export type RefreshToolsFn = (toolNames?: readonly string[]) => void;

/** GetAppState 回调 */
export type GetAppStateFn = <T>(key: string) => T | undefined;

/** SetAppState 回调 */
export type SetAppStateFn = <T>(key: string, value: T) => void;

/** HandleElicitation 回调 */
export type HandleElicitationFn = (request: ElicitationRequest) => Promise<ElicitationResponse>;

/**
 * ToolUseContext Options — 完整配置层
 *
 * CC Tool.ts 中 ToolUseContext 包含完整的 options 层，
 *
 * @suga 的 ToolUseContext 当前只有最小字段（abortController, tools, sessionId, onProgress）。
 * 此类型定义了所有缺失的可选字段，宿主按需注入。
 *
 * 合并方式：宿主通过 interface merging 将这些字段加入 ToolUseContext：
 * ```ts
 * declare module '@suga/ai-tool-core' {
 *   interface ToolUseContext extends ToolUseContextOptions {}
 * }
 * ```
 */
export interface ToolUseContextOptions {
  /** CLI 命令目录引用（宿主注入） */
  readonly commands?: unknown;
  /** 调试模式 */
  readonly debug?: boolean;
  /** 主循环模型名 */
  readonly mainLoopModel?: string;
  /** 详细输出模式 */
  readonly verbose?: boolean;
  /** 思考模式配置 */
  readonly thinkingConfig?: ThinkingConfig;
  /** MCP客户端映射（服务器名→客户端引用） */
  readonly mcpClients?: ReadonlyMap<string, McpClientRef>;
  /** MCP资源提供者 */
  readonly mcpResources?: unknown;
  /** 是否非交互session（如SDK/headless） */
  readonly isNonInteractiveSession?: boolean;
  /** 子代理定义映射 */
  readonly agentDefinitions?: ReadonlyMap<string, AgentDefinitionRef>;
  /** 最大预算（USD） */
  readonly maxBudgetUsd?: number;
  /** 刷新工具列表 */
  readonly refreshTools?: RefreshToolsFn;
  /** AbortController — 取消信号（已存在于 ToolUseContext，此处为类型声明补充） */
  readonly abortController?: AbortController;
  /** 文件读取状态追踪 */
  readonly readFileState?: unknown;
  /** 应用状态读取 */
  readonly getAppState?: GetAppStateFn;
  /** 应用状态写入 */
  readonly setAppState?: SetAppStateFn;
  /** 任务专用状态更新 */
  readonly setAppStateForTasks?: SetAppStateFn;
  /** 交互式询问处理 */
  readonly handleElicitation?: HandleElicitationFn;
}
