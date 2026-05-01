/** MockDiagnosticProvider — 测试用的诊断模拟 */

import type { DiagnosticCheck, DiagnosticProvider, DiagnosticReport } from '../../types/providers';

const DEFAULT_CHECKS: DiagnosticCheck[] = [
  { name: 'Node.js version', status: 'pass', message: 'v20.11.0' },
  { name: 'Git availability', status: 'pass', message: 'git 2.43.0 available' },
  { name: 'Tool registry', status: 'pass', message: '6 tools registered' },
  { name: 'Skill registry', status: 'warn', message: '0 skills registered' },
  { name: 'MCP connections', status: 'pass', message: '2 servers connected' },
  { name: 'Permissions', status: 'pass', message: 'Default mode configured' }
];

const DEFAULT_REPORT: DiagnosticReport = {
  checks: DEFAULT_CHECKS,
  passCount: 4,
  failCount: 0,
  warnCount: 1
};

export class MockDiagnosticProvider implements DiagnosticProvider {
  private _report: DiagnosticReport = DEFAULT_REPORT;

  setReport(report: DiagnosticReport): this {
    this._report = report;
    return this;
  }

  async checkNodeVersion(): Promise<DiagnosticCheck> {
    return this._report.checks.find(c => c.name === 'Node.js version') ?? DEFAULT_CHECKS[0];
  }

  async checkGit(): Promise<DiagnosticCheck> {
    return this._report.checks.find(c => c.name === 'Git availability') ?? DEFAULT_CHECKS[1];
  }

  async checkToolRegistry(): Promise<DiagnosticCheck> {
    return this._report.checks.find(c => c.name === 'Tool registry') ?? DEFAULT_CHECKS[2];
  }

  async checkSkillRegistry(): Promise<DiagnosticCheck> {
    return this._report.checks.find(c => c.name === 'Skill registry') ?? DEFAULT_CHECKS[3];
  }

  async checkMcpConnections(): Promise<DiagnosticCheck> {
    return this._report.checks.find(c => c.name === 'MCP connections') ?? DEFAULT_CHECKS[4];
  }

  async checkPermissions(): Promise<DiagnosticCheck> {
    return this._report.checks.find(c => c.name === 'Permissions') ?? DEFAULT_CHECKS[5];
  }

  async runAll(): Promise<DiagnosticReport> {
    return this._report;
  }
}
