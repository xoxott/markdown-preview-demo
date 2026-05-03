/** P68 测试 — FileRead安全验证(设备保护+二进制拒绝+UNC路径+大小预检) */

import { describe, expect, it } from 'vitest';
import {
  checkFileSize,
  hasBinaryExtension,
  isBlockedDevicePath,
  isUncPath,
  validateFileReadSecurity
} from '../tools/file-read-security';

// ============================================================
// hasBinaryExtension
// ============================================================

describe('hasBinaryExtension', () => {
  it('.jpg → true', () => {
    expect(hasBinaryExtension('/photo.jpg')).toBe(true);
  });

  it('.png → true', () => {
    expect(hasBinaryExtension('/image.png')).toBe(true);
  });

  it('.exe → true', () => {
    expect(hasBinaryExtension('/program.exe')).toBe(true);
  });

  it('.zip → true', () => {
    expect(hasBinaryExtension('/archive.zip')).toBe(true);
  });

  it('.pdf → true', () => {
    expect(hasBinaryExtension('/doc.pdf')).toBe(true);
  });

  it('.ts → false', () => {
    expect(hasBinaryExtension('/code.ts')).toBe(false);
  });

  it('.txt → false', () => {
    expect(hasBinaryExtension('/readme.txt')).toBe(false);
  });

  it('.json → false', () => {
    expect(hasBinaryExtension('/data.json')).toBe(false);
  });

  it('.md → false', () => {
    expect(hasBinaryExtension('/doc.md')).toBe(false);
  });

  it('.PNG (大写) → true（大小写不敏感）', () => {
    expect(hasBinaryExtension('/image.PNG')).toBe(true);
  });
});

// ============================================================
// isBlockedDevicePath
// ============================================================

describe('isBlockedDevicePath', () => {
  it('/dev/zero → true', () => {
    expect(isBlockedDevicePath('/dev/zero')).toBe(true);
  });

  it('/dev/random → true', () => {
    expect(isBlockedDevicePath('/dev/random')).toBe(true);
  });

  it('/dev/null → true', () => {
    expect(isBlockedDevicePath('/dev/null')).toBe(true);
  });

  it('/dev/urandom → true', () => {
    expect(isBlockedDevicePath('/dev/urandom')).toBe(true);
  });

  it('/home/file.txt → false', () => {
    expect(isBlockedDevicePath('/home/file.txt')).toBe(false);
  });

  it('/dev/sda → false（不在阻止列表）', () => {
    expect(isBlockedDevicePath('/dev/sda')).toBe(false);
  });
});

// ============================================================
// isUncPath
// ============================================================

describe('isUncPath', () => {
  it('\\\\server\\path → true', () => {
    expect(isUncPath('\\\\server\\share\\file')).toBe(true);
  });

  it('//server/path → true', () => {
    expect(isUncPath('//server/share/file')).toBe(true);
  });

  it('/home/file → false', () => {
    expect(isUncPath('/home/file')).toBe(false);
  });

  it('C:\\file → false', () => {
    expect(isUncPath('C:\\file')).toBe(false);
  });
});

// ============================================================
// checkFileSize
// ============================================================

describe('checkFileSize', () => {
  it('500KB → allowed=true, isLarge=false', () => {
    const result = checkFileSize(500 * 1024);
    expect(result.allowed).toBe(true);
    expect(result.isLarge).toBe(false);
    expect(result.warning).toBeUndefined();
  });

  it('2MB → allowed=true, isLarge=true, warning', () => {
    const result = checkFileSize(2 * 1024 * 1024);
    expect(result.allowed).toBe(true);
    expect(result.isLarge).toBe(true);
    expect(result.warning).toContain('Large file');
  });

  it('15MB → allowed=false, denial', () => {
    const result = checkFileSize(15 * 1024 * 1024);
    expect(result.allowed).toBe(false);
    expect(result.denial).toContain('too large');
  });
});

// ============================================================
// validateFileReadSecurity — 综合
// ============================================================

describe('validateFileReadSecurity — 综合', () => {
  it('正常文件 → safe=true', () => {
    const result = validateFileReadSecurity('/home/code.ts');
    expect(result.safe).toBe(true);
    expect(result.blockedReason).toBeUndefined();
  });

  it('/dev/zero → safe=false(设备文件)', () => {
    const result = validateFileReadSecurity('/dev/zero');
    expect(result.safe).toBe(false);
    expect(result.blockedReason).toContain('device');
  });

  it('photo.jpg → safe=false(二进制)', () => {
    const result = validateFileReadSecurity('/photos/photo.jpg');
    expect(result.safe).toBe(false);
    expect(result.blockedReason).toContain('binary');
  });

  it('\\\\server\\path → safe=false(UNC)', () => {
    const result = validateFileReadSecurity('\\\\server\\share\\file');
    expect(result.safe).toBe(false);
    expect(result.blockedReason).toContain('UNC');
  });

  it('大文件(2MB) → safe=true+warning', () => {
    const result = validateFileReadSecurity('/home/big.txt', 2 * 1024 * 1024);
    expect(result.safe).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Large');
  });

  it('超大文件(20MB) → safe=false(大小)', () => {
    const result = validateFileReadSecurity('/home/huge.txt', 20 * 1024 * 1024);
    expect(result.safe).toBe(false);
    expect(result.blockedReason).toContain('too large');
  });

  it('checks列表包含所有检查类型', () => {
    const result = validateFileReadSecurity('/home/file.txt', 500);
    const types = result.checks.map(c => c.type);
    expect(types).toContain('device_path');
    expect(types).toContain('binary_extension');
    expect(types).toContain('unc_path');
    expect(types).toContain('file_size');
  });
});
