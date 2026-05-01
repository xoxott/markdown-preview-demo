/** FileMailbox 测试（使用 mock fs） */

import { describe, expect, it } from 'vitest';
import { FileMailbox } from '../../mailbox/FileMailbox';
import type { FileMailboxReader, FileMailboxWriter } from '../../mailbox/FileMailbox';

/** Mock 文件系统实现 */
function createMockFS(): {
  files: Map<string, string>;
  reader: FileMailboxReader;
  writer: FileMailboxWriter;
} {
  const files = new Map<string, string>();

  const reader: FileMailboxReader = {
    readFile: async path => files.get(path) ?? null,
    listFiles: async dirPath => {
      const result: string[] = [];
      for (const key of files.keys()) {
        if (key.startsWith(dirPath)) {
          result.push(key.slice(dirPath.length + 1));
        }
      }
      return result;
    },
    exists: async path => files.has(path)
  };

  const writer: FileMailboxWriter = {
    writeFile: async (path, content) => {
      files.set(path, content);
    },
    deleteFile: async path => {
      files.delete(path);
    },
    ensureDir: async _dirPath => {
      /* mock: 不需要创建目录 */
    }
  };

  return { files, reader, writer };
}

describe('FileMailbox', () => {
  it('send 一对一 → 写入 inbox 文件', async () => {
    const { reader, writer } = createMockFS();
    const mailbox = new FileMailbox({
      rootDir: '/teams/test/inboxes',
      fileReader: reader,
      fileWriter: writer
    });

    await mailbox.registerRecipient('worker-1');
    await mailbox.send({
      messageId: 'msg_1',
      from: 'coordinator',
      to: 'worker-1',
      content: 'task assignment',
      timestamp: Date.now()
    });

    const inbox = await mailbox.hasPending('worker-1');
    expect(inbox).toBe(true);
  });

  it('receive → 读取并清空 inbox', async () => {
    const { files, reader, writer } = createMockFS();
    const mailbox = new FileMailbox({
      rootDir: '/teams/test/inboxes',
      fileReader: reader,
      fileWriter: writer
    });

    await mailbox.registerRecipient('worker-1');
    await mailbox.send({
      messageId: 'msg_1',
      from: 'coordinator',
      to: 'worker-1',
      content: 'hello',
      timestamp: Date.now()
    });

    const messages = await mailbox.receive('worker-1');
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('hello');

    // receive 后 inbox 应为空
    const inbox = files.get('/teams/test/inboxes/worker-1.json');
    expect(inbox).toBe('[]');
  });

  it('broadcast → 写入所有已注册 inbox', async () => {
    const { reader, writer } = createMockFS();
    const mailbox = new FileMailbox({
      rootDir: '/teams/test/inboxes',
      fileReader: reader,
      fileWriter: writer
    });

    await mailbox.registerRecipient('worker-1');
    await mailbox.registerRecipient('worker-2');
    await mailbox.registerRecipient('coordinator');

    await mailbox.broadcast('coordinator', '重要通知');

    const w1 = await mailbox.hasPending('worker-1');
    const w2 = await mailbox.hasPending('worker-2');
    // coordinator 不应收到自己发的广播
    const coord = await mailbox.hasPending('coordinator');
    expect(w1).toBe(true);
    expect(w2).toBe(true);
    expect(coord).toBe(false);
  });

  it('hasPending → 无消息时返回 false', async () => {
    const { reader, writer } = createMockFS();
    const mailbox = new FileMailbox({
      rootDir: '/teams/test/inboxes',
      fileReader: reader,
      fileWriter: writer
    });

    await mailbox.registerRecipient('worker-1');
    const result = await mailbox.hasPending('worker-1');
    expect(result).toBe(false);
  });

  it('clear → 清空 inbox', async () => {
    const { reader, writer } = createMockFS();
    const mailbox = new FileMailbox({
      rootDir: '/teams/test/inboxes',
      fileReader: reader,
      fileWriter: writer
    });

    await mailbox.registerRecipient('worker-1');
    await mailbox.send({
      messageId: 'msg_1',
      from: 'coordinator',
      to: 'worker-1',
      content: 'hello',
      timestamp: Date.now()
    });

    await mailbox.clear('worker-1');
    const result = await mailbox.hasPending('worker-1');
    expect(result).toBe(false);
  });

  it('destroy → 删除所有 inbox 文件', async () => {
    const { reader, writer } = createMockFS();
    const mailbox = new FileMailbox({
      rootDir: '/teams/test/inboxes',
      fileReader: reader,
      fileWriter: writer
    });

    await mailbox.registerRecipient('worker-1');
    await mailbox.registerRecipient('worker-2');

    await mailbox.destroy();
    const w1 = await mailbox.hasPending('worker-1');
    expect(w1).toBe(false);
  });
});
