/** @suga/ai-tools — InMemoryTeamProvider + InMemoryMailboxProvider测试 */

import { describe, expect, it } from 'vitest';
import { InMemoryTeamProvider } from '../provider/InMemoryTeamProvider';
import { InMemoryMailboxProvider } from '../provider/InMemoryMailboxProvider';

describe('InMemoryTeamProvider', () => {
  const provider = new InMemoryTeamProvider();

  it('createTeam → 返回TeamResult', async () => {
    provider.reset();
    const result = await provider.createTeam('my-team', 'description');
    expect(result.teamName).toBe('my-team');
    expect(result.leadAgentId).toBeTruthy();
    expect(result.teamFilePath).toContain('my-team');
  });

  it('getTeamInfo → 返回TeamInfo', async () => {
    provider.reset();
    await provider.createTeam('test');
    const info = await provider.getTeamInfo();
    expect(info?.teamName).toBe('test');
    expect(info?.members.length).toBe(1);
  });

  it('deleteTeam → 成功删除', async () => {
    provider.reset();
    await provider.createTeam('test');
    const result = await provider.deleteTeam();
    expect(result.success).toBe(true);
    expect(result.teamName).toBe('test');
    const info = await provider.getTeamInfo();
    expect(info).toBeNull();
  });

  it('deleteTeam → 无team时失败', async () => {
    provider.reset();
    const result = await provider.deleteTeam();
    expect(result.success).toBe(false);
  });

  it('reset → 清空team', async () => {
    provider.reset();
    await provider.createTeam('test');
    provider.reset();
    const info = await provider.getTeamInfo();
    expect(info).toBeNull();
  });
});

describe('InMemoryMailboxProvider', () => {
  const provider = new InMemoryMailboxProvider();

  it('writeToMailbox → 写入消息', async () => {
    provider.reset();
    await provider.writeToMailbox('worker1', 'hello');
    const msgs = await provider.readMailbox('worker1');
    expect(msgs).toContain('hello');
  });

  it('readMailbox → 空mailbox返回空数组', async () => {
    provider.reset();
    const msgs = await provider.readMailbox('unknown');
    expect(msgs).toEqual([]);
  });

  it('sendStructuredMessage → 发送shutdown_request', async () => {
    provider.reset();
    const result = await provider.sendStructuredMessage('worker1', {
      type: 'shutdown_request',
      reason: 'done'
    });
    expect(result.success).toBe(true);
    expect(result.recipient).toBe('worker1');
  });

  it('broadcastMessage → 广播到所有mailbox', async () => {
    provider.reset();
    await provider.writeToMailbox('w1', '');
    await provider.writeToMailbox('w2', '');
    const result = await provider.broadcastMessage('broadcast msg', 'summary');
    expect(result.success).toBe(true);
  });

  it('reset → 清空所有mailbox', async () => {
    provider.reset();
    await provider.writeToMailbox('w1', 'msg1');
    provider.reset();
    const msgs = await provider.readMailbox('w1');
    expect(msgs).toEqual([]);
  });
});
