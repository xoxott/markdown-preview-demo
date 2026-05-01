/** 权限规则类型定义（Permission Rule Types） 规则来源、规则值、规则接口和匹配逻辑 */

/**
 * 权限规则来源 — 8种来源标记
 *
 * 参考 Claude Code 的 PermissionRuleSource:
 *
 * - user: 用户交互式审批产生
 * - project: 项目级 settings.json (.claude/settings.json)
 * - local: 本地/用户级 settings.json (~/.claude/settings.json)
 * - policy: 企业策略文件（MDM managed）
 * - flag: CLI flag (--dangerously-skip-permissions 等)
 * - cliArg: CLI 参数 (--permission-mode=auto 等)
 * - command: 命令式 API 调用
 * - session: 会话级临时规则（运行时动态添加）
 */
export type PermissionRuleSource =
  | 'user'
  | 'project'
  | 'local'
  | 'policy'
  | 'flag'
  | 'cliArg'
  | 'command'
  | 'session';

/**
 * 权限规则值 — 细粒度工具匹配表达式
 *
 * 支持格式:
 *
 * - 纯工具名: "Write", "Read", "Bash"
 * - 工具名+命令模式: "Bash(git push:*)", "Bash(npm test)"
 * - 通配符: "fs-*", "Bash(git _)", "_"
 *
 * 参考 Claude Code 的 PermissionRuleValue， Bash 工具的细粒度规则格式为 `Bash(command_pattern)`， 其中
 * command_pattern 支持通配符。
 */
export type PermissionRuleValue = string;

/** 规则行为判别标记 */
export type PermissionRuleBehavior = 'allow' | 'deny' | 'ask';

/** 权限允许规则 */
export interface PermissionAllowRule {
  /** 行为判别标记 */
  readonly behavior: 'allow';
  /** 规则匹配值（工具名/工具名+命令模式/通配符） */
  readonly ruleValue: PermissionRuleValue;
  /** 规则来源 */
  readonly source: PermissionRuleSource;
  /** 允许原因（可选，用于审计日志） */
  readonly reason?: string;
}

/** 权限拒绝规则 */
export interface PermissionDenyRule {
  /** 行为判别标记 */
  readonly behavior: 'deny';
  /** 规则匹配值 */
  readonly ruleValue: PermissionRuleValue;
  /** 规则来源 */
  readonly source: PermissionRuleSource;
  /** 拒绝原因 */
  readonly reason: string;
}

/** 权限询问规则 — 需要用户确认 */
export interface PermissionAskRule {
  /** 行为判别标记 */
  readonly behavior: 'ask';
  /** 规则匹配值 */
  readonly ruleValue: PermissionRuleValue;
  /** 规则来源 */
  readonly source: PermissionRuleSource;
  /** 询问原因（可选） */
  readonly reason?: string;
}

/** 权限规则联合类型 */
export type PermissionRule = PermissionAllowRule | PermissionDenyRule | PermissionAskRule;

/** parsePermissionRuleValue 解析结果 */
export interface ParsedPermissionRuleValue {
  /** 工具名称 */
  readonly toolName: string;
  /** 命令模式（仅 Bash 等命令类工具有，如 "git push:*"） */
  readonly commandPattern?: string;
}

/**
 * 解析权限规则值 — 将 "Bash(git push:*)" 解析为结构化数据
 *
 * 格式规则:
 *
 * - "Bash(git push:_)" → { toolName: 'Bash', commandPattern: 'git push:_' }
 * - "Write" → { toolName: 'Write', commandPattern: undefined }
 * - "fs-_" → { toolName: 'fs-_', commandPattern: undefined }
 * - "_" → { toolName: '_', commandPattern: undefined }
 *
 * @param ruleValue 规则值字符串
 * @returns 解析结果
 */
export function parsePermissionRuleValue(
  ruleValue: PermissionRuleValue
): ParsedPermissionRuleValue {
  // 匹配 ToolName(commandPattern) 格式
  const match = ruleValue.match(/^([A-Za-z][A-Za-z0-9_-]*)\((.+)\)$/);
  if (match) {
    return {
      toolName: match[1],
      commandPattern: match[2]
    };
  }

  return {
    toolName: ruleValue,
    commandPattern: undefined
  };
}

/**
 * 匹配权限规则值 — 判断工具名+输入是否匹配规则值
 *
 * 匹配逻辑:
 *
 * 1. 纯工具名/通配符: 用通配符模式匹配工具名
 * 2. 工具名+命令模式: 先匹配工具名，再匹配命令字符串
 *
 * @param ruleValue 规则值
 * @param toolName 工具名称
 * @param toolInput 工具输入（可选，用于命令模式匹配）
 * @returns 是否匹配
 */
export function matchPermissionRuleValue(
  ruleValue: PermissionRuleValue,
  toolName: string,
  toolInput?: unknown
): boolean {
  const parsed = parsePermissionRuleValue(ruleValue);

  // 工具名通配符匹配（大小写不敏感）
  if (!matchWildcard(parsed.toolName.toLowerCase(), toolName.toLowerCase())) {
    return false;
  }

  // 无命令模式 → 工具名匹配即成功
  if (parsed.commandPattern === undefined) {
    return true;
  }

  // 有命令模式 → 需要匹配命令字符串
  const commandStr = extractCommandString(toolInput);
  if (commandStr === undefined) {
    return false;
  }

  return matchWildcard(parsed.commandPattern, commandStr);
}

/**
 * 通配符模式匹配 — 支持 * 和 ? 通配符
 *
 * "fs-*" 匹配 "fs-read", "fs-write" "Bash(git _)" 匹配 "git push", "git pull" "_" 匹配所有名称
 *
 * @param pattern 含通配符的模式
 * @param value 要匹配的值
 * @returns 是否匹配
 */
export function matchWildcard(pattern: string, value: string): boolean {
  // 精确匹配快速路径
  if (pattern === value) return true;
  // 全匹配快速路径
  if (pattern === '*') return true;

  // 转换为正则: 先转义所有正则特殊字符，再替换通配符
  // 正则特殊字符: . \ ^ $ + { } [ ] | ( )
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义所有特殊字符
    .replace(/\*/g, '.*') // * → .* (通配符)
    .replace(/[?]/g, '.'); // ? → . (单字符通配)
  return new RegExp(`^${escaped}$`).test(value);
}

/**
 * 从工具输入中提取命令字符串
 *
 * Bash 工具的输入格式: { command: "git push origin main" } 其他工具的输入不包含 command 字段。
 *
 * @param toolInput 工具输入
 * @returns 命令字符串，或 undefined
 */
function extractCommandString(toolInput: unknown): string | undefined {
  if (toolInput === undefined || toolInput === null) return undefined;
  if (typeof toolInput === 'string') return toolInput;
  if (typeof toolInput === 'object' && toolInput !== null) {
    const input = toolInput as Record<string, unknown>;
    if (typeof input.command === 'string') return input.command;
  }
  return undefined;
}
