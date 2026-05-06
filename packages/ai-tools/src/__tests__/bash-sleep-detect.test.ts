import { describe, expect, it } from 'vitest';
import { detectSleepCommand } from '../tools/bash-sleep-detect';

describe('detectSleepCommand', () => {
  it('not a sleep command', () => {
    expect(detectSleepCommand('ls -la').isSleepCommand).toBe(false);
    expect(detectSleepCommand('echo hello').isSleepCommand).toBe(false);
    expect(detectSleepCommand('').isSleepCommand).toBe(false);
  });

  it('sleep 1 → too short', () => {
    expect(detectSleepCommand('sleep 1').isSleepCommand).toBe(false);
  });

  it('sleep 2 → detected', () => {
    const r = detectSleepCommand('sleep 2');
    expect(r.isSleepCommand).toBe(true);
    expect(r.sleepSeconds).toBe(2);
    expect(r.suggestion).toContain('后台运行');
  });

  it('sleep 60 → with minutes display', () => {
    const r = detectSleepCommand('sleep 60');
    expect(r.isSleepCommand).toBe(true);
    expect(r.sleepSeconds).toBe(60);
    expect(r.suggestion).toContain('1分');
  });

  it('sleep 0.5 → too short', () => {
    expect(detectSleepCommand('sleep 0.5').isSleepCommand).toBe(false);
  });

  it('sleep 5m → minutes unit', () => {
    const r = detectSleepCommand('sleep 5m');
    expect(r.isSleepCommand).toBe(true);
    expect(r.sleepSeconds).toBe(300);
  });

  it('sleep 1h → hours unit', () => {
    const r = detectSleepCommand('sleep 1h');
    expect(r.isSleepCommand).toBe(true);
    expect(r.sleepSeconds).toBe(3600);
  });

  it('sleep 1s → too short (unit suffix)', () => {
    expect(detectSleepCommand('sleep 1s').isSleepCommand).toBe(false);
  });

  it('sleep embedded in compound → not detected', () => {
    expect(detectSleepCommand('build && sleep 5').isSleepCommand).toBe(false);
    expect(detectSleepCommand('sleep 3; echo done').isSleepCommand).toBe(false);
    expect(detectSleepCommand('cd /tmp && sleep 10 && ls').isSleepCommand).toBe(false);
  });

  it('sleep with extra args → not pure sleep', () => {
    expect(detectSleepCommand('sleep 5 extra').isSleepCommand).toBe(false);
  });
});
