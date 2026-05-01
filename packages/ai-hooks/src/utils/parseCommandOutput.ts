/** Shell 命令输出解析 — JSON 解析 + fallback */

import type { HookOutcome, HookResult } from '../types/hooks';

/** Hook JSON 输出 schema — Claude Code 兼容格式 */
interface HookJsonOutput {
  /** 是否继续执行 */
  continue?: boolean;
  /** 是否抑制输出 */
  suppressOutput?: boolean;
  /** 权限决策 */
  decision?: 'approve' | 'block';
  /** 系统消息 */
  systemMessage?: string;
  /** 附加上下文 */
  additionalContext?: string;
  /** 修改后的输入（PreToolUse） */
  updatedInput?: Record<string, unknown>;
  /** 修改后的输出（PostToolUse） */
  updatedMCPToolOutput?: unknown;
  /** 阻止原因 */
  reason?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * parseCommandOutput — 解析 Shell 命令输出并映射到 HookResult
 *
 * 解析策略：
 *
 * 1. 优先尝试 JSON 解析（Claude Code 兼容格式）
 * 2. JSON 解析失败 → fallback 纯文本映射
 * 3. exit code 映射：0=success, 2=blocking, 其他=non_blocking_error
 *
 * @param stdout — Shell 命令标准输出
 * @param stderr — Shell 命令标准错误输出
 * @param exitCode — Shell 命令退出码
 */
export function parseCommandOutput(stdout: string, stderr: string, exitCode: number): HookResult {
  // exit code 2 → blocking（Claude Code 语义）
  if (exitCode === 2) {
    return {
      outcome: 'blocking',
      stopReason: stderr.trim() || stdout.trim() || 'Hook 命令返回 blocking (exit code 2)',
      preventContinuation: true
    };
  }

  // exit code 0 → 尝试 JSON 解析
  if (exitCode === 0) {
    const jsonResult = tryParseHookJson(stdout);
    if (jsonResult !== undefined) {
      return mapHookJsonToResult(jsonResult);
    }

    // fallback: 纯文本 → success with additionalContext
    const text = stdout.trim();
    if (text.length > 0) {
      return {
        outcome: 'success',
        additionalContext: text
      };
    }

    // 空输出 → success
    return { outcome: 'success' };
  }

  // 其他 exit code → non_blocking_error
  return {
    outcome: 'non_blocking_error',
    error: stderr.trim() || `Hook 命令退出码 ${exitCode}`,
    preventContinuation: false
  };
}

/** 尝试解析 Hook JSON 输出 */
function tryParseHookJson(stdout: string): HookJsonOutput | undefined {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) return undefined;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as HookJsonOutput;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** 映射 Hook JSON 输出到 HookResult */
function mapHookJsonToResult(json: HookJsonOutput): HookResult {
  // decision=block → blocking
  if (json.decision === 'block') {
    return {
      outcome: 'blocking',
      stopReason: json.reason || json.systemMessage || 'Hook 决策为 block',
      preventContinuation: true
    };
  }

  // continue=false → blocking
  if (json.continue === false) {
    return {
      outcome: 'blocking',
      stopReason: json.reason || json.systemMessage || 'Hook 决策为 continue=false',
      preventContinuation: true
    };
  }

  // 正常 success — 一次性构建 result，避免 readonly 属性赋值
  const additionalContext =
    json.additionalContext && json.systemMessage
      ? `${json.additionalContext}\n${json.systemMessage}`
      : json.additionalContext || json.systemMessage || undefined;

  const result: HookResult = {
    outcome: 'success' as HookOutcome,
    additionalContext,
    updatedInput: json.updatedInput,
    updatedOutput: json.updatedMCPToolOutput
  };

  return result;
}
