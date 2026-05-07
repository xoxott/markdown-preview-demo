/**
 * REPLTool 常量与判定
 *
 * 对齐 CC tools/REPLTool/constants.ts。当 REPL 模式启用时，原始工具
 * （Read/Write/Edit/Glob/Grep/Bash/NotebookEdit/Agent）从模型直接可用列表中隐藏， 模型必须通过 REPL 工具进行批量操作。
 */

export const REPL_TOOL_NAME = 'REPL';

/** REPL 模式下隐藏的工具名集合（仅 REPL 内部可访问） */
export const REPL_ONLY_TOOLS: ReadonlySet<string> = new Set([
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'Bash',
  'NotebookEdit',
  'Task',
  'Agent',
  'file_read',
  'file_write',
  'file_edit',
  'glob',
  'grep',
  'bash',
  'notebook_edit',
  'task',
  'agent'
]);

/**
 * REPL 模式启用判断（由宿主调用，传入环境变量配置）
 *
 * 默认规则：
 *
 * - 显式 `CLAUDE_CODE_REPL=0` -> 禁用
 * - 显式 `CLAUDE_REPL_MODE=1` -> 强制启用
 * - ant 用户在交互式 CLI 模式 -> 默认启用
 * - 其它情况 -> 禁用
 *
 * @param env 环境变量映射
 * @returns 是否启用 REPL 模式
 */
export function isReplModeEnabled(env: Record<string, string | undefined>): boolean {
  const replFlag = env.CLAUDE_CODE_REPL;
  if (replFlag === '0' || replFlag === 'false') return false;

  const legacyFlag = env.CLAUDE_REPL_MODE;
  if (legacyFlag === '1' || legacyFlag === 'true') return true;

  return env.USER_TYPE === 'ant' && env.CLAUDE_CODE_ENTRYPOINT === 'cli';
}

/** 判断工具名是否为 REPL only（启用 REPL 模式时应被隐藏） */
export function isReplOnlyTool(toolName: string): boolean {
  return REPL_ONLY_TOOLS.has(toolName);
}

/**
 * 在工具列表中过滤掉 REPL only 工具
 *
 * @param tools 工具名数组
 * @param replEnabled 当前 REPL 模式是否启用
 * @returns 过滤后的工具列表（REPL 启用时移除 REPL only 工具）
 */
export function filterReplOnlyTools(
  tools: readonly string[],
  replEnabled: boolean
): readonly string[] {
  if (!replEnabled) return tools;
  return tools.filter(name => !REPL_ONLY_TOOLS.has(name));
}
