import { describe, expect, it } from 'vitest';
import {
  INTERNAL_WORKER_TOOLS,
  StopTaskError,
  getCoordinatorUserContext,
  isCoordinatorMode,
  isTerminalTaskStatus,
  matchSessionMode
} from '../types';
import type {
  BackgroundTaskState,
  CoordinatorModeConfig,
  TaskDefinition,
  TaskHandle
} from '../types';

describe('isTerminalTaskStatus', () => {
  it('terminal statuses return true', () => {
    expect(isTerminalTaskStatus('completed')).toBe(true);
    expect(isTerminalTaskStatus('failed')).toBe(true);
    expect(isTerminalTaskStatus('cancelled')).toBe(true);
  });

  it('non-terminal statuses return false', () => {
    expect(isTerminalTaskStatus('pending')).toBe(false);
    expect(isTerminalTaskStatus('in_progress')).toBe(false);
    expect(isTerminalTaskStatus('blocked')).toBe(false);
  });
});

describe('StopTaskError', () => {
  it('creates error with taskId and reason', () => {
    const err = new StopTaskError('task_123', 'user cancelled');
    expect(err.name).toBe('StopTaskError');
    expect(err.taskId).toBe('task_123');
    expect(err.reason).toBe('user cancelled');
    expect(err.message).toContain('task_123');
  });
});

describe('TaskDefinition N10 fields', () => {
  it('notified/outputFile/endTime fields are usable', () => {
    const task: TaskDefinition = {
      taskId: 't1',
      subject: 'Test',
      status: 'completed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notified: true,
      outputFile: '/tmp/output.txt',
      outputOffset: 1024,
      endTime: Date.now() + 1000,
      totalPausedMs: 500,
      backgroundState: 'foreground'
    };
    expect(task.notified).toBe(true);
    expect(task.outputFile).toBe('/tmp/output.txt');
    expect(task.endTime).toBeDefined();
  });

  it('BackgroundTaskState type values', () => {
    const states: BackgroundTaskState[] = ['foreground', 'background'];
    expect(states).toHaveLength(2);
  });

  it('TaskHandle type is usable', () => {
    const handle: TaskHandle = {
      taskId: 't1',
      cleanup: () => {}
    };
    expect(handle.taskId).toBe('t1');
  });
});

describe('isCoordinatorMode', () => {
  it('returns true for coordinator mode', () => {
    expect(isCoordinatorMode({ mode: 'coordinator' })).toBe(true);
  });

  it('returns false for single mode', () => {
    expect(isCoordinatorMode({ mode: 'single' })).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCoordinatorMode(undefined)).toBe(false);
  });
});

describe('matchSessionMode', () => {
  it('explicit mode takes priority', () => {
    expect(matchSessionMode('coordinator', false)).toBe('coordinator');
    expect(matchSessionMode('single', true)).toBe('single');
  });

  it('team enabled → coordinator', () => {
    expect(matchSessionMode(undefined, true)).toBe('coordinator');
  });

  it('default → single', () => {
    expect(matchSessionMode(undefined, false)).toBe('single');
    expect(matchSessionMode()).toBe('single');
  });
});

describe('getCoordinatorUserContext', () => {
  it('returns context in coordinator mode', () => {
    const config: CoordinatorModeConfig = { mode: 'coordinator' };
    const ctx = getCoordinatorUserContext(config, ['slack']);
    expect(ctx).toBeDefined();
    expect(ctx!.mcpServerNames).toContain('slack');
    expect(ctx!.workerAllowlist.length).toBeGreaterThan(0);
  });

  it('returns undefined in single mode', () => {
    const config: CoordinatorModeConfig = { mode: 'single' };
    expect(getCoordinatorUserContext(config)).toBeUndefined();
  });
});

describe('INTERNAL_WORKER_TOOLS', () => {
  it('contains essential tools', () => {
    expect(INTERNAL_WORKER_TOOLS).toContain('bash');
    expect(INTERNAL_WORKER_TOOLS).toContain('file_read');
    expect(INTERNAL_WORKER_TOOLS).toContain('file_edit');
  });
});
