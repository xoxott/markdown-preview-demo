/** 工具构建器（Tool Builder） 基于失败封闭默认值的工具构建函数 */

import type { z } from 'zod';
import { DEFAULT_MAX_RESULT_SIZE, TOOL_NAME_PATTERN } from './constants';
import type { BuiltTool, ToolDef } from './types/tool';
import type { ToolClassifierInput } from './types/permission-classifier';

/**
 * 工具默认值（失败封闭默认值 — 保守策略）
 *
 * 核心设计原则：
 *
 * - isConcurrencySafe 默认 false：未声明的工具不允许并发执行
 * - isReadOnly 默认 false：未声明的工具被视为写操作
 * - isDestructive 默认 false：未声明的不被视为破坏性（但 isReadOnly=false 更保守）
 * - safetyLabel 默认 'system'：最保守标签，视为最高风险
 * - interruptBehavior 默认 'cancel'：中断时直接取消而非等待
 * - validateInput 默认 allow：不做额外语义校验（Zod 已做基础校验）
 * - checkPermissions 默认 allow：不做额外权限检查（执行器会根据模式规则检查）
 */
export const TOOL_DEFAULTS = {
  aliases: [] as string[],
  isConcurrencySafe: () => false as boolean,
  isReadOnly: () => false as boolean,
  isDestructive: () => false as boolean,
  isEnabled: () => true as boolean,
  validateInput: () => ({ behavior: 'allow' as const }),
  checkPermissions: () => ({ behavior: 'allow' as const }),
  safetyLabel: () => 'system' as const,
  maxResultSizeChars: DEFAULT_MAX_RESULT_SIZE,
  interruptBehavior: () => 'cancel' as const,
  toAutoClassifierInput: (_input: unknown): ToolClassifierInput => ({
    toolName: '',
    input: _input,
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: false
  }),
  requiresUserInteraction: () => false as boolean,
  shouldDefer: false as boolean,
  searchHint: '' as string,
  alwaysLoad: false as boolean
};

/**
 * 构建工具（从部分定义生成完整工具）
 *
 * 核心流程：
 *
 * 1. 验证工具名称格式（必须匹配 /^[a-z][a-z0-9-]*$/）
 * 2. 解析 inputSchema（如果是工厂函数，调用一次获取 Zod schema）
 * 3. 合并默认值和自定义定义（默认值作为基线，自定义覆盖）
 *
 * @example
 *   // 只读工具（必须显式声明安全行为）
 *   const readTool = buildTool({
 *     name: 'read-file',
 *     inputSchema: z.object({ path: z.string() }),
 *     call: async args => ({ data: readFile(args.path) }),
 *     description: async input => `读取文件: ${input.path}`,
 *     isReadOnly: () => true,
 *     isConcurrencySafe: () => true,
 *     safetyLabel: () => 'readonly'
 *   } satisfies ToolDef<{ path: string }, string>);
 *
 * @param def 工具部分定义（可选字段会被默认值填充）
 * @returns 构建完成的工具（所有字段都有值）
 * @throws 工具名称不符合格式要求时抛出错误
 */
export function buildTool<Input, Output>(def: ToolDef<Input, Output>): BuiltTool<Input, Output> {
  // 验证工具名称格式
  if (!TOOL_NAME_PATTERN.test(def.name)) {
    throw new Error(`工具名称 "${def.name}" 不符合格式要求，必须匹配 ${TOOL_NAME_PATTERN.source}`);
  }

  // 解析 inputSchema：如果是函数，调用一次获取 Zod schema
  const resolvedSchema =
    typeof def.inputSchema === 'function'
      ? (def.inputSchema as () => z.ZodType<Input>)()
      : def.inputSchema;

  // 合并默认值和自定义定义（展开合并，自定义定义优先）
  return {
    name: def.name,
    aliases: def.aliases ?? TOOL_DEFAULTS.aliases,
    inputSchema: resolvedSchema,
    call: def.call,
    description: def.description,
    isConcurrencySafe: def.isConcurrencySafe ?? TOOL_DEFAULTS.isConcurrencySafe,
    isReadOnly: def.isReadOnly ?? TOOL_DEFAULTS.isReadOnly,
    isDestructive: def.isDestructive ?? TOOL_DEFAULTS.isDestructive,
    isEnabled: def.isEnabled ?? TOOL_DEFAULTS.isEnabled,
    validateInput: def.validateInput ?? TOOL_DEFAULTS.validateInput,
    checkPermissions: def.checkPermissions ?? TOOL_DEFAULTS.checkPermissions,
    safetyLabel: def.safetyLabel ?? TOOL_DEFAULTS.safetyLabel,
    maxResultSizeChars: def.maxResultSizeChars ?? TOOL_DEFAULTS.maxResultSizeChars,
    interruptBehavior: def.interruptBehavior ?? TOOL_DEFAULTS.interruptBehavior,
    toAutoClassifierInput: (def.toAutoClassifierInput ?? TOOL_DEFAULTS.toAutoClassifierInput) as (
      input: unknown
    ) => ToolClassifierInput,
    requiresUserInteraction: def.requiresUserInteraction ?? TOOL_DEFAULTS.requiresUserInteraction,
    shouldDefer: def.shouldDefer ?? TOOL_DEFAULTS.shouldDefer,
    searchHint: def.searchHint ?? TOOL_DEFAULTS.searchHint,
    alwaysLoad: def.alwaysLoad ?? TOOL_DEFAULTS.alwaysLoad
  };
}
