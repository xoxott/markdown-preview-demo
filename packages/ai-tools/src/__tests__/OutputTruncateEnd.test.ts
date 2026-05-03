/** P73 测试 — Bash输出截断升级(尾部保留+持久化+搜索折叠) */

import { describe, expect, it } from 'vitest';
import {
  foldSearchOutput,
  persistLargeOutput,
  truncateOutputWithTail
} from '../utils/output-truncate-end';

// ============================================================
// truncateOutputWithTail — 双段截断
// ============================================================

describe('truncateOutputWithTail — 不截断', () => {
  it('短输出 → 不截断', () => {
    const result = truncateOutputWithTail('short output', 1000);
    expect(result.truncated).toBe(false);
    expect(result.content).toBe('short output');
    expect(result.headSize).toBe(12);
    expect(result.omittedSize).toBe(0);
  });
});

describe('truncateOutputWithTail — 双段截断', () => {
  it('长输出 → 截断(头部+尾部保留)', () => {
    const longOutput = 'a\n'.repeat(5000); // ~10000 chars
    const result = truncateOutputWithTail(longOutput, 1000);
    expect(result.truncated).toBe(true);
    expect(result.originalSize).toBeGreaterThan(9000);
    expect(result.content.length).toBeLessThanOrEqual(1200); // 含省略提示
    expect(result.content).toContain('lines omitted');
    // 头部应该是 'a\na\n...'
    expect(result.content.substring(0, 10)).toContain('a');
  });

  it('headRatio=0.5 → 头尾各半', () => {
    const output = 'x'.repeat(1000);
    const result = truncateOutputWithTail(output, 500, 0.5);
    expect(result.truncated).toBe(true);
  });

  it('尾部保留关键信息', () => {
    const output = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');
    const result = truncateOutputWithTail(output, 200, 0.7);
    // 尾部应该包含 "line 99"（最后一行）
    expect(result.content).toContain('line 99');
  });
});

// ============================================================
// persistLargeOutput
// ============================================================

describe('persistLargeOutput', () => {
  it('小输出 → 不持久化', () => {
    const result = persistLargeOutput('small output', 500_000);
    expect(result.persisted).toBe(false);
    expect(result.content).toBe('small output');
  });

  it('大输出 → 持久化+截断摘要', () => {
    const largeOutput = 'x'.repeat(600_000);
    const result = persistLargeOutput(largeOutput, 500_000, 100_000);
    expect(result.persisted).toBe(true);
    expect(result.originalSize).toBe(600_000);
    expect(result.content.length).toBeLessThan(200_000);
    expect(result.content).toContain('persisted');
  });
});

// ============================================================
// foldSearchOutput — 搜索命令折叠
// ============================================================

describe('foldSearchOutput — 非搜索命令', () => {
  it('ls → 不折叠', () => {
    const result = foldSearchOutput('ls', 'line1\nline2\nline3');
    expect(result.folded).toBe(false);
  });

  it('cat → 不折叠', () => {
    const result = foldSearchOutput('cat file.txt', 'output');
    expect(result.folded).toBe(false);
  });
});

describe('foldSearchOutput — 搜索命令短输出', () => {
  it('grep 短输出 → 不折叠', () => {
    const result = foldSearchOutput('grep pattern file', 'line1\nline2\nline3', 50);
    expect(result.folded).toBe(false);
    expect(result.content).toBe('line1\nline2\nline3');
  });
});

describe('foldSearchOutput — 搜索命令长输出', () => {
  it('grep 长输出 → 折叠(头部+尾部+省略)', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `match ${i}: some text`);
    const output = lines.join('\n');
    const result = foldSearchOutput('grep pattern dir', output, 50, 20, 10);
    expect(result.folded).toBe(true);
    expect(result.matchCount).toBe(100);
    expect(result.content).toContain('match 0');
    expect(result.content).toContain('omitted');
    expect(result.content).toContain('match 99'); // 尾部最后一行
  });

  it('find 长输出 → 投折', () => {
    const lines = Array.from({ length: 200 }, (_, i) => `/path/to/file${i}.ts`);
    const output = lines.join('\n');
    const result = foldSearchOutput('find . -name "*.ts"', output, 50, 20, 10);
    expect(result.folded).toBe(true);
    expect(result.content).toContain('omitted');
  });

  it('rg → 投折', () => {
    const lines = Array.from({ length: 80 }, (_, i) => `result ${i}`);
    const output = lines.join('\n');
    const result = foldSearchOutput('rg pattern dir', output, 50, 20, 10);
    expect(result.folded).toBe(true);
  });
});
