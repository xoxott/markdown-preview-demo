/** matchesPattern 测试 — 精确匹配 + glob 通配符 */

import { describe, expect, it } from 'vitest';
import { matchesPattern } from '../utils/match';

describe('matchesPattern', () => {
  describe('无 matcher（undefined）', () => {
    it('匹配所有', () => {
      expect(matchesPattern('Bash', undefined)).toBe(true);
      expect(matchesPattern('Write', undefined)).toBe(true);
      expect(matchesPattern('anything', undefined)).toBe(true);
    });
  });

  describe('精确匹配', () => {
    it('完全相同 → 匹配', () => {
      expect(matchesPattern('Bash', 'Bash')).toBe(true);
    });

    it('不同 → 不匹配', () => {
      expect(matchesPattern('Bash', 'Write')).toBe(false);
    });
  });

  describe('glob 通配符', () => {
    it('后缀通配符匹配', () => {
      expect(matchesPattern('BashTool', 'Bash*')).toBe(true);
      expect(matchesPattern('BashCommand', 'Bash*')).toBe(true);
    });

    it('通配符不匹配前缀不同', () => {
      expect(matchesPattern('WriteBash', 'Bash*')).toBe(false);
    });

    it('中间通配符', () => {
      expect(matchesPattern('FileEditTool', 'File*Tool')).toBe(true);
    });
  });
});