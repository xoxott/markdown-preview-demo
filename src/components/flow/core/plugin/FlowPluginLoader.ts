/**
 * Flow 插件加载器
 *
 * 负责插件的注册、加载、卸载、依赖管理等功能
 */

import { FlowConfigManager } from '../../config/FlowConfigManager';
import type { FlowPluginConfig, FlowPluginContext } from '../../types/flow-plugin';
import { FlowEventEmitter } from '../events/FlowEventEmitter';
import { FlowPluginContextImpl } from './FlowPluginContext';

/**
 * 插件实例
 */
interface PluginInstance {
  /** 插件配置 */
  config: FlowPluginConfig;
  /** 插件上下文 */
  context: FlowPluginContext;
  /** 是否已安装 */
  installed: boolean;
  /** 安装时间 */
  installedAt?: number;
}

/**
 * Flow 插件加载器
 */
export class FlowPluginLoader {
  /** 插件注册表 */
  private plugins: Map<string, PluginInstance> = new Map();
  /** 事件发射器 */
  private eventEmitter: FlowEventEmitter;
  /** 配置管理器 */
  private configManager: FlowConfigManager;
  /** 配置实例 ID */
  private configId: string;

  constructor(
    eventEmitter: FlowEventEmitter,
    configManager: FlowConfigManager,
    configId: string
  ) {
    this.eventEmitter = eventEmitter;
    this.configManager = configManager;
    this.configId = configId;
  }

  /**
   * 注册插件
   *
   * @param pluginConfig 插件配置
   * @returns 是否注册成功
   */
  register(pluginConfig: FlowPluginConfig): boolean {
    const { plugin, options = {}, enabled = true } = pluginConfig;

    // 检查插件是否已注册
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered`);
      return false;
    }

    // 创建插件上下文
    const context = new FlowPluginContextImpl(
      this.eventEmitter,
      this.configManager,
      this.configId
    );

    // 创建插件实例
    const instance: PluginInstance = {
      config: {
        plugin,
        options,
        enabled
      },
      context,
      installed: false
    };

    this.plugins.set(plugin.name, instance);

    // 如果启用，自动安装
    if (enabled) {
      this.install(plugin.name);
    }

    return true;
  }

  /**
   * 安装插件
   *
   * @param pluginName 插件名称
   * @returns 是否安装成功
   */
  async install(pluginName: string): Promise<boolean> {
    const instance = this.plugins.get(pluginName);
    if (!instance) {
      console.warn(`Plugin "${pluginName}" is not registered`);
      return false;
    }

    if (instance.installed) {
      console.warn(`Plugin "${pluginName}" is already installed`);
      return false;
    }

    try {
      // 调用插件的 install 方法
      await instance.config.plugin.install(instance.context);
      instance.installed = true;
      instance.installedAt = Date.now();
      return true;
    } catch (error) {
      console.error(`Failed to install plugin "${pluginName}":`, error);
      return false;
    }
  }

  /**
   * 卸载插件
   *
   * @param pluginName 插件名称
   * @returns 是否卸载成功
   */
  async uninstall(pluginName: string): Promise<boolean> {
    const instance = this.plugins.get(pluginName);
    if (!instance) {
      console.warn(`Plugin "${pluginName}" is not registered`);
      return false;
    }

    if (!instance.installed) {
      console.warn(`Plugin "${pluginName}" is not installed`);
      return false;
    }

    try {
      // 调用插件的 uninstall 方法（如果存在）
      if (instance.config.plugin.uninstall) {
        await instance.config.plugin.uninstall(instance.context);
      }

      // 清理上下文（如果实现了 cleanup 方法）
      if (typeof (instance.context as any).cleanup === 'function') {
        (instance.context as any).cleanup();
      }

      instance.installed = false;
      instance.installedAt = undefined;
      return true;
    } catch (error) {
      console.error(`Failed to uninstall plugin "${pluginName}":`, error);
      return false;
    }
  }

  /**
   * 启用插件
   *
   * @param pluginName 插件名称
   * @returns 是否启用成功
   */
  async enable(pluginName: string): Promise<boolean> {
    const instance = this.plugins.get(pluginName);
    if (!instance) {
      console.warn(`Plugin "${pluginName}" is not registered`);
      return false;
    }

    instance.config.enabled = true;

    if (!instance.installed) {
      return await this.install(pluginName);
    }

    return true;
  }

  /**
   * 禁用插件
   *
   * @param pluginName 插件名称
   * @returns 是否禁用成功
   */
  async disable(pluginName: string): Promise<boolean> {
    const instance = this.plugins.get(pluginName);
    if (!instance) {
      console.warn(`Plugin "${pluginName}" is not registered`);
      return false;
    }

    instance.config.enabled = false;

    if (instance.installed) {
      return await this.uninstall(pluginName);
    }

    return true;
  }

  /**
   * 获取插件
   *
   * @param pluginName 插件名称
   * @returns 插件实例，如果不存在则返回 undefined
   */
  getPlugin(pluginName: string): PluginInstance | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * 检查插件是否已注册
   *
   * @param pluginName 插件名称
   * @returns 是否已注册
   */
  isRegistered(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * 检查插件是否已安装
   *
   * @param pluginName 插件名称
   * @returns 是否已安装
   */
  isInstalled(pluginName: string): boolean {
    const instance = this.plugins.get(pluginName);
    return instance?.installed ?? false;
  }

  /**
   * 检查插件是否启用
   *
   * @param pluginName 插件名称
   * @returns 是否启用
   */
  isEnabled(pluginName: string): boolean {
    const instance = this.plugins.get(pluginName);
    return instance?.config.enabled ?? false;
  }

  /**
   * 获取所有已注册的插件名称
   *
   * @returns 插件名称数组
   */
  getRegisteredPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * 获取所有已安装的插件名称
   *
   * @returns 插件名称数组
   */
  getInstalledPlugins(): string[] {
    return Array.from(this.plugins.values())
      .filter(instance => instance.installed)
      .map(instance => instance.config.plugin.name);
  }

  /**
   * 获取所有已启用的插件名称
   *
   * @returns 插件名称数组
   */
  getEnabledPlugins(): string[] {
    return Array.from(this.plugins.values())
      .filter(instance => instance.config.enabled)
      .map(instance => instance.config.plugin.name);
  }

  /**
   * 卸载所有插件
   */
  async uninstallAll(): Promise<void> {
    const pluginNames = Array.from(this.plugins.keys());
    await Promise.all(pluginNames.map(name => this.uninstall(name)));
  }

  /**
   * 清理所有插件
   */
  async cleanup(): Promise<void> {
    await this.uninstallAll();
    this.plugins.clear();
  }
}

