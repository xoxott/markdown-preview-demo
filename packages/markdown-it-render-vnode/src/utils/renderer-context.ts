/**
 * 渲染器上下文工具
 *
 * @module utils/renderer-context
 * @description 提供访问 renderer 实例数据的工具函数
 */

import type { MarkdownRenderer, FrameworkPluginOptions, ErrorHandlerConfig } from '../types';
import type { FrameworkAdapter } from '../adapters/types';
import type { PerformanceCallback } from '../performance';

/** 内部符号键 */
const OPTIONS_KEY = '__vnodeOptions';
const ADAPTER_KEY = Symbol('__vnodeAdapter');
const ERROR_CONFIG_KEY = '__errorConfig';
const PERF_CALLBACK_KEY = '__perfCallback';

/**
 * 扩展的 MarkdownRenderer 接口，包含内部属性
 * @internal
 */
interface ExtendedRenderer extends MarkdownRenderer {
  [OPTIONS_KEY]?: FrameworkPluginOptions;
  [ADAPTER_KEY]?: FrameworkAdapter;
  [ERROR_CONFIG_KEY]?: ErrorHandlerConfig;
  [PERF_CALLBACK_KEY]?: PerformanceCallback | null;
}

/**
 * 从渲染器获取插件选项
 *
 * @param renderer - Markdown 渲染器实例
 * @returns 插件选项
 */
export function getRendererOptions(renderer: MarkdownRenderer): FrameworkPluginOptions | undefined {
  return (renderer as ExtendedRenderer)[OPTIONS_KEY];
}

/**
 * 从渲染器获取适配器
 *
 * @param renderer - Markdown 渲染器实例
 * @returns 适配器
 */
export function getRendererAdapter(renderer: MarkdownRenderer): FrameworkAdapter | undefined {
  return (renderer as ExtendedRenderer)[ADAPTER_KEY];
}

/**
 * 从渲染器获取错误配置
 *
 * @param renderer - Markdown 渲染器实例
 * @returns 错误配置
 */
export function getRendererErrorConfig(renderer: MarkdownRenderer): ErrorHandlerConfig | undefined {
  return (renderer as ExtendedRenderer)[ERROR_CONFIG_KEY];
}

/**
 * 设置渲染器错误配置
 *
 * @param renderer - Markdown 渲染器实例
 * @param config - 错误配置
 */
export function setRendererErrorConfig(renderer: MarkdownRenderer, config: ErrorHandlerConfig): void {
  (renderer as ExtendedRenderer)[ERROR_CONFIG_KEY] = config;
}

/**
 * 从渲染器获取性能回调
 *
 * @param renderer - Markdown 渲染器实例
 * @returns 性能回调
 */
export function getRendererPerfCallback(renderer: MarkdownRenderer): PerformanceCallback | undefined {
  const callback = (renderer as ExtendedRenderer)[PERF_CALLBACK_KEY];
  return callback === null ? undefined : callback;
}

/**
 * 设置渲染器性能回调
 *
 * @param renderer - Markdown 渲染器实例
 * @param callback - 性能回调
 */
export function setRendererPerfCallback(renderer: MarkdownRenderer, callback: PerformanceCallback | null): void {
  (renderer as ExtendedRenderer)[PERF_CALLBACK_KEY] = callback;
}

