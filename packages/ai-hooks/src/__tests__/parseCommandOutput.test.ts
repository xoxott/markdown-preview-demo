/** parseCommandOutput 测试 */

import { describe, expect, it } from 'vitest';
import { parseCommandOutput } from '../utils/parseCommandOutput';

describe('parseCommandOutput', () => {
  describe('exit code 映射', () => {
    it('exit code 0 + JSON 输出 → success', () => {
      const result = parseCommandOutput(
        JSON.stringify({ continue: true, additionalContext: 'lint passed' }),
        '',
        0
      );
      expect(result.outcome).toBe('success');
      expect(result.additionalContext).toBe('lint passed');
    });

    it('exit code 0 + 纯文本 → success with additionalContext', () => {
      const result = parseCommandOutput('lint passed: no errors', '', 0);
      expect(result.outcome).toBe('success');
      expect(result.additionalContext).toBe('lint passed: no errors');
    });

    it('exit code 0 + 空输出 → success', () => {
      const result = parseCommandOutput('', '', 0);
      expect(result.outcome).toBe('success');
    });

    it('exit code 2 → blocking', () => {
      const result = parseCommandOutput('', 'security check failed', 2);
      expect(result.outcome).toBe('blocking');
      expect(result.preventContinuation).toBe(true);
      expect(result.stopReason).toBe('security check failed');
    });

    it('exit code 2 + 空 stderr → blocking with stdout', () => {
      const result = parseCommandOutput('blocking reason', '', 2);
      expect(result.outcome).toBe('blocking');
      expect(result.stopReason).toBe('blocking reason');
    });

    it('exit code 1 → non_blocking_error', () => {
      const result = parseCommandOutput('', 'command not found', 1);
      expect(result.outcome).toBe('non_blocking_error');
      expect(result.error).toBe('command not found');
    });

    it('exit code 137 → non_blocking_error', () => {
      const result = parseCommandOutput('', '', 137);
      expect(result.outcome).toBe('non_blocking_error');
    });
  });

  describe('JSON 输出解析', () => {
    it('decision=block → blocking', () => {
      const result = parseCommandOutput(
        JSON.stringify({ decision: 'block', reason: 'unsafe operation' }),
        '',
        0
      );
      expect(result.outcome).toBe('blocking');
      expect(result.stopReason).toBe('unsafe operation');
    });

    it('continue=false → blocking', () => {
      const result = parseCommandOutput(
        JSON.stringify({ continue: false, reason: 'stopped by policy' }),
        '',
        0
      );
      expect(result.outcome).toBe('blocking');
    });

    it('decision=approve → success', () => {
      const result = parseCommandOutput(
        JSON.stringify({ decision: 'approve', additionalContext: 'approved' }),
        '',
        0
      );
      expect(result.outcome).toBe('success');
    });

    it('updatedInput → 映射到 HookResult', () => {
      const result = parseCommandOutput(
        JSON.stringify({ continue: true, updatedInput: { command: 'ls -la' } }),
        '',
        0
      );
      expect(result.outcome).toBe('success');
      expect(result.updatedInput).toEqual({ command: 'ls -la' });
    });

    it('systemMessage → additionalContext', () => {
      const result = parseCommandOutput(
        JSON.stringify({ continue: true, systemMessage: 'warning: deprecated' }),
        '',
        0
      );
      expect(result.additionalContext).toBe('warning: deprecated');
    });
  });

  describe('无效 JSON fallback', () => {
    it('非 JSON 文本 → additionalContext', () => {
      const result = parseCommandOutput('plain text output', '', 0);
      expect(result.outcome).toBe('success');
      expect(result.additionalContext).toBe('plain text output');
    });

    it('部分 JSON → additionalContext', () => {
      const result = parseCommandOutput('{"incomplete":', '', 0);
      expect(result.outcome).toBe('success');
      expect(result.additionalContext).toBe('{"incomplete":');
    });
  });
});
