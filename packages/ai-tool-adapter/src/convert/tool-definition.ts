/** 工具定义转换 — AnyBuiltTool → Anthropic ToolDefinition */

import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { ToolDefinition } from '@suga/ai-agent-loop';
import { zodToJsonSchema } from './zod-to-json-schema';

/**
 * 将 AnyBuiltTool 转换为 Anthropic 工具定义格式
 *
 * 注意：tool.description 是异步函数，此处使用静态占位描述。 如需动态描述，请使用 formatToolDefinitionsAsync 辅助函数。
 *
 * @param tool AnyBuiltTool 工具对象
 * @returns ToolDefinition（JSON Schema 中间格式）
 */
export function formatAnthropicToolDefinition(tool: AnyBuiltTool): ToolDefinition {
  const jsonSchema = zodToJsonSchema(tool.inputSchema);
  return {
    name: tool.name,
    description: '', // 静态占位，动态描述需异步调用
    inputSchema: jsonSchema
  };
}

/**
 * 将 AnyBuiltTool 转换为 Anthropic API 的 input_schema 格式
 *
 * Anthropic 使用 input_schema（而非 inputSchema），需要字段名转换。
 *
 * @param tool AnyBuiltTool 工具对象
 * @returns Anthropic API 格式的工具定义
 */
export function formatAnthropicApiToolDef(tool: AnyBuiltTool): {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
} {
  const jsonSchema = zodToJsonSchema(tool.inputSchema);
  return {
    name: tool.name,
    description: '', // 静态占位
    input_schema: jsonSchema // Anthropic 用 input_schema
  };
}
