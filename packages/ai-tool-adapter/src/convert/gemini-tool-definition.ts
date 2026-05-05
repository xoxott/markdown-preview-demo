/** Gemini 工具定义转换器 — AnyBuiltTool → Gemini functionDeclarations */

import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { ToolDefinition } from '@suga/ai-agent-loop';
import type { GeminiFunctionDeclaration, GeminiTool } from '../types/gemini';
import { zodToJsonSchema } from './zod-to-json-schema';

/**
 * 将 AnyBuiltTool 转换为中间格式 ToolDefinition
 *
 * Gemini 的中间格式与 Anthropic/OpenAI 一致： { name, description, inputSchema }
 */
export function formatGeminiToolDefinition(tool: AnyBuiltTool): ToolDefinition {
  return {
    name: tool.name,
    description: '', // 静态占位，动态描述需异步调用
    inputSchema: zodToJsonSchema(tool.inputSchema)
  };
}

/**
 * 将 AnyBuiltTool 转换为 Gemini API 格式 functionDeclaration
 *
 * Gemini 工具定义格式与 Anthropic/OpenAI 的差异：
 *
 * - 参数名：parameters（而非 input_schema 或 function.parameters）
 * - 需要包裹在 GeminiTool.functionDeclarations 数组中
 * - JSON Schema 需要 type: "object" 顶层结构
 *
 * @param tool 工具对象
 * @returns GeminiTool（含 functionDeclarations）
 */
export function formatGeminiApiToolDef(tool: AnyBuiltTool): GeminiTool {
  const declaration: GeminiFunctionDeclaration = {
    name: tool.name,
    description: '', // 静态占位，动态描述需异步调用
    parameters: zodToJsonSchema(tool.inputSchema)
  };

  return {
    functionDeclarations: [declaration]
  };
}

/**
 * 将 ToolDefinition[] 转换为 Gemini API 的 tools 数组
 *
 * Gemini 要求所有 functionDeclarations 合并在同一个 GeminiTool 中， 而非每个工具独立一个 GeminiTool（与 OpenAI 的 tools[]
 * 格式不同）。
 */
export function formatGeminiToolDefs(tools: readonly ToolDefinition[]): GeminiTool[] {
  if (tools.length === 0) return [];

  const declarations: GeminiFunctionDeclaration[] = tools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.inputSchema as Record<string, unknown>
  }));

  return [{ functionDeclarations: declarations }];
}
