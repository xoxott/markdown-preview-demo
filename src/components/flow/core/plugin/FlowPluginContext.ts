/**
 * Flow 插件上下文实现
 *
 * 提供插件使用的 API 和工具
 */

import type { FlowPluginContext } from '../../types/flow-plugin';
import type { FlowConfig } from '../../types/flow-config';
import type { FlowEvents } from '../../types/flow-events';
import { FlowEventEmitter } from '../events/FlowEventEmitter';
import { FlowConfigManager } from '../../config/FlowConfigManager';

/**
 * Flow 插件上下文实现
 */
export class FlowPluginContextImpl implements FlowPluginContext {
  /** 配置管理器 */
  public readonly config: FlowPluginContext['config'];
  /** 事件系统 */
  public readonly events: FlowPluginContext['events'];
  /** Hook 系统 */
  public readonly hooks: FlowPluginContext['hooks'];

  /** 事件发射器 */
  private eventEmitter: FlowEventEmitter;
  /** 配置管理器实例 */
  private configManager: FlowConfigManager;
  /** 配置实例 ID */
  private configId: string;
  /** Hook 注册表 */
  private hookRegistry: Map<string, any> = new Map();

  constructor(
    eventEmitter: FlowEventEmitter,
    configManager: FlowConfigManager,
    configId: string
  ) {
    this.eventEmitter = eventEmitter;
    this.configManager = configManager;
    this.configId = configId;

    // 配置 API
    this.config = {
      get: () => this.configManager.getConfig(this.configId),
      update: (partialConfig) => {
        this.configManager.updateConfig(this.configId, partialConfig);
      },
      subscribe: (listener) => {
        return this.configManager.subscribe(this.configId, listener);
      }
    };

    // 事件 API
    this.events = {
      on: <K extends keyof FlowEvents>(
        event: K,
        handler: FlowEvents[K]
      ) => {
        return this.eventEmitter.on(event, handler as any);
      },
      off: <K extends keyof FlowEvents>(
        event: K,
        handler: FlowEvents[K]
      ) => {
        this.eventEmitter.off(event, handler as any);
      },
      emit: <K extends keyof FlowEvents>(
        event: K,
        ...args: Parameters<NonNullable<FlowEvents[K]>>
      ) => {
        this.eventEmitter.emit(event, ...args);
      }
    };

    // Hook API
    this.hooks = {
      register: (name: string, hook: any) => {
        this.hookRegistry.set(name, hook);
      },
      get: (name: string) => {
        return this.hookRegistry.get(name);
      }
    };
  }

  /**
   * 获取事件发射器（内部使用）
   */
  getEventEmitter(): FlowEventEmitter {
    return this.eventEmitter;
  }

  /**
   * 获取配置管理器（内部使用）
   */
  getConfigManager(): FlowConfigManager {
    return this.configManager;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.hookRegistry.clear();
  }
}

