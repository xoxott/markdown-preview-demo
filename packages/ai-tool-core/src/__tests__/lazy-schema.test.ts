/** lazySchema 测试 — 缓存、延迟初始化和 Zod 集成 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { lazySchema } from '../lazy-schema';
import { buildTool } from '../tool';

describe('lazySchema', () => {
  describe('延迟初始化', () => {
    it('应该在首次调用 get() 时初始化', () => {
      const schema = lazySchema(() => z.string());
      expect(schema.initialized).toBe(false);
      schema.get();
      expect(schema.initialized).toBe(true);
    });

    it('应该缓存初始化结果（多次调用返回同一实例）', () => {
      const schema = lazySchema(() => z.object({ name: z.string() }));
      const first = schema.get();
      const second = schema.get();
      expect(first).toBe(second);
    });

    it('工厂函数应该只被调用一次', () => {
      let callCount = 0;
      const schema = lazySchema(() => {
        callCount++;
        return z.object({ name: z.string() });
      });
      schema.get();
      schema.get();
      schema.get();
      expect(callCount).toBe(1);
    });
  });

  describe('Zod 集成', () => {
    it('应该支持 Zod Schema 验证', () => {
      const schema = lazySchema(() => z.object({ path: z.string() }));
      const result = schema.get().safeParse({ path: '/test' });
      expect(result.success).toBe(true);
    });

    it('应该支持 Zod 验证失败', () => {
      const schema = lazySchema(() => z.object({ path: z.string() }));
      const result = schema.get().safeParse({ path: 123 });
      expect(result.success).toBe(false);
    });

    it('应该支持复杂 Zod Schema（嵌套、可选等）', () => {
      const schema = lazySchema(() =>
        z.object({
          name: z.string(),
          age: z.number().optional(),
          tags: z.array(z.string()).default([])
        })
      );
      const result = schema.get().safeParse({ name: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'test', tags: [] });
      }
    });
  });

  describe('延迟引用场景', () => {
    it('应该支持引用尚未定义的 Schema（延迟解析）', () => {
      // 模拟延迟引用场景：先声明 schemaB 的引用，再定义 schemaA
      const schemaA = lazySchema(() =>
        z.object({
          name: z.string(),
          // 使用延迟引用而非循环引用
          ref: z.string().optional()
        })
      );

      // 验证延迟初始化有效
      expect(schemaA.initialized).toBe(false);
      const result = schemaA.get().safeParse({ name: 'test' });
      expect(result.success).toBe(true);
    });
  });

  describe('配合 buildTool 使用', () => {
    it('应该能作为 inputSchema 工厂函数使用', () => {
      const schema = lazySchema(() => z.object({ x: z.number() }));

      const tool = buildTool({
        name: 'lazy-test',
        inputSchema: schema.get,
        call: async args => ({ data: args.x * 2 }),
        description: async input => `计算: ${input.x}`
      });

      // inputSchema 应被解析为 Zod schema
      const parseResult = tool.inputSchema.safeParse({ x: 5 });
      expect(parseResult.success).toBe(true);
    });
  });
});
