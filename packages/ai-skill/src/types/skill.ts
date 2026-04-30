/** Skill 核心类型定义 */

import type { HookEvent, HookHandler } from '@suga/ai-hooks';
import type { ToolRegistry } from '@suga/ai-tool-core';

/**
 * Skill 注册定义
 *
 * 每个 Skill 是一个 slash command 的底层实现:
 *
 * - 用户通过 /skill-name 调用
 * - LLM 通过 SkillTool 桥接调用
 * - getPromptForCommand 生成 prompt 文本注入对话
 * - hooks 可随 skill 动态注入到 HookRegistry
 */
export interface SkillDefinition {
  /** 唯一标识（如 "commit"、"debug"） */
  readonly name: string;
  /** 描述（给 LLM 和用户看的） */
  readonly description: string;
  /** 别名（如 ["review-pr"]） */
  readonly aliases?: string[];
  /** 参数提示（如 "<instruction>"） */
  readonly argumentHint?: string;
  /** 详细使用场景描述 */
  readonly whenToUse?: string;
  /** 限制 skill 可使用的工具集 */
  readonly allowedTools?: string[];
  /** 模型覆盖 */
  readonly model?: string;
  /** 禁止模型主动调用（仅用户可触发） */
  readonly disableModelInvocation?: boolean;
  /** 用户是否可通过 /skill-name 调用（默认 true） */
  readonly userInvocable?: boolean;
  /** 动态启停 */
  readonly isEnabled?: () => boolean;
  /** skill 携带的 hook 配置 */
  readonly hooks?: HooksSettings;
  /** 执行上下文: inline=当前会话, fork=创建子代理 */
  readonly context?: 'inline' | 'fork';
  /** Skill prompt 生成函数 */
  readonly getPromptForCommand: (
    args: string,
    context: SkillExecutionContext
  ) => Promise<SkillPromptResult>;
}

/**
 * Skill prompt 生成结果
 *
 * getPromptForCommand 的返回值，包含 prompt 文本和可选的上下文修改
 */
export interface SkillPromptResult {
  /** prompt 文本内容 */
  readonly content: string;
  /** 上下文修改（可选） */
  readonly contextModifier?: SkillContextModifier;
}

/**
 * Skill 上下文修改
 *
 * skill 可通过此接口动态调整对话上下文:
 *
 * - allowedTools: 限制可用工具集
 * - model: 覆盖模型
 * - hooks: 注入临时 hook 配置
 */
export interface SkillContextModifier {
  /** 限制可用工具集 */
  readonly allowedTools?: string[];
  /** 模型覆盖 */
  readonly model?: string;
  /** 动态注入的 hook 配置 */
  readonly hooks?: HooksSettings;
}

/** Skill 运行时上下文 — 传递给 getPromptForCommand */
export interface SkillExecutionContext {
  /** 当前会话 ID */
  readonly sessionId: string;
  /** 工具注册表 */
  readonly toolRegistry: ToolRegistry;
  /** Hook 注册表（可选） */
  readonly hookRegistry?: import('@suga/ai-hooks').HookRegistry;
  /** 中断信号 */
  readonly abortSignal: AbortSignal;
  /** 阶段间共享数据 */
  readonly meta: Record<string, unknown>;
}

/**
 * Skill 携带的 hook 配置 — 简化格式
 *
 * 每个 SkillHookConfig 可直接转换为 P4 的 HookDefinition 并注册到 HookRegistry
 */
export interface SkillHookConfig {
  /** 触发事件类型 */
  readonly event: HookEvent;
  /** 工具名称匹配模式 */
  readonly matcher?: string;
  /** hook 处理函数 */
  readonly handler: HookHandler;
}

/** Skill 的 hook 配置集合 */
export type HooksSettings = SkillHookConfig[];

/** Skill 名称合法正则 与 P0 TOOL_NAME_PATTERN 对齐但允许大写（如 "Commit"、"Debug"） */
export const SKILL_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
