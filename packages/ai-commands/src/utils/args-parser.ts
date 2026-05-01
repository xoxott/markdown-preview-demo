/**
 * 命令参数解析工具 — raw string → Zod validated object
 *
 * 支持三种格式:
 *
 * 1. JSON: '{"subcommand":"save","name":"bug-patterns"}'
 * 2. key=value: 'subcommand=save name=bug-patterns'
 * 3. 位置参数: 'save bug-patterns'（命令特定位置解析器）
 */

import type { z } from 'zod';

/** 位置参数解析器 — 将 token 数组映射为对象 */
export type PositionalParser = (tokens: string[]) => Record<string, unknown>;

/**
 * 解析命令参数
 *
 * @param rawArgs 原始参数字符串
 * @param schema Zod 验证 schema
 * @param positionalParser 可选的位置参数解析器
 * @returns Zod 验证后的结构化对象
 * @throws ZodError 如果参数不合法
 */
export function parseCommandArgs<T>(
  rawArgs: string,
  schema: z.ZodType<T>,
  positionalParser?: PositionalParser
): T {
  const trimmed = rawArgs.trim();

  // 空参数 → schema 直接验证（可能全部 optional）
  if (trimmed === '') {
    return schema.parse({});
  }

  // 尝试 JSON 解析
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed);
      return schema.parse(json);
    } catch {
      // JSON 解析失败 → 继续 key=value/位置参数
    }
  }

  // key=value 解析
  const kvPattern = /^(\w+)=(.*)$/;
  const tokens = trimmed.split(/\s+/);
  const hasKeyValue = tokens.some(t => kvPattern.test(t));

  if (hasKeyValue) {
    const obj: Record<string, unknown> = {};
    for (const token of tokens) {
      const match = kvPattern.exec(token);
      if (match) {
        const key = match[1];
        const value = match[2];
        // 尝试解析 boolean/number
        obj[key] = parseValue(value);
      } else {
        // 混合模式: key=value 中穿插位置参数 → 放入 _args
        if (!obj._args) {
          obj._args = [];
        }
        (obj._args as string[]).push(token);
      }
    }
    return schema.parse(obj);
  }

  // 位置参数解析
  if (positionalParser) {
    const obj = positionalParser(tokens);
    return schema.parse(obj);
  }

  // 无位置解析器 → 单字符串作为 instruction/query
  return schema.parse({ instruction: trimmed });
}

/** 解析单值 — boolean/number/string */
function parseValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (!Number.isNaN(num) && value !== '') return num;
  return value;
}

/** /memory 位置参数解析器: "save name content" 或 "recall query" 等 */
export const memoryPositionalParser: PositionalParser = tokens => {
  if (tokens.length === 0) return {};
  const subcommand = tokens[0];
  switch (subcommand) {
    case 'save':
      return {
        subcommand: 'save',
        name: tokens[1] ?? undefined,
        content: tokens.slice(2).join(' ') ?? undefined
      };
    case 'recall':
      return {
        subcommand: 'recall',
        query: tokens.slice(1).join(' ') ?? undefined
      };
    case 'forget':
      return {
        subcommand: 'forget',
        name: tokens[1] ?? undefined
      };
    case 'refresh':
      return { subcommand: 'refresh' };
    default:
      return { subcommand, query: tokens.slice(1).join(' ') };
  }
};

/** /config 位置参数解析器: "list" 或 "get key" 或 "set key value" 等 */
export const configPositionalParser: PositionalParser = tokens => {
  if (tokens.length === 0) return {};
  const subcommand = tokens[0];
  switch (subcommand) {
    case 'list':
      return { subcommand: 'list' };
    case 'get':
      return { subcommand: 'get', key: tokens[1] ?? undefined };
    case 'set':
      return {
        subcommand: 'set',
        key: tokens[1] ?? undefined,
        value: tokens.slice(2).join(' ') ?? undefined
      };
    case 'reset':
      return { subcommand: 'reset', key: tokens[1] ?? undefined };
    default:
      return { subcommand, key: tokens[1] ?? undefined };
  }
};

/** /mcp 位置参数解析器: "list" 或 "add name stdio command" 等 */
export const mcpPositionalParser: PositionalParser = tokens => {
  if (tokens.length === 0) return {};
  const subcommand = tokens[0];
  switch (subcommand) {
    case 'list':
      return { subcommand: 'list' };
    case 'add':
      return {
        subcommand: 'add',
        name: tokens[1] ?? undefined,
        configType: tokens[2] ?? undefined,
        command: tokens.slice(3).join(' ') ?? undefined
      };
    case 'remove':
      return { subcommand: 'remove', name: tokens[1] ?? undefined };
    case 'restart':
      return { subcommand: 'restart', name: tokens[1] ?? undefined };
    default:
      return { subcommand, name: tokens[1] ?? undefined };
  }
};
