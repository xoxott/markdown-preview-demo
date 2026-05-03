/** 工具核心类型定义（Tool Core Types） 工具抽象层的基础类型 */

import type { z } from 'zod';
import type { PermissionResult, SafetyLabel } from './permission';
import type { ValidationResult } from './validation';
import type { ToolCallOptions, ToolUseContext } from './context';
import type { ToolClassifierInput } from './permission-classifier';

/** 工具结果（工具执行后的返回值） */
export interface ToolResult<T = unknown> {
  /** 工具返回的数据 */
  data: T;
  /** 错误消息（可选，允许部分成功或软错误） */
  error?: string;
  /** 元数据（可选，用于传递额外信息，如截断标记等） */
  metadata?: Record<string, unknown>;
}

/**
 * 工具定义（部分定义，buildTool 会填充默认值）
 *
 * 设计原则：失败封闭（Fail-Closed）
 *
 * - 安全相关字段默认为最保守值（通过 buildTool 填充）
 * - 工具必须显式声明安全行为（如 isReadOnly: true）
 * - 未声明的行为默认为最保守值（如 isConcurrencySafe: false）
 *
 * 使用 satisfies ToolDef<Input, Output> 可获得编译时类型检查
 *
 * @example
 *   const myTool = buildTool({
 *     name: 'read-file',
 *     inputSchema: z.object({ path: z.string() }),
 *     call: async args => ({ data: readFile(args.path) }),
 *     description: async input => `读取文件: ${input.path}`,
 *     isReadOnly: () => true, // 必须显式声明
 *     safetyLabel: () => 'readonly'
 *   } satisfies ToolDef<{ path: string }, string>);
 */
export interface ToolDef<Input = unknown, Output = unknown> {
  /** 工具名称（必须唯一，匹配 /^[a-z][a-z0-9-]*$/） */
  name: string;
  /** 工具别名（可选，支持多个别名用于兼容旧名称） */
  aliases?: string[];
  /**
   * 输入 Schema（Zod schema 或延迟初始化工厂函数）
   *
   * - 直接传入 Zod schema: z.object({ path: z.string() })
   * - 传入工厂函数: () => z.object({ path: z.string() })（避免循环依赖）
   * - 使用 lazySchema: lazySchema(() => z.object({ ... })).get
   */
  inputSchema: z.ZodType<Input> | (() => z.ZodType<Input>);
  /** 工具执行函数（核心逻辑） */
  call(args: Input, context: ToolUseContext): Promise<ToolResult<Output>>;
  /** 工具描述（动态，可以基于输入参数生成不同描述给 LLM 看） */
  description(input: Input, options?: ToolCallOptions): Promise<string>;

  // === 安全相关字段（失败封闭 — 默认值为最保守） ===

  /**
   * 是否允许并发执行（默认 false — 未声明的工具不允许并发） 注意：同一工具的不同调用可能有不同的并发安全性 例如 Bash: ls 是安全的（只读），git push
   * 不安全（有副作用）
   */
  isConcurrencySafe?(input: Input): boolean;
  /** 是否只读操作（默认 false — 未声明的工具被视为写操作） */
  isReadOnly?(input: Input): boolean;
  /** 是否破坏性操作（默认 false — 未声明的不被视为破坏性） */
  isDestructive?(input: Input): boolean;
  /** 是否启用（默认 true — 工具默认可用） */
  isEnabled?(): boolean;
  /** 安全标签（默认 'system' — 最保守标签） */
  safetyLabel?(input: Input): SafetyLabel;

  // === 验证和权限 ===

  /** 自定义输入验证（在 Zod 验证之后执行，可做语义检查） 例如：检查文件路径是否存在、检查网络地址是否可达等 */
  validateInput?(input: Input, context: ToolUseContext): ValidationResult;
  /** 权限检查（由执行器在验证阶段之后调用） 默认返回 allow（执行器的权限模式规则优先于工具自定义检查） */
  checkPermissions?(input: Input, context: ToolUseContext): PermissionResult;

  // === 其他 ===

  /** 最大结果字符数限制（默认 100,000，超过时截断并标记 metadata） */
  maxResultSizeChars?: number;
  /** 中断行为（默认 'cancel' — 中断时取消执行；'block' 等待工具自行处理） */
  interruptBehavior?(): 'cancel' | 'block';
  /** 分类器投影（可选，P16-B 前置 — 从工具投影出分类器所需的信息） */
  toAutoClassifierInput?(input: Input): ToolClassifierInput;
  /** P41: 是否要求用户交互（bypass-immune — 即使 bypass/auto 模式也必须用户交互） */
  requiresUserInteraction?(input: Input): boolean;

  // === ToolSearch 元数据（P54 — 工具搜索发现引擎） ===

  /**
   * 是否延迟加载（默认 false — 工具默认不延迟）
   *
   * 延迟加载的工具不在初始化时发送给 LLM，而是通过 ToolSearch 按需发现。 MCP 工具默认延迟，alwaysLoad=true 的工具从不延迟。
   */
  shouldDefer?: boolean;
  /**
   * 搜索提示词（可选 — 用于 ToolSearch 关键词匹配）
   *
   * 当工具名称不够直观时，提供额外的搜索关键词。 例如: 'notebook jupyter cell' 用于 NotebookEditTool
   */
  searchHint?: string;
  /**
   * 是否始终加载（默认 false — 延迟工具在搜索发现后才加载）
   *
   * alwaysLoad=true 的工具即使 shouldDefer=true 也不会被延迟。 核心工具（如 Bash, FileRead, Edit）应设为 alwaysLoad=true。
   */
  alwaysLoad?: boolean;
}

/**
 * 构建完成后的工具（所有字段都有值，默认值已填充）
 *
 * buildTool() 从 ToolDef 生成 BuiltTool，填充所有可选字段的默认值 BuiltTool 的所有字段都是必填的 readonly，保证使用时无需检查 undefined
 */
export interface BuiltTool<Input = unknown, Output = unknown> {
  /** 工具名称 */
  readonly name: string;
  /** 工具别名 */
  readonly aliases: string[];
  /** 输入 Schema（已解析，始终是 Zod schema 对象） */
  readonly inputSchema: z.ZodType<Input>;
  /** 工具执行函数 */
  readonly call: (args: Input, context: ToolUseContext) => Promise<ToolResult<Output>>;
  /** 工具描述 */
  readonly description: (input: Input, options?: ToolCallOptions) => Promise<string>;
  /** 是否允许并发执行（已填充默认值: () => false） */
  readonly isConcurrencySafe: (input: Input) => boolean;
  /** 是否只读操作（已填充默认值: () => false） */
  readonly isReadOnly: (input: Input) => boolean;
  /** 是否破坏性操作（已填充默认值: () => false） */
  readonly isDestructive: (input: Input) => boolean;
  /** 是否启用（已填充默认值: () => true） */
  readonly isEnabled: () => boolean;
  /** 安全标签（已填充默认值: () => 'system'） */
  readonly safetyLabel: (input: Input) => SafetyLabel;
  /** 自定义输入验证（已填充默认值: () => ({ behavior: 'allow' })） */
  readonly validateInput: (input: Input, context: ToolUseContext) => ValidationResult;
  /** 权限检查（已填充默认值: () => ({ behavior: 'allow' })） */
  readonly checkPermissions: (input: Input, context: ToolUseContext) => PermissionResult;
  /** 最大结果字符数限制（已填充默认值: 100,000） */
  readonly maxResultSizeChars: number;
  /** 中断行为（已填充默认值: () => 'cancel'） */
  readonly interruptBehavior: () => 'cancel' | 'block';
  /** 分类器投影（已填充默认值，P16-B 前置接口） */
  readonly toAutoClassifierInput: (input: unknown) => ToolClassifierInput;
  /** P41: 是否要求用户交互（已填充默认值: () => false） */
  readonly requiresUserInteraction: (input: Input) => boolean;
  /** P54: 是否延迟加载（已填充默认值: false） */
  readonly shouldDefer: boolean;
  /** P54: 搜索提示词（已填充默认值: ''） */
  readonly searchHint: string;
  /** P54: 是否始终加载（已填充默认值: false） */
  readonly alwaysLoad: boolean;
}
