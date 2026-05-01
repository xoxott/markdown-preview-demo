/** AppState 核心域接口 + 默认值 测试 */

import { describe, expect, it } from 'vitest';
import type {
  AgentStateDomain,
  InboxMessage,
  PermissionStateDomain,
  SettingsStateDomain,
  TaskItem,
  TaskStateDomain,
  TeamStateDomain,
  UIStateDomain,
  WorkerState
} from '../../state/AppState';
import { getDefaultAppState } from '../../state/createAppStateStore';

describe('AppState 核心域接口', () => {
  it('PermissionStateDomain — 接口可被实现', () => {
    const domain: PermissionStateDomain = {
      toolPermissionContext: {
        mode: 'default',
        allowRules: [],
        denyRules: [],
        askRules: [],
        workingDirectories: [],
        bypassPermissions: false
      },
      settings: undefined,
      pendingPermissionBubbles: [],
      currentMode: 'default'
    };
    expect(domain.currentMode).toBe('default');
    expect(domain.pendingPermissionBubbles).toHaveLength(0);
  });

  it('SettingsStateDomain — 接口可被实现', () => {
    const domain: SettingsStateDomain = {
      settings: {},
      activeSourceLayers: ['project'],
      settingsCacheValid: true
    };
    expect(domain.activeSourceLayers).toContain('project');
    expect(domain.settingsCacheValid).toBe(true);
  });

  it('TaskStateDomain — 接口可被实现', () => {
    const task: TaskItem = {
      taskId: '1',
      subject: 'Test',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const domain: TaskStateDomain = {
      tasks: new Map([[task.taskId, task]]),
      foregroundedTaskId: '1'
    };
    expect(domain.tasks.get('1')?.subject).toBe('Test');
    expect(domain.foregroundedTaskId).toBe('1');
  });

  it('AgentStateDomain — 接口可被实现', () => {
    const domain: AgentStateDomain = {
      agentNameRegistry: new Map([['coder', 'agent-001']]),
      viewingAgentId: undefined,
      viewSelectionMode: 'none',
      agentDefinitions: []
    };
    expect(domain.agentNameRegistry.get('coder')).toBe('agent-001');
    expect(domain.viewSelectionMode).toBe('none');
  });

  it('TeamStateDomain — 接口可被实现', () => {
    const worker: WorkerState = {
      workerId: 'w-1',
      status: 'idle',
      lastActiveAt: Date.now()
    };
    const msg: InboxMessage = {
      id: 'msg-1',
      from: 'leader',
      text: 'hello',
      timestamp: Date.now(),
      status: 'unread'
    };
    const domain: TeamStateDomain = {
      team: undefined,
      workers: new Map([[worker.workerId, worker]]),
      inbox: [msg],
      isLeader: false
    };
    expect(domain.workers.get('w-1')?.status).toBe('idle');
    expect(domain.inbox[0].from).toBe('leader');
  });

  it('UIStateDomain — 接口可被实现', () => {
    const domain: UIStateDomain = {
      expandedView: 'tasks',
      statusLineText: 'Running tests...',
      spinnerTip: 'Loading'
    };
    expect(domain.expandedView).toBe('tasks');
    expect(domain.statusLineText).toBe('Running tests...');
  });
});

describe('getDefaultAppState', () => {
  it('返回完整默认状态 — 6域都有初始值', () => {
    const state = getDefaultAppState();
    expect(state.permissions.currentMode).toBe('default');
    expect(state.settings.settingsCacheValid).toBe(true);
    expect(state.tasks.tasks.size).toBe(0);
    expect(state.agents.viewSelectionMode).toBe('none');
    expect(state.team.isLeader).toBe(false);
    expect(state.ui.expandedView).toBe('none');
  });

  it('权限域默认值 — mode=default, 规则空', () => {
    const state = getDefaultAppState();
    expect(state.permissions.currentMode).toBe('default');
    expect(state.permissions.toolPermissionContext.mode).toBe('default');
    expect(state.permissions.pendingPermissionBubbles).toHaveLength(0);
  });

  it('settings域默认值 — 空配置+缓存有效', () => {
    const state = getDefaultAppState();
    expect(state.settings.settings).toEqual({});
    expect(state.settings.activeSourceLayers).toHaveLength(0);
    expect(state.settings.settingsCacheValid).toBe(true);
  });

  it('tasks域默认值 — 空字典+无前台任务', () => {
    const state = getDefaultAppState();
    expect(state.tasks.tasks.size).toBe(0);
    expect(state.tasks.foregroundedTaskId).toBeUndefined();
  });
});
