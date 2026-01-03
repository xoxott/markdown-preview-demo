/**
 * Props 工具函数
 *
 * 提供将组件 props 转换为响应式引用的工具函数
 */

import { computed, type ComputedRef } from 'vue';

/**
 * 将 props 转换为 computed ref（带默认值支持）
 *
 * @param prop 组件 prop 值
 * @param defaultValue 默认值
 * @returns ComputedRef
 *
 * @example
 * ```typescript
 * const viewportRef = usePropRef(props.viewport, { x: 0, y: 0, zoom: 1 });
 * ```
 */
export function usePropRef<T>(
  prop: T | undefined,
  defaultValue?: T
): ComputedRef<T> {
  return computed(() => prop ?? defaultValue!);
}

/**
 * 将 props 数组转换为 computed ref（带默认空数组）
 *
 * @param prop 组件 prop 数组值
 * @param defaultValue 默认值（默认为空数组）
 * @returns ComputedRef
 *
 * @example
 * ```typescript
 * const nodesRef = usePropArrayRef(props.nodes);
 * const selectedIdsRef = usePropArrayRef(props.selectedNodeIds, []);
 * ```
 */
export function usePropArrayRef<T>(
  prop: T[] | undefined,
  defaultValue: T[] = []
): ComputedRef<T[]> {
  return computed(() => prop ?? defaultValue);
}

/**
 * 将 props 对象转换为 computed ref（带默认值）
 *
 * @param prop 组件 prop 对象值
 * @param defaultValue 默认值
 * @returns ComputedRef
 *
 * @example
 * ```typescript
 * const viewportRef = usePropObjectRef(
 *   props.viewport,
 *   { x: 0, y: 0, zoom: 1 }
 * );
 * ```
 */
export function usePropObjectRef<T extends Record<string, any>>(
  prop: T | undefined,
  defaultValue: T
): ComputedRef<T> {
  return computed(() => prop ?? defaultValue);
}

