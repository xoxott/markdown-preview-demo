/**
 * ai-runtime 的 ToolUseContext module augmentation
 *
 * P36: 将 11 个 provider 字段添加到 ai-tool-core 的 ToolUseContext 接口。 当 ai-runtime 包被导入时，所有工具的 call() 方法中
 * context 自动包含这些字段。
 *
 * P39: 添加 promptHandler/canUseToolFn/denialTracking 权限交互字段。
 *
 * P52: 补全 memory/compress/coordinator/subagent/sandbox 等字段。
 */

import type {
  CanUseToolFn,
  DenialTrackingState,
  PermissionPromptHandler,
  ToolRegistry
} from '@suga/ai-tool-core';
import type { HookRegistry } from '@suga/ai-hooks';
import type { CompressConfig, CompressDependencies } from '@suga/ai-context';
import type {
  CoordinatorRegistry,
  Mailbox,
  SpawnProvider
} from '@suga/ai-coordinator';
import type { SubagentRegistry, SubagentSpawner } from '@suga/ai-subagent';
import type { MemoryPathConfig, MemoryPromptConfig, MemoryStorageProvider } from '@suga/ai-memory';
import type { SandboxSettings } from '@suga/ai-sdk';
import type {
  ConfigProvider,
  FileSystemProvider,
  HttpProvider,
  LLMClassifierConfig,
  MailboxProvider,
  McpResourceProvider,
  PlanModeProvider,
  SearchProvider,
  SkillProvider,
  TaskStoreProvider,
  TeamProvider,
  UserInteractionProvider
} from '@suga/ai-tools';

declare module '@suga/ai-tool-core' {
  interface ToolUseContext {
    /** 文件系统提供者（必填 — bash/file 工具硬性依赖） */
    readonly fsProvider?: FileSystemProvider;
    /** HTTP 提供者（可选 — web-fetch 工具使用） */
    readonly httpProvider?: HttpProvider;
    /** 搜索提供者（可选 — web-search 工具使用） */
    readonly searchProvider?: SearchProvider;
    /** 任务存储提供者（可选 — task 工具使用） */
    readonly taskStoreProvider?: TaskStoreProvider;
    /** Team 管理提供者（可选 — team 工具使用） */
    readonly teamProvider?: TeamProvider;
    /** 消息收发提供者（可选 — send-message 工具使用） */
    readonly mailboxProvider?: MailboxProvider;
    /** 用户交互提供者（可选 — ask-user 工具使用） */
    readonly userInteractionProvider?: UserInteractionProvider;
    /** Skill 提供者（可选 — skill 工具使用） */
    readonly skillProvider?: SkillProvider;
    /** 配置管理提供者（可选 — config 工具使用） */
    readonly configProvider?: ConfigProvider;
    /** MCP 资源提供者（可选 — mcp-resource 工具使用） */
    readonly mcpResourceProvider?: McpResourceProvider;
    /** 计划模式提供者（可选 — plan-mode 工具使用） */
    readonly planModeProvider?: PlanModeProvider;
    /** P39: 权限确认交互接口（可选 — TerminalPermissionPromptHandler等） */
    readonly promptHandler?: PermissionPromptHandler;
    /** P39: 用户确认函数（可选 — 向后兼容boolean版） */
    readonly canUseToolFn?: CanUseToolFn;
    /** P39: 拒绝追踪状态（可选 — 默认DEFAULT_DENIAL_TRACKING） */
    readonly denialTracking?: DenialTrackingState;
    /** P41: 工具是否标记 requiresUserInteraction（可选 — executor 传递到管线） */
    readonly requiresUserInteraction?: boolean;
    /** P41: 是否为 headless agent（可选 — 自动 deny ask） */
    readonly isHeadlessAgent?: boolean;

    // === P52: 补全 RuntimeConfig → ToolUseContext 字段 ===

    /** P35: Memory配置（可选 — system prompt注入memory段落） */
    readonly memoryConfig?: Partial<MemoryPromptConfig>;
    /** P35: Memory存储提供者（可选 — 读取MEMORY.md） */
    readonly memoryProvider?: MemoryStorageProvider;
    /** P35: Memory路径配置（可选 — 计算MEMORY.md路径） */
    readonly memoryPathConfig?: MemoryPathConfig;

    /** P8: 压缩配置（可选 — CompressPhase使用） */
    readonly compressConfig?: CompressConfig;
    /** P8: 压缩依赖注入（可选 — callModelForSummary等） */
    readonly compressDeps?: CompressDependencies;

    /** P4: Hook注册表（可选 — 工具层可查询hook状态） */
    readonly hookRegistry?: HookRegistry;
    /** P0: 工具注册表（可选 — 工具层可查询可用工具） */
    readonly toolRegistry?: ToolRegistry;

    /** P9: Coordinator注册表（可选 — team/spawn工具可查询worker定义） */
    readonly coordinatorRegistry?: CoordinatorRegistry;
    /** P9: Coordinator Mailbox（可选 — 直接发送消息到coordinator） */
    readonly coordinatorMailbox?: Mailbox;
    /** P9: SpawnProvider（可选 — team工具创建真实Agent会话） */
    readonly spawnProvider?: SpawnProvider;

    /** P10: Subagent注册表（可选 — 子代理查询） */
    readonly subagentRegistry?: SubagentRegistry;
    /** P10: SubagentSpawner（可选 — 子代理创建） */
    readonly subagentSpawner?: SubagentSpawner;

    /** P37: LLM分类器配置（可选 — 权限管线感知当前分类器） */
    readonly classifierConfig?: LLMClassifierConfig;

    /** P50: Sandbox配置（可选 — 工具层感知沙箱规则） */
    readonly sandbox?: SandboxSettings;
  }
}

// Side-effect: 确保 augmentation 安装
export {};
