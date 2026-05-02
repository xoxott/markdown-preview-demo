/** @suga/ai-tools — SendMessageTool测试 */

import { describe, expect, it } from 'vitest';
import { sendMessageTool } from '../tools/send-message';
import { InMemoryMailboxProvider } from '../provider/InMemoryMailboxProvider';

describe('SendMessageTool', () => {
  const mailboxProvider = new InMemoryMailboxProvider();

  it('name → send-message', () => {
    expect(sendMessageTool.name).toBe('send-message');
  });

  it('isReadOnly → true(纯文本)', () => {
    const input = { to: 'worker', message: 'hello' };
    expect(sendMessageTool.isReadOnly!(input)).toBe(true);
  });

  it('isReadOnly → false(结构化)', () => {
    const input = { to: 'worker', message: { type: 'shutdown_request' as const } };
    expect(sendMessageTool.isReadOnly!(input)).toBe(false);
  });

  it('safetyLabel → readonly(纯文本)', () => {
    const input = { to: 'worker', message: 'hello' };
    expect(sendMessageTool.safetyLabel!(input)).toBe('readonly');
  });

  it('safetyLabel → destructive(结构化)', () => {
    const input = { to: 'worker', message: { type: 'shutdown_request' as const } };
    expect(sendMessageTool.safetyLabel!(input)).toBe('destructive');
  });

  it('isDestructive → true(shutdown_request)', () => {
    const input = { to: 'worker', message: { type: 'shutdown_request' as const } };
    expect(sendMessageTool.isDestructive!(input)).toBe(true);
  });

  it('isDestructive → false(纯文本)', () => {
    const input = { to: 'worker', message: 'hello' };
    expect(sendMessageTool.isDestructive!(input)).toBe(false);
  });

  it('call → 发送纯文本消息', async () => {
    mailboxProvider.reset();
    const result = await sendMessageTool.call({ to: 'worker1', message: 'start on task #1' }, {
      mailboxProvider
    } as any);
    expect(result.data.success).toBe(true);
    expect(result.data.recipient).toBe('worker1');
    const msgs = await mailboxProvider.readMailbox('worker1');
    expect(msgs).toContain('start on task #1');
  });

  it('call → 广播消息(to="*")', async () => {
    mailboxProvider.reset();
    // 预创建mailbox
    await mailboxProvider.writeToMailbox('worker1', '');
    await mailboxProvider.writeToMailbox('worker2', '');
    const result = await sendMessageTool.call({ to: '*', message: 'broadcast test' }, {
      mailboxProvider
    } as any);
    expect(result.data.success).toBe(true);
  });

  it('call → 发送shutdown_request', async () => {
    mailboxProvider.reset();
    const result = await sendMessageTool.call(
      { to: 'worker1', message: { type: 'shutdown_request' as const, reason: 'done' } },
      { mailboxProvider } as any
    );
    expect(result.data.success).toBe(true);
    const msgs = await mailboxProvider.readMailbox('worker1');
    expect(msgs.length).toBeGreaterThan(0);
  });

  it('call → 发送shutdown_response', async () => {
    mailboxProvider.reset();
    const result = await sendMessageTool.call(
      {
        to: 'team-lead',
        message: { type: 'shutdown_response' as const, request_id: 'req-1', approve: true }
      },
      { mailboxProvider } as any
    );
    expect(result.data.success).toBe(true);
  });

  it('call → 无Provider返回失败', async () => {
    const result = await sendMessageTool.call({ to: 'worker', message: 'hello' }, {} as any);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('No MailboxProvider');
  });

  it('call → 广播结构化消息失败', async () => {
    mailboxProvider.reset();
    const result = await sendMessageTool.call(
      { to: '*', message: { type: 'shutdown_request' as const } },
      { mailboxProvider } as any
    );
    expect(result.data.success).toBe(false);
  });

  it('inputSchema → 正确定义', () => {
    expect(sendMessageTool.inputSchema).toBeDefined();
  });
});
