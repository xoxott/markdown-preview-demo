/**
 * 数组工具函数
 */

/**
 * 比较两个数组是否包含相同的 ID
 *
 * 性能优化：O(n log n) → O(n)
 *
 * @param arr1 第一个数组
 * @param arr2 第二个数组
 * @returns 如果两个数组包含相同的 ID，返回 true
 *
 * @example
 * ```typescript
 * const nodes1 = [{ id: '1' }, { id: '2' }];
 * const nodes2 = [{ id: '2' }, { id: '1' }];
 * compareIds(nodes1, nodes2); // true
 * ```
 */
export function compareIds<T extends { id: string }>(
  arr1: T[],
  arr2: T[]
): boolean {
  if (arr1.length !== arr2.length) return false;

  const set1 = new Set(arr1.map(item => item.id));
  const set2 = new Set(arr2.map(item => item.id));

  if (set1.size !== set2.size) return false;

  for (const id of set1) {
    if (!set2.has(id)) return false;
  }

  return true;
}

