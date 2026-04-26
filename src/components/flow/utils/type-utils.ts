/**
 * 类型检查工具函数
 *
 * 提供常用的类型检查函数，用于类型守卫和运行时类型判断
 */

import type { Ref } from 'vue';

/**
 * 检查值是否为函数类型
 *
 * @example
 *   ```typescript
 *   if (isFunction(callback)) {
 *     callback();
 *   }
 *   ```;
 *
 * @param value 要检查的值
 * @returns 是否为函数
 */
export function isFunction<T extends (...args: any[]) => any>(value: unknown): value is T {
  return typeof value === 'function';
}

/**
 * 检查值是否为布尔类型
 *
 * @example
 *   ```typescript
 *   if (isBoolean(flag)) {
 *     // flag 被类型收窄为 boolean
 *   }
 *   ```;
 *
 * @param value 要检查的值
 * @returns 是否为布尔值
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 检查值是否为 Vue 响应式引用（Ref）
 *
 * @example
 *   ```typescript
 *   if (isRef(enabled)) {
 *     // enabled 被类型收窄为 Ref<T>
 *     watch(() => enabled.value, ...);
 *   }
 *   ```;
 *
 * @param value 要检查的值
 * @returns 是否为 Ref
 */
export function isRef<T = any>(value: unknown): value is Ref<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof (value as any).value !== 'undefined'
  );
}

/**
 * 检查值是否为对象类型（非 null）
 *
 * @example
 *   ```typescript
 *   if (isObject(config)) {
 *     // config 被类型收窄为 object
 *   }
 *   ```;
 *
 * @param value 要检查的值
 * @returns 是否为对象
 */
export function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

/**
 * 检查值是否为字符串类型
 *
 * @example
 *   ```typescript
 *   if (isString(id)) {
 *     // id 被类型收窄为 string
 *   }
 *   ```;
 *
 * @param value 要检查的值
 * @returns 是否为字符串
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 检查值是否为数字类型
 *
 * @example
 *   ```typescript
 *   if (isNumber(value)) {
 *     // value 被类型收窄为 number
 *   }
 *   ```;
 *
 * @param value 要检查的值
 * @returns 是否为数字
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * 检查值是否为数组类型
 *
 * @example
 *   ```typescript
 *   if (isArray(items)) {
 *     // items 被类型收窄为 any[]
 *   }
 *   ```;
 *
 * @param value 要检查的值
 * @returns 是否为数组
 */
export function isArray<T = any>(value: unknown): value is T[] {
  return Array.isArray(value);
}
