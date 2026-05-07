/**
 * loadAgentsDir — 从 .claude/agents/ 目录加载自定义 SubagentDefinition
 *
 * 对齐 CC tools/AgentTool/loadAgentsDir.ts，支持从 markdown 文件（带 frontmatter）和 JSON 文件加载用户/项目/插件级
 * sub-agent 定义。本实现解耦了文件系统操作， 由宿主提供 `AgentDefinitionFileSource`，便于在浏览器/Worker/Node 中复用。
 */

import { z } from 'zod';
import type { SubagentDefinition, SubagentPermissionMode } from '../types/subagent';
import type { AgentMemoryScope } from './AgentMemoryPaths';

// ============================================================
// Schema
// ============================================================

/** Agent JSON 定义 schema */
export const AgentJsonSchema = z.object({
  description: z.string().min(1),
  tools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  prompt: z.string().min(1),
  model: z.string().optional(),
  permissionMode: z
    .enum(['default', 'plan', 'acceptEdits', 'bypassPermissions', 'dontAsk'])
    .optional(),
  maxTurns: z.number().int().positive().optional(),
  skills: z.array(z.string()).optional(),
  initialPrompt: z.string().optional(),
  memory: z.enum(['user', 'project', 'local']).optional(),
  background: z.boolean().optional(),
  isolation: z.enum(['worktree', 'remote']).optional(),
  color: z.enum(['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']).optional(),
  whenToUse: z.string().optional()
});

export type AgentJson = z.infer<typeof AgentJsonSchema>;

/** JSON/CC frontmatter permission strings → SubagentPermissionMode */
const LEGACY_PERMISSION_TO_SUBAGENT: Record<
  NonNullable<AgentJson['permissionMode']>,
  SubagentPermissionMode
> = {
  default: 'bubble',
  plan: 'bubble',
  acceptEdits: 'auto',
  bypassPermissions: 'auto',
  dontAsk: 'auto'
};

function normalizePermissionMode(raw: unknown): SubagentPermissionMode | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (raw === 'bubble' || raw === 'auto') return raw;
  if (typeof raw !== 'string') return undefined;
  return LEGACY_PERMISSION_TO_SUBAGENT[raw as NonNullable<AgentJson['permissionMode']>];
}

/** Agent Markdown 定义解析结果（frontmatter + body） */
export interface ParsedAgentMarkdown {
  readonly frontmatter: AgentJson;
  readonly body: string;
}

// ============================================================
// 文件源
// ============================================================

/** Agent 定义来源 — 决定优先级和合并行为 */
export type AgentDefinitionSource = 'user' | 'project' | 'local' | 'plugin' | 'built-in';

/** 单个文件条目 */
export interface AgentFileEntry {
  /** 文件名（含扩展名，如 my-agent.md） */
  readonly fileName: string;
  /** 文件内容 */
  readonly content: string;
  /** 来源 */
  readonly source: AgentDefinitionSource;
  /** 插件名（仅 source='plugin' 时） */
  readonly pluginName?: string;
}

/** Agent 定义文件源 — 由宿主提供 */
export interface AgentDefinitionFileSource {
  /** 列出指定来源下所有可用的 agent 定义文件 */
  list(source: AgentDefinitionSource): Promise<readonly AgentFileEntry[]>;
}

// ============================================================
// 解析器
// ============================================================

/**
 * 解析 markdown 文件的 frontmatter（YAML 格式）和 body
 *
 * 简化版 frontmatter 解析器，只支持 key: value 简单语法，不支持嵌套对象/数组。 复杂场景应使用 gray-matter 等库（由宿主注入解析器）。
 */
export function parseMarkdownFrontmatter(content: string): {
  frontmatter: Record<string, string | number | boolean>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const fmText = match[1] ?? '';
  const body = match[2] ?? '';
  const frontmatter: Record<string, string | number | boolean> = {};

  for (const line of fmText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value: string | number | boolean = trimmed.slice(colonIdx + 1).trim();

    // 去除引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // 类型推断
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+$/.test(value)) value = Number.parseInt(value, 10);
    else if (/^-?\d+\.\d+$/.test(value)) value = Number.parseFloat(value);

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

/**
 * 从 markdown 文件解析单个 SubagentDefinition
 *
 * frontmatter 提供 metadata，body 作为 systemPrompt
 */
export function parseSubagentFromMarkdown(fileEntry: AgentFileEntry): SubagentDefinition | null {
  const { frontmatter, body } = parseMarkdownFrontmatter(fileEntry.content);
  const agentType = fileEntry.fileName.replace(/\.md$/, '');

  if (!agentType) return null;
  const description = String(frontmatter.description ?? '');
  if (!description) return null;

  const toolsStr = String(frontmatter.tools ?? '');
  const disallowedStr = String(frontmatter.disallowedTools ?? '');

  return {
    agentType,
    source: fileEntry.source === 'built-in' ? 'builtin' : 'custom',
    description,
    whenToUse: String(frontmatter.whenToUse ?? description),
    tools: toolsStr ? toolsStr.split(',').map(s => s.trim()) : undefined,
    disallowedTools: disallowedStr ? disallowedStr.split(',').map(s => s.trim()) : [],
    maxTurns: typeof frontmatter.maxTurns === 'number' ? frontmatter.maxTurns : undefined,
    model: typeof frontmatter.model === 'string' ? frontmatter.model : undefined,
    systemPromptPrefix: body.trim() || undefined,
    permissionMode: normalizePermissionMode(frontmatter.permissionMode)
  };
}

/** 从 JSON 文件解析单个 SubagentDefinition */
export function parseSubagentFromJson(fileEntry: AgentFileEntry): SubagentDefinition | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileEntry.content);
  } catch {
    return null;
  }

  const result = AgentJsonSchema.safeParse(parsed);
  if (!result.success) return null;

  const agentType = fileEntry.fileName.replace(/\.json$/, '');
  if (!agentType) return null;

  const data = result.data;
  return {
    agentType,
    source: fileEntry.source === 'built-in' ? 'builtin' : 'custom',
    description: data.description,
    whenToUse: data.whenToUse ?? data.description,
    tools: data.tools,
    disallowedTools: data.disallowedTools ?? [],
    maxTurns: data.maxTurns,
    model: data.model,
    systemPromptPrefix: data.prompt,
    permissionMode: normalizePermissionMode(data.permissionMode)
  };
}

// ============================================================
// 加载与合并
// ============================================================

/** 加载选项 */
export interface LoadAgentsOptions {
  /** 包括的来源（按优先级倒序合并 — 后面覆盖前面） */
  readonly sources?: readonly AgentDefinitionSource[];
}

const DEFAULT_SOURCES: readonly AgentDefinitionSource[] = ['user', 'project', 'local', 'plugin'];

/**
 * loadAgentsDir — 加载所有自定义 SubagentDefinition
 *
 * 按 sources 顺序合并：相同 agentType 的后续定义会覆盖前面的（priority: plugin > local > project > user）
 */
export async function loadAgentsDir(
  fileSource: AgentDefinitionFileSource,
  options?: LoadAgentsOptions
): Promise<readonly SubagentDefinition[]> {
  const sources = options?.sources ?? DEFAULT_SOURCES;
  const merged = new Map<string, SubagentDefinition>();

  for (const src of sources) {
    const entries = await fileSource.list(src);
    for (const entry of entries) {
      const def = entry.fileName.endsWith('.json')
        ? parseSubagentFromJson(entry)
        : parseSubagentFromMarkdown(entry);
      if (def) {
        merged.set(def.agentType, def);
      }
    }
  }

  return [...merged.values()];
}

// ============================================================
// 持久化记忆作用域辅助
// ============================================================

/** 获取 SubagentDefinition 的记忆作用域（默认 'project'） */
export function getAgentMemoryScope(def: SubagentDefinition): AgentMemoryScope {
  const customDef = def as SubagentDefinition & { memoryScope?: AgentMemoryScope };
  return customDef.memoryScope ?? 'project';
}
