/** @suga/ai-tools — StructuredOutputTool测试 */

import { describe, expect, it } from 'vitest';
import type { StructuredOutputInput } from '../types/tool-inputs';
import { structuredOutputTool } from '../tools/structured-output';

describe('StructuredOutputTool', () => {
  it('validate(匹配schema) → valid=true', async () => {
    const result = await structuredOutputTool.call({
      schema: { required: ['name'], properties: { name: { type: 'string' } } },
      data: { name: 'test' }
    } as StructuredOutputInput, {} as any);
    expect(result.data.valid).toBe(true);
    expect(result.data.errors).toBeUndefined();
  });

  it('validate(缺少required字段) → valid=false', async () => {
    const result = await structuredOutputTool.call({
      schema: { required: ['name', 'age'], properties: { name: { type: 'string' }, age: { type: 'number' } } },
      data: { name: 'test' }
    } as StructuredOutputInput, {} as any);
    expect(result.data.valid).toBe(false);
    expect(result.data.errors).toContain('Missing required field: "age"');
  });

  it('validate(类型不匹配) → valid=false', async () => {
    const result = await structuredOutputTool.call({
      schema: { properties: { count: { type: 'number' } } },
      data: { count: 'not-a-number' }
    } as StructuredOutputInput, {} as any);
    expect(result.data.valid).toBe(false);
    expect(result.data.errors!.length).toBeGreaterThan(0);
  });

  it('validate(无required) → valid=true(任何data)', async () => {
    const result = await structuredOutputTool.call({
      schema: { properties: { name: { type: 'string' } } },
      data: { name: 'x' }
    } as StructuredOutputInput, {} as any);
    expect(result.data.valid).toBe(true);
  });

  it('validate(数组类型检查) → valid=false', async () => {
    const result = await structuredOutputTool.call({
      schema: { properties: { items: { type: 'array' } } },
      data: { items: 'not-array' }
    } as StructuredOutputInput, {} as any);
    expect(result.data.valid).toBe(false);
  });

  it('validate(布尔类型检查) → valid=true', async () => {
    const result = await structuredOutputTool.call({
      schema: { properties: { active: { type: 'boolean' } } },
      data: { active: true }
    } as StructuredOutputInput, {} as any);
    expect(result.data.valid).toBe(true);
  });

  it('validateInput(空schema) → deny', () => {
    const result = structuredOutputTool.validateInput!({ schema: {} as any, data: { x: 1 } } as StructuredOutputInput, {} as any);
    expect(result.behavior).toBe('deny');
  });

  it('isReadOnly → true', () => {
    expect(structuredOutputTool.isReadOnly!({ schema: { type: 'object' }, data: { x: 1 } } as StructuredOutputInput)).toBe(true);
  });
});