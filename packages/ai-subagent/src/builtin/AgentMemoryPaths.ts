/**
 * AgentMemoryScope — Agent 持久化记忆作用域
 *
 * 对齐 CC tools/AgentTool/agentMemory.ts，提供三种持久化记忆作用域:
 *
 * - user: ~/.claude/agent-memory/<agentType>/
 * - project: <cwd>/.claude/agent-memory/<agentType>/
 * - local: <cwd>/.claude/agent-memory-local/<agentType>/ (不入 VCS)
 *
 * 此模块只负责路径计算和 Scope 校验，实际文件读写由宿主提供的 fsProvider 执行。
 */

/** Agent 记忆作用域 */
export type AgentMemoryScope = 'user' | 'project' | 'local';

/** Agent 记忆配置 */
export interface AgentMemoryConfig {
  /** 用户级记忆基础目录（如 ~/.claude） */
  readonly userMemoryBaseDir: string;
  /** 当前工作目录（用于 project/local 作用域） */
  readonly cwd: string;
  /** 远程记忆挂载目录（CLAUDE_CODE_REMOTE_MEMORY_DIR），可选 */
  readonly remoteMemoryDir?: string;
  /** Git 项目根（用于远程 local 作用域路径命名空间），可选 */
  readonly projectRoot?: string;
}

/**
 * 路径分隔符 — 默认 POSIX 风格 `/`，宿主可在 Windows 使用 `\\`
 *
 * 不引入 Node.js path 模块，便于在浏览器/Worker 环境运行。
 */
const SEP = '/';

/** 清理 agentType 中的非法字符（冒号在 Windows 下不允许， 也用于 plugin-namespaced agent 类型 `plugin:agent` 的分隔）。 */
export function sanitizeAgentTypeForPath(agentType: string): string {
  return agentType.replace(/:/g, '-');
}

/** 移除路径中的 `.` 和 `..` 段，避免路径穿越 */
function sanitizePath(p: string): string {
  return p
    .split(/[/\\]/)
    .filter(seg => seg !== '' && seg !== '.' && seg !== '..')
    .join(SEP);
}

/**
 * 计算 local 作用域的 agent memory 目录
 *
 * - 如果设置了 remoteMemoryDir：<remote>/projects/<sanitized-projectRoot>/agent-memory-local/<dirName>/
 * - 否则：<cwd>/.claude/agent-memory-local/<dirName>/
 */
function getLocalAgentMemoryDir(dirName: string, config: AgentMemoryConfig): string {
  if (config.remoteMemoryDir) {
    const rootRef = config.projectRoot ?? config.cwd;
    return `${config.remoteMemoryDir}${SEP}projects${SEP}${sanitizePath(rootRef)}${SEP}agent-memory-local${SEP}${dirName}${SEP}`;
  }
  return `${config.cwd}${SEP}.claude${SEP}agent-memory-local${SEP}${dirName}${SEP}`;
}

/** 获取 agentType 在指定 scope 下的记忆目录绝对路径 */
export function getAgentMemoryDir(
  agentType: string,
  scope: AgentMemoryScope,
  config: AgentMemoryConfig
): string {
  const dirName = sanitizeAgentTypeForPath(agentType);
  switch (scope) {
    case 'project':
      return `${config.cwd}${SEP}.claude${SEP}agent-memory${SEP}${dirName}${SEP}`;
    case 'local':
      return getLocalAgentMemoryDir(dirName, config);
    case 'user':
    default:
      return `${config.userMemoryBaseDir}${SEP}agent-memory${SEP}${dirName}${SEP}`;
  }
}

/**
 * 判断绝对路径是否位于任意 scope 的 agent memory 目录下
 *
 * 用于权限校验 — 防止 agent 跨越自己的 memory 边界。
 */
export function isAgentMemoryPath(absolutePath: string, config: AgentMemoryConfig): boolean {
  const normalizedPath = absolutePath.replace(/\\/g, SEP);

  const userBase = `${config.userMemoryBaseDir}${SEP}agent-memory${SEP}`;
  const projectBase = `${config.cwd}${SEP}.claude${SEP}agent-memory${SEP}`;
  const localBase = `${config.cwd}${SEP}.claude${SEP}agent-memory-local${SEP}`;

  if (normalizedPath.startsWith(userBase)) return true;
  if (normalizedPath.startsWith(projectBase)) return true;
  if (normalizedPath.startsWith(localBase)) return true;

  if (config.remoteMemoryDir) {
    const remoteBase = `${config.remoteMemoryDir}${SEP}projects${SEP}`;
    if (normalizedPath.startsWith(remoteBase)) return true;
  }

  return false;
}

/**
 * 提取路径中的 agentType
 *
 * @returns agentType 字符串，如果路径不在任何 agent-memory 目录下则返回 null
 */
export function extractAgentTypeFromPath(
  absolutePath: string,
  config: AgentMemoryConfig
): string | null {
  const normalizedPath = absolutePath.replace(/\\/g, SEP);
  const candidates = [
    `${config.userMemoryBaseDir}${SEP}agent-memory${SEP}`,
    `${config.cwd}${SEP}.claude${SEP}agent-memory${SEP}`,
    `${config.cwd}${SEP}.claude${SEP}agent-memory-local${SEP}`
  ];

  for (const base of candidates) {
    if (normalizedPath.startsWith(base)) {
      const rest = normalizedPath.slice(base.length);
      const firstSlash = rest.indexOf(SEP);
      return firstSlash >= 0 ? rest.slice(0, firstSlash) : rest;
    }
  }

  return null;
}
