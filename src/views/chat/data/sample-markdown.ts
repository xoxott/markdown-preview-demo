/** 能力栈示例文档 — 演示本站 Markdown 管线（代码块、表格、列表） */

export const CHAT_MARKDOWN_SAMPLE = `
## Workspace 栈说明

本页**不发起 LLM 推理**，仅展示 Monorepo 中与 **Markdown 渲染**、**命令目录**、**参数解析** 相关能力；完整的 Agent 循环与 Runtime 请在 **Node / IDE 宿主** 中使用。

### 能力分层（节选）

| 分层 | 代表包 | 说明 |
|------|--------|------|
| 文档 | \`markdown-it-render-vnode*\` | Token → VNode → Vue |
| 命令 | \`ai-commands\` | \`COMMAND_CATALOG\` 与 Skill 注册 |
| 编排 | \`ai-agent-loop\` | Phase / 工具调度 |
| 上下文 | \`ai-context\` | 压缩与预算管线 |

### 内联代码

\`parseCommandArgs(raw, schema)\` 使用 **Zod** 校验结构，支持 JSON、\`key=value\` 与位置参数混排。

\`\`\`ts
import { z } from 'zod';
// 与 @suga/ai-commands 中用法一致
const schema = z.object({ name: z.string().optional() });
\`\`\`

### 任务列表示例

- [x] 去除浏览器直连本地模型
- [x] 拆分页面组件、便于扩展
- [ ] 接入宿主侧 Runtime（可选）

> **注**：若需流式对话，应在后端或桌面宿主完成模型调用，再通过 SSE / WebSocket 推送到前端展示。
`.trim();
