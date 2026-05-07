/** Monorepo 包索引 — 浏览器端展示用，与 package.json 描述对齐 */

export type WorkspacePackageGroup = 'render' | 'pipeline' | 'agent' | 'infra';

export interface WorkspacePackageMeta {
  readonly name: string;
  readonly group: WorkspacePackageGroup;
  readonly tags: readonly string[];
  readonly desc: Record<'zh-CN' | 'en-US', string>;
}

export const WORKSPACE_PACKAGES: readonly WorkspacePackageMeta[] = [
  {
    name: '@suga/markdown-it-render-vnode',
    group: 'render',
    tags: ['markdown-it', 'VNode'],
    desc: {
      'zh-CN': 'Markdown-it 插件：将 token 流渲染为 VNode，供 Vue/React 宿主消费。',
      'en-US': 'Markdown-it plugin: token stream to VNode for Vue/React hosts.'
    }
  },
  {
    name: '@suga/markdown-it-render-vnode-vue',
    group: 'render',
    tags: ['Vue', 'renderer'],
    desc: {
      'zh-CN': 'Vue 封装层：与本站 Markdown 组件同一渲染管线。',
      'en-US': 'Vue wrapper — same pipeline as app Markdown components.'
    }
  },
  {
    name: '@suga/markdown-it-task-lists',
    group: 'render',
    tags: ['GFM', 'checkbox'],
    desc: {
      'zh-CN': '任务列表语法扩展，与 render-vnode 链配合。',
      'en-US': 'Task list syntax extension for the render pipeline.'
    }
  },
  {
    name: '@suga/ai-commands',
    group: 'agent',
    tags: ['catalog', 'skills'],
    desc: {
      'zh-CN': 'Slash 命令与 Skill 定义；下方「命令目录」即此包的 COMMAND_CATALOG。',
      'en-US': 'Slash commands & skills; the command table mirrors COMMAND_CATALOG here.'
    }
  },
  {
    name: '@suga/ai-skill',
    group: 'agent',
    tags: ['registry', 'SkillTool'],
    desc: {
      'zh-CN': 'Skill/Command 框架：注册表、执行器与 Tool 桥接模式。',
      'en-US': 'Skill framework: registry, executor, and tool-bridge pattern.'
    }
  },
  {
    name: '@suga/ai-agent-loop',
    group: 'agent',
    tags: ['loop', 'phases'],
    desc: {
      'zh-CN': 'Agent 主循环与阶段编排（调用模型、工具、流式等）。',
      'en-US': 'Main agent loop and phase orchestration (model, tools, streaming).'
    }
  },
  {
    name: '@suga/ai-context',
    group: 'pipeline',
    tags: ['compact', 'budget'],
    desc: {
      'zh-CN': '上下文压缩管线：ToolResult 预算、微压缩、自动/紧急压缩等。',
      'en-US': 'Context pipeline: tool-result budgets, micro/auto/reactive compaction.'
    }
  },
  {
    name: '@suga/ai-runtime',
    group: 'agent',
    tags: ['session', 'SDK'],
    desc: {
      'zh-CN': 'Runtime Session、SDK 适配与宿主侧会话能力（需在 Node/IDE 侧完整使用）。',
      'en-US': 'Runtime sessions & SDK adapters — full features on Node/IDE hosts.'
    }
  },
  {
    name: '@suga/ai-hooks',
    group: 'pipeline',
    tags: ['hooks', 'phases'],
    desc: {
      'zh-CN': 'Agent 钩子与阶段扩展点，与 ai-agent-loop 配合。',
      'en-US': 'Hook points and phase extensions for the agent loop.'
    }
  },
  {
    name: '@suga/ai-memory',
    group: 'pipeline',
    tags: ['memory'],
    desc: {
      'zh-CN': '会话记忆存储与检索策略接口。',
      'en-US': 'Session memory storage and retrieval interfaces.'
    }
  },
  {
    name: '@suga/ai-mcp',
    group: 'infra',
    tags: ['MCP'],
    desc: {
      'zh-CN': 'MCP 服务器与资源编排相关能力。',
      'en-US': 'MCP server wiring and resource orchestration utilities.'
    }
  },
  {
    name: '@suga/utils',
    group: 'infra',
    tags: ['shared'],
    desc: {
      'zh-CN': '通用工具函数集，被各业务与本站引用。',
      'en-US': 'Shared utilities used across packages and the app shell.'
    }
  },
  {
    name: '@suga/color',
    group: 'infra',
    tags: ['design'],
    desc: {
      'zh-CN': '主题色板与颜色变换（本页底部在线演示）。',
      'en-US': 'Palette & color transforms — live demo at page bottom.'
    }
  },
  {
    name: '@suga/axios',
    group: 'infra',
    tags: ['HTTP'],
    desc: {
      'zh-CN': '请求客户端封装，与 @suga/request-* 系列协同。',
      'en-US': 'Axios-based client layered with request pipeline packages.'
    }
  },
  {
    name: '@suga/hooks',
    group: 'infra',
    tags: ['Vue'],
    desc: {
      'zh-CN': 'Vue 业务 Hooks 与可复用组合逻辑。',
      'en-US': 'Vue composition utilities reusable across views.'
    }
  },
  {
    name: '@suga/materials',
    group: 'infra',
    tags: ['UI'],
    desc: {
      'zh-CN': '物料与 UI 片段库。',
      'en-US': 'UI materials and snippet library.'
    }
  }
];
