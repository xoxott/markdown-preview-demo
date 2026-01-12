/**
 * 插件管理模块
 */

import type { Plugin } from '../plugins/types';
import type { Request } from '../request';
import { internalWarn } from '../utils/common/internalLogger';

/**
 * 插件管理器
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  /**
   * 安装插件
   * @param plugin 插件实例
   * @param requestInstance 请求实例
   */
  use(plugin: Plugin, requestInstance: Request): void {
    if (this.plugins.has(plugin.name)) {
      internalWarn(`Plugin ${plugin.name} already installed`);
      return;
    }
    plugin.install(requestInstance);
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * 卸载插件
   * @param pluginName 插件名称
   * @param requestInstance 请求实例
   */
  unuse(pluginName: string, requestInstance: Request): void {
    const plugin = this.plugins.get(pluginName);
    if (plugin && plugin.uninstall) {
      plugin.uninstall(requestInstance);
    }
    this.plugins.delete(pluginName);
  }

  /**
   * 检查插件是否已安装
   * @param pluginName 插件名称
   * @returns 是否已安装
   */
  hasPlugin(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * 获取所有已安装的插件名称
   * @returns 插件名称列表
   */
  listPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * 清除所有插件
   * @param requestInstance 请求实例
   */
  clearPlugins(requestInstance: Request): void {
    this.plugins.forEach(plugin => {
      if (plugin.uninstall) {
        plugin.uninstall(requestInstance);
      }
    });
    this.plugins.clear();
  }
}
