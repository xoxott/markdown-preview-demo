/** P76 C2 测试 — BuiltinAgentDefinitions + SystemPrompts + createBuiltinSubagentRegistry */

import { describe, expect, it } from 'vitest';
import {
  BUILTIN_AGENT_DEFINITIONS,
  createBuiltinSubagentRegistry
} from '../builtin/BuiltinAgentDefinitions';
import { getSystemPromptForAgentType } from '../builtin/SystemPrompts';

// ============================================================
// BuiltinAgentDefinitions
// ============================================================

describe('BuiltinAgentDefinitions', () => {
  it('有7种内置代理定义', () => {
    expect(BUILTIN_AGENT_DEFINITIONS.length).toBe(7);
  });

  it('包含所有7种代理类型', () => {
    const types = BUILTIN_AGENT_DEFINITIONS.map(d => d.agentType);
    expect(types).toContain('general-purpose');
    expect(types).toContain('explore');
    expect(types).toContain('plan');
    expect(types).toContain('claude-code-guide');
    expect(types).toContain('statusline-setup');
    expect(types).toContain('verification');
    expect(types).toContain('fork');
  });

  it('所有定义的 source 是 builtin', () => {
    for (const def of BUILTIN_AGENT_DEFINITIONS) {
      expect(def.source).toBe('builtin');
    }
  });

  it('explore 只允许只读/搜索工具', () => {
    const explore = BUILTIN_AGENT_DEFINITIONS.find(d => d.agentType === 'explore');
    expect(explore?.tools).toEqual([
      'read',
      'glob',
      'grep',
      'search',
      'ls',
      'file-read',
      'file-search'
    ]);
  });

  it('general-purpose 继承完整工具池 (tools=undefined)', () => {
    const gp = BUILTIN_AGENT_DEFINITIONS.find(d => d.agentType === 'general-purpose');
    expect(gp?.tools).toBeUndefined();
  });

  it('fork 继承完整工具池 + 权限冒泡 + model=inherit', () => {
    const fork = BUILTIN_AGENT_DEFINITIONS.find(d => d.agentType === 'fork');
    expect(fork?.tools).toBeUndefined();
    expect(fork?.permissionMode).toBe('bubble');
    expect(fork?.model).toBe('inherit');
  });

  it('所有定义有 description 和 whenToUse', () => {
    for (const def of BUILTIN_AGENT_DEFINITIONS) {
      expect(def.description).toBeTruthy();
      expect(def.whenToUse).toBeTruthy();
    }
  });
});

// ============================================================
// createBuiltinSubagentRegistry
// ============================================================

describe('createBuiltinSubagentRegistry', () => {
  it('创建注册表并注册所有7种定义', () => {
    const registry = createBuiltinSubagentRegistry();
    expect(registry.getAll().length).toBe(7);
  });

  it('可以通过 agentType 查找', () => {
    const registry = createBuiltinSubagentRegistry();
    expect(registry.get('explore')).toBeDefined();
    expect(registry.get('fork')).toBeDefined();
    expect(registry.get('nonexistent')).toBeUndefined();
  });
});

// ============================================================
// getSystemPromptForAgentType
// ============================================================

describe('getSystemPromptForAgentType', () => {
  it('每种内置类型返回系统提示', () => {
    const types = [
      'general-purpose',
      'explore',
      'plan',
      'claude-code-guide',
      'statusline-setup',
      'verification',
      'fork'
    ];
    for (const type of types) {
      const prompt = getSystemPromptForAgentType(type);
      expect(prompt.length).toBeGreaterThan(0);
    }
  });

  it('explore 提示强调只读不修改', () => {
    const prompt = getSystemPromptForAgentType('explore');
    expect(prompt).toContain('只做搜索和读取');
    expect(prompt).toContain('不做任何修改');
  });

  it('plan 提示强调分析不执行', () => {
    const prompt = getSystemPromptForAgentType('plan');
    expect(prompt).toContain('只做分析和规划');
    expect(prompt).toContain('不做执行');
  });

  it('fork 提示强调继承父上下文', () => {
    const prompt = getSystemPromptForAgentType('fork');
    expect(prompt).toContain('继承父的完整上下文');
  });

  it('未知类型返回通用提示', () => {
    const prompt = getSystemPromptForAgentType('custom-agent');
    expect(prompt).toContain('custom-agent');
  });
});
