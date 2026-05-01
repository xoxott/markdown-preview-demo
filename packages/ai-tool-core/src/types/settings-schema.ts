/** Settings Zod Schema（Settings Schema） 权限规则字符串校验+配置结构定义 */

import { z } from 'zod';

/**
 * 权限规则字符串 schema — 校验格式但不校验语义
 *
 * settings.json 中的权限规则是字符串数组格式:
 *
 * - 纯工具名: "Read", "Write", "Bash"
 * - 工具名+命令模式: "Bash(git push:*)", "Bash(npm test)"
 * - 通配符: "fs-*", "Bash(git _)", "_"
 *
 * 此 schema 仅校验字符串非空，语义校验由 PermissionRuleStringSchema
 *
 * - matchPermissionRuleValue 在运行时完成。
 */
export const PermissionRuleStringSchema = z.string().min(1);

/**
 * Settings permissions 部分 schema
 *
 * 对齐 Claude Code 的 PermissionsSchema:
 *
 * - allow: 允许规则字符串数组
 * - deny: 拒绝规则字符串数组
 * - ask: 询问规则字符串数组
 *
 * passthrough() 允许其他未知字段（如 defaultMode、additionalDirectories 等）， 保持与 Claude Code 的兼容性。
 */
export const SettingsPermissionsSectionSchema = z
  .object({
    allow: z.array(PermissionRuleStringSchema).default([]),
    deny: z.array(PermissionRuleStringSchema).default([]),
    ask: z.array(PermissionRuleStringSchema).default([])
  })
  .passthrough();

/**
 * 完整 Settings schema — 权限部分精细校验，其他部分宽松
 *
 * 参考 Claude Code 的 SettingsSchema:
 *
 * - permissions: 精细校验（allow/deny/ask 数组）
 * - 其他字段: passthrough() 宽松处理（hooks、env、MCP 等由宿主定义）
 *
 * @example
 *   // 有效的 settings.json
 *   {
 *   "permissions": {
 *   "allow": ["Bash(git push:*)"],
 *   "deny": ["Bash(rm -rf *)"],
 *   "ask": ["Write"]
 *   }
 *   }
 */
export const SettingsSchema = z
  .object({
    permissions: SettingsPermissionsSectionSchema.optional()
  })
  .passthrough();

/**
 * 合并后的 Settings 类型
 *
 * 从 SettingsSchema 的 z.infer 推导，代表多源合并后的最终配置。 宿主可在此基础上扩展更多字段（hooks、env、MCP 等）。
 */
export type MergedSettings = z.infer<typeof SettingsSchema>;
