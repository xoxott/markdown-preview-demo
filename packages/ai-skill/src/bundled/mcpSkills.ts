/**
 * MCPSkills — 从 MCP server 抓取 skill 列表
 *
 * 对齐 CC src/skills/mcpSkills.ts。MCP server 通过 prompts/list 暴露其支持的 skill （特殊命名约定
 * `<server>:<skill>`），CC 在连接 server 时拉取并注册到 commands。
 *
 * 这里只提供抽象接口与缓存框架，实际 prompts/list RPC 由宿主 MCP client 实现。
 */

import type { MCPSkillBuilders, SkillCommand } from './mcpSkillBuilders';
import { getMCPSkillBuilders } from './mcpSkillBuilders';

// ============================================================
// Provider — 由宿主 MCP client 提供
// ============================================================

/** MCP prompt 信息（来自 prompts/list 响应） */
export interface McpPromptInfo {
  readonly name: string;
  readonly description?: string;
  readonly arguments?: readonly McpPromptArgument[];
}

export interface McpPromptArgument {
  readonly name: string;
  readonly description?: string;
  readonly required?: boolean;
}

/** MCP server prompts/list 与 prompts/get 提供器 */
export interface McpPromptsProvider {
  /** 列出所有 prompt（用于发现 skill） */
  listPrompts(serverName: string): Promise<readonly McpPromptInfo[]>;
  /** 获取 prompt 详细内容（包含 frontmatter + body） */
  getPrompt(
    serverName: string,
    promptName: string
  ): Promise<{
    readonly content: string;
    readonly frontmatter: Record<string, unknown>;
  } | null>;
}

// ============================================================
// 缓存
// ============================================================

const SKILL_PREFIX_RE = /^skill__/;

/**
 * 判断 prompt 名是否符合 skill 命名约定
 *
 * MCP skill 命名：`skill__<name>`（CC 在 `prompts/list` 中发现的特殊前缀）
 */
export function isMcpSkillPromptName(name: string): boolean {
  return SKILL_PREFIX_RE.test(name);
}

/** 提取 skill 名（去除 skill__ 前缀） */
export function stripMcpSkillPrefix(name: string): string {
  return name.replace(SKILL_PREFIX_RE, '');
}

// ============================================================
// 抓取器
// ============================================================

export interface FetchMcpSkillsOptions {
  readonly serverName: string;
  readonly provider: McpPromptsProvider;
  /** 自定义 builders（默认从全局 registry 获取） */
  readonly builders?: MCPSkillBuilders;
}

/**
 * 从 MCP server 获取并构造 SkillCommand 列表
 *
 * 流程：
 *
 * 1. 调用 prompts/list 拿到所有 prompt
 * 2. 过滤出 skill__ 前缀的
 * 3. 对每个 prompt 调用 prompts/get 拿 content + frontmatter
 * 4. 通过已注册的 MCPSkillBuilders.createSkillCommand 构造 SkillCommand
 */
export async function fetchMcpSkillsForServer(
  options: FetchMcpSkillsOptions
): Promise<readonly SkillCommand[]> {
  const builders = options.builders ?? getMCPSkillBuilders();
  const prompts = await options.provider.listPrompts(options.serverName);
  const skillPrompts = prompts.filter(p => isMcpSkillPromptName(p.name));

  const skills: SkillCommand[] = [];
  for (const prompt of skillPrompts) {
    const detail = await options.provider.getPrompt(options.serverName, prompt.name);
    if (!detail) continue;

    const frontmatter = builders.parseSkillFrontmatterFields(detail.frontmatter);
    const skillName = `${options.serverName}:${stripMcpSkillPrefix(prompt.name)}`;
    skills.push(
      builders.createSkillCommand({
        name: skillName,
        content: detail.content,
        frontmatter,
        source: 'mcp',
        serverName: options.serverName
      })
    );
  }
  return skills;
}

/**
 * 缓存 MCP skill 抓取结果，按 server 名 + 一个由调用方提供的版本/hash 分组
 *
 * 当 server 重连或 prompts/list_changed 通知到达时，调用 invalidate 让缓存失效。
 */
export class McpSkillsFetcher {
  private readonly cache = new Map<string, Promise<readonly SkillCommand[]>>();

  constructor(private readonly provider: McpPromptsProvider) {}

  async getSkillsForServer(serverName: string): Promise<readonly SkillCommand[]> {
    const existing = this.cache.get(serverName);
    if (existing) return existing;

    const promise = fetchMcpSkillsForServer({
      serverName,
      provider: this.provider
    });
    this.cache.set(serverName, promise);

    try {
      return await promise;
    } catch (err) {
      this.cache.delete(serverName);
      throw err;
    }
  }

  invalidate(serverName?: string): void {
    if (serverName) {
      this.cache.delete(serverName);
    } else {
      this.cache.clear();
    }
  }
}
