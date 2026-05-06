import { describe, it, expect } from 'vitest';
import type {
  ThinkingConfig,
  McpClientRef,
  AgentDefinitionRef,
  ElicitationRequest,
  ElicitationResponse,
  ToolUseContextOptions
} from '../types/tool-use-context-options';

describe('ToolUseContextOptions', () => {
  it('all fields are optional', () => {
    const opts: ToolUseContextOptions = {};
    expect(opts.debug).toBeUndefined();
    expect(opts.mainLoopModel).toBeUndefined();
    expect(opts.thinkingConfig).toBeUndefined();
    expect(opts.mcpClients).toBeUndefined();
    expect(opts.maxBudgetUsd).toBeUndefined();
  });

  it('can set core fields', () => {
    const opts: ToolUseContextOptions = {
      debug: true,
      mainLoopModel: 'claude-sonnet-4-6',
      verbose: false,
      thinkingConfig: { enabled: true, budgetTokens: 10000 },
      isNonInteractiveSession: false,
      maxBudgetUsd: 5.0,
      abortController: new AbortController()
    };
    expect(opts.debug).toBe(true);
    expect(opts.mainLoopModel).toBe('claude-sonnet-4-6');
    expect(opts.thinkingConfig?.enabled).toBe(true);
    expect(opts.maxBudgetUsd).toBe(5.0);
  });

  it('can set mcpClients map', () => {
    const clients = new Map<string, McpClientRef>();
    clients.set('slack', { serverName: 'slack', toolNames: ['send_message'] });
    const opts: ToolUseContextOptions = { mcpClients: clients };
    expect(opts.mcpClients?.get('slack')?.serverName).toBe('slack');
  });

  it('can set callback functions', () => {
    const opts: ToolUseContextOptions = {
      refreshTools: () => {},
      getAppState: <T>(key: string) => undefined as T | undefined,
      setAppState: <T>(key: string, value: T) => {},
      handleElicitation: async () => ({ answer: 'yes' })
    };
    expect(opts.refreshTools).toBeDefined();
    expect(opts.getAppState).toBeDefined();
    expect(opts.setAppState).toBeDefined();
    expect(opts.handleElicitation).toBeDefined();
  });
});

describe('ThinkingConfig', () => {
  it('interface is usable', () => {
    const config: ThinkingConfig = { enabled: true, budgetTokens: 5000 };
    expect(config.enabled).toBe(true);
    expect(config.budgetTokens).toBe(5000);
  });

  it('minimal config', () => {
    const config: ThinkingConfig = { enabled: false };
    expect(config.enabled).toBe(false);
  });
});

describe('McpClientRef', () => {
  it('interface is usable', () => {
    const ref: McpClientRef = { serverName: 'slack', toolNames: ['send_message', 'list_channels'] };
    expect(ref.serverName).toBe('slack');
    expect(ref.toolNames).toHaveLength(2);
  });
});

describe('AgentDefinitionRef', () => {
  it('interface is usable', () => {
    const ref: AgentDefinitionRef = { agentType: 'explorer', description: 'Code explorer' };
    expect(ref.agentType).toBe('explorer');
    expect(ref.description).toBe('Code explorer');
  });
});

describe('ElicitationRequest/Response', () => {
  it('request type is usable', () => {
    const req: ElicitationRequest = { message: 'Which option?', options: ['A', 'B'] };
    expect(req.message).toBe('Which option?');
    expect(req.options).toEqual(['A', 'B']);
  });

  it('minimal request', () => {
    const req: ElicitationRequest = { message: 'Proceed?' };
    expect(req.options).toBeUndefined();
  });

  it('response type is usable', () => {
    const res: ElicitationResponse = { answer: 'A', cancelled: false };
    expect(res.answer).toBe('A');
    expect(res.cancelled).toBe(false);
  });

  it('minimal response', () => {
    const res: ElicitationResponse = { answer: 'yes' };
    expect(res.cancelled).toBeUndefined();
  });
});