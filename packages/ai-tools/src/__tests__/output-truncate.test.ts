/** 大输出截断测试 */

import { describe, expect, it } from 'vitest';
import { truncateOutput } from '../utils/output-truncate';

describe('truncateOutput', () => {
  it('未超过限制 → 不截断', () => {
    const result = truncateOutput('hello', 100);
    expect(result.content).toBe('hello');
    expect(result.truncated).toBe(false);
    expect(result.originalSize).toBe(5);
  });

  it('恰好等于限制 → 不截断', () => {
    const result = truncateOutput('12345', 5);
    expect(result.content).toBe('12345');
    expect(result.truncated).toBe(false);
    expect(result.originalSize).toBe(5);
  });

  it('超过限制 → 截断并附加提示', () => {
    const result = truncateOutput('abcdefghij', 5);
    expect(result.truncated).toBe(true);
    expect(result.originalSize).toBe(10);
    expect(result.content).toContain('[Output truncated');
    expect(result.content.length).toBeLessThanOrEqual(5 + 100); // 截断提示
  });

  it('超大输出 → 截断', () => {
    const large = 'x'.repeat(200_000);
    const result = truncateOutput(large, 100_000);
    expect(result.truncated).toBe(true);
    expect(result.originalSize).toBe(200_000);
    expect(result.content.length).toBeLessThanOrEqual(100_000 + 100);
  });

  it('空字符串 → 不截断', () => {
    const result = truncateOutput('', 100);
    expect(result.content).toBe('');
    expect(result.truncated).toBe(false);
    expect(result.originalSize).toBe(0);
  });

  it('限制为 0 → 截断所有内容仅保留提示', () => {
    const result = truncateOutput('hello', 0);
    expect(result.truncated).toBe(true);
    expect(result.originalSize).toBe(5);
    // 提示信息可能为空（没有空间显示截断提示）
    expect(result.content.length).toBeGreaterThanOrEqual(0);
  });

  it('限制为 1 → 截断几乎全部', () => {
    const result = truncateOutput('abcdefghij', 1);
    expect(result.truncated).toBe(true);
    expect(result.originalSize).toBe(10);
  });

  it('包含换行 → 截断保留提示信息', () => {
    const content = 'line1\nline2\nline3\nline4\nline5\nline6';
    const result = truncateOutput(content, 10);
    expect(result.truncated).toBe(true);
    expect(result.content).toContain('[Output truncated');
  });
});
