/**
 * DefaultMcpElicitationHandler — 默认 Elicitation 处理器
 *
 * 在宿主未注入自定义 ElicitationHandler 时使用。
 * 默认策略: 自动 decline（CLI 环境无法呈现 UI 表单），
 * 因为服务器请求用户信息时，headless/CLI 模式无法安全地
 * 处理表单输入或 URL 跳转。
 */

import type { McpElicitationHandler, McpElicitationRequestEvent, McpElicitResult } from '../types/mcp-elicitation';

/**
 * DefaultMcpElicitationHandler — 自动 decline
 *
 * 安全策略: 无 UI 环境下，服务器请求用户信息一律拒绝。
 * 宿主可注入自定义实现（如 TerminalElicitationHandler 或 WebElicitationHandler）
 * 替换此默认行为。
 */
export class DefaultMcpElicitationHandler implements McpElicitationHandler {
  async handleElicitation(request: McpElicitationRequestEvent): Promise<McpElicitResult> {
    // 默认策略: decline — 无 UI 环境，拒绝服务器的信息请求
    return { action: 'decline' };
  }
}