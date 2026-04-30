import { describe, it, expect } from 'vitest';
import { InMemoryMailbox } from '../mailbox/InMemoryMailbox';

describe('InMemoryMailbox', () => {
  it('send+receive 应正确投递和弹出消息', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('worker-1');
    mailbox.registerRecipient('coordinator');

    await mailbox.send({
      messageId: 'msg_1',
      from: 'coordinator',
      to: 'worker-1',
      content: '请研究这个文件',
      timestamp: 0
    });

    const pending = await mailbox.hasPending('worker-1');
    expect(pending).toBe(true);

    const messages = await mailbox.receive('worker-1');
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('请研究这个文件');

    // 接收后 inbox 清空
    const afterReceive = await mailbox.hasPending('worker-1');
    expect(afterReceive).toBe(false);
  });

  it('broadcast 应投递给所有接收者 (排除发送者)', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('worker-1');
    mailbox.registerRecipient('worker-2');
    mailbox.registerRecipient('coordinator');

    await mailbox.broadcast('coordinator', '团队通知：开始新阶段');

    const w1Msgs = await mailbox.receive('worker-1');
    expect(w1Msgs.length).toBe(1);
    expect(w1Msgs[0].content).toBe('团队通知：开始新阶段');

    const w2Msgs = await mailbox.receive('worker-2');
    expect(w2Msgs.length).toBe(1);

    // 发送者不应收到自己的广播
    const coordMsgs = await mailbox.receive('coordinator');
    expect(coordMsgs.length).toBe(0);
  });

  it('hasPending+clear 应正确检查和清空 inbox', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('worker-1');

    await mailbox.send({
      messageId: 'msg_1',
      from: 'coord',
      to: 'worker-1',
      content: '任务1',
      timestamp: 0
    });
    await mailbox.send({
      messageId: 'msg_2',
      from: 'coord',
      to: 'worker-1',
      content: '任务2',
      timestamp: 1
    });

    expect(await mailbox.hasPending('worker-1')).toBe(true);

    await mailbox.clear('worker-1');
    expect(await mailbox.hasPending('worker-1')).toBe(false);
  });
});
