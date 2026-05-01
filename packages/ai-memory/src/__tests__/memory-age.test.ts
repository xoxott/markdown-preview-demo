/** MemoryAge 测试 — 年龄/鲜度纯函数 */

import { describe, expect, it } from 'vitest';
import {
  memoryAge,
  memoryAgeDays,
  memoryAgeInfo,
  memoryFreshnessNote,
  memoryFreshnessText
} from '../core/memory-age';
import {
  FRESH_THRESHOLD_DAYS,
  STALE_THRESHOLD_DAYS,
  VERY_STALE_THRESHOLD_DAYS
} from '../types/memory-age';

/** 固定 now 时间 — 2026-05-01 00:00 UTC */
const NOW_MS = 1743465600000;

describe('MemoryAge — memoryAgeDays', () => {
  it('当天 → 0', () => {
    expect(memoryAgeDays(NOW_MS, NOW_MS)).toBe(0);
  });

  it('1天前 → 1', () => {
    expect(memoryAgeDays(NOW_MS - 24 * 60 * 60 * 1000, NOW_MS)).toBe(1);
  });

  it('7天前 → 7', () => {
    expect(memoryAgeDays(NOW_MS - 7 * 24 * 60 * 60 * 1000, NOW_MS)).toBe(7);
  });

  it('未来时间 → 钳制为 0', () => {
    expect(memoryAgeDays(NOW_MS + 100000, NOW_MS)).toBe(0);
  });

  it('默认 nowMs → Date.now()', () => {
    const mtimeMs = Date.now() - 24 * 60 * 60 * 1000;
    expect(memoryAgeDays(mtimeMs)).toBe(1);
  });
});

describe('MemoryAge — memoryAge', () => {
  it('0天 → today', () => {
    expect(memoryAge(NOW_MS, NOW_MS)).toBe('today');
  });

  it('1天 → yesterday', () => {
    expect(memoryAge(NOW_MS - 24 * 60 * 60 * 1000, NOW_MS)).toBe('yesterday');
  });

  it('3天 → 3 days', () => {
    expect(memoryAge(NOW_MS - 3 * 24 * 60 * 60 * 1000, NOW_MS)).toBe('3 days');
  });

  it('14天 → 2 weeks', () => {
    expect(memoryAge(NOW_MS - 14 * 24 * 60 * 60 * 1000, NOW_MS)).toBe('2 weeks');
  });

  it('60天 → 2 months', () => {
    expect(memoryAge(NOW_MS - 60 * 24 * 60 * 60 * 1000, NOW_MS)).toBe('2 months');
  });

  it('365天 → 1 year', () => {
    expect(memoryAge(NOW_MS - 365 * 24 * 60 * 60 * 1000, NOW_MS)).toBe('1 year');
  });
});

describe('MemoryAge — memoryFreshnessText', () => {
  it('< 7天 → fresh', () => {
    expect(memoryFreshnessText(NOW_MS, NOW_MS)).toBe('fresh');
    expect(memoryFreshnessText(NOW_MS - 6 * 24 * 60 * 60 * 1000, NOW_MS)).toBe('fresh');
  });

  it('7-29天 → stale', () => {
    expect(memoryFreshnessText(NOW_MS - 7 * 24 * 60 * 60 * 1000, NOW_MS)).toBe('stale');
    expect(memoryFreshnessText(NOW_MS - 29 * 24 * 60 * 60 * 1000, NOW_MS)).toBe('stale');
  });

  it('≥ 30天 → very stale', () => {
    expect(memoryFreshnessText(NOW_MS - 30 * 24 * 60 * 60 * 1000, NOW_MS)).toBe('very stale');
    expect(memoryFreshnessText(NOW_MS - 365 * 24 * 60 * 60 * 1000, NOW_MS)).toBe('very stale');
  });
});

describe('MemoryAge — memoryFreshnessNote', () => {
  it('fresh → 空字符串', () => {
    expect(memoryFreshnessNote(NOW_MS, NOW_MS)).toBe('');
  });

  it('stale → 含 stale + 年龄', () => {
    const note = memoryFreshnessNote(NOW_MS - 10 * 24 * 60 * 60 * 1000, NOW_MS);
    expect(note).toContain('stale');
    expect(note).toContain('10 days');
  });

  it('very stale → 含 very stale + 年龄', () => {
    const note = memoryFreshnessNote(NOW_MS - 60 * 24 * 60 * 60 * 1000, NOW_MS);
    expect(note).toContain('very stale');
    expect(note).toContain('2 months');
  });
});

describe('MemoryAge — memoryAgeInfo', () => {
  it('聚合所有年龄信息', () => {
    const info = memoryAgeInfo(NOW_MS - 10 * 24 * 60 * 60 * 1000, NOW_MS);
    expect(info.ageDays).toBe(10);
    expect(info.ageText).toBe('10 days');
    expect(info.freshnessText).toBe('stale');
    expect(info.freshnessNote).toContain('stale');
  });

  it('fresh → freshnessNote 为空', () => {
    const info = memoryAgeInfo(NOW_MS, NOW_MS);
    expect(info.freshnessNote).toBe('');
  });
});

describe('MemoryAge — 阈值常量', () => {
  it('阈值正确', () => {
    expect(FRESH_THRESHOLD_DAYS).toBe(7);
    expect(STALE_THRESHOLD_DAYS).toBe(30);
    expect(VERY_STALE_THRESHOLD_DAYS).toBe(90);
  });
});
