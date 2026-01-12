/**
 * 插件系统类型定义
 */

import type { Request } from '../request';

/**
 * 插件接口
 */
export interface Plugin {
  /** 插件名称（必须唯一） */
  name: string;
  /** 插件版本 */
  version: string;
  /** 安装插件 */
  install(request: Request): void;
  /** 卸载插件（可选） */
  uninstall?(request: Request): void;
}

/**
 * 插件管理器接口
 */
export interface PluginManager {
  /** 安装插件 */
  use(plugin: Plugin): void;
  /** 卸载插件 */
  unuse(pluginName: string): void;
  /** 检查插件是否已安装 */
  has(pluginName: string): boolean;
  /** 获取所有已安装的插件名称 */
  list(): string[];
  /** 清除所有插件 */
  clear(): void;
}
