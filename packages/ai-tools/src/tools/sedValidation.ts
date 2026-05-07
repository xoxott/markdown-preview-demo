/**
 * G7: sed 命令安全验证 — allowlist/denylist + 约束检查
 *
 * 对齐 Claude Code BashTool/sedValidation.ts:
 *
 * 1. checkSedConstraints — 交叉约束检查（阻断危险操作）
 * 2. sedCommandIsAllowedByAllowlist — allowlist 安全模式
 * 3. containsDangerousOperations — denylist 危险模式
 *
 * 验证流程: 先 denylist → 再 allowlist → 最后约束
 */

import type { SedEditInfo } from './sedEditParser';

// ============================================================
// 1. sed 命令约束检查
// ============================================================

/** sed 约束检查结果 */
export interface SedConstraintResult {
  /** 是否通过约束检查 */
  readonly allowed: boolean;
  /** 原因（如果不允许） */
  readonly reason?: string;
}

/**
 * checkSedConstraints — 交叉约束检查
 *
 * 无论拦截模式如何，以下操作总是被阻断:
 *
 * - w/W 命令（写入文件）
 * - e/E 命令（执行 shell 命令）
 */
export function checkSedConstraints(info: SedEditInfo): SedConstraintResult {
  const pattern = info.pattern;
  const flags = info.flags;

  // 检查 w 命令（写入外部文件）
  if (pattern.includes('w') || flags.includes('w')) {
    return {
      allowed: false,
      reason: 'sed w command writes to external files — blocked for security'
    };
  }

  // 检查 e 命令（执行 shell）
  if (pattern.includes('e') || flags.includes('e')) {
    return {
      allowed: false,
      reason: 'sed e command executes shell commands — blocked for security'
    };
  }

  return { allowed: true };
}

// ============================================================
// 2. Allowlist 安全模式
// ============================================================

/**
 * sedCommandIsAllowedByAllowlist — 判断 sed 替换表达式是否在安全 allowlist 内
 *
 * 安全 sed 操作:
 *
 * - s 命令（替换）
 *
 *   - 纯文本替换（pattern 无正则特殊字符）
 *   - 简单正则替换（常见量词 . * ^ $ 等）
 *
 * 不安全:
 *
 * - d 命令（删除行）
 * - y 命令（字符转换）
 * - p 命令（打印行 — 除非用 -n）
 * - a/i/c 命令（追加/插入/修改）
 */
export function sedCommandIsAllowedByAllowlist(info: SedEditInfo): boolean {
  // 只有 s 命令在 allowlist 内
  // SedEditInfo 已经确认是 s 命令（parseSedEditCommand 只解析 s 命令）

  // 检查 pattern 不包含过于复杂的正则
  // 允许: 纯文本、简单锚点、常见量词、简单分组
  const pattern = info.pattern;

  // 排除前瞻/后顾断言（JS 和扩展正则特有）
  if (pattern.includes('(?') || pattern.includes('(?=')) return false;

  // 排除超长 pattern（可能为恶意构造）
  if (pattern.length > 500) return false;

  // 排除包含非 ASCII 字符（可能为 unicode 绕过）
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(pattern)) return false;

  return true;
}

// ============================================================
// 3. Denylist 危险模式
// ============================================================

/** 危险操作检测结果 */
export interface DangerousOperationsResult {
  /** 是否包含危险操作 */
  readonly hasDangerous: boolean;
  /** 检测到的危险操作列表 */
  readonly reasons: string[];
}

/**
 * containsDangerousOperations — 检测 sed 命令中的危险操作
 *
 * 危险模式:
 *
 * - 非替换命令 (d/y/p/a/i/c 等)
 * - w 命令（写入外部文件）
 * - e 命令（执行 shell）
 * - 命令分隔符 ; 后跟非 s 命令
 * - 包含 shell 命令执行
 * - 包含 \x00-\x1f 控制字符
 */
export function containsDangerousOperations(originalCommand: string): DangerousOperationsResult {
  const reasons: string[] = [];
  const trimmed = originalCommand.trim();

  // 检查 w/W 命令
  if (/[swW]\s+\S+/.test(trimmed) || /\bw\b/.test(trimmed)) {
    reasons.push('w command: writes to external file');
  }

  // 检查 e/E 命令
  if (/\be\b/.test(trimmed)) {
    reasons.push('e command: executes shell command');
  }

  // 检查非 s 命令（在表达式内）
  // sed 表达式不以 s 开头 → d/p/y/a/i/c 等非替换命令
  // 提取所有引号内的表达式
  const allExprMatches = [...trimmed.matchAll(/'([^']+)'/g), ...trimmed.matchAll(/"([^"]+)"/g)];
  // 也检查 -e 后的表达式（可能无引号）
  const eExprMatches = [...trimmed.matchAll(/\be\s+(\S+)/g)];
  const expressions = [...allExprMatches.map(m => m[1]), ...eExprMatches.map(m => m[1])];

  // 如果无引号表达式且命令格式为 sed ... 'expr' file，也提取裸表达式
  if (expressions.length === 0) {
    // 尝试提取最后一个非文件、非flag的token
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      if (token.length >= 2 && token[0] === 's' && !/[a-zA-Z0-9]/.test(token[1])) {
        expressions.push(token);
      }
      // 非 s 命令：d/p/y/a/i/c 等
      if (/^[0-9]*[dpyaicqPDNgGhHxrRln]$/.test(token)) {
        reasons.push(`non-substitution command '${token}': potential data modification`);
      }
    }
  }

  for (const expr of expressions) {
    // 多命令分隔（分号）
    const subExprs = expr.split(';');
    for (const subExpr of subExprs) {
      const trimmedSub = subExpr.trim();
      if (!trimmedSub) continue;
      // 去掉地址前缀（行号或行范围如 3,5 或 /pattern/）
      // 地址可以是: 数字, /regex/, 数字,数字 等
      const cmdOnly = trimmedSub.replace(/^(\d+|\d+,\d+|\/[^/]*\/|\\[^\\]*\\)\s*/, '');
      if (cmdOnly && cmdOnly[0] !== 's') {
        const cmdChar = cmdOnly[0];
        if (
          [
            'd',
            'p',
            'y',
            'a',
            'i',
            'c',
            'q',
            'P',
            'D',
            'N',
            'g',
            'G',
            'h',
            'H',
            'x',
            'r',
            'R',
            'l',
            'n'
          ].includes(cmdChar)
        ) {
          reasons.push(`non-substitution command '${cmdChar}': potential data modification`);
        }
      }
    }
  }

  // 检查控制字符
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(trimmed)) {
    reasons.push('contains control characters');
  }

  // 检查 curly braces (sed 分组命令)
  if (/\{.*\}/.test(trimmed)) {
    reasons.push('curly brace grouping: complex command structure');
  }

  return {
    hasDangerous: reasons.length > 0,
    reasons
  };
}
