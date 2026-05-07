/** G25: interpretCommandResult 测试 */

import { describe, expect, it } from 'vitest';
import { interpretCommandResult } from '../tools/bash-interpret';

describe('interpretCommandResult', () => {
  it('exitCode=0 → success', () => {
    const result = interpretCommandResult(0);
    expect(result.status).toBe('success');
    expect(result.description).toContain('successfully');
  });

  it('exitCode=127 → command_not_found', () => {
    const result = interpretCommandResult(127);
    expect(result.status).toBe('command_not_found');
    expect(result.suggestion).toContain('PATH');
  });

  it('exitCode=126 → permission_denied', () => {
    const result = interpretCommandResult(126);
    expect(result.status).toBe('permission_denied');
    expect(result.suggestion).toContain('chmod');
  });

  it('exitCode=2 → syntax_error', () => {
    const result = interpretCommandResult(2);
    expect(result.status).toBe('syntax_error');
  });

  it('exitCode=137 (128+9) → signal_killed (SIGKILL)', () => {
    const result = interpretCommandResult(137);
    expect(result.status).toBe('signal_killed');
    expect(result.description).toContain('SIGKILL');
  });

  it('exitCode=130 (128+2) → signal_killed (SIGINT)', () => {
    const result = interpretCommandResult(130);
    expect(result.status).toBe('signal_killed');
    expect(result.description).toContain('SIGINT');
  });

  it('timedOut=true → timeout', () => {
    const result = interpretCommandResult(0, '', true);
    expect(result.status).toBe('timeout');
    expect(result.suggestion).toContain('timeout');
  });

  it('exitCode=-1 → timeout (suga约定)', () => {
    const result = interpretCommandResult(-1);
    expect(result.status).toBe('timeout');
  });

  it('exitCode=1 + stderr → general_failure with stderr snippet', () => {
    const result = interpretCommandResult(1, 'Error: something went wrong');
    expect(result.status).toBe('general_failure');
    expect(result.description).toContain('something went wrong');
  });

  it('exitCode=1 无 stderr → general_failure', () => {
    const result = interpretCommandResult(1);
    expect(result.status).toBe('general_failure');
    expect(result.description).toContain('exit code 1');
  });
});
