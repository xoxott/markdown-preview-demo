/** 编排器权限事件测试 */

import { describe, expect, it } from 'vitest';
import { CoordinatorOrchestrator } from '../../orchestrator/CoordinatorOrchestrator';
import type { OrchestrationEvent } from '../../types/orchestrator';

describe('CoordinatorOrchestrator permission events', () => {
  it('emitPermissionBubble → 产出 permission_bubble 事件', () => {
    const orchestrator = new CoordinatorOrchestrator();
    const events: OrchestrationEvent[] = [
      ...orchestrator.emitPermissionBubble('worker-1', 'bash', '需要执行命令')
    ];

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('permission_bubble');
    if (events[0].type === 'permission_bubble') {
      expect(events[0].workerId).toBe('worker-1');
      expect(events[0].toolName).toBe('bash');
      expect(events[0].reason).toBe('需要执行命令');
    }
  });

  it('emitPermissionResolved → 产出 permission_resolved 事件 (approved)', () => {
    const orchestrator = new CoordinatorOrchestrator();
    const events: OrchestrationEvent[] = [...orchestrator.emitPermissionResolved('worker-1', true)];

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('permission_resolved');
    if (events[0].type === 'permission_resolved') {
      expect(events[0].workerId).toBe('worker-1');
      expect(events[0].approved).toBe(true);
    }
  });

  it('emitPermissionResolved → 产出 permission_resolved 事件 (rejected)', () => {
    const orchestrator = new CoordinatorOrchestrator();
    const events: OrchestrationEvent[] = [
      ...orchestrator.emitPermissionResolved('worker-1', false)
    ];

    expect(events.length).toBe(1);
    if (events[0].type === 'permission_resolved') {
      expect(events[0].approved).toBe(false);
    }
  });

  it('permissionQueue → 初始为空', () => {
    const orchestrator = new CoordinatorOrchestrator();
    expect(orchestrator.permissionQueue.getPending().length).toBe(0);
  });
});
