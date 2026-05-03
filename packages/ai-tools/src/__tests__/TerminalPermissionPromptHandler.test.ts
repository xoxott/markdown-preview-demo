/** TerminalPermissionPromptHandler 测试 — stdin 交互权限确认 + 解析 + 格式化 */

import { describe, expect, it, vi } from 'vitest';
import type { PermissionPromptRequest } from '@suga/ai-tool-core';
import type {
  NodeReadlineInterface,
  ReadlineFactory
} from '../provider/TerminalPermissionPromptHandler';
import {
  TerminalPermissionPromptHandler,
  formatRequestMessage,
  parseUserInput,
  reasonToDescription
} from '../provider/TerminalPermissionPromptHandler';

/** 辅助: 创建最小权限请求 */
function createRequest(overrides?: Partial<PermissionPromptRequest>): PermissionPromptRequest {
  return {
    requestId: 'prompt_test_001',
    toolName: 'bash',
    toolInput: { command: 'curl https://example.com' },
    reason: 'classifier_ask',
    message: '分类器建议确认 "bash" 的执行: Network operation unclear',
    currentMode: 'auto',
    ...overrides
  };
}

/** 辅助: 创建 mock stdout */
function createMockStdout() {
  const chunks: string[] = [];
  return {
    write: vi.fn((chunk: string) => {
      chunks.push(chunk);
      return true;
    }),
    _getOutput: () => chunks.join('')
  } as unknown as NodeJS.WritableStream & { _getOutput: () => string };
}

/** 辅助: 创建 mock readlineFactory — 立即返回指定输入 */
function createMockReadlineFactory(input: string | null): ReadlineFactory {
  return {
    createInterface: vi.fn(() => {
      const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
      const rl: NodeReadlineInterface = {
        once: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          if (!handlers[event]) handlers[event] = [];
          handlers[event].push(handler);
          // 立即触发（异步）
          if (event === 'line' && input !== null) {
            setTimeout(() => handler(input), 0);
          }
          if (event === 'close' && input === null) {
            setTimeout(() => handler(), 0);
          }
          return rl;
        }),
        close: vi.fn()
      };
      return rl;
    })
  };
}

/** 辅助: 创建带延迟触发能力的 mock readlineFactory */
function createDeferredMockReadlineFactory(): {
  factory: ReadlineFactory;
  emitLine: (line: string) => void;
  emitClose: () => void;
} {
  let lineHandler: ((line: string) => void) | null = null;
  let closeHandler: (() => void) | null = null;

  const factory: ReadlineFactory = {
    createInterface: vi.fn(() => {
      const rl: NodeReadlineInterface = {
        once: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          if (event === 'line') lineHandler = handler as (line: string) => void;
          if (event === 'close') closeHandler = handler as () => void;
          return rl;
        }),
        close: vi.fn()
      };
      return rl;
    })
  };

  return {
    factory,
    emitLine: (line: string) => {
      if (lineHandler) lineHandler(line);
    },
    emitClose: () => {
      if (closeHandler) closeHandler();
    }
  };
}

// ===== parseUserInput 纯函数测试 =====

describe('parseUserInput', () => {
  it('Y → approve + non-persistent', () => {
    const result = parseUserInput('Y');
    expect(result.behavior).toBe('approve');
    expect(result.persistent).toBe(false);
  });

  it('y → approve + non-persistent', () => {
    const result = parseUserInput('y');
    expect(result.behavior).toBe('approve');
    expect(result.persistent).toBe(false);
  });

  it('yes → approve + non-persistent', () => {
    const result = parseUserInput('yes');
    expect(result.behavior).toBe('approve');
    expect(result.persistent).toBe(false);
  });

  it('A → approve + persistent + session', () => {
    const result = parseUserInput('A');
    expect(result.behavior).toBe('approve');
    expect(result.persistent).toBe(true);
    expect(result.persistentTarget).toBe('session');
  });

  it('always → approve + persistent + session', () => {
    const result = parseUserInput('always');
    expect(result.behavior).toBe('approve');
    expect(result.persistent).toBe(true);
    expect(result.persistentTarget).toBe('session');
  });

  it('N → deny', () => {
    expect(parseUserInput('N').behavior).toBe('deny');
  });

  it('no → deny', () => {
    expect(parseUserInput('no').behavior).toBe('deny');
  });

  it('空输入 → deny（安全优先）', () => {
    expect(parseUserInput('').behavior).toBe('deny');
  });

  it('纯空格 → deny', () => {
    expect(parseUserInput('   ').behavior).toBe('deny');
  });

  it('不可解析 → deny + feedback', () => {
    const result = parseUserInput('maybe');
    expect(result.behavior).toBe('deny');
    expect(result.feedback).toContain('maybe');
  });
});

// ===== formatRequestMessage 纯函数测试 =====

describe('formatRequestMessage', () => {
  it('基本请求 → 包含工具名+原因+选项', () => {
    const message = formatRequestMessage(createRequest());
    expect(message).toContain('[Permission] Tool: bash');
    expect(message).toContain('AI分类器建议确认');
    expect(message).toContain('[Y]');
    expect(message).toContain('[A]');
    expect(message).toContain('[N]');
  });

  it('无 classifierSuggestion → 不输出分类器行', () => {
    const message = formatRequestMessage(createRequest({ classifierSuggestion: undefined }));
    expect(message).not.toContain('Classifier');
  });

  it('有 classifierSuggestion → 输出分类器建议', () => {
    const message = formatRequestMessage(
      createRequest({
        classifierSuggestion: {
          behavior: 'ask',
          reason: 'Network operation unclear',
          confidence: 'low'
        }
      })
    );
    expect(message).toContain('Classifier: ask');
    expect(message).toContain('Network operation');
  });

  it('consecutiveDenials > 0 → 输出拒绝计数', () => {
    const message = formatRequestMessage(createRequest({ consecutiveDenials: 2, totalDenials: 5 }));
    expect(message).toContain('2 consecutive');
    expect(message).toContain('5 total');
  });

  it('consecutiveDenials = 0 → 不输出拒绝计数', () => {
    const message = formatRequestMessage(createRequest({ consecutiveDenials: 0, totalDenials: 0 }));
    expect(message).not.toContain('consecutive');
  });

  it('各种 reason → 人类可读描述', () => {
    expect(reasonToDescription('ask_rule_match')).toBe('匹配了询问规则');
    expect(reasonToDescription('classifier_ask')).toBe('AI分类器建议确认');
    expect(reasonToDescription('tool_check_permissions')).toBe('工具要求确认');
    expect(reasonToDescription('unknown_reason')).toBe('unknown_reason');
  });
});

// ===== TerminalPermissionPromptHandler 交互测试 =====

describe('TerminalPermissionPromptHandler', () => {
  it('构造: 默认使用 process.stdin/stdout', () => {
    const handler = new TerminalPermissionPromptHandler();
    expect(handler).toBeDefined();
  });

  it('构造: 自定义 readlineFactory', () => {
    const factory = createMockReadlineFactory('Y');
    const handler = new TerminalPermissionPromptHandler({ readlineFactory: factory });
    expect(handler).toBeDefined();
  });

  it('prompt: Y 输入 → approve + non-persistent', async () => {
    const stdout = createMockStdout();
    const factory = createMockReadlineFactory('Y');
    const handler = new TerminalPermissionPromptHandler({
      stdin: process.stdin,
      stdout,
      readlineFactory: factory
    });

    const result = await handler.prompt(createRequest());

    expect(result.behavior).toBe('approve');
    expect(result.persistent).toBe(false);
  });

  it('prompt: A 输入 → approve + persistent + session', async () => {
    const stdout = createMockStdout();
    const factory = createMockReadlineFactory('A');
    const handler = new TerminalPermissionPromptHandler({
      stdin: process.stdin,
      stdout,
      readlineFactory: factory
    });

    const result = await handler.prompt(createRequest());

    expect(result.behavior).toBe('approve');
    expect(result.persistent).toBe(true);
    expect(result.persistentTarget).toBe('session');
  });

  it('prompt: N 输入 → deny', async () => {
    const stdout = createMockStdout();
    const factory = createMockReadlineFactory('N');
    const handler = new TerminalPermissionPromptHandler({
      stdin: process.stdin,
      stdout,
      readlineFactory: factory
    });

    const result = await handler.prompt(createRequest());

    expect(result.behavior).toBe('deny');
  });

  it('prompt: stdin 关闭 (null) → deny + feedback', async () => {
    const stdout = createMockStdout();
    const factory = createMockReadlineFactory(null); // stdin关闭
    const handler = new TerminalPermissionPromptHandler({
      stdin: process.stdin,
      stdout,
      readlineFactory: factory
    });

    const result = await handler.prompt(createRequest());

    expect(result.behavior).toBe('deny');
    expect(result.feedback).toContain('timed out');
  });

  it('prompt: stdout 输出格式化消息 + 提示符', async () => {
    const stdout = createMockStdout();
    const factory = createMockReadlineFactory('Y');
    const handler = new TerminalPermissionPromptHandler({
      stdin: process.stdin,
      stdout,
      readlineFactory: factory
    });

    await handler.prompt(createRequest({ toolName: 'file-write' }));

    const output = stdout._getOutput();
    expect(output).toContain('[Permission] Tool: file-write');
    expect(output).toContain('[Y]');
    expect(output).toContain('> ');
  });

  it('prompt: approve once → 输出决策摘要', async () => {
    const stdout = createMockStdout();
    const factory = createMockReadlineFactory('Y');
    const handler = new TerminalPermissionPromptHandler({
      stdin: process.stdin,
      stdout,
      readlineFactory: factory
    });

    await handler.prompt(createRequest({ toolName: 'bash' }));

    expect(stdout._getOutput()).toContain('Allow "bash" once');
  });

  it('prompt: always allow → 输出决策摘要', async () => {
    const stdout = createMockStdout();
    const factory = createMockReadlineFactory('A');
    const handler = new TerminalPermissionPromptHandler({
      stdin: process.stdin,
      stdout,
      readlineFactory: factory
    });

    await handler.prompt(createRequest({ toolName: 'bash' }));

    expect(stdout._getOutput()).toContain('Always allow "bash" for this session');
  });

  it('prompt: deny → 输出决策摘要', async () => {
    const stdout = createMockStdout();
    const factory = createMockReadlineFactory('N');
    const handler = new TerminalPermissionPromptHandler({
      stdin: process.stdin,
      stdout,
      readlineFactory: factory
    });

    await handler.prompt(createRequest({ toolName: 'bash' }));

    expect(stdout._getOutput()).toContain('Deny "bash"');
  });

  it('prompt: autoTimeout 超时 → auto-deny', async () => {
    const stdout = createMockStdout();
    const { factory } = createDeferredMockReadlineFactory();
    const handler = new TerminalPermissionPromptHandler({
      stdin: process.stdin,
      stdout,
      readlineFactory: factory,
      autoTimeout: 50 // 50ms 超时
    });

    // 启动 prompt（不会立即有 line 输入）
    const resultPromise = handler.prompt(createRequest());

    // 等超时触发
    const result = await resultPromise;

    expect(result.behavior).toBe('deny');
    expect(result.feedback).toContain('timed out');
  });

  it('prompt: autoTimeout 内用户输入 → 正常返回', async () => {
    const stdout = createMockStdout();
    const { factory, emitLine } = createDeferredMockReadlineFactory();
    const handler = new TerminalPermissionPromptHandler({
      stdin: process.stdin,
      stdout,
      readlineFactory: factory,
      autoTimeout: 5000 // 5秒超时（足够）
    });

    const resultPromise = handler.prompt(createRequest());

    // 在超时前手动触发 line
    setTimeout(() => emitLine('Y'), 10);

    const result = await resultPromise;

    expect(result.behavior).toBe('approve');
    expect(result.persistent).toBe(false);
  });

  it('prompt: 空行输入 → deny（安全优先）', async () => {
    const stdout = createMockStdout();
    const factory = createMockReadlineFactory(''); // 空输入
    const handler = new TerminalPermissionPromptHandler({
      stdin: process.stdin,
      stdout,
      readlineFactory: factory
    });

    const result = await handler.prompt(createRequest());

    expect(result.behavior).toBe('deny');
  });
});
