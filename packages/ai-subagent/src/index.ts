/**
 * @suga/ai-subagent
 * In-Process 子代理执行系统 — AgentTool桥接、SubagentSpawner真实执行、scoped ToolRegistry隔离、prompt cache脚手架、DiskTaskOutput噪声隔离
 */

// 类型导出
export type * from './types';

// 常量
export {
  AGENT_TOOL_NAME,
  DEFAULT_SUBAGENT_TIMEOUT,
  DEFAULT_MAX_IN_MEMORY_CHARS,
  DEFAULT_MAX_FORK_DEPTH
} from './constants';

// 注册表
export { SubagentRegistry } from './registry/SubagentRegistry';

// 创建器
export { SubagentSpawner } from './spawner/SubagentSpawner';
export type { Spawner } from './spawner/SubagentSpawner';
export { ForkSpawner } from './spawner/ForkSpawner';

// Fork 递归防护
export {
  FORK_BOILERPLATE,
  isInForkChild,
  getForkDepth,
  injectForkBoilerplate
} from './spawner/ForkGuard';

// 工具
export { createAgentTool } from './tool/AgentTool';

// Cache 脚手架
export {
  extractCacheSafeParams,
  buildPlaceholderResults,
  assembleChildMessages
} from './cache/PromptCacheBridge';
export { detectBreak } from './cache/CacheBreakDetector';

// 噪声隔离
export { DiskTaskOutput } from './output/DiskTaskOutput';
export { OutputFileBridge } from './output/OutputFileBridge';

// P9 集成
export { SubagentDispatchPhase } from './integration/SubagentDispatchPhase';

// 内置代理定义
export {
  BUILTIN_AGENT_DEFINITIONS,
  createBuiltinSubagentRegistry
} from './builtin/BuiltinAgentDefinitions';
export {
  getSystemPromptForAgentType,
  GENERAL_PURPOSE_PROMPT,
  EXPLORE_AGENT_PROMPT,
  PLAN_AGENT_PROMPT,
  VERIFICATION_AGENT_PROMPT,
  CLAUDE_CODE_GUIDE_PROMPT,
  STATUSLINE_SETUP_PROMPT,
  FORK_AGENT_PROMPT
} from './builtin/SystemPrompts';

// G38: Agent 颜色管理
export { AgentColorManager, AGENT_COLORS } from './builtin/AgentColorManager';
export type { AgentColorName } from './builtin/AgentColorManager';

// G39: Agent 持久化记忆作用域
export {
  getAgentMemoryDir,
  isAgentMemoryPath,
  extractAgentTypeFromPath,
  sanitizeAgentTypeForPath
} from './builtin/AgentMemoryPaths';
export type { AgentMemoryScope, AgentMemoryConfig } from './builtin/AgentMemoryPaths';

// G40: 自定义 Agent 加载（.claude/agents/）
export {
  loadAgentsDir,
  parseSubagentFromMarkdown,
  parseSubagentFromJson,
  parseMarkdownFrontmatter,
  getAgentMemoryScope,
  AgentJsonSchema
} from './builtin/loadAgentsDir';
export type {
  AgentDefinitionSource,
  AgentFileEntry,
  AgentDefinitionFileSource,
  ParsedAgentMarkdown,
  AgentJson,
  LoadAgentsOptions
} from './builtin/loadAgentsDir';

// G41: 后台 Agent 恢复执行
export {
  resumeAgent,
  AgentResumeError,
  filterUnresolvedToolUses,
  filterOrphanedThinkingOnlyMessages,
  filterWhitespaceOnlyAssistantMessages
} from './builtin/resumeAgent';
export type {
  AgentTranscript,
  AgentMetadata,
  AgentResumeProvider,
  ResumeAgentResult,
  ResumeAgentOptions
} from './builtin/resumeAgent';

// G18: Agent MCP 服务器初始化
export {
  initializeAgentMcpServers,
  ScopedMcpResourceProvider
} from './core/initializeAgentMcpServers';
export type { AgentMcpInitResult } from './core/initializeAgentMcpServers';

// G35: Agent memory scope
export { computeScopedMemoryPath } from './types/memory-scope';

// G37: Agent skill预加载
export type { SkillDescriptor, SkillResolver } from './core/resolveAgentSkills';
export { resolveAgentSkills, buildSkillSystemPrompt } from './core/resolveAgentSkills';
