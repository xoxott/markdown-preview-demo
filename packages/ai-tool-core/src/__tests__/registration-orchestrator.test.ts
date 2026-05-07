import { describe, expect, it } from 'vitest';
import { ToolRegistrationOrchestrator } from '../core/tool-registration-orchestrator';
import {
  CoordinatorPermissionHandler,
  InteractivePermissionHandler,
  SwarmWorkerPermissionHandler
} from '../core/permission-handlers';

describe('ToolRegistrationOrchestrator', () => {
  it('always condition → always register', () => {
    const orchestrator = new ToolRegistrationOrchestrator();
    orchestrator.addRule({ toolName: 'bash', condition: 'always' });
    expect(orchestrator.shouldRegister('bash')).toBe(true);
  });

  it('feature_gate → check feature set', () => {
    const orchestrator = new ToolRegistrationOrchestrator();
    orchestrator.addRule({
      toolName: 'sleep',
      condition: 'feature_gate',
      featureKey: 'sleep_tool'
    });

    expect(orchestrator.shouldRegister('sleep', { features: new Set(['sleep_tool']) })).toBe(true);
    expect(orchestrator.shouldRegister('sleep', { features: new Set() })).toBe(false);
  });

  it('platform_specific → check platform', () => {
    const orchestrator = new ToolRegistrationOrchestrator();
    orchestrator.addRule({
      toolName: 'powershell',
      condition: 'platform_specific',
      platform: 'win32'
    });

    expect(orchestrator.shouldRegister('powershell', { platform: 'win32' })).toBe(true);
    expect(orchestrator.shouldRegister('powershell', { platform: 'darwin' })).toBe(false);
  });

  it('non_interactive → check flag', () => {
    const orchestrator = new ToolRegistrationOrchestrator();
    orchestrator.addRule({ toolName: 'monitor', condition: 'non_interactive' });

    expect(orchestrator.shouldRegister('monitor', { isNonInteractive: true })).toBe(true);
    expect(orchestrator.shouldRegister('monitor', { isNonInteractive: false })).toBe(false);
  });

  it('no rule → default register', () => {
    const orchestrator = new ToolRegistrationOrchestrator();
    expect(orchestrator.shouldRegister('unknown_tool')).toBe(true);
  });

  it('getRegisteredToolNames filters correctly', () => {
    const orchestrator = new ToolRegistrationOrchestrator();
    orchestrator.addRules([
      { toolName: 'bash', condition: 'always' },
      { toolName: 'sleep', condition: 'feature_gate', featureKey: 'sleep_tool' }
    ]);
    const names = orchestrator.getRegisteredToolNames({ features: new Set(['sleep_tool']) });
    expect(names).toContain('bash');
    expect(names).toContain('sleep');
  });
});

describe('PermissionHandlers', () => {
  it('InteractiveHandler auto-approves readonly', async () => {
    const handler = new InteractivePermissionHandler();
    const result = await handler.decide('glob', 'search files', true);
    expect(result.behavior).toBe('allow');
    expect(result.source).toBe('interactive');
  });

  it('InteractiveHandler asks for non-readonly', async () => {
    const handler = new InteractivePermissionHandler();
    const result = await handler.decide('bash', 'rm -rf /', false);
    expect(result.behavior).toBe('ask');
    expect(result.source).toBe('interactive');
  });

  it('CoordinatorHandler auto-approves readonly when configured', () => {
    const handler = new CoordinatorPermissionHandler({ autoApproveReadOnly: true });
    const result = handler.decide('grep', true);
    expect(result.behavior).toBe('allow');
    expect(result.source).toBe('coordinator');
  });

  it('CoordinatorHandler asks without auto-approve', () => {
    const handler = new CoordinatorPermissionHandler();
    const result = handler.decide('bash', false);
    expect(result.behavior).toBe('ask');
    expect(result.source).toBe('coordinator');
  });

  it('SwarmWorkerHandler follows leader by default', () => {
    const handler = new SwarmWorkerPermissionHandler({ followLeaderDecisions: true });
    const result = handler.decide('bash');
    expect(result.behavior).toBe('ask');
    expect(result.source).toBe('swarm_worker');
    expect(result.reason).toContain('leader');
  });

  it('SwarmWorkerHandler uses default behavior', () => {
    const handler = new SwarmWorkerPermissionHandler({ defaultBehavior: 'deny' });
    const result = handler.decide('bash');
    expect(result.behavior).toBe('deny');
  });
});
