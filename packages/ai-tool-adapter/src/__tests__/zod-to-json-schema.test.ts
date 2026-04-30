/** zodToJsonSchema 测试 — Zod v4 → JSON Schema 转换 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { zodToJsonSchema } from '../convert/zod-to-json-schema';

describe('zodToJsonSchema', () => {
  it('简单对象 → 正确 JSON Schema', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number()
    });

    const result = zodToJsonSchema(schema);

    expect(result.type).toBe('object');
    expect(result.properties).toBeDefined();
    expect((result.properties as any).name).toBeDefined();
    expect((result.properties as any).age).toBeDefined();
  });

  it('应移除 $schema 元字段', () => {
    const schema = z.object({ x: z.number() });
    const result = zodToJsonSchema(schema);

    expect(result.$schema).toBeUndefined();
  });

  it('嵌套对象 → 正确嵌套 Schema', () => {
    const schema = z.object({
      outer: z.object({
        inner: z.string()
      })
    });

    const result = zodToJsonSchema(schema);

    expect(result.type).toBe('object');
    const outerProp = (result.properties as any).outer;
    expect(outerProp.type).toBe('object');
  });

  it('数组类型 → 正确 Schema', () => {
    const schema = z.object({
      items: z.array(z.string())
    });

    const result = zodToJsonSchema(schema);

    const itemsProp = (result.properties as any).items;
    expect(itemsProp.type).toBe('array');
  });

  it('可选字段 → 应标记', () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional()
    });

    const result = zodToJsonSchema(schema);

    expect((result as any).required).toBeDefined();
  });

  it('enum 类型 → 正确 Schema', () => {
    const schema = z.object({
      status: z.enum(['active', 'inactive'])
    });

    const result = zodToJsonSchema(schema);

    const statusProp = (result.properties as any).status;
    expect(statusProp.enum).toEqual(['active', 'inactive']);
  });
});
