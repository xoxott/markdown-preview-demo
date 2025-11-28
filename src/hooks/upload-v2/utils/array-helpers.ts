/**
 * 数组操作辅助函数
 */

/**
 * 从数组中移除指定项
 */
export function removeFromArray<T>(array: T[], predicate: (item: T) => boolean): T | undefined {
  const index = array.findIndex(predicate);
  if (index > -1) {
    return array.splice(index, 1)[0];
  }
  return undefined;
}

/**
 * 批量从数组中移除项
 */
export function removeManyFromArray<T>(array: T[], predicate: (item: T) => boolean): T[] {
  const removed: T[] = [];
  let index = array.findIndex(predicate);
  
  while (index > -1) {
    removed.push(array.splice(index, 1)[0]);
    index = array.findIndex(predicate);
  }
  
  return removed;
}

/**
 * 检查数组中是否存在项
 */
export function existsInArray<T>(array: T[], predicate: (item: T) => boolean): boolean {
  return array.some(predicate);
}

/**
 * 从多个数组中查找项
 */
export function findInArrays<T>(
  arrays: T[][],
  predicate: (item: T) => boolean
): T | undefined {
  for (const array of arrays) {
    const found = array.find(predicate);
    if (found) return found;
  }
  return undefined;
}

