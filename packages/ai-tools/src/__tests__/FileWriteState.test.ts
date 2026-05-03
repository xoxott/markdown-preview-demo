/** P67 测试 — FileWriteState(编码检测+mtime一致性+读写状态强制) */

import { describe, expect, it } from 'vitest';
import {
  FileWriteStateTracker,
  checkMtimeConsistency,
  detectFileEncoding,
  detectLineEnding,
  encodeContentForWrite,
  preserveLineEnding
} from '../tools/file-write-state';
import type { FileEncodingInfo } from '../tools/file-write-state';

// ============================================================
// detectLineEnding
// ============================================================

describe('detectLineEnding', () => {
  it('纯LF → lf', () => {
    expect(detectLineEnding('line1\nline2\nline3')).toBe('lf');
  });

  it('纯CRLF → crlf', () => {
    expect(detectLineEnding('line1\r\nline2\r\nline3')).toBe('crlf');
  });

  it('混合LF+CRLF → mixed', () => {
    expect(detectLineEnding('line1\nline2\r\nline3')).toBe('mixed');
  });

  it('无换行符 → lf（默认）', () => {
    expect(detectLineEnding('no newlines')).toBe('lf');
  });
});

// ============================================================
// detectFileEncoding
// ============================================================

describe('detectFileEncoding — 字符串输入', () => {
  it('字符串 → utf-8', () => {
    const result = detectFileEncoding('hello world');
    expect(result.encoding).toBe('utf-8');
    expect(result.hasBOM).toBe(false);
    expect(result.bomBytes.length).toBe(0);
  });

  it('字符串含CRLF → crlf行尾', () => {
    const result = detectFileEncoding('line1\r\nline2\r\n');
    expect(result.lineEnding).toBe('crlf');
  });
});

describe('detectFileEncoding — Buffer输入', () => {
  it('UTF-16LE BOM → utf-16le', () => {
    const buf = Buffer.from([0xff, 0xfe, 0x48, 0x00, 0x69, 0x00]); // "Hi" in UTF-16LE
    const result = detectFileEncoding(buf);
    expect(result.encoding).toBe('utf-16le');
    expect(result.hasBOM).toBe(true);
    expect(result.bomBytes).toEqual([0xff, 0xfe]);
  });

  it('UTF-16BE BOM → utf-16be', () => {
    const buf = Buffer.from([0xfe, 0xff, 0x00, 0x48, 0x00, 0x69]); // "Hi" in UTF-16BE
    const result = detectFileEncoding(buf);
    expect(result.encoding).toBe('utf-16be');
    expect(result.hasBOM).toBe(true);
  });

  it('UTF-8 BOM → utf-8+hasBOM', () => {
    const content = '\xEF\xBB\xBFhello world';
    const buf = Buffer.from(content, 'binary');
    const result = detectFileEncoding(buf);
    expect(result.encoding).toBe('utf-8');
    expect(result.hasBOM).toBe(true);
    expect(result.bomBytes).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('无BOM Buffer → utf-8', () => {
    const buf = Buffer.from('hello world', 'utf-8');
    const result = detectFileEncoding(buf);
    expect(result.encoding).toBe('utf-8');
    expect(result.hasBOM).toBe(false);
  });

  it('短Buffer(<2字节) → utf-8', () => {
    const buf = Buffer.from([0x48]); // "H"
    const result = detectFileEncoding(buf);
    expect(result.encoding).toBe('utf-8');
    expect(result.hasBOM).toBe(false);
  });
});

// ============================================================
// preserveLineEnding
// ============================================================

describe('preserveLineEnding', () => {
  it('LF内容+CRLF目标 → 转换为CRLF', () => {
    const result = preserveLineEnding('line1\nline2\n', 'crlf');
    expect(result).toBe('line1\r\nline2\r\n');
  });

  it('CRLF内容+LF目标 → 转换为LF', () => {
    const result = preserveLineEnding('line1\r\nline2\r\n', 'lf');
    expect(result).toBe('line1\nline2\n');
  });

  it('LF内容+LF目标 → 保持LF', () => {
    const result = preserveLineEnding('line1\nline2\n', 'lf');
    expect(result).toBe('line1\nline2\n');
  });

  it('CRLF内容+CRLF目标 → 保持CRLF', () => {
    const result = preserveLineEnding('line1\r\nline2\r\n', 'crlf');
    expect(result).toBe('line1\r\nline2\r\n');
  });

  it('mixed → 统一为LF', () => {
    const result = preserveLineEnding('line1\nline2\r\nline3', 'mixed');
    expect(result).toBe('line1\nline2\nline3');
  });
});

// ============================================================
// encodeContentForWrite
// ============================================================

describe('encodeContentForWrite', () => {
  it('UTF-8无BOM → 直接返回字符串', () => {
    const info: FileEncodingInfo = {
      encoding: 'utf-8',
      hasBOM: false,
      bomBytes: [],
      lineEnding: 'lf',
      crlfRatio: 0
    };
    const result = encodeContentForWrite('hello', info);
    expect(result).toBe('hello');
  });

  it('UTF-8有BOM → Buffer含BOM前缀', () => {
    const info: FileEncodingInfo = {
      encoding: 'utf-8',
      hasBOM: true,
      bomBytes: [0xef, 0xbb, 0xbf],
      lineEnding: 'lf',
      crlfRatio: 0
    };
    const result = encodeContentForWrite('hello', info);
    expect(result).toBeInstanceOf(Buffer);
    const buf = result as Buffer;
    expect(buf[0]).toBe(0xef);
    expect(buf[1]).toBe(0xbb);
    expect(buf[2]).toBe(0xbf);
  });

  it('UTF-16LE → Buffer含BOM', () => {
    const info: FileEncodingInfo = {
      encoding: 'utf-16le',
      hasBOM: true,
      bomBytes: [0xff, 0xfe],
      lineEnding: 'lf',
      crlfRatio: 0
    };
    const result = encodeContentForWrite('Hi', info);
    expect(result).toBeInstanceOf(Buffer);
    const buf = result as Buffer;
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xfe);
  });
});

// ============================================================
// checkMtimeConsistency
// ============================================================

describe('checkMtimeConsistency', () => {
  it('mtime一致 → consistent=true', () => {
    const result = checkMtimeConsistency(
      { filePath: '/test.txt', mtimeMs: 1000, readAt: Date.now() },
      1000
    );
    expect(result.consistent).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('mtime不一致 → consistent=false+warning', () => {
    const result = checkMtimeConsistency(
      { filePath: '/test.txt', mtimeMs: 1000, readAt: Date.now() },
      2000
    );
    expect(result.consistent).toBe(false);
    expect(result.warning).toContain('modified since last read');
  });
});

// ============================================================
// FileWriteStateTracker
// ============================================================

describe('FileWriteStateTracker', () => {
  it('记录Read → hasBeenRead=true', () => {
    const tracker = new FileWriteStateTracker();
    tracker.recordRead('/test.txt', 1000);
    expect(tracker.hasBeenRead('/test.txt')).toBe(true);
  });

  it('未记录 → hasBeenRead=false', () => {
    const tracker = new FileWriteStateTracker();
    expect(tracker.hasBeenRead('/test.txt')).toBe(false);
  });

  it('清除状态 → hasBeenRead=false', () => {
    const tracker = new FileWriteStateTracker();
    tracker.recordRead('/test.txt', 1000);
    tracker.clearReadState('/test.txt');
    expect(tracker.hasBeenRead('/test.txt')).toBe(false);
  });

  it('validateWrite — 已Read → allowed=true', () => {
    const tracker = new FileWriteStateTracker();
    tracker.recordRead('/test.txt', 1000);
    const result = tracker.validateWriteRequirement('/test.txt', false);
    expect(result.allowed).toBe(true);
  });

  it('validateWrite — 未Read+旧文件 → allowed=false', () => {
    const tracker = new FileWriteStateTracker();
    const result = tracker.validateWriteRequirement('/test.txt', false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('must be read');
  });

  it('validateWrite — 未Read+新文件 → allowed=true', () => {
    const tracker = new FileWriteStateTracker();
    const result = tracker.validateWriteRequirement('/new.txt', true);
    expect(result.allowed).toBe(true);
  });

  it('checkMtime — 一致 → consistent=true', () => {
    const tracker = new FileWriteStateTracker();
    tracker.recordRead('/test.txt', 1000);
    const result = tracker.checkMtime('/test.txt', 1000);
    expect(result?.consistent).toBe(true);
  });

  it('checkMtime — 不一致 → consistent=false', () => {
    const tracker = new FileWriteStateTracker();
    tracker.recordRead('/test.txt', 1000);
    const result = tracker.checkMtime('/test.txt', 2000);
    expect(result?.consistent).toBe(false);
  });

  it('checkMtime — 未Read → null', () => {
    const tracker = new FileWriteStateTracker();
    const result = tracker.checkMtime('/test.txt', 1000);
    expect(result).toBeNull();
  });
});
