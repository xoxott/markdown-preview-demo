/**
 * sharedTypes.ts — SDK内部共享类型定义
 *
 * 被sdkMessages.ts和controlTypes.ts共同引用的类型，避免重复定义。
 */

/** SDK账户信息 */
export interface SDKAccountInfo {
  readonly email?: string;
  readonly organization?: string;
  readonly subscription_type?: string;
  readonly token_source?: string;
  readonly api_key_source?: string;
  readonly api_provider?: string;
}

/** SDK斜杠命令信息 */
export interface SDKSlashCommand {
  readonly name: string;
  readonly description: string;
  readonly argument_hint?: string;
}

/** SDK MCP服务器信息 */
export interface SDKMcpServerInfo {
  readonly name: string;
  readonly status: string;
  readonly tools: readonly string[];
}

/** SDK模型信息 */
export interface SDKModelInfo {
  readonly value: string;
  readonly display_name: string;
  readonly description?: string;
  readonly supports_effort?: boolean;
  readonly supports_adaptive_thinking?: boolean;
  readonly supports_fast_mode?: boolean;
}

/** Agent定义配置（控制协议用） */
export interface AgentDefinitionConfig {
  readonly name: string;
  readonly description?: string;
  readonly prompt?: string;
  readonly tools?: readonly string[];
  readonly model?: string;
}
