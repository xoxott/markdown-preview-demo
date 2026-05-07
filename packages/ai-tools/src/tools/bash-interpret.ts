/**
 * G25: interpretCommandResult — Bash 命令退出码语义解释
 *
 * 对齐 Claude Code interpretCommandResult:
 *
 * 将 exitCode + stderr + timedOut 转为人类可读的状态描述， 帮助 LLM 理解命令执行结果。
 */

/** 命令结果语义 */
export interface CommandResultInterpretation {
  /** 状态分类 */
  readonly status:
    | 'success'
    | 'permission_denied'
    | 'command_not_found'
    | 'timeout'
    | 'signal_killed'
    | 'syntax_error'
    | 'general_failure';
  /** 人类可读描述 */
  readonly description: string;
  /** 建议操作（可选） */
  readonly suggestion?: string;
}

/**
 * interpretCommandResult — 从 exitCode/stderr/timedOut 解释命令结果
 *
 * 常见 exitCode 语义:
 *
 * - 0 → 成功
 * - 1 → 一般错误
 * - 2 → shell 语法错误/命令使用错误
 * - 126 → 权限被拒绝（命令不可执行）
 * - 127 → 命令未找到
 * - 128+N → 被 signal N 杀死（如 128+9=137 = SIGKILL）
 * - -1 → 超时（@suga 约定）
 */
export function interpretCommandResult(
  exitCode: number,
  stderr?: string,
  timedOut?: boolean
): CommandResultInterpretation {
  // 超时
  if (timedOut || exitCode === -1) {
    return {
      status: 'timeout',
      description: 'Command timed out',
      suggestion: 'Increase timeout or optimize the command'
    };
  }

  // 成功
  if (exitCode === 0) {
    return {
      status: 'success',
      description: 'Command completed successfully'
    };
  }

  // 信号杀死 (128+N)
  if (exitCode > 128) {
    const signal = exitCode - 128;
    const signalNames: Record<number, string> = {
      1: 'SIGHUP',
      2: 'SIGINT',
      3: 'SIGQUIT',
      6: 'SIGABRT',
      9: 'SIGKILL',
      11: 'SIGSEGV',
      13: 'SIGPIPE',
      15: 'SIGTERM'
    };
    const name = signalNames[signal] ?? `signal ${signal}`;
    return {
      status: 'signal_killed',
      description: `Process killed by ${name} (exit code ${exitCode})`,
      suggestion:
        signal === 9 ? 'Process was force-killed (SIGKILL)' : 'Process received termination signal'
    };
  }

  // 命令未找到
  if (exitCode === 127) {
    return {
      status: 'command_not_found',
      description: 'Command not found',
      suggestion: 'Check if the command is installed and in PATH'
    };
  }

  // 权限被拒绝
  if (exitCode === 126) {
    return {
      status: 'permission_denied',
      description: 'Permission denied — command not executable',
      suggestion: 'Check file permissions (chmod +x) or run with appropriate privileges'
    };
  }

  // Shell 语法错误
  if (exitCode === 2) {
    return {
      status: 'syntax_error',
      description: 'Shell syntax error or command misuse',
      suggestion: 'Check command syntax and arguments'
    };
  }

  // 一般错误 — 尝试从 stderr 提取更多信息
  const generalDescription = stderr
    ? `Command failed (exit code ${exitCode}): ${stderr.substring(0, 200)}`
    : `Command failed with exit code ${exitCode}`;

  return {
    status: 'general_failure',
    description: generalDescription
  };
}
