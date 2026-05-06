/** file-desanitize 测试 */

import { describe, expect, it } from 'vitest';
import { containsSanitizedMarkers, desanitizeContent } from '../tools/file-desanitize';

describe('desanitizeContent', () => {
  it('removes fnr markers', () => {
    expect(desanitizeContent('function<fnr>name</fnr>()')).toBe('functionname()');
  });

  it('removes antml markers', () => {
    expect(desanitizeContent('<antml:parameter>value</antml:parameter>')).toBe('value');
  });

  it('removes multiple markers', () => {
    expect(desanitizeContent('call<fnr>func</fnr>(<antml:parameter>x</antml:parameter>)')).toBe(
      'callfunc(x)'
    );
  });

  it('no markers → unchanged', () => {
    expect(desanitizeContent('normal code')).toBe('normal code');
  });

  it('empty string → unchanged', () => {
    expect(desanitizeContent('')).toBe('');
  });
});

describe('containsSanitizedMarkers', () => {
  it('detects fnr', () => {
    expect(containsSanitizedMarkers('<fnr>test</fnr>')).toBe(true);
  });

  it('detects single fnr open', () => {
    expect(containsSanitizedMarkers('code<fnr>more')).toBe(true);
  });

  it('detects antml', () => {
    expect(containsSanitizedMarkers('<antml:parameter>')).toBe(true);
  });

  it('no markers → false', () => {
    expect(containsSanitizedMarkers('normal code')).toBe(false);
  });

  it('empty string → false', () => {
    expect(containsSanitizedMarkers('')).toBe(false);
  });
});
