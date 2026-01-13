/**
 * 存储适配器类型定义
 */

/**
 * 存储适配器接口
 * 提供统一的存储操作接口，支持不同的存储实现（localStorage、sessionStorage、内存存储等）
 */
export interface StorageAdapter {
  /**
   * 获取存储项
   */
  getItem(key: string): string | null;

  /**
   * 设置存储项
   */
  setItem(key: string, value: string): void;

  /**
   * 删除存储项
   */
  removeItem(key: string): void;

  /**
   * 清空所有存储项
   */
  clear(): void;

  /**
   * 获取所有存储键
   * 用于支持按前缀清空等功能
   * @returns 所有存储键的数组
   */
  getAllKeys(): string[];
}

