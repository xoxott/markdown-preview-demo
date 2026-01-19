/**
 * 适配器管理器
 *
 * @module adapters/manager
 */

import type { FrameworkAdapter } from './types';

/** 当前使用的适配器 */
let currentAdapter: FrameworkAdapter | null = null;

/**
 * 设置适配器
 *
 * @param adapter - 框架适配器
 */
export function setAdapter(adapter: FrameworkAdapter): void {
  currentAdapter = adapter;
}

/**
 * 获取当前适配器
 *
 * @returns 当前适配器
 * @throws 如果适配器未设置
 */
export function getAdapter(): FrameworkAdapter {
  if (!currentAdapter) {
    throw new Error('Adapter is not set. Please provide an adapter in plugin options.');
  }
  return currentAdapter;
}

/**
 * 检查适配器是否已设置
 *
 * @returns 是否已设置
 */
export function hasAdapter(): boolean {
  return currentAdapter !== null;
}

