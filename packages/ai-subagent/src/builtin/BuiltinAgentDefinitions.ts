/** 内置代理定义 — 7种 BuiltInAgentDefinition（对齐 Claude Code 的 7 种内置代理） */

import type { SubagentDefinition } from '../types/subagent';
import { SubagentRegistry } from '../registry/SubagentRegistry';

/**
 * 7种内置代理定义（对齐 Claude Code 的 BuiltInAgentDefinition）
 *
 * | 代理类型          | 用途                | 工具      | maxTurns |
 * | ----------------- | ------------------- | --------- | -------- |
 * | general-purpose   | 通用子代理          | 全部      | 10       |
 * | explore           | 代码探索和搜索      | 只读/搜索 | 5        |
 * | plan              | 规划任务            | 只读/搜索 | 5        |
 * | claude-code-guide | Claude Code使用指南 | 只读/搜索 | 3        |
 * | statusline-setup  | 状态栏配置          | 只读/搜索 | 3        |
 * | verification      | 验证和测试          | 只读+bash | 5        |
 * | fork              | 并行fork子代理      | 全部      | 10       |
 */
export const BUILTIN_AGENT_DEFINITIONS: readonly SubagentDefinition[] = [
  {
    agentType: 'general-purpose',
    source: 'builtin',
    description: '通用子代理，执行各种任务',
    whenToUse: '用于不需要特殊限制的通用任务',
    tools: undefined, // 全部工具（继承父完整工具池）
    disallowedTools: [],
    maxTurns: 10
  },
  {
    agentType: 'explore',
    source: 'builtin',
    description: '代码探索和搜索代理，只做搜索/读取不做修改',
    whenToUse: '需要快速搜索代码、读取文件、探索项目结构时',
    tools: ['read', 'glob', 'grep', 'search', 'ls', 'file-read', 'file-search'],
    disallowedTools: [],
    maxTurns: 5
  },
  {
    agentType: 'plan',
    source: 'builtin',
    description: '规划代理，只做分析和规划不做执行',
    whenToUse: '需要分析任务并制定执行计划时',
    tools: ['read', 'glob', 'grep', 'search', 'ls', 'file-read', 'file-search'],
    disallowedTools: [],
    maxTurns: 5
  },
  {
    agentType: 'claude-code-guide',
    source: 'builtin',
    description: 'Claude Code 使用指南代理',
    whenToUse: '需要回答关于 Claude Code 使用方法、功能、配置的问题时',
    tools: ['read', 'glob', 'grep', 'search'],
    disallowedTools: [],
    maxTurns: 3
  },
  {
    agentType: 'statusline-setup',
    source: 'builtin',
    description: '状态栏配置代理',
    whenToUse: '需要配置 Claude Code 的状态栏设置时',
    tools: ['read', 'glob', 'grep', 'search'],
    disallowedTools: [],
    maxTurns: 3
  },
  {
    agentType: 'verification',
    source: 'builtin',
    description: '验证和测试代理，执行检查和验证任务',
    whenToUse: '需要验证代码、运行测试、检查一致性时',
    tools: ['read', 'glob', 'grep', 'bash'],
    disallowedTools: [],
    maxTurns: 5
  },
  {
    agentType: 'fork',
    source: 'builtin',
    description: '并行 fork 子代理，继承父的完整上下文',
    whenToUse: '需要并行执行多个独立子任务时',
    tools: undefined, // 继承完整工具池
    disallowedTools: [],
    permissionMode: 'bubble', // 权限冒泡到父
    maxTurns: 10,
    model: 'inherit' // 继承父模型
  }
];

/**
 * 创建包含所有内置代理定义的 SubagentRegistry
 *
 * @returns SubagentRegistry 实例，已注册所有 7 种内置代理
 */
export function createBuiltinSubagentRegistry(): SubagentRegistry {
  const registry = new SubagentRegistry();
  for (const def of BUILTIN_AGENT_DEFINITIONS) {
    registry.register(def);
  }
  return registry;
}
