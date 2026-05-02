/**
 * TerminalPermissionPromptHandler — 终端交互式权限确认实现
 *
 * P39: 参考 Claude Code PermissionRequest.tsx，精简版实现。 使用 stdin readline 在终端中展示权限请求并等待用户输入。
 *
 * 设计原则:
 *
 * - 宿主注入: 实现 PermissionPromptHandler 接口，通过 RuntimeConfig 注入
 * - readline 交互: 使用 Node.js readline 模块从 stdin 读取用户输入
 * - 安全优先: 空输入/超时/不可解析 → deny
 * - 三个选项: Y(一次性允许) / A(永久允许-session) / N(拒绝)
 * - 格式化输出: 工具名/原因/分类器建议/拒绝计数
 *
 * 与 Claude Code 的差异:
 *
 * - Claude Code 使用 Ink/React TUI 组件，按工具类型渲染不同 UI
 * - @suga 当前没有 TUI 层，使用 stdin readline 作为最轻量实现
 * - 未来可替换为 Ink 组件或 IDE 对话框实现
 */

import type {
  PermissionPromptHandler,
  PermissionPromptRequest,
  PermissionPromptResponse
} from '@suga/ai-tool-core';

// ========== 类型定义 ==========

/** 终端权限确认配置 */
export interface TerminalPermissionPromptConfig {
  /** stdin 输入流（默认 process.stdin） */
  readonly stdin?: NodeJS.ReadableStream;
  /** stdout 输出流（默认 process.stdout） */
  readonly stdout?: NodeJS.WritableStream;
  /** 自动超时时间 ms（可选，超时自动 deny） */
  readonly autoTimeout?: number;
  /** readline createInterface 工厂（可选，测试注入 mock） */
  readonly readlineFactory?: ReadlineFactory;
}

/** readline createInterface 工厂函数签名 — 便于测试 mock */
export interface ReadlineFactory {
  createInterface(options: {
    input: NodeJS.ReadableStream;
    output: NodeJS.WritableStream;
    terminal?: boolean;
  }): NodeReadlineInterface;
}

/** readline Interface 类型抽象 — 便于测试 mock */
export interface NodeReadlineInterface {
  once(event: 'line', handler: (line: string) => void): this;
  once(event: 'close', handler: () => void): this;
  close(): void;
}

/** Node.js 内置 readline 模块的 createInterface 包装 */
const nodeReadlineFactory: ReadlineFactory = {
  createInterface(options) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rl = require('node:readline') as typeof import('node:readline');
    return rl.createInterface(options) as unknown as NodeReadlineInterface;
  }
};

// ========== 用户输入解析 ==========

/** 从用户输入文本解析决策 */
export function parseUserInput(input: string): PermissionPromptResponse {
  const normalized = input.trim().toLowerCase();

  // 空输入 → deny（安全优先）
  if (normalized === '') {
    return { behavior: 'deny' };
  }

  // Y/yes → 一次性允许
  if (normalized === 'y' || normalized === 'yes') {
    return { behavior: 'approve', persistent: false };
  }

  // A/always → 永久允许（session级）
  if (normalized === 'a' || normalized === 'always') {
    return { behavior: 'approve', persistent: true, persistentTarget: 'session' };
  }

  // N/no → 拒绝
  if (normalized === 'n' || normalized === 'no') {
    return { behavior: 'deny' };
  }

  // 不可解析 → deny（安全优先）
  return { behavior: 'deny', feedback: `Unrecognized input: "${input.trim()}"` };
}

// ========== 格式化输出 ==========

/** 将 PermissionDecisionReason 转为人类可读描述 */
export function reasonToDescription(reason: string): string {
  const descriptions: Record<string, string> = {
    ask_rule_match: '匹配了询问规则',
    classifier_ask: 'AI分类器建议确认',
    classifier_unavailable_fallback: '分类器不可用，回退到用户确认',
    tool_check_permissions: '工具要求确认',
    hook_ask: 'Hook 要求确认'
  };
  return descriptions[reason] ?? reason;
}

/** 格式化权限请求为终端可读文本 */
export function formatRequestMessage(request: PermissionPromptRequest): string {
  const lines: string[] = [];

  // 工具名 + 原因
  lines.push(`[Permission] Tool: ${request.toolName}`);
  lines.push(`  Reason: ${reasonToDescription(request.reason)}`);

  // 询问消息
  if (request.message) {
    lines.push(`  Message: ${request.message}`);
  }

  // 分类器建议
  if (request.classifierSuggestion) {
    const suggestion = request.classifierSuggestion;
    lines.push(
      `  Classifier: ${suggestion.behavior} (${suggestion.reason}, confidence: ${suggestion.confidence})`
    );
  }

  // 拒绝计数
  if ((request.consecutiveDenials ?? 0) > 0) {
    lines.push(
      `  Recent denials: ${request.consecutiveDenials} consecutive / ${request.totalDenials ?? 0} total`
    );
  }

  // 选项提示
  lines.push('');
  lines.push('  [Y] Allow once  [A] Always allow (session)  [N] Deny');
  lines.push('');

  return lines.join('\n');
}

// ========== 核心实现 ==========

/**
 * TerminalPermissionPromptHandler — 终端交互式权限确认
 *
 * 使用 Node.js readline 模块从 stdin 读取用户输入， 格式化权限请求信息输出到 stdout， 解析用户响应为 PermissionPromptResponse。
 *
 * 安全优先: 空输入/超时/不可解析 → deny
 */
export class TerminalPermissionPromptHandler implements PermissionPromptHandler {
  private readonly stdin: NodeJS.ReadableStream;
  private readonly stdout: NodeJS.WritableStream;
  private readonly autoTimeout?: number;
  private readonly readlineFactory: ReadlineFactory;

  constructor(config?: TerminalPermissionPromptConfig) {
    this.stdin = config?.stdin ?? process.stdin;
    this.stdout = config?.stdout ?? process.stdout;
    this.autoTimeout = config?.autoTimeout;
    this.readlineFactory = config?.readlineFactory ?? nodeReadlineFactory;
  }

  async prompt(request: PermissionPromptRequest): Promise<PermissionPromptResponse> {
    // 格式化输出权限请求信息
    const message = formatRequestMessage(request);
    this.stdout.write(`${message}\n> `);

    // 从 stdin 读取一行
    const input = await this.readLine();

    // 超时 → auto-deny
    if (input === null) {
      this.stdout.write('  (timeout → auto-deny)\n');
      return { behavior: 'deny', feedback: 'Permission prompt timed out' };
    }

    // 解析用户输入
    const response = parseUserInput(input);

    // 输出决策摘要
    let summary: string;
    if (response.behavior === 'approve') {
      summary = response.persistent
        ? `  → Always allow "${request.toolName}" for this session`
        : `  → Allow "${request.toolName}" once`;
    } else {
      summary = `  → Deny "${request.toolName}"`;
    }

    this.stdout.write(`${summary}\n`);

    return response;
  }

  /**
   * 从 stdin 读取一行输入
   *
   * 使用 readline 模块，支持可选超时。 超时返回 null → prompt() 方法将转为 auto-deny。
   */
  private readLine(): Promise<string | null> {
    return new Promise<string | null>(resolve => {
      let settled = false;

      const readlineInterface = this.readlineFactory.createInterface({
        input: this.stdin,
        output: this.stdout,
        terminal: false
      });

      const cleanup = () => {
        if (!settled) {
          settled = true;
          readlineInterface.close();
        }
      };

      // 超时处理
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      if (this.autoTimeout && this.autoTimeout > 0) {
        timeoutId = setTimeout(() => {
          cleanup();
          resolve(null);
        }, this.autoTimeout);
      }

      // 读取一行
      readlineInterface.once('line', (line: string) => {
        if (timeoutId) clearTimeout(timeoutId);
        cleanup();
        resolve(line);
      });

      // stdin 关闭
      readlineInterface.once('close', () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          resolve(null);
        }
      });
    });
  }
}
