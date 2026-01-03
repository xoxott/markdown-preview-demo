/**
 * Set 工具函数
 *
 * 提供 Set 相关的工具函数，包括缓存优化
 */

import { computed, type Ref } from 'vue';

/**
 * 创建缓存的 Set（性能优化）
 *
 * 避免每次 computed 都创建新的 Set 对象，只在数组引用变化时重新创建
 *
 * @param arrayRef 数组的响应式引用
 * @returns 缓存的 Set 对象（响应式）
 *
 * @example
 * ```typescript
 * const selectedIds = ref(['id1', 'id2']);
 * const selectedIdsSet = useCachedSet(selectedIds);
 * // selectedIdsSet.value 是一个 Set，只在 selectedIds 引用变化时重新创建
 * ```
 */
export function useCachedSet<T>(arrayRef: Ref<T[] | undefined> | Ref<T[]>): Ref<Set<T>> {
  let lastArray: T[] | undefined = undefined;
  let lastSet = new Set<T>();

  return computed(() => {
    const currentArray = arrayRef.value ?? [];

    // 如果数组引用相同，返回缓存的 Set
    if (currentArray === lastArray) {
      return lastSet;
    }

    // 数组引用变化，重新创建 Set
    lastArray = currentArray;
    lastSet = new Set(currentArray);
    return lastSet;
  });
}

