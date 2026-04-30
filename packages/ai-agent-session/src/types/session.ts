/** 会话类型定义（Session Types） 会话配置、状态与生命周期 */

import type { ToolRegistry } from '@suga/ai-tool-core';
import type { AnthropicAdapterConfig } from '@suga/ai-tool-adapter';
import type { LLMProvider } from '@suga/ai-agent-loop';
import type { StorageAdapter } from './storage';

/** Provider 配置（可序列化的配置，默认 Anthropic） */
export type ProviderConfig = AnthropicAdapterConfig;

/** Provider 工厂函数（反序列化时重建 LLMProvider） */
export type ProviderFactory = (config: ProviderConfig) => LLMProvider;

/** 工具注册表工厂函数（反序列化时重建 ToolRegistry） */
export type RegistryFactory = () => ToolRegistry;

/** 会话配置 */
export interface SessionConfig {
  /** 最大循环轮次（默认 10） */
  readonly maxTurns?: number;
  /** Provider 配置（可序列化） */
  readonly providerConfig: ProviderConfig;
  /** Provider 工厂函数（默认 AnthropicAdapter） */
  readonly providerFactory?: ProviderFactory;
  /** 工具注册表（不序列化，外部提供） */
  readonly toolRegistry?: ToolRegistry;
  /** 工具注册表工厂函数（反序列化时重建） */
  readonly registryFactory?: RegistryFactory;
  /** 工具执行超时（ms，默认 30000） */
  readonly toolTimeout?: number;
  /** 持久化存储适配器（默认 InMemoryStorageAdapter） */
  readonly storage?: StorageAdapter;
}

/** 会话状态枚举 */
export type SessionStatus = 'active' | 'paused' | 'completed' | 'destroyed';

/** 会话简要信息（用于列表展示） */
export interface SessionInfo {
  readonly sessionId: string;
  readonly status: SessionStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly turnCount: number;
}
