/**
 * Flow 插件系统类型定义
 * 
 * 定义插件接口，支持扩展图形编辑器功能
 */

import type { FlowConfig } from './flow-config';
import type { FlowEvents } from './flow-events';

/**
 * 插件上下文
 * 
 * 提供给插件使用的 API 和工具
 */
export interface FlowPluginContext {
  /** 配置管理器 */
  config: {
    /** 获取配置 */
    get: () => Readonly<FlowConfig>;
    /** 更新配置 */
    update: (partialConfig: Partial<FlowConfig>) => void;
    /** 订阅配置变化 */
    subscribe: (listener: (config: FlowConfig) => void) => () => void;
  };
  /** 事件系统 */
  events: {
    /** 注册事件监听器 */
    on: <K extends keyof FlowEvents>(
      event: K,
      handler: FlowEvents[K]
    ) => () => void;
    /** 移除事件监听器 */
    off: <K extends keyof FlowEvents>(
      event: K,
      handler: FlowEvents[K]
    ) => void;
    /** 触发事件 */
    emit: <K extends keyof FlowEvents>(
      event: K,
      ...args: Parameters<NonNullable<FlowEvents[K]>>
    ) => void;
  };
  /** Hook 系统 */
  hooks: {
    /** 注册 Hook */
    register: (name: string, hook: any) => void;
    /** 获取 Hook */
    get: (name: string) => any;
  };
}

/**
 * Flow 插件接口
 * 
 * 所有插件必须实现此接口
 */
export interface FlowPlugin {
  /** 插件名称（唯一标识） */
  name: string;
  /** 插件版本 */
  version?: string;
  /** 插件描述 */
  description?: string;
  /** 安装插件 */
  install: (context: FlowPluginContext) => void | Promise<void>;
  /** 卸载插件 */
  uninstall?: (context: FlowPluginContext) => void | Promise<void>;
}

/**
 * 插件配置
 */
export interface FlowPluginConfig {
  /** 插件实例 */
  plugin: FlowPlugin;
  /** 插件选项 */
  options?: Record<string, any>;
  /** 是否启用 */
  enabled?: boolean;
}

