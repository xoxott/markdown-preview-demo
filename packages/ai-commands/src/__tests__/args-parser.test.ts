/** args-parser 测试 — 参数解析工具 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  configPositionalParser,
  mcpPositionalParser,
  memoryPositionalParser,
  parseCommandArgs
} from '../utils/args-parser';
import { CommitArgsSchema, DoctorArgsSchema } from '../types/command-args';

const SimpleSchema = z.strictObject({
  name: z.string(),
  count: z.number().optional(),
  flag: z.boolean().optional()
});

describe('parseCommandArgs — JSON 格式', () => {
  it('JSON 字符串 → 解析成功', () => {
    const result = parseCommandArgs('{"name":"test","count":5}', SimpleSchema);
    expect(result.name).toBe('test');
    expect(result.count).toBe(5);
  });

  it('无效 JSON → fallback 到位置参数', () => {
    expect(() => parseCommandArgs('{broken}', SimpleSchema)).toThrow();
  });
});

describe('parseCommandArgs — key=value 格式', () => {
  it('key=value → 解析成功', () => {
    const result = parseCommandArgs('name=test count=3 flag=true', SimpleSchema);
    expect(result.name).toBe('test');
    expect(result.count).toBe(3);
    expect(result.flag).toBe(true);
  });

  it('boolean 值解析 → true/false', () => {
    const result = parseCommandArgs('name=test flag=false', SimpleSchema);
    expect(result.flag).toBe(false);
  });
});

describe('parseCommandArgs — 位置参数', () => {
  it('位置参数 + positionalParser → 解析成功', () => {
    const positional = (tokens: string[]) => ({ instruction: tokens.join(' ') });
    const result = parseCommandArgs('fix the login bug', CommitArgsSchema, positional);
    expect(result.instruction).toBe('fix the login bug');
  });
});

describe('parseCommandArgs — 空参数', () => {
  it('空字符串 → schema 默认值', () => {
    const result = parseCommandArgs('', DoctorArgsSchema);
    expect(result.filter).toBeUndefined();
  });
});

describe('parseCommandArgs — 单字符串 fallback', () => {
  it('单字符串 → instruction', () => {
    const result = parseCommandArgs('some instruction', CommitArgsSchema);
    expect(result.instruction).toBe('some instruction');
  });
});

describe('memoryPositionalParser', () => {
  it('save name content → 解析', () => {
    const result = memoryPositionalParser(['save', 'bug-patterns', 'Always check null']);
    expect(result.subcommand).toBe('save');
    expect(result.name).toBe('bug-patterns');
    expect(result.content).toBe('Always check null');
  });

  it('recall query → 解析', () => {
    const result = memoryPositionalParser(['recall', 'React hooks']);
    expect(result.subcommand).toBe('recall');
    expect(result.query).toBe('React hooks');
  });

  it('refresh → 无额外参数', () => {
    const result = memoryPositionalParser(['refresh']);
    expect(result.subcommand).toBe('refresh');
  });
});

describe('configPositionalParser', () => {
  it('list → 解析', () => {
    const result = configPositionalParser(['list']);
    expect(result.subcommand).toBe('list');
  });

  it('set key value → 解析', () => {
    const result = configPositionalParser(['set', 'permissions.mode', 'auto']);
    expect(result.subcommand).toBe('set');
    expect(result.key).toBe('permissions.mode');
    expect(result.value).toBe('auto');
  });
});

describe('mcpPositionalParser', () => {
  it('add name stdio command → 解析', () => {
    const result = mcpPositionalParser(['add', 'github', 'stdio', 'gh mcp']);
    expect(result.subcommand).toBe('add');
    expect(result.name).toBe('github');
    expect(result.configType).toBe('stdio');
    expect(result.command).toBe('gh mcp');
  });

  it('list → 解析', () => {
    const result = mcpPositionalParser(['list']);
    expect(result.subcommand).toBe('list');
  });
});
