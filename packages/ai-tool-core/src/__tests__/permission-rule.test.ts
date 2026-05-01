/** PermissionRule 类型体系测试 */

import { describe, expect, it } from 'vitest';
import {
  matchPermissionRuleValue,
  matchWildcard,
  parsePermissionRuleValue
} from '../types/permission-rule';

describe('parsePermissionRuleValue', () => {
  it('纯工具名 → { toolName, commandPattern: undefined }', () => {
    expect(parsePermissionRuleValue('Write')).toEqual({
      toolName: 'Write',
      commandPattern: undefined
    });
  });

  it('通配符 → { toolName: "fs-*", commandPattern: undefined }', () => {
    expect(parsePermissionRuleValue('fs-*')).toEqual({
      toolName: 'fs-*',
      commandPattern: undefined
    });
  });

  it('全匹配 → { toolName: "*", commandPattern: undefined }', () => {
    expect(parsePermissionRuleValue('*')).toEqual({
      toolName: '*',
      commandPattern: undefined
    });
  });

  it('Bash细粒度 → { toolName: "Bash", commandPattern: "git push:*" }', () => {
    expect(parsePermissionRuleValue('Bash(git push:*)')).toEqual({
      toolName: 'Bash',
      commandPattern: 'git push:*'
    });
  });

  it('Bash(npm test) → 有 commandPattern', () => {
    expect(parsePermissionRuleValue('Bash(npm test)')).toEqual({
      toolName: 'Bash',
      commandPattern: 'npm test'
    });
  });
});

describe('matchWildcard', () => {
  it('精确匹配', () => {
    expect(matchWildcard('Write', 'Write')).toBe(true);
    expect(matchWildcard('Write', 'Read')).toBe(false);
  });

  it('全匹配 *', () => {
    expect(matchWildcard('*', 'anything')).toBe(true);
  });

  it('前缀通配符 fs-*', () => {
    expect(matchWildcard('fs-*', 'fs-read')).toBe(true);
    expect(matchWildcard('fs-*', 'fs-write')).toBe(true);
    expect(matchWildcard('fs-*', 'other')).toBe(false);
  });

  it('命令模式 git *', () => {
    expect(matchWildcard('git *', 'git push')).toBe(true);
    expect(matchWildcard('git *', 'git pull')).toBe(true);
    expect(matchWildcard('git *', 'npm test')).toBe(false);
  });
});

describe('matchPermissionRuleValue', () => {
  it('纯工具名精确匹配', () => {
    expect(matchPermissionRuleValue('Write', 'Write')).toBe(true);
    expect(matchPermissionRuleValue('Write', 'Read')).toBe(false);
  });

  it('通配符匹配', () => {
    expect(matchPermissionRuleValue('fs-*', 'fs-read')).toBe(true);
    expect(matchPermissionRuleValue('*', 'anything')).toBe(true);
  });

  it('Bash细粒度匹配 — 有 commandPattern', () => {
    expect(
      matchPermissionRuleValue('Bash(git push *)', 'Bash', { command: 'git push origin' })
    ).toBe(true);
    expect(matchPermissionRuleValue('Bash(npm test)', 'Bash', { command: 'npm test' })).toBe(true);
    expect(matchPermissionRuleValue('Bash(git *)', 'Bash', { command: 'git pull' })).toBe(true);
  });

  it('Bash细粒度匹配 — 工具名不匹配', () => {
    expect(matchPermissionRuleValue('Bash(git *)', 'Write', { command: 'git pull' })).toBe(false);
  });

  it('Bash细粒度匹配 — 无 toolInput', () => {
    expect(matchPermissionRuleValue('Bash(git *)', 'Bash')).toBe(false);
  });

  it('Bash细粒度匹配 — input 中无 command 字段', () => {
    expect(matchPermissionRuleValue('Bash(git *)', 'Bash', { path: '/tmp' })).toBe(false);
  });
});
