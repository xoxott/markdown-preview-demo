/** InMemoryMailbox — 内存默认实现 */

import type { MailboxMessage, Mailbox, StructuredMessage } from '../types/mailbox';
import { DEFAULT_MESSAGE_ID_PREFIX } from '../constants';

export class InMemoryMailbox implements Mailbox {
  private readonly inboxes = new Map<string, MailboxMessage[]>();

  async send(message: MailboxMessage): Promise<void> {
    if (message.to === '*') {
      // 广播 — 投递给所有 inbox（排除发送者）
      for (const [name, inbox] of this.inboxes) {
        if (name !== message.from) {
          inbox.push(message);
        }
      }
      // 确保发送者也有 inbox（后续广播能排除）
      if (!this.inboxes.has(message.from)) {
        this.inboxes.set(message.from, []);
      }
    } else {
      // 一对一投递
      let inbox = this.inboxes.get(message.to);
      if (!inbox) {
        inbox = [];
        this.inboxes.set(message.to, inbox);
      }
      inbox.push(message);
    }
  }

  async receive(recipientName: string): Promise<MailboxMessage[]> {
    const inbox = this.inboxes.get(recipientName);
    if (!inbox) return [];
    // 弹出所有消息
    const messages = [...inbox];
    inbox.length = 0;
    return messages;
  }

  async broadcast(from: string, content: string | StructuredMessage, summary?: string): Promise<void> {
    const message: MailboxMessage = {
      messageId: `${DEFAULT_MESSAGE_ID_PREFIX}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      from,
      to: '*',
      content,
      timestamp: Date.now(),
      summary
    };
    await this.send(message);
  }

  async hasPending(recipientName: string): Promise<boolean> {
    const inbox = this.inboxes.get(recipientName);
    return inbox !== undefined && inbox.length > 0;
  }

  async clear(recipientName: string): Promise<void> {
    const inbox = this.inboxes.get(recipientName);
    if (inbox) inbox.length = 0;
  }

  async destroy(): Promise<void> {
    this.inboxes.clear();
  }

  /** 注册接收者（确保 inbox 存在） */
  registerRecipient(name: string): void {
    if (!this.inboxes.has(name)) {
      this.inboxes.set(name, []);
    }
  }
}