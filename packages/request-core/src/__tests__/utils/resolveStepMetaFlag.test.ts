import { describe, expect, it } from 'vitest';
import { resolveStepMetaFlag } from '../../utils/resolveStepMetaFlag';

describe('resolveStepMetaFlag', () => {
  it('meta 为 false 时返回 undefined', () => {
    expect(resolveStepMetaFlag(false, true)).toBeUndefined();
  });

  it('meta 有值时原样返回', () => {
    expect(resolveStepMetaFlag({ ttl: 60 }, true)).toEqual({ ttl: 60 });
    expect(resolveStepMetaFlag(true, false)).toBe(true);
  });

  it('meta 未设置且 enabledByDefault 为 true 时返回 true', () => {
    expect(resolveStepMetaFlag(undefined, true)).toBe(true);
  });

  it('meta 未设置且 enabledByDefault 为 false 时返回 undefined', () => {
    expect(resolveStepMetaFlag(undefined, false)).toBeUndefined();
  });
});
