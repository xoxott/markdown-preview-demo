/**
 * Ref 工具函数
 *
 * 提供 Ref 更新相关的工具函数
 */

import type { Ref } from 'vue';

/**
 * 安全更新 Ref（只在值变化时更新）
 *
 * 使用引用比较，避免不必要的响应式更新
 *
 * @param ref 要更新的 Ref
 * @param newValue 新值
 *
 * @example
 * ```typescript
 * safeUpdateRef(nodesRef, newNodes);
 * ```
 */
export function safeUpdateRef<T>(ref: Ref<T>, newValue: T): void {
  if (ref.value !== newValue) {
    ref.value = newValue;
  }
}

/**
 * 浅层比较更新 Ref（用于对象）
 *
 * 比较指定键的值，只在有变化时更新
 *
 * @param ref 要更新的 Ref
 * @param newValue 新值
 * @param keys 要比较的键
 *
 * @example
 * ```typescript
 * shallowUpdateRef(viewportRef, newViewport, ['x', 'y', 'zoom']);
 * ```
 */
export function shallowUpdateRef<T extends Record<string, any>>(
  ref: Ref<T>,
  newValue: T,
  keys: (keyof T)[]
): void {
  const oldValue = ref.value;
  const hasChanged = keys.some(key => oldValue[key] !== newValue[key]);
  if (hasChanged) {
    ref.value = newValue;
  }
}

