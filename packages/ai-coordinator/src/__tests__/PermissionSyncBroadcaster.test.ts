/** P60 测试 — PermissionSyncBroadcaster/Receiver 广播+接收 */

import { describe, expect, it } from 'vitest';
import { InMemoryMailbox } from '../mailbox/InMemoryMailbox';
import { PermissionSyncBroadcaster, PermissionSyncReceiver } from '../permission/PermissionSyncBroadcaster';
import type { PermissionUpdateMessage, SettingsUpdateMessage } from '../types/permission-sync';

// ============================================================
// PermissionSyncBroadcaster
// ============================================================

describe('PermissionSyncBroadcaster', () => {
  it('广播 PermissionUpdateMessage → 所有Worker收到', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');
    mailbox.registerRecipient('worker-1');
    mailbox.registerRecipient('worker-2');

    const broadcaster = new PermissionSyncBroadcaster(mailbox, 'leader');

    const update: PermissionUpdateMessage = {
      type: 'permission_update',
      updateType: 'addRules',
      rules: [{ behavior: 'allow', ruleValue: 'Bash(git push:*)' }]
    };

    await broadcaster.broadcastPermissionUpdate(update);

    const worker1Msgs = await mailbox.receive('worker-1');
    const worker2Msgs = await mailbox.receive('worker-2');

    expect(worker1Msgs.length).toBe(1);
    expect(worker2Msgs.length).toBe(1);
    expect((worker1Msgs[0].content as PermissionUpdateMessage).updateType).toBe('addRules');
  });

  it('广播 SettingsUpdateMessage → 所有Worker收到', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');
    mailbox.registerRecipient('worker-1');

    const broadcaster = new PermissionSyncBroadcaster(mailbox, 'leader');

    const update: SettingsUpdateMessage = {
      type: 'settings_update',
      sourceLayer: 'project',
      changedFields: ['permissions', 'hooks']
    };

    await broadcaster.broadcastSettingsUpdate(update);

    const msgs = await mailbox.receive('worker-1');
    expect(msgs.length).toBe(1);
    const content = msgs[0].content as SettingsUpdateMessage;
    expect(content.type).toBe('settings_update');
    expect(content.sourceLayer).toBe('project');
  });

  it('摘要正确 — addRules', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');
    mailbox.registerRecipient('worker-1');

    const broadcaster = new PermissionSyncBroadcaster(mailbox, 'leader');
    const update: PermissionUpdateMessage = {
      type: 'permission_update',
      updateType: 'addRules',
      rules: [{ behavior: 'allow', ruleValue: 'Bash(ls)' }, { behavior: 'deny', ruleValue: 'Bash(rm)' }]
    };

    await broadcaster.broadcastPermissionUpdate(update);

    const msgs = await mailbox.receive('worker-1');
    expect(msgs[0].summary).toBe('权限规则新增: 2 条规则');
  });

  it('摘要正确 — setMode', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');
    mailbox.registerRecipient('worker-1');

    const broadcaster = new PermissionSyncBroadcaster(mailbox, 'leader');
    const update: PermissionUpdateMessage = {
      type: 'permission_update',
      updateType: 'setMode',
      mode: 'plan'
    };

    await broadcaster.broadcastPermissionUpdate(update);

    const msgs = await mailbox.receive('worker-1');
    expect(msgs[0].summary).toBe('权限模式设置: plan');
  });

  it('摘要正确 — reloadFromSettings', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');
    mailbox.registerRecipient('worker-1');

    const broadcaster = new PermissionSyncBroadcaster(mailbox, 'leader');
    const update: PermissionUpdateMessage = {
      type: 'permission_update',
      updateType: 'reloadFromSettings'
    };

    await broadcaster.broadcastPermissionUpdate(update);

    const msgs = await mailbox.receive('worker-1');
    expect(msgs[0].summary).toBe('从 Settings 文件重新加载权限');
  });

  it('Leader不收到自己的广播', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');
    mailbox.registerRecipient('worker-1');

    const broadcaster = new PermissionSyncBroadcaster(mailbox, 'leader');
    await broadcaster.broadcastPermissionUpdate({
      type: 'permission_update',
      updateType: 'addRules'
    });

    const leaderMsgs = await mailbox.receive('leader');
    expect(leaderMsgs.length).toBe(0);
  });
});

// ============================================================
// PermissionSyncReceiver
// ============================================================

describe('PermissionSyncReceiver', () => {
  it('pollPermissionUpdates → 接收权限+Settings更新', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');
    mailbox.registerRecipient('worker-1');

    const broadcaster = new PermissionSyncBroadcaster(mailbox, 'leader');
    const receiver = new PermissionSyncReceiver(mailbox, 'worker-1');

    await broadcaster.broadcastPermissionUpdate({
      type: 'permission_update',
      updateType: 'addRules',
      rules: [{ behavior: 'allow', ruleValue: 'Bash(ls)' }]
    });

    await broadcaster.broadcastSettingsUpdate({
      type: 'settings_update',
      sourceLayer: 'project',
      changedFields: ['permissions']
    });

    const updates = await receiver.pollPermissionUpdates();
    expect(updates.length).toBe(2);
    expect(updates[0].type).toBe('permission_update');
    expect(updates[1].type).toBe('settings_update');
  });

  it('pollPermissionUpdateMessages → 只接收权限更新', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');
    mailbox.registerRecipient('worker-1');

    const broadcaster = new PermissionSyncBroadcaster(mailbox, 'leader');
    const receiver = new PermissionSyncReceiver(mailbox, 'worker-1');

    await broadcaster.broadcastPermissionUpdate({
      type: 'permission_update',
      updateType: 'addRules'
    });

    await broadcaster.broadcastSettingsUpdate({
      type: 'settings_update'
    });

    const permMsgs = await receiver.pollPermissionUpdateMessages();
    expect(permMsgs.length).toBe(1);
    expect(permMsgs[0].type).toBe('permission_update');
  });

  it('pollSettingsUpdateMessages → 只接收Settings更新', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');
    mailbox.registerRecipient('worker-1');

    const broadcaster = new PermissionSyncBroadcaster(mailbox, 'leader');
    const receiver = new PermissionSyncReceiver(mailbox, 'worker-1');

    await broadcaster.broadcastPermissionUpdate({
      type: 'permission_update',
      updateType: 'addRules'
    });

    await broadcaster.broadcastSettingsUpdate({
      type: 'settings_update',
      sourceLayer: 'user'
    });

    const settingsMsgs = await receiver.pollSettingsUpdateMessages();
    expect(settingsMsgs.length).toBe(1);
    expect(settingsMsgs[0].sourceLayer).toBe('user');
  });

  it('无消息 → 空数组', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('worker-1');

    const receiver = new PermissionSyncReceiver(mailbox, 'worker-1');
    const updates = await receiver.pollPermissionUpdates();
    expect(updates.length).toBe(0);
  });

  it('混合消息（含非权限类型）→ 只返回权限/Settings', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');
    mailbox.registerRecipient('worker-1');

    // 手动发送一条非权限消息
    await mailbox.send({
      messageId: 'msg_1',
      from: 'leader',
      to: 'worker-1',
      content: { type: 'task_assignment', task: 'research' },
      timestamp: Date.now()
    });

    const broadcaster = new PermissionSyncBroadcaster(mailbox, 'leader');
    await broadcaster.broadcastPermissionUpdate({
      type: 'permission_update',
      updateType: 'setMode',
      mode: 'auto'
    });

    const receiver = new PermissionSyncReceiver(mailbox, 'worker-1');
    const updates = await receiver.pollPermissionUpdates();
    expect(updates.length).toBe(1);
    expect(updates[0].type).toBe('permission_update');
  });
});