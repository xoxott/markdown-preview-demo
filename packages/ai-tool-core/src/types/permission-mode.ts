/** 权限模式定义（Permission Mode） 6种权限模式及其分类转换 */

/**
 * 权限模式 — 控制工具执行时的权限决策策略
 *
 * - default: 默认交互模式，通过 checkPermissions 决策
 * - plan: 计划模式，只允许只读和搜索工具
 * - acceptEdits: 接受编辑模式，允许文件写入但禁止 Bash 等危险操作
 * - bypassPermissions: 绕过所有权限检查（危险，仅用于内部测试）
 * - auto: 自动模式，只读工具自动允许
 * - restricted: 受限模式，只允许只读工具
 * - dontAsk: 静默拒绝模式，将所有 ask 转为 deny（参考 Claude Code 的 dontAsk）
 */
export type PermissionMode =
  | 'default'
  | 'plan'
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'auto'
  | 'restricted'
  | 'dontAsk';

/**
 * 权限模式分类 — 将 7 种模式归入 5 类，用于决策逻辑
 *
 * - interactive: 需要用户交互确认（default, plan, acceptEdits）
 * - autoapprove: 自动批准部分操作（auto）
 * - restricted: 严格限制（restricted）
 * - bypass: 绕过所有权限（bypassPermissions）
 * - silentDeny: 静默拒绝所有询问（dontAsk）
 */
export type PermissionModeCategory =
  | 'interactive'
  | 'autoapprove'
  | 'restricted'
  | 'bypass'
  | 'silentDeny';

/** 所有合法权限模式值 */
export const PERMISSION_MODES: readonly PermissionMode[] = [
  'default',
  'plan',
  'acceptEdits',
  'bypassPermissions',
  'auto',
  'restricted',
  'dontAsk'
];

/** 计划模式允许的工具白名单 */
export const PLAN_MODE_ALLOWED_TOOLS: readonly string[] = [
  'read',
  'glob',
  'ls',
  'search',
  'list-dir',
  'file-read',
  'file-search',
  'file-tree'
];

/** 接受编辑模式禁止的工具黑名单 */
export const ACCEPT_EDITS_DENIED_TOOLS: readonly string[] = [
  'bash',
  'shell',
  'terminal',
  'execute',
  'command'
];

/**
 * acceptEdits 快速路径白名单 — 分类器前确定性安全工具
 *
 * 参考 Claude Code 的 acceptEdits 快速路径: 在调用分类器之前，对已知安全工具（如文件读取/搜索）做确定性 allow， 避免昂贵的分类器 API 调用。
 *
 * 当 acceptEdits 模式的工具在此白名单中且 checkPermissions 返回 allow 时， 可直接 allow，无需走分类器或用户确认。
 */
export const ACCEPT_EDITS_FAST_PATH_TOOLS: readonly string[] = [
  'read',
  'glob',
  'ls',
  'grep',
  'search',
  'list-dir',
  'file-read',
  'file-search',
  'file-tree'
];

/**
 * 分类器安全白名单 — 不需要 AI 分类器评估的确定性安全工具
 *
 * 参考 Claude Code 的 SAFE_YOLO_ALLOWLISTED_TOOLS: 在 auto 模式下，对确定性安全工具（只读文件、任务管理、交互UI） 直接
 * allow，跳过分类器评估。
 */
export const CLASSIFIER_SAFE_ALLOWLIST: readonly string[] = [
  'read',
  'glob',
  'ls',
  'grep',
  'search',
  'todo-write',
  'task-create',
  'task-get',
  'task-update',
  'task-list',
  'task-stop',
  'ask-user',
  'enter-plan',
  'exit-plan',
  'sleep',
  'team-create',
  'send-message'
];

/**
 * 分类权限模式 — 将 6 种模式归入 4 类
 *
 * @param mode 权限模式
 * @returns 模式分类
 */
export function classifyPermissionMode(mode: PermissionMode): PermissionModeCategory {
  switch (mode) {
    case 'default':
    case 'plan':
    case 'acceptEdits':
      return 'interactive';
    case 'auto':
      return 'autoapprove';
    case 'restricted':
      return 'restricted';
    case 'bypassPermissions':
      return 'bypass';
    case 'dontAsk':
      return 'silentDeny';
    default:
      return 'interactive';
  }
}

/**
 * 是否需要用户交互确认
 *
 * interactive 模式下，某些操作需要用户确认才能执行。
 */
export function isInteractiveMode(mode: PermissionMode): boolean {
  return classifyPermissionMode(mode) === 'interactive';
}

/**
 * 是否自动批准只读操作
 *
 * autoapprove 模式下，只读工具自动允许，写操作仍需检查。
 */
export function isAutoApproveReadonlyMode(mode: PermissionMode): boolean {
  return classifyPermissionMode(mode) === 'autoapprove';
}

/** 是否为受限模式 — 仅允许只读工具 */
export function isRestrictedMode(mode: PermissionMode): boolean {
  return mode === 'restricted';
}

/** 是否绕过所有权限检查 */
export function isBypassMode(mode: PermissionMode): boolean {
  return mode === 'bypassPermissions';
}

/** 是否静默拒绝模式 — dontAsk 将所有 ask 转为 deny */
export function isSilentDenyMode(mode: PermissionMode): boolean {
  return mode === 'dontAsk';
}

/** 是否应避免权限提示 — headless agent 或 dontAsk 模式 */
export function shouldAvoidPermissionPrompts(mode: PermissionMode): boolean {
  return mode === 'dontAsk' || classifyPermissionMode(mode) === 'silentDeny';
}

/**
 * 判断工具名是否在计划模式白名单中
 *
 * 白名单外的工具在 plan 模式下被拒绝。
 */
export function isPlanModeAllowedTool(toolName: string): boolean {
  return PLAN_MODE_ALLOWED_TOOLS.some(pattern => {
    if (pattern === toolName) return true;
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return regex.test(toolName);
  });
}

/**
 * 判断工具名是否在接受编辑模式黑名单中
 *
 * 黑名单内的工具在 acceptEdits 模式下被拒绝。
 */
export function isAcceptEditsDeniedTool(toolName: string): boolean {
  return ACCEPT_EDITS_DENIED_TOOLS.some(pattern => {
    if (pattern === toolName) return true;
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return regex.test(toolName);
  });
}

/**
 * 判断工具名是否在 acceptEdits 快速路径白名单中
 *
 * 快速路径白名单中的工具在 acceptEdits 模式下可跳过分类器， 通过 checkPermissions 确定性 allow。
 */
export function isAcceptEditsFastPathTool(toolName: string): boolean {
  return ACCEPT_EDITS_FAST_PATH_TOOLS.some(pattern => {
    if (pattern === toolName) return true;
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return regex.test(toolName);
  });
}

/**
 * 判断工具名是否在分类器安全白名单中
 *
 * 分类器安全白名单中的工具在 auto 模式下可跳过分类器， 确定性安全（只读/任务管理/交互UI）。
 */
export function isClassifierSafeTool(toolName: string): boolean {
  return CLASSIFIER_SAFE_ALLOWLIST.some(pattern => {
    if (pattern === toolName) return true;
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return regex.test(toolName);
  });
}
