/** 文件过时检测测试 */

import { describe, expect, it } from 'vitest';
import { isStale } from '../utils/staleness-check';

describe('isStale', () => {
  it('无之前 mtime → 不过时（首次读取）', () => {
    expect(isStale(undefined, 1000)).toBe(false);
  });

  it('mtime 相同 → 不过时', () => {
    expect(isStale(1000, 1000)).toBe(false);
  });

  it('mtime 不同 → 过时', () => {
    expect(isStale(1000, 2000)).toBe(true);
  });

  it('无当前 mtime → 过时（保守判断）', () => {
    expect(isStale(1000, undefined)).toBe(true);
  });

  it('两者均 undefined → 过时', () => {
    expect(isStale(undefined, undefined)).toBe(false);
  });

  it('mtime 略有变化 → 过时', () => {
    expect(isStale(1000.0, 1000.1)).toBe(true);
  });
});
