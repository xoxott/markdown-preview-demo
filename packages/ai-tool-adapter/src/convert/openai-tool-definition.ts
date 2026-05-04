/** 工具定义转换 — AnyBuiltTool → OpenAI ToolDefinition / OpenAIToolDef */

import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { ToolDefinition } from '@suga/ai-agent-loop';
import type { OpenAIToolDef } from '../types/openai';
import { zodToJsonSchema } from './zod-to-json-schema';

/**
 * 将 AnyBuiltTool 转换为统一的 ToolDefinition（中间格式）
 *
 * ToolDefinition 格式与 Anthropic 版相同（name, description, inputSchema）， OpenAI Adapter 在构建请求体时将此格式转换为
 * OpenAI API 格式。
 *
 * @param tool AnyBuiltTool 工具对象
 * @returns ToolDefinition（中间格式）
 */
export function formatOpenAIToolDefinition(tool: AnyBuiltTool): ToolDefinition {
  const jsonSchema = zodToJsonSchema(tool.inputSchema);
  return {
    name: tool.name,
    description: '', // 静态占位，动态描述需异步调用
    inputSchema: jsonSchema
  };
}

/**
 * 将 AnyBuiltTool 转换为 OpenAI API 的 function tool 定义格式
 *
 * OpenAI 使用嵌套结构 `{ type: 'function', function: { name, description, parameters } }`， 字段名为
 * `parameters`（而非 Anthropic 的 `input_schema`）。
 *
 * @param tool AnyBuiltTool 工具对象
 * @returns OpenAI API 格式的工具定义
 */
export function formatOpenAIApiToolDef(tool: AnyBuiltTool): OpenAIToolDef {
  const jsonSchema = zodToJsonSchema(tool.inputSchema);
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: '', // 静态占位
      parameters: jsonSchema
    }
  };
}
