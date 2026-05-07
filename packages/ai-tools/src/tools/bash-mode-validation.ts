/**
 * Bash modeValidation — 权限模式相关的命令验证
 *
 * 对齐 CC tools/BashTool/modeValidation.ts。在 `acceptEdits` 模式下，
 * 自动允许常见的文件系统操作（mkdir/touch/rm/cp/mv/sed），不再触发 ask。
 */

/** 在 acceptEdits 模式下自动允许的文件系统命令 */
export const ACCEPT_EDITS_ALLOWED_COMMANDS = [
  'mkdir',
  'touch',
  'rm',
  'rmdir',
  'mv',
  'cp',
  'sed'
] as const;

export type FilesystemCommand = (typeof ACCEPT_EDITS_ALLOWED_COMMANDS)[number];

/** 判断 base 命令是否为文件系统命令 */
export function isFilesystemCommand(command: string): command is FilesystemCommand {
  return ACCEPT_EDITS_ALLOWED_COMMANDS.includes(command as FilesystemCommand);
}

/** Permission Mode（权限模式） */
export type PermissionMode = 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions' | 'dontAsk';

/** 验证结果 */
export interface BashModeValidationResult {
  readonly behavior: 'allow' | 'ask' | 'deny' | 'passthrough';
  readonly message?: string;
  readonly decisionReason?: { type: 'mode'; mode: PermissionMode };
}

/**
 * 在指定权限模式下验证单个 bash 命令片段
 *
 * 仅处理 mode 相关的判断；不做权限规则匹配（由调用方完成）。
 *
 * @returns
 *
 *   - `allow`：模式自动批准（如 acceptEdits + 文件系统命令）
 *   - `passthrough`：模式不影响判定，由调用方继续后续验证
 */
export function validateCommandForMode(
  cmd: string,
  mode: PermissionMode
): BashModeValidationResult {
  const trimmedCmd = cmd.trim();
  const [baseCmd] = trimmedCmd.split(/\s+/);

  if (!baseCmd) {
    return { behavior: 'passthrough', message: 'Base command not found' };
  }

  // bypassPermissions 模式 — 全部放行
  if (mode === 'bypassPermissions') {
    return {
      behavior: 'allow',
      decisionReason: { type: 'mode', mode }
    };
  }

  // acceptEdits 模式 — 自动允许文件系统命令
  if (mode === 'acceptEdits' && isFilesystemCommand(baseCmd)) {
    return {
      behavior: 'allow',
      decisionReason: { type: 'mode', mode }
    };
  }

  // plan 模式 — 拒绝所有可能修改的命令
  if (mode === 'plan') {
    if (isFilesystemCommand(baseCmd)) {
      return {
        behavior: 'deny',
        message: `Plan mode does not allow ${baseCmd} commands`,
        decisionReason: { type: 'mode', mode }
      };
    }
  }

  return { behavior: 'passthrough' };
}

/**
 * 批量验证 — 任一片段被拒绝则整体拒绝；任一需要 ask 则整体 ask
 *
 * @param subcommands 复合命令拆分后的子命令数组
 */
export function validateCompoundCommandForMode(
  subcommands: readonly string[],
  mode: PermissionMode
): BashModeValidationResult {
  let allAllowed = true;

  for (const sub of subcommands) {
    const result = validateCommandForMode(sub, mode);
    if (result.behavior === 'deny') {
      return result;
    }
    if (result.behavior === 'ask') {
      return result;
    }
    if (result.behavior !== 'allow') {
      allAllowed = false;
    }
  }

  if (allAllowed) {
    return { behavior: 'allow', decisionReason: { type: 'mode', mode } };
  }
  return { behavior: 'passthrough' };
}
