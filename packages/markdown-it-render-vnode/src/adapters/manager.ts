/**
 * 适配器管理器
 *
 * @module adapters/manager
 * @description 通过在 renderer 对象上存储实例数据来避免全局状态
 */

import type { FrameworkAdapter } from './types';
import type { MarkdownRenderer } from '../types';

/** 内部符号键，用于存储适配器（避免命名冲突） */
const ADAPTER_KEY = Symbol('__vnodeAdapter');

/** 扩展渲染器类型，包含内部存储 */
interface RendererWithAdapter extends MarkdownRenderer {
  [ADAPTER_KEY]?: FrameworkAdapter;
}

/** 当前上下文的 renderer（用于在渲染函数调用链中传递） */
let currentRenderer: RendererWithAdapter | null = null;

/**
 * 设置当前渲染上下文
 *
 * @param renderer - 渲染器实例
 * @internal 内部使用，不对外暴露
 */
export function setCurrentRenderer(renderer: MarkdownRenderer | null): void {
  currentRenderer = renderer;
}

/**
 * 设置适配器
 *
 * @param renderer - Markdown 渲染器实例
 * @param adapter - 框架适配器
 */
export function setAdapter(renderer: MarkdownRenderer, adapter: FrameworkAdapter): void {
  (renderer as RendererWithAdapter)[ADAPTER_KEY] = adapter;
}

/**
 * 获取当前适配器
 *
 * @param renderer - Markdown 渲染器实例（可选，用于实例管理）
 * @returns 当前适配器
 * @throws 如果适配器未设置
 */
export function getAdapter(renderer?: MarkdownRenderer): FrameworkAdapter {
  // 1. 如果提供了 renderer，从实例中获取
  if (renderer) {
    const adapter = (renderer as RendererWithAdapter)[ADAPTER_KEY];
    if (adapter) {
      return adapter;
    }
  }

  // 2. 尝试从当前上下文获取
  if (currentRenderer) {
    const adapter = currentRenderer[ADAPTER_KEY];
    if (adapter) {
      return adapter;
    }
  }

  throw new Error('Adapter is not set. Please provide an adapter in plugin options.');
}

/**
 * 检查适配器是否已设置
 *
 * @param renderer - Markdown 渲染器实例
 * @returns 是否已设置
 */
export function hasAdapter(renderer: MarkdownRenderer): boolean {
  return !!(renderer as RendererWithAdapter)[ADAPTER_KEY];
}

