import { describe, expect, it } from 'vitest';
import { assessPowerShellCommandSecurity } from '../tools/powershell-security';

describe('assessPowerShellCommandSecurity', () => {
  it('Get-ChildItem → safe readonly', () => {
    const a = assessPowerShellCommandSecurity('Get-ChildItem');
    expect(a.safetyLevel).toBe('safe');
    expect(a.isReadOnly).toBe(true);
  });

  it('Invoke-WebRequest → caution (network)', () => {
    const a = assessPowerShellCommandSecurity('Invoke-WebRequest https://x');
    expect(a.safetyLevel).toBe('caution');
    expect(a.isReadOnly).toBe(false);
  });

  it('IRM alias → caution', () => {
    const a = assessPowerShellCommandSecurity('IRM https://example.com');
    expect(a.safetyLevel).toBe('caution');
  });

  it('Format-Volume → dangerous', () => {
    const a = assessPowerShellCommandSecurity('Format-Volume -DriveLetter X');
    expect(a.safetyLevel).toBe('dangerous');
  });

  it('Recursive Remove-Item → dangerous', () => {
    const a = assessPowerShellCommandSecurity('Remove-Item -Path .\\* -Recurse -Force');
    expect(a.safetyLevel).toBe('dangerous');
  });

  it('git status line → safe', () => {
    const a = assessPowerShellCommandSecurity('git status');
    expect(a.safetyLevel).toBe('safe');
    expect(a.isReadOnly).toBe(true);
  });

  it('unclassified long script → caution', () => {
    const a = assessPowerShellCommandSecurity(' Foo-Bar -X 1'.repeat(2000));
    expect(a.safetyLevel).toBe('caution');
  });
});
