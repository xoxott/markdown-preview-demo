/**
 * ToolSearchTool — 工具搜索发现引擎
 *
 * 对齐 Claude Code tools/ToolSearchTool/ToolSearchTool.ts。 支持3种查询模式:
 *
 * 1. select 模式 — "select:Read,Edit,Grep" → 按名精确选择（逗号分隔多选）
 * 2. keyword 模式 — "notebook jupyter" → 关键词搜索（评分排序）
 * 3. +prefix 模式 — "+slack send" → 必须包含 + 前缀词 + 可选词
 *
 * 搜索算法:
 *
 * - 工具名解析: MCP 工具用 `__` 分隔(server__tool), 常规用 CamelCase 拆分
 * - 评分系统: 精确匹配10分, MCP server名12分, 描述匹配2分, searchHint匹配4分
 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  AnyBuiltTool,
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { ToolSearchInput } from '../types/tool-inputs';
import type { ToolSearchOutput } from '../types/tool-outputs';
import { ToolSearchInputSchema } from '../types/tool-inputs';

// ============================================================
// 工具名解析与评分算法
// ============================================================

/**
 * parseToolName — 将工具名拆分为可搜索的词段
 *
 * - MCP 工具: `mcp__server__tool` → ['mcp', 'server', 'tool']
 * - CamelCase: `FileReadTool` → ['file', 'read', 'tool']
 * - kebab-case: `file-read` → ['file', 'read']
 */
export function parseToolName(name: string): string[] {
  // MCP 工具格式: mcp__server__tool
  if (name.startsWith('mcp__')) {
    return name.split('__').filter(s => s.length > 0);
  }

  // CamelCase 拆分: FileReadTool → File, Read, Tool
  const camelParts: string[] = [];
  let current = '';
  for (const ch of name) {
    if (ch === '-') {
      if (current) camelParts.push(current.toLowerCase());
      current = '';
    } else if (ch === '_' || ch === '.') {
      if (current) camelParts.push(current.toLowerCase());
      current = '';
    } else if (ch.toUpperCase() === ch && ch.toLowerCase() !== ch && current.length > 0) {
      // 大写字母 → 新词段开始
      camelParts.push(current.toLowerCase());
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) camelParts.push(current.toLowerCase());

  return camelParts.length > 0 ? camelParts : [name.toLowerCase()];
}

/**
 * 解析查询字符串为结构化查询
 *
 * - select 模式: "select:Read,Edit,Grep" → { mode: 'select', names: ['Read', 'Edit', 'Grep'] }
 * - +prefix 模式: "+slack send" → { mode: 'prefix', required: ['slack'], optional: ['send'] }
 * - keyword 模式: "notebook jupyter" → { mode: 'keyword', keywords: ['notebook', 'jupyter'] }
 */
export interface ParsedQuery {
  mode: 'select' | 'keyword' | 'prefix';
  names?: string[];
  keywords?: string[];
  required?: string[];
  optional?: string[];
}

export function parseQuery(query: string): ParsedQuery {
  // select 模式: "select:Read,Edit"
  if (query.startsWith('select:') || query.startsWith('Select:')) {
    const namesStr = query.slice(7).trim();
    const names = namesStr
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);
    return { mode: 'select', names };
  }

  // +prefix 模式: "+slack send"
  const terms = query.split(/\s+/).filter(t => t.length > 0);
  const required = terms.filter(t => t.startsWith('+')).map(t => t.slice(1).toLowerCase());
  const optional = terms.filter(t => !t.startsWith('+')).map(t => t.toLowerCase());

  if (required.length > 0) {
    return { mode: 'prefix', required, optional };
  }

  // keyword 模式
  return { mode: 'keyword', keywords: terms.map(t => t.toLowerCase()) };
}

// ============================================================
// 评分常量（对齐 Claude Code）
// ============================================================

/** 精确匹配分数 */
const SCORE_EXACT_MATCH = 10;
/** MCP server 名匹配分数 */
const SCORE_MCP_SERVER = 12;
/** 描述词匹配分数 */
const SCORE_DESCRIPTION = 2;
/** searchHint 匹配分数 */
const SCORE_SEARCH_HINT = 4;

/**
 * scoreTool — 计算工具与查询的匹配分数
 *
 * 评分规则:
 *
 * - 工具名精确匹配 → 10 分
 * - MCP server 名匹配 → 12 分
 * - 工具名词段匹配 → 累加（每个词段精确匹配加5分）
 * - searchHint 包含关键词 → 4 分/词
 * - 描述包含关键词 → 2 分/词
 */
export function scoreTool(
  tool: AnyBuiltTool,
  keywords: string[],
  descriptionCache?: Map<string, string>
): number {
  let score = 0;
  const nameParts = parseToolName(tool.name);

  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();

    // 精确名匹配
    if (tool.name.toLowerCase() === kwLower) {
      score += SCORE_EXACT_MATCH;
      continue;
    }

    // MCP server 名匹配（MCP工具名的第2段是server名）
    if (tool.name.startsWith('mcp__') && nameParts.length >= 2) {
      const serverName = nameParts[1].toLowerCase();
      if (serverName === kwLower || serverName.includes(kwLower)) {
        score += SCORE_MCP_SERVER;
        continue;
      }
    }

    // 工具名词段匹配
    for (const part of nameParts) {
      if (part === kwLower) {
        score += 5; // 词段精确匹配
        break;
      }
      if (part.includes(kwLower)) {
        score += 3; // 词段包含匹配
        break;
      }
    }

    // searchHint 匹配
    if (tool.searchHint) {
      const hintLower = tool.searchHint.toLowerCase();
      const hintParts = hintLower.split(/\s+/);
      for (const hint of hintParts) {
        if (hint === kwLower) {
          score += SCORE_SEARCH_HINT;
          break;
        }
        if (hint.includes(kwLower)) {
          score += SCORE_SEARCH_HINT / 2;
          break;
        }
      }
    }

    // 描述匹配（使用缓存避免重复调用 description()）
    const cachedDesc = descriptionCache?.get(tool.name);
    if (cachedDesc) {
      const descLower = cachedDesc.toLowerCase();
      if (descLower.includes(kwLower)) {
        score += SCORE_DESCRIPTION;
      }
    }
  }

  return score;
}

/**
 * isDeferredTool — 判定工具是否应延迟加载
 *
 * 规则（对齐 Claude Code）:
 *
 * - alwaysLoad=true → 从不延迟
 * - ToolSearch 本身从不延迟
 * - shouldDefer=true → 延迟
 * - MCP 工具 → 默认延迟（名称以 mcp__ 开头）
 * - 其他 → 不延迟
 */
export function isDeferredTool(tool: AnyBuiltTool): boolean {
  // alwaysLoad=true → 从不延迟
  if (tool.alwaysLoad) return false;
  // ToolSearch 本身从不延迟
  if (tool.name === 'tool-search') return false;
  // MCP 工具 → 默认延迟
  if (tool.name.startsWith('mcp__')) return true;
  // 显式声明
  return tool.shouldDefer;
}

/**
 * searchToolsWithKeywords — 核心搜索算法
 *
 * 按 parsedQuery.mode 分流:
 *
 * - select: 按名精确匹配，返回所有匹配的工具名
 * - prefix: required 全部必须匹配（分数>0）+ optional 加分排序
 * - keyword: 按评分排序，返回 top-N
 */
export function searchToolsWithKeywords(
  tools: readonly AnyBuiltTool[],
  parsedQuery: ParsedQuery,
  maxResults: number = 5,
  descriptionCache?: Map<string, string>
): string[] {
  if (parsedQuery.mode === 'select') {
    // select 模式: 按名精确匹配
    const targetNames = parsedQuery.names ?? [];
    return tools
      .map(t => t.name)
      .filter(name => {
        const nameLower = name.toLowerCase();
        return targetNames.some(target => {
          const targetLower = target.toLowerCase();
          return nameLower === targetLower || nameLower.endsWith(`-${targetLower}`);
        });
      });
  }

  if (parsedQuery.mode === 'prefix') {
    // +prefix 模式: required 全部必须匹配 + optional 加分排序
    const required = parsedQuery.required ?? [];
    const optional = parsedQuery.optional ?? [];
    const allKeywords = [...required, ...optional];

    const scored = tools
      .map(tool => ({
        tool,
        score: scoreTool(tool, allKeywords, descriptionCache)
      }))
      .filter(({ tool, score }) => {
        // required 全部必须匹配（分数 > 0 对每个 required 词）
        if (score === 0) return false;
        // 确保每个 required 词都匹配到
        for (const req of required) {
          const parts = parseToolName(tool.name);
          const nameStr = tool.name.toLowerCase();
          const hintStr = tool.searchHint?.toLowerCase() ?? '';
          const matched =
            parts.some(p => p.includes(req)) || nameStr.includes(req) || hintStr.includes(req);
          if (!matched) return false;
        }
        return true;
      })
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, maxResults).map(s => s.tool.name);
  }

  // keyword 模式: 按评分排序
  const keywords = parsedQuery.keywords ?? [];
  const scored = tools
    .map(tool => ({
      tool,
      score: scoreTool(tool, keywords, descriptionCache)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map(s => s.tool.name);
}

// ============================================================
// ToolSearch 工具定义
// ============================================================

/**
 * ToolSearchTool — 工具搜索发现
 *
 * - isReadOnly: true — 只读搜索，无副作用
 * - safetyLabel: 'readonly' — 安全
 * - shouldDefer: false — ToolSearch 本身从不延迟
 * - alwaysLoad: true — 必须始终加载（用于发现其他工具）
 */
export const toolSearchTool = buildTool<ToolSearchInput, ToolSearchOutput>({
  name: 'tool-search',

  inputSchema: ToolSearchInputSchema,

  description: async input =>
    `Search for available tools matching "${input.query}" (max ${input.max_results} results)`,
  searchHint: 'search discover find explore available tools capabilities',

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  shouldDefer: false,
  alwaysLoad: true,

  validateInput: (input: ToolSearchInput): ValidationResult => {
    if (input.query.trim() === '') {
      return {
        behavior: 'deny',
        message: 'Search query must not be empty',
        reason: 'empty_query'
      };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => ({ behavior: 'allow' }),

  call: async (
    input: ToolSearchInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<ToolSearchOutput>> => {
    const registry = context.tools;
    if (!registry) {
      return {
        data: {
          matches: [],
          query: input.query,
          totalDeferredTools: 0
        },
        error: 'No tool registry available'
      };
    }

    const allTools = registry.getAll();
    const parsedQuery = parseQuery(input.query);

    // 构建描述缓存（避免重复调用 description()）
    const descriptionCache = new Map<string, string>();
    for (const tool of allTools) {
      try {
        // description() 需要 input 参数，但我们只需要通用描述用于搜索
        // 使用 searchHint 作为主要搜索文本，description 作为备用
        if (tool.searchHint) {
          descriptionCache.set(tool.name, tool.searchHint);
        }
      } catch {
        // description 可能需要具体 input，跳过
      }
    }

    const matches = searchToolsWithKeywords(
      allTools,
      parsedQuery,
      input.max_results ?? 5,
      descriptionCache
    );

    const deferredTools = allTools.filter(t => isDeferredTool(t));

    return {
      data: {
        matches,
        query: input.query,
        totalDeferredTools: deferredTools.length,
        pendingMcpServers: deferredTools
          .filter(t => t.name.startsWith('mcp__'))
          .map(t => {
            const parts = t.name.split('__');
            return parts[1] ?? t.name;
          })
      }
    };
  },

  toAutoClassifierInput: (input: ToolSearchInput) => ({
    toolName: 'tool-search',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 50_000
});
