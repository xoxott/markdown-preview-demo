/** Mock 工具 — 用于测试的模拟工具实现 */

import { z } from 'zod';
import { buildTool } from '../../tool';
import type { AnyBuiltTool } from '../../types/registry';
import type { ToolResult } from '../../types/tool';
import type { ToolUseContext } from '../../types/context';
import type { PermissionResult, SafetyLabel, ValidationResult } from '../../types';

/** Mock 工具配置 */
export interface MockToolConfig<Input = unknown, Output = unknown> {
  /** 工具名称（默认 'mock-tool'） */
  name?: string;
  /** 工具别名 */
  aliases?: string[];
  /** 是否只读（默认 false） */
  isReadOnly?: boolean;
  /** 是否允许并发（默认 false） */
  isConcurrencySafe?: boolean;
  /** 是否破坏性操作（默认 false） */
  isDestructive?: boolean;
  /** 安全标签（默认 'system'） */
  safetyLabel?: SafetyLabel;
  /** 自定义执行函数 */
  callFn?: (args: Input, context: ToolUseContext) => Promise<ToolResult<Output>>;
  /** 自定义验证函数 */
  validateInputFn?: (input: Input, context: ToolUseContext) => ValidationResult;
  /** 自定义权限检查函数 */
  checkPermissionsFn?: (input: Input, context: ToolUseContext) => PermissionResult;
  /** 是否启用（默认 true） */
  isEnabled?: boolean;
  /** 最大结果字符数 */
  maxResultSizeChars?: number;
}

/** 创建 Mock 工具（简化版 buildTool 调用，用于测试） */
export function createMockTool<Input = Record<string, unknown>, Output = unknown>(
  inputSchema: z.ZodType<Input> = z.object({}) as unknown as z.ZodType<Input>,
  config: MockToolConfig<Input, Output> = {}
): AnyBuiltTool {
  return buildTool({
    name: config.name ?? 'mock-tool',
    aliases: config.aliases,
    inputSchema,
    call: config.callFn ?? (async () => ({ data: null as unknown as Output })),
    description: async () => config.name ?? 'mock-tool',
    isReadOnly: config.isReadOnly !== undefined ? () => config.isReadOnly as boolean : undefined,
    isConcurrencySafe:
      config.isConcurrencySafe !== undefined
        ? () => config.isConcurrencySafe as boolean
        : undefined,
    isDestructive:
      config.isDestructive !== undefined ? () => config.isDestructive as boolean : undefined,
    safetyLabel:
      config.safetyLabel !== undefined ? () => config.safetyLabel as SafetyLabel : undefined,
    validateInput: config.validateInputFn,
    checkPermissions: config.checkPermissionsFn,
    isEnabled: config.isEnabled !== undefined ? () => config.isEnabled as boolean : undefined,
    maxResultSizeChars: config.maxResultSizeChars
  });
}

/** 创建只读 Mock 工具（常用场景的快捷方式） */
export function createReadOnlyMockTool<Input = Record<string, unknown>, Output = unknown>(
  inputSchema: z.ZodType<Input> = z.object({}) as unknown as z.ZodType<Input>,
  config: MockToolConfig<Input, Output> = {}
): AnyBuiltTool {
  return createMockTool(inputSchema, {
    ...config,
    isReadOnly: true,
    isConcurrencySafe: true,
    safetyLabel: 'readonly'
  });
}

/** 创建破坏性 Mock 工具（常用场景的快捷方式） */
export function createDestructiveMockTool<Input = Record<string, unknown>, Output = unknown>(
  inputSchema: z.ZodType<Input> = z.object({}) as unknown as z.ZodType<Input>,
  config: MockToolConfig<Input, Output> = {}
): AnyBuiltTool {
  return createMockTool(inputSchema, {
    ...config,
    isReadOnly: false,
    isConcurrencySafe: false,
    isDestructive: true,
    safetyLabel: 'destructive'
  });
}
