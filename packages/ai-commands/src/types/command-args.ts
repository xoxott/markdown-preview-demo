/** 命令参数 Zod schema — 每个命令定义自己的参数验证 */

import { z } from 'zod';

// === Tier 1 ===

/** /commit 参数: 可选的 commit instruction 覆盖 */
export const CommitArgsSchema = z.strictObject({
  instruction: z.string().optional().describe('覆盖 commit 说明指令'),
  amend: z.boolean().optional().describe('是否 amend 上一个 commit')
});
export type CommitArgs = z.infer<typeof CommitArgsSchema>;

/** /compact 参数: 可选的自定义压缩指令 */
export const CompactArgsSchema = z.strictObject({
  instruction: z.string().optional().describe('自定义压缩指令'),
  force: z.boolean().optional().describe('强制压缩（即使不需要）')
});
export type CompactArgs = z.infer<typeof CompactArgsSchema>;

/** /memory 子命令 */
export const MemorySubcommand = z.enum(['save', 'recall', 'forget', 'refresh']);

/** /memory 参数 */
export const MemoryArgsSchema = z.strictObject({
  subcommand: MemorySubcommand.describe('记忆操作类型'),
  name: z.string().optional().describe('记忆名称（用于 save/recall）'),
  content: z.string().optional().describe('记忆内容（用于 save）'),
  query: z.string().optional().describe('搜索查询（用于 recall）'),
  type: z
    .enum(['user', 'feedback', 'project', 'reference'])
    .optional()
    .describe('记忆类型（用于 save）')
});
export type MemoryArgs = z.infer<typeof MemoryArgsSchema>;

/** /config 子命令 */
export const ConfigSubcommand = z.enum(['list', 'get', 'set', 'reset']);

/** /config 参数 */
export const ConfigArgsSchema = z.strictObject({
  subcommand: ConfigSubcommand.describe('配置操作类型'),
  key: z.string().optional().describe('配置键'),
  value: z.string().optional().describe('配置值（用于 set）')
});
export type ConfigArgs = z.infer<typeof ConfigArgsSchema>;

/** /doctor 参数: 可选的检查过滤器 */
export const DoctorArgsSchema = z.strictObject({
  filter: z.string().optional().describe('仅运行匹配此过滤器的检查')
});
export type DoctorArgs = z.infer<typeof DoctorArgsSchema>;

// === Tier 2 ===

/** /add-dir 参数 */
export const AddDirArgsSchema = z.strictObject({
  path: z.string().describe('要添加的目录路径')
});
export type AddDirArgs = z.infer<typeof AddDirArgsSchema>;

/** /init 参数 */
export const InitArgsSchema = z.strictObject({
  template: z.enum(['default', 'minimal', 'full']).optional().describe('初始化模板类型'),
  projectRoot: z.string().optional().describe('项目根目录路径')
});
export type InitArgs = z.infer<typeof InitArgsSchema>;

/** /status 参数 */
export const StatusArgsSchema = z.strictObject({
  verbose: z.boolean().optional().describe('显示详细信息')
});
export type StatusArgs = z.infer<typeof StatusArgsSchema>;

/** /diff 参数 */
export const DiffArgsSchema = z.strictObject({
  filter: z.string().optional().describe('仅显示匹配路径的 diff'),
  stagedOnly: z.boolean().optional().describe('仅显示 staged 变更')
});
export type DiffArgs = z.infer<typeof DiffArgsSchema>;

/** /mcp 子命令 */
export const McpSubcommand = z.enum(['list', 'add', 'remove', 'restart']);

/** /mcp 参数 */
export const McpArgsSchema = z.strictObject({
  subcommand: McpSubcommand.describe('MCP 操作类型'),
  name: z.string().optional().describe('MCP 服务器名称'),
  configType: z.string().optional().describe('配置类型（用于 add）'),
  command: z.string().optional().describe('启动命令（用于 add stdio）'),
  url: z.string().optional().describe('服务器 URL（用于 add sse/http）')
});
export type McpArgs = z.infer<typeof McpArgsSchema>;

// === Tier 3 (新增) ===

/** /help 参数 */
export const HelpArgsSchema = z.strictObject({
  filter: z.string().optional().describe('按名称或类别过滤命令')
});
export type HelpArgs = z.infer<typeof HelpArgsSchema>;

/** /clear 参数 */
export const ClearArgsSchema = z.strictObject({
  confirmed: z.boolean().optional().describe('确认清空（默认 true）')
});
export type ClearArgs = z.infer<typeof ClearArgsSchema>;

/** /cost 参数 */
export const CostArgsSchema = z.strictObject({
  detailed: z.boolean().optional().describe('显示逐轮明细')
});
export type CostArgs = z.infer<typeof CostArgsSchema>;

/** /fast 参数 */
export const FastArgsSchema = z.strictObject({
  model: z.string().optional().describe('目标模型名称（默认 haiku）')
});
export type FastArgs = z.infer<typeof FastArgsSchema>;

/** /model 子命令 */
export const ModelSubcommand = z.enum(['list', 'switch']);

/** /model 参数 */
export const ModelArgsSchema = z.strictObject({
  subcommand: ModelSubcommand.optional().describe('操作类型（默认 list）'),
  model: z.string().optional().describe('要切换的模型名称')
});
export type ModelArgs = z.infer<typeof ModelArgsSchema>;

/** /permissions 子命令 */
export const PermissionsSubcommand = z.enum(['list', 'grant', 'revoke']);

/** /permissions 参数 */
export const PermissionsArgsSchema = z.strictObject({
  subcommand: PermissionsSubcommand.describe('权限操作类型'),
  tool: z.string().optional().describe('工具名称（用于 grant）'),
  pattern: z.string().optional().describe('命令模式（用于 grant）'),
  ruleId: z.string().optional().describe('规则 ID（用于 revoke）')
});
export type PermissionsArgs = z.infer<typeof PermissionsArgsSchema>;

/** /vim 参数 */
export const VimArgsSchema = z.strictObject({
  enabled: z.boolean().optional().describe('启用/禁用 vim 模式（默认切换）')
});
export type VimArgs = z.infer<typeof VimArgsSchema>;

/** /terminal-setup 参数 */
export const TerminalSetupArgsSchema = z.strictObject({
  uninstall: z.boolean().optional().describe('卸载终端集成'),
  shell: z.string().optional().describe('指定 shell（默认自动检测）')
});
export type TerminalSetupArgs = z.infer<typeof TerminalSetupArgsSchema>;
