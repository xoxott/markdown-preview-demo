/** /doctor 命令测试 — buildDoctorPrompt + SkillDefinition + DiagnosticProvider */

import { describe, expect, it } from 'vitest';
import { buildDoctorPrompt, doctorSkill } from '../../commands/tier1/doctor';
import type { DiagnosticReport } from '../../types/providers';
import { MockDiagnosticProvider } from '../mocks/MockDiagnosticProvider';

const MOCK_REPORT: DiagnosticReport = {
  checks: [
    { name: 'Node.js version', status: 'pass', message: 'v20.11.0' },
    { name: 'Git availability', status: 'fail', message: 'git not found' },
    { name: 'Permissions', status: 'warn', message: 'Restricted mode' }
  ],
  passCount: 1,
  failCount: 1,
  warnCount: 1
};

describe('buildDoctorPrompt — 纯函数', () => {
  it('完整报告 → 格式化', () => {
    const prompt = buildDoctorPrompt({ report: MOCK_REPORT });
    expect(prompt).toContain('Diagnostic Report');
    expect(prompt).toContain('✓');
    expect(prompt).toContain('✗');
    expect(prompt).toContain('⚠');
    expect(prompt).toContain('1 passed');
  });

  it('filter → 仅显示匹配检查', () => {
    const prompt = buildDoctorPrompt({ report: MOCK_REPORT, filter: 'node' });
    expect(prompt).toContain('Node.js');
    expect(prompt).not.toContain('Git');
  });

  it('全部 pass → 全 ✓', () => {
    const allPass: DiagnosticReport = {
      checks: [{ name: 'Node', status: 'pass', message: 'OK' }],
      passCount: 1,
      failCount: 0,
      warnCount: 0
    };
    const prompt = buildDoctorPrompt({ report: allPass });
    expect(prompt).toContain('✓');
    expect(prompt).not.toContain('✗');
  });
});

describe('doctorSkill — SkillDefinition', () => {
  it('name 和 aliases', () => {
    expect(doctorSkill.name).toBe('doctor');
    expect(doctorSkill.aliases).toContain('diag');
  });

  it('disableModelInvocation → true', () => {
    expect(doctorSkill.disableModelInvocation).toBe(true);
  });

  it('无 diagnosticProvider → 返回错误', async () => {
    const result = await doctorSkill.getPromptForCommand('', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('Error');
    expect(result.content).toContain('DiagnosticProvider');
  });

  it('有 diagnosticProvider → 生成诊断 prompt', async () => {
    const diagProvider = new MockDiagnosticProvider();
    const result = await doctorSkill.getPromptForCommand('', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      diagnosticProvider: diagProvider
    } as any);
    expect(result.content).toContain('Diagnostic Report');
  });

  it('filter 参数 → 仅显示匹配检查', async () => {
    const diagProvider = new MockDiagnosticProvider();
    const result = await doctorSkill.getPromptForCommand('node', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      diagnosticProvider: diagProvider
    } as any);
    expect(result.content).toContain('Node.js');
  });
});
