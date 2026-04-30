/** 懒加载 Schema 工具（Lazy Schema Utility） 避免循环依赖和启动成本的 Zod Schema 延迟初始化 */

import type { z } from 'zod';

/** 懒加载 Schema 工厂函数 */
export type LazySchemaFactory<T> = () => z.ZodType<T>;

/**
 * 懒加载 Schema（带缓存的延迟初始化 Zod Schema）
 *
 * 适用场景：
 *
 * 1. 避免循环依赖：Schema A 引用 Schema B，Schema B 引用 Schema A
 * 2. 减少启动成本：复杂 Schema 延迟到首次使用时才构建
 * 3. 配合 buildTool 的 inputSchema 函数形式使用
 */
export interface LazySchema<T> {
  /** 获取 Schema（首次调用时初始化，后续调用返回缓存） */
  get(): z.ZodType<T>;
  /** 是否已初始化（用于调试和性能监控） */
  readonly initialized: boolean;
}

/**
 * 创建懒加载 Schema（避免循环依赖和启动成本）
 *
 * @example
 *   // 避免循环依赖
 *   const schemaB = lazySchema(() => z.object({ a: schemaA.get().optional() }));
 *   const schemaA = lazySchema(() => z.object({ b: schemaB.get() }));
 *
 * @example
 *   // 配合 buildTool 使用
 *   const mySchema = lazySchema(() => z.strictObject({ path: z.string() }));
 *   const tool = buildTool({
 *   name: 'read',
 *   inputSchema: mySchema.get,  // 传入 .get 方法作为工厂函数
 *   ...
 *   });
 *
 * @param factory Zod Schema 工厂函数（只在首次调用 get() 时执行）
 * @returns LazySchema 实例（带缓存机制）
 */
export function lazySchema<T>(factory: LazySchemaFactory<T>): LazySchema<T> {
  let cached: z.ZodType<T> | null = null;

  return {
    get(): z.ZodType<T> {
      if (cached === null) {
        cached = factory();
      }
      return cached;
    },
    get initialized(): boolean {
      return cached !== null;
    }
  };
}
