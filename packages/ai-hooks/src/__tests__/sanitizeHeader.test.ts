/** sanitizeHeaderValue 测试 */

import { describe, expect, it } from 'vitest';
import { sanitizeHeaderValue } from '../utils/sanitizeHeader';

describe('sanitizeHeaderValue', () => {
  it('应剥离 CR (\\r)', () => {
    expect(sanitizeHeaderValue('value\rwith\rCR')).toBe('valuewithCR');
  });

  it('应剥离 LF (\\n)', () => {
    expect(sanitizeHeaderValue('value\nwith\nLF')).toBe('valuewithLF');
  });

  it('应剥离 CRLF (\\r\\n)', () => {
    expect(sanitizeHeaderValue('value\r\n\r\nwithCRLF')).toBe('valuewithCRLF');
  });

  it('应剥离 NUL (\\0)', () => {
    expect(sanitizeHeaderValue('value\0with\0NUL')).toBe('valuewithNUL');
  });

  it('应混合剥离 CR+LF+NUL', () => {
    expect(sanitizeHeaderValue('v\r\n\0a\r\0b\n\0')).toBe('vab');
  });

  it('正常字符串应不变', () => {
    expect(sanitizeHeaderValue('Content-Type: application/json')).toBe(
      'Content-Type: application/json'
    );
  });

  it('空字符串应不变', () => {
    expect(sanitizeHeaderValue('')).toBe('');
  });
});
