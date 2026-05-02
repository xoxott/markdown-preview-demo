/** StructuredOutputTool — JSON Schema验证输出 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { StructuredOutputInput } from '../types/tool-inputs';
import type { StructuredOutputOutput } from '../types/tool-outputs';
import { StructuredOutputInputSchema } from '../types/tool-inputs';

/**
 * StructuredOutputTool — JSON Schema验证结构化输出
 *
 * - isReadOnly: true — 纯验证操作
 * - safetyLabel: 'readonly' — 无破坏性
 * - 简单Schema验证：检查data中的required字段是否存在于schema中
 */
export const structuredOutputTool = buildTool<StructuredOutputInput, StructuredOutputOutput>({
  name: 'structured-output',

  inputSchema: StructuredOutputInputSchema,

  description: async () => 'Validate structured output against JSON Schema',

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: StructuredOutputInput): ValidationResult => {
    if (!input.schema || Object.keys(input.schema).length === 0) {
      return { behavior: 'deny', message: 'Schema cannot be empty', reason: 'invalid_schema' };
    }
    if (!input.data || Object.keys(input.data).length === 0) {
      return { behavior: 'deny', message: 'Data cannot be empty', reason: 'invalid_data' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => ({ behavior: 'allow' }),

  call: async (
    input: StructuredOutputInput,
    _context: any
  ): Promise<ToolResult<StructuredOutputOutput>> => {
    const errors: string[] = [];
    const schema = input.schema;
    const data = input.data;

    // 简单验证：检查required字段
    if (Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Missing required field: "${field}"`);
        }
      }
    }

    // 检查类型匹配（简化版）
    if (schema.properties && typeof schema.properties === 'object') {
      for (const [key, propSchema] of Object.entries(schema.properties as Record<string, any>)) {
        if (key in data && propSchema.type) {
          const value = data[key];
          const expectedType = propSchema.type;
          const actualType = typeof value;

          if (expectedType === 'string' && actualType !== 'string') {
            errors.push(`Field "${key}" should be string, got ${actualType}`);
          } else if (expectedType === 'number' && actualType !== 'number') {
            errors.push(`Field "${key}" should be number, got ${actualType}`);
          } else if (expectedType === 'boolean' && actualType !== 'boolean') {
            errors.push(`Field "${key}" should be boolean, got ${actualType}`);
          } else if (expectedType === 'array' && !Array.isArray(value)) {
            errors.push(`Field "${key}" should be array`);
          } else if (
            expectedType === 'object' &&
            (typeof value !== 'object' || Array.isArray(value))
          ) {
            errors.push(`Field "${key}" should be object`);
          }
        }
      }
    }

    return {
      data: {
        valid: errors.length === 0,
        data,
        errors: errors.length > 0 ? errors : undefined
      }
    };
  },

  toAutoClassifierInput: (input: StructuredOutputInput) => ({
    toolName: 'structured_output',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 10_000
});
