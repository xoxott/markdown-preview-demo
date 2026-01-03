/**
 * Flow 配置管理器
 *
 * 支持多实例的配置管理，每个画布可以有独立的配置
 * 提供配置的创建、获取、更新、订阅等功能
 */

import type { FlowConfig, PartialFlowConfig } from '../types/flow-config';
import { logger } from '../utils';
import { normalizeConfig, mergeConfig, cloneConfig } from '../utils/config-utils';
import { FlowConfigValidator } from './FlowConfigValidator';
import { DEFAULT_FLOW_CONFIG } from './default-config';

/**
 * 配置实例
 */
interface ConfigInstance {
  /** 配置 ID */
  id: string;
  /** 配置数据 */
  config: FlowConfig;
  /** 监听器集合 */
  listeners: Set<(config: FlowConfig) => void>;
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
}

/**
 * Flow 配置管理器
 *
 * 支持多实例配置管理，每个画布可以有独立的配置
 */
export class FlowConfigManager {
  /** 配置实例存储 */
  private instances: Map<string, ConfigInstance> = new Map();

  /** 验证器 */
  private validator: FlowConfigValidator;

  constructor() {
    this.validator = new FlowConfigValidator();
  }

  /**
   * 创建配置实例
   *
   * @param id 配置实例 ID（通常是画布 ID）
   * @param initialConfig 初始配置（可选）
   * @returns 配置实例 ID
   */
  createInstance(
    id: string,
    initialConfig?: PartialFlowConfig
  ): string {
    if (this.instances.has(id)) {
      logger.warn(`Config instance with id "${id}" already exists, updating instead`);
      this.updateConfig(id, initialConfig);
      return id;
    }

    // 规范化配置（填充默认值）
    const normalizedConfig = normalizeConfig(initialConfig);

    // 验证配置
    const validation = this.validator.validate(normalizedConfig);
    if (!validation.valid) {
      logger.warn(
        `Invalid config for instance "${id}":`,
        validation.errors.join(', ')
      );
    }

    // 创建实例
    const instance: ConfigInstance = {
      id,
      config: normalizedConfig,
      listeners: new Set(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.instances.set(id, instance);

    return id;
  }

  /**
   * 获取配置实例
   *
   * @param id 配置实例 ID
   * @returns 配置实例，如果不存在则返回 undefined
   */
  getInstance(id: string): ConfigInstance | undefined {
    return this.instances.get(id);
  }

  /**
   * 获取配置
   *
   * @param id 配置实例 ID
   * @returns 配置的只读副本，如果实例不存在则返回默认配置
   */
  getConfig(id: string): Readonly<FlowConfig> {
    const instance = this.instances.get(id);
    if (!instance) {
      logger.warn(`Config instance with id "${id}" not found, returning default config`);
      return Object.freeze(cloneConfig(DEFAULT_FLOW_CONFIG));
    }

    return Object.freeze(cloneConfig(instance.config));
  }

  /**
   * 更新配置
   *
   * @param id 配置实例 ID
   * @param partialConfig 部分配置（会与现有配置合并）
   */
  updateConfig(id: string, partialConfig?: PartialFlowConfig): void {
    const instance = this.instances.get(id);
    if (!instance) {
      logger.warn(
        `Config instance with id "${id}" not found, creating new instance`
      );
      this.createInstance(id, partialConfig);
      return;
    }

    // 合并配置
    const updatedConfig = mergeConfig(instance.config, partialConfig);

    // 验证配置
    const validation = this.validator.validate(updatedConfig);
    if (!validation.valid) {
      logger.warn(
        `Invalid config update for instance "${id}":`,
        validation.errors.join(', ')
      );
      // 仍然更新，但记录警告
    }

    // 更新配置
    instance.config = updatedConfig;
    instance.updatedAt = Date.now();

    // 通知监听器
    this.notifyListeners(id, updatedConfig);
  }

  /**
   * 订阅配置变化
   *
   * @param id 配置实例 ID
   * @param listener 监听器函数
   * @returns 取消订阅的函数
   */
  subscribe(
    id: string,
    listener: (config: FlowConfig) => void
  ): () => void {
    const instance = this.instances.get(id);
    if (!instance) {
      logger.warn(
        `Config instance with id "${id}" not found, cannot subscribe`
      );
      return () => {}; // 返回空函数
    }

    instance.listeners.add(listener);

    // 立即调用一次，传递当前配置
    listener(cloneConfig(instance.config));

    // 返回取消订阅函数
    return () => {
      instance.listeners.delete(listener);
    };
  }

  /**
   * 重置配置为默认值
   *
   * @param id 配置实例 ID
   */
  resetConfig(id: string): void {
    const instance = this.instances.get(id);
    if (!instance) {
      logger.warn(`Config instance with id "${id}" not found`);
      return;
    }

    instance.config = cloneConfig(DEFAULT_FLOW_CONFIG);
    instance.updatedAt = Date.now();

    this.notifyListeners(id, instance.config);
  }

  /**
   * 删除配置实例
   *
   * @param id 配置实例 ID
   */
  deleteInstance(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      // 清理所有监听器
      instance.listeners.clear();
      this.instances.delete(id);
    }
  }

  /**
   * 获取所有配置实例 ID
   *
   * @returns 配置实例 ID 数组
   */
  getAllInstanceIds(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * 检查配置实例是否存在
   *
   * @param id 配置实例 ID
   * @returns 是否存在
   */
  hasInstance(id: string): boolean {
    return this.instances.has(id);
  }

  /**
   * 通知所有监听器
   *
   * @param id 配置实例 ID
   * @param config 配置数据
   */
  private notifyListeners(id: string, config: FlowConfig): void {
    const instance = this.instances.get(id);
    if (!instance) return;

    const configCopy = cloneConfig(config);
    instance.listeners.forEach(listener => {
      try {
        listener(configCopy);
      } catch (error) {
        logger.error(
          `Error in config listener for instance "${id}":`,
          error
        );
      }
    });
  }

  /**
   * 清理所有配置实例
   */
  clear(): void {
    this.instances.forEach(instance => {
      instance.listeners.clear();
    });
    this.instances.clear();
  }
}

/**
 * 全局配置管理器单例
 */
let globalConfigManager: FlowConfigManager | null = null;

/**
 * 获取全局配置管理器
 *
 * @returns 全局配置管理器实例
 */
export function getGlobalConfigManager(): FlowConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new FlowConfigManager();
  }
  return globalConfigManager;
}

/**
 * 创建新的配置管理器实例
 *
 * @returns 新的配置管理器实例
 */
export function createFlowConfigManager(): FlowConfigManager {
  return new FlowConfigManager();
}

