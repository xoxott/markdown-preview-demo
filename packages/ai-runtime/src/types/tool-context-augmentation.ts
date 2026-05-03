/**
 * ai-runtime 的 ToolUseContext module augmentation
 *
 * P36: 将 11 个 provider 字段添加到 ai-tool-core 的 ToolUseContext 接口。 当 ai-runtime 包被导入时，所有工具的 call() 方法中
 * context 自动包含这些字段。
 *
 * P39: 添加 promptHandler/canUseToolFn/denialTracking 权限交互字段。
 */

import type {
  CanUseToolFn,
  DenialTrackingState,
  PermissionPromptHandler
} from '@suga/ai-tool-core';
import type {
  ConfigProvider,
  FileSystemProvider,
  HttpProvider,
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
  }
}

// Side-effect: 确保 augmentation 安装
export {};
