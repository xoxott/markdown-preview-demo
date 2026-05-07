/** G17: 15个新 Hook Phase 测试 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import {
  HookConfigChangePhase,
  HookCwdChangedPhase,
  HookElicitationPhase,
  HookElicitationResultPhase,
  HookFileChangedPhase,
  HookInstructionsLoadedPhase,
  HookPermissionDeniedPhase,
  HookPermissionRequestPhase,
  HookRegistry,
  HookSetupPhase,
  HookStopFailurePhase,
  HookTaskCompletedPhase,
  HookTaskCreatedPhase,
  HookTeammateIdlePhase,
  HookWorktreeCreatePhase,
  HookWorktreeRemovePhase
} from '../index';

/** 创建最小 MutableAgentContext */
function createContext(meta: Record<string, unknown> = {}): any {
  return {
    meta,
    state: {
      sessionId: 'test-g17',
      toolUseContext: {
        abortController: new AbortController(),
        tools: new ToolRegistry()
      }
    }
  };
}

/** 空 next generator */
async function* emptyNext(): AsyncGenerator<any> {
  /* no events */
}

describe('G17 Hook Phases — 构造与执行', () => {
  const registry = new HookRegistry();

  const phases = [
    {
      name: 'PermissionRequest',
      cls: HookPermissionRequestPhase,
      metaKey: 'permissionRequestToolName',
      metaValue: 'bash'
    },
    {
      name: 'PermissionDenied',
      cls: HookPermissionDeniedPhase,
      metaKey: 'permissionDeniedToolName',
      metaValue: 'bash'
    },
    {
      name: 'Elicitation',
      cls: HookElicitationPhase,
      metaKey: 'elicitationToolUseId',
      metaValue: 'tool-123'
    },
    {
      name: 'ElicitationResult',
      cls: HookElicitationResultPhase,
      metaKey: 'elicitationResultToolUseId',
      metaValue: 'tool-123'
    },
    { name: 'Setup', cls: HookSetupPhase, metaKey: 'setupSessionId', metaValue: 'session-1' },
    {
      name: 'ConfigChange',
      cls: HookConfigChangePhase,
      metaKey: 'configChangedFields',
      metaValue: ['model']
    },
    {
      name: 'TaskCreated',
      cls: HookTaskCreatedPhase,
      metaKey: 'taskCreatedId',
      metaValue: 'task-1'
    },
    {
      name: 'TaskCompleted',
      cls: HookTaskCompletedPhase,
      metaKey: 'taskCompletedId',
      metaValue: 'task-1'
    },
    {
      name: 'TeammateIdle',
      cls: HookTeammateIdlePhase,
      metaKey: 'teammateIdleName',
      metaValue: 'researcher'
    },
    {
      name: 'InstructionsLoaded',
      cls: HookInstructionsLoadedPhase,
      metaKey: 'instructionsLoadedSessionId',
      metaValue: 'session-1'
    },
    {
      name: 'CwdChanged',
      cls: HookCwdChangedPhase,
      metaKey: 'cwdChangedNewPath',
      metaValue: '/new/path'
    },
    {
      name: 'FileChanged',
      cls: HookFileChangedPhase,
      metaKey: 'fileChangedPath',
      metaValue: '/test/file.ts'
    },
    {
      name: 'WorktreeCreate',
      cls: HookWorktreeCreatePhase,
      metaKey: 'worktreeCreateName',
      metaValue: 'wt-1'
    },
    {
      name: 'WorktreeRemove',
      cls: HookWorktreeRemovePhase,
      metaKey: 'worktreeRemoveName',
      metaValue: 'wt-1'
    },
    {
      name: 'StopFailure',
      cls: HookStopFailurePhase,
      metaKey: 'stopFailureError',
      metaValue: 'Something went wrong'
    }
  ];

  for (const { name, cls: Cls, metaKey, metaValue } of phases) {
    describe(`Hook${name}Phase`, () => {
      it('构造 — 无hooks注册时正常', () => {
        const phase = new Cls(registry);
        expect(phase).toBeDefined();
      });

      it('有meta数据 → 执行不报错', async () => {
        const phase = new Cls(registry);
        const ctx = createContext({ [metaKey]: metaValue });
        const events = [];
        for await (const event of phase.execute(ctx, emptyNext)) {
          events.push(event);
        }
        // 无hooks → 无事件（只有 emptyNext 的空yield）
        expect(events.length).toBe(0);
      });

      it('无meta数据 → 跳过执行', async () => {
        const phase = new Cls(registry);
        const ctx = createContext(); // 无相关 meta
        const events = [];
        for await (const event of phase.execute(ctx, emptyNext)) {
          events.push(event);
        }
        expect(events.length).toBe(0);
      });
    });
  }
});
