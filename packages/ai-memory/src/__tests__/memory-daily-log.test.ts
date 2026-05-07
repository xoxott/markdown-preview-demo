import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DAILY_LOG_CONFIG,
  buildDailyLogEntry,
  formatDailyLogForPrompt,
  getDailyLogFilename,
  isDailyLogFile,
  parseDailyLog,
  serializeDailyLog
} from '../core/memory-daily-log';
import type { DailyLogConfig } from '../core/memory-daily-log';

describe('buildDailyLogEntry', () => {
  it('builds entry with defaults', () => {
    const entry = buildDailyLogEntry({ summary: 'Worked on feature X' });
    expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(entry.summary).toBe('Worked on feature X');
    expect(entry.completed).toEqual([]);
    expect(entry.inProgress).toEqual([]);
    expect(entry.blockers).toEqual([]);
  });

  it('builds entry with all fields', () => {
    const entry = buildDailyLogEntry({
      date: '2026-05-06',
      summary: 'Fixed bug',
      completed: ['Bug fix', 'Tests'],
      inProgress: ['Feature Y'],
      blockers: ['Waiting on review'],
      nextSteps: ['Deploy', 'Write docs']
    });
    expect(entry.date).toBe('2026-05-06');
    expect(entry.completed).toEqual(['Bug fix', 'Tests']);
    expect(entry.nextSteps).toEqual(['Deploy', 'Write docs']);
  });
});

describe('serializeDailyLog', () => {
  it('serializes full entry', () => {
    const entry = buildDailyLogEntry({
      date: '2026-05-06',
      summary: 'Work day',
      completed: ['Task A'],
      blockers: ['Issue B']
    });
    const md = serializeDailyLog(entry);
    expect(md).toContain('daily-2026-05-06');
    expect(md).toContain('Task A');
    expect(md).toContain('Issue B');
  });

  it('empty lists → no sections', () => {
    const entry = buildDailyLogEntry({
      date: '2026-05-06',
      summary: 'Quiet day'
    });
    const md = serializeDailyLog(entry);
    expect(md).not.toContain('### Completed');
    expect(md).not.toContain('### Blockers');
  });
});

describe('parseDailyLog', () => {
  it('parses serialized entry', () => {
    const entry = buildDailyLogEntry({
      date: '2026-05-06',
      summary: 'Test day',
      completed: ['Task 1'],
      inProgress: ['Task 2']
    });
    const md = serializeDailyLog(entry);
    const parsed = parseDailyLog(md);
    expect(parsed).not.toBeNull();
    expect(parsed!.date).toBe('2026-05-06');
    expect(parsed!.summary).toBe('Test day');
    expect(parsed!.completed).toEqual(['Task 1']);
    expect(parsed!.inProgress).toEqual(['Task 2']);
  });

  it('non-daily-log content → null', () => {
    expect(parseDailyLog('random text')).toBeNull();
    expect(parseDailyLog('---\nname: not-daily\n---\n')).toBeNull();
  });
});

describe('formatDailyLogForPrompt', () => {
  it('formats entries for prompt', () => {
    const entries = [
      buildDailyLogEntry({ date: '2026-05-06', summary: 'Day 1', completed: ['A'] }),
      buildDailyLogEntry({ date: '2026-05-05', summary: 'Day 2' })
    ];
    const prompt = formatDailyLogForPrompt(entries);
    expect(prompt).toContain('Recent Daily Logs');
    expect(prompt).toContain('2026-05-06');
    expect(prompt).toContain('Day 1');
  });

  it('empty entries → empty string', () => {
    expect(formatDailyLogForPrompt([])).toBe('');
  });

  it('limits to maxEntries', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      buildDailyLogEntry({ date: `2026-05-0${i + 1}`, summary: `Day ${i + 1}` })
    );
    const prompt = formatDailyLogForPrompt(entries, 2);
    expect(prompt).toContain('2026-05-01');
    expect(prompt).not.toContain('2026-05-04');
  });
});

describe('getDailyLogFilename', () => {
  it('generates default filename', () => {
    expect(getDailyLogFilename('2026-05-06')).toBe('daily-2026-05-06.md');
  });

  it('uses custom template', () => {
    const config: DailyLogConfig = { enabled: true, filenameTemplate: 'log-{date}.md' };
    expect(getDailyLogFilename('2026-05-06', config)).toBe('log-2026-05-06.md');
  });
});

describe('isDailyLogFile', () => {
  it('recognizes daily log files', () => {
    expect(isDailyLogFile('daily-2026-05-06.md')).toBe(true);
    expect(isDailyLogFile('daily-2025-01-01.md')).toBe(true);
  });

  it('rejects non-daily files', () => {
    expect(isDailyLogFile('user_role.md')).toBe(false);
    expect(isDailyLogFile('daily.md')).toBe(false);
  });
});

describe('DEFAULT_DAILY_LOG_CONFIG', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_DAILY_LOG_CONFIG.enabled).toBe(true);
    expect(DEFAULT_DAILY_LOG_CONFIG.maxRetentionDays).toBe(30);
  });
});
