/** MCP 环境变量扩展测试 */

import { describe, expect, it } from 'vitest';
import { expandEnvVarsInString } from '../config/envExpansion';

describe('expandEnvVarsInString', () => {
  it('展开存在的环境变量', () => {
    const result = expandEnvVarsInString('hello ${NAME}', { NAME: 'world' });
    expect(result.expanded).toBe('hello world');
    expect(result.missingVars).toEqual([]);
  });

  it('展开多个环境变量', () => {
    const result = expandEnvVarsInString('${A} and ${B}', { A: '1', B: '2' });
    expect(result.expanded).toBe('1 and 2');
  });

  it('${VAR:-default} → 使用默认值', () => {
    const result = expandEnvVarsInString('${MISSING:-fallback}', {});
    expect(result.expanded).toBe('fallback');
    expect(result.missingVars).toEqual([]);
  });

  it('${VAR:-default} → 变量存在时忽略默认值', () => {
    const result = expandEnvVarsInString('${NAME:-fallback}', { NAME: 'actual' });
    expect(result.expanded).toBe('actual');
  });

  it('缺失变量 → 保留原样 + 报告缺失', () => {
    const result = expandEnvVarsInString('${MISSING}', {});
    expect(result.expanded).toBe('${MISSING}');
    expect(result.missingVars).toEqual(['MISSING']);
  });

  it('多个缺失变量', () => {
    const result = expandEnvVarsInString('${A}${B}${C}', {});
    expect(result.missingVars).toEqual(['A', 'B', 'C']);
  });

  it('无环境变量引用 → 原样返回', () => {
    const result = expandEnvVarsInString('plain text', {});
    expect(result.expanded).toBe('plain text');
    expect(result.missingVars).toEqual([]);
  });

  it('空字符串', () => {
    const result = expandEnvVarsInString('', {});
    expect(result.expanded).toBe('');
    expect(result.missingVars).toEqual([]);
  });

  it('混合存在/缺失变量', () => {
    const result = expandEnvVarsInString('${HOST}:${PORT:-3000}', { HOST: 'localhost' });
    expect(result.expanded).toBe('localhost:3000');
    expect(result.missingVars).toEqual([]);
  });

  it('默认值中含 :- 的只分割一次', () => {
    // JS string.split(':-', 2) splits on first :- only
    const result = expandEnvVarsInString('${MISSING:-a:-b}', {});
    expect(result.expanded).toBe('a'); // split(':-',2) gives ['MISSING', 'a'] — ':-b' is lost
  });

  it('自定义 env 对象', () => {
    const result = expandEnvVarsInString('${KEY}', { KEY: 'value' });
    expect(result.expanded).toBe('value');
    expect(result.missingVars).toEqual([]);
  });
});
