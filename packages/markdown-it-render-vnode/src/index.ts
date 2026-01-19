/**
 * Markdown 渲染 VNode 插件
 *
 * @module markdown-it-render-vnode
 */

import type MarkdownIt from 'markdown-it';
import { PERFORMANCE_CONFIG } from './constants';
import { defaultRenderRules, setCodeRendererOptions } from './renderers';
import { render, renderAttrs, renderToken } from './core';
import { startCacheCleanup } from './cache';
import { createPerformanceMonitor } from './performance';
import { mergeDefaultOptions, validateOptions } from './utils/options-validator';
import { setErrorHandlerConfig } from './utils/error-handler';
import { setAdapter } from './adapters/manager';
import type { FrameworkPluginOptions } from './types';

/**
 * Markdown 渲染 VNode 插件
 *
 * @param md - MarkdownIt 实例
 * @param options - 插件选项（必须包含 adapter）
 */
const markdownItRenderVnode = (md: MarkdownIt, options: FrameworkPluginOptions): void => {
  // 验证并规范化选项
  const validation = validateOptions(options);
  if (!validation.valid) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Markdown Render VNode] Invalid options:', validation.errors);
    }
    throw new Error(`Invalid plugin options: ${validation.errors.join(', ')}`);
  }

  // 合并默认选项
  const normalizedOptions = mergeDefaultOptions(validation.normalized);

  // 设置适配器（必需）
  setAdapter(normalizedOptions.adapter);

  // 设置错误处理配置（从选项中读取，如果有）
  if (normalizedOptions.errorHandler) {
    setErrorHandlerConfig(normalizedOptions.errorHandler);
  }

  // 设置代码渲染器选项
  setCodeRendererOptions(normalizedOptions);

  // 应用渲染规则（先应用默认规则，再应用自定义规则）
  Object.assign(md.renderer.rules, defaultRenderRules);
  if (normalizedOptions.customRules) {
    Object.assign(md.renderer.rules, normalizedOptions.customRules);
  }

  // 覆盖渲染方法（使用 unknown 作为中间类型，因为 markdown-it 的类型定义期望返回 string，但我们返回 FrameworkNode[]）
  md.renderer.render = render as unknown as typeof md.renderer.render;
  md.renderer.renderInline = render as unknown as typeof md.renderer.renderInline;
  md.renderer.renderAttrs = renderAttrs as unknown as typeof md.renderer.renderAttrs;
  md.renderer.renderToken = renderToken as unknown as typeof md.renderer.renderToken;

  // 性能监控（开发模式）
  if (process.env.NODE_ENV === 'development') {
    const originalRender = md.renderer.render as unknown as typeof render;
    md.renderer.render = createPerformanceMonitor(originalRender) as unknown as typeof md.renderer.render;
  }

  // 启动缓存清理（如果启用）
  if (normalizedOptions.performance?.enableCache ?? PERFORMANCE_CONFIG.ENABLE_VNODE_CACHE) {
    startCacheCleanup();
  }
};

export default markdownItRenderVnode;

// 导出类型和工具
export type {
  CodeBlockMeta,
  MarkdownRenderer,
  RenderEnv,
  RenderOptions,
  RenderRule,
  Token,
  FrameworkPluginOptions,
  ErrorHandlerConfig,
  ErrorHandlingMode
} from './types';

export * from './constants';
export { defaultRenderRules } from './renderers';
export * from './utils';
export {
  handleError,
  safeExecute,
  setErrorHandlerConfig
} from './utils/error-handler';
export {
  validateOptions,
  mergeDefaultOptions
} from './utils/options-validator';
export {
  createPerformanceMonitor,
  setPerformanceCallback
} from './performance';
export type {
  PerformanceMetrics,
  PerformanceCallback
} from './performance';
export {
  setAdapter,
  getAdapter,
  hasAdapter
} from './adapters/manager';
export type {
  FrameworkAdapter,
  FrameworkNode,
  FrameworkComponent
} from './adapters/types';

