/** MCP 名称规范化测试 */

import { describe, expect, it } from 'vitest';
import { normalizeNameForMCP } from '../naming/normalization';

describe('normalizeNameForMCP', () => {
  it('保留合法字符', () => {
    expect(normalizeNameForMCP('my_server')).toBe('my_server');
    expect(normalizeNameForMCP('server-1')).toBe('server-1');
    expect(normalizeNameForMCP('MyServer123')).toBe('MyServer123');
  });

  it('替换空格为下划线', () => {
    expect(normalizeNameForMCP('my server')).toBe('my_server');
  });

  it('替换点号为下划线', () => {
    expect(normalizeNameForMCP('my.server')).toBe('my_server');
  });

  it('替换特殊字符为下划线', () => {
    expect(normalizeNameForMCP('my@server!')).toBe('my_server_');
  });

  it('claude.ai 前缀 → 合并下划线+去除首尾下划线', () => {
    expect(normalizeNameForMCP('claude.ai my server')).toBe('claude_ai_my_server');
  });

  it('空字符串 → 空字符串', () => {
    expect(normalizeNameForMCP('')).toBe('');
  });

  it('纯特殊字符 → 纯下划线', () => {
    expect(normalizeNameForMCP('@@')).toBe('__');
  });

  it('claude.ai 纯特殊字符 → 去除首尾后', () => {
    // "claude.ai @@"" → "claude_ai___" → 合并 → "claude_ai_" → 去除首尾 → "claude_ai"
    // Actually: "claude.ai @@".replace(/[^a-zA-Z0-9_-]/g, '_') = "claude_ai___"
    // then replace(/_+/g, '_') = "claude_ai_", then replace(/^_|_$/g, '') = "claude_ai"
    expect(normalizeNameForMCP('claude.ai @@')).toBe('claude_ai');
  });
});
