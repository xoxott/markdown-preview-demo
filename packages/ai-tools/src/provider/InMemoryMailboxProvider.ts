/** InMemoryMailboxProvider — 内存Mailbox实现（测试+轻量宿主） */

import type { MailboxProvider, SendMessageResult, StructuredMessage } from '../types/team-provider';

export class InMemoryMailboxProvider implements MailboxProvider {
  private mailboxes = new Map<string, string[]>();

  reset(): void {
    this.mailboxes.clear();
  }

  async writeToMailbox(to: string, message: string, _summary?: string): Promise<void> {
    const box = this.mailboxes.get(to) ?? [];
    box.push(message);
    this.mailboxes.set(to, box);
  }

  async readMailbox(agentId: string): Promise<string[]> {
    return this.mailboxes.get(agentId) ?? [];
  }

  async sendStructuredMessage(to: string, message: StructuredMessage): Promise<SendMessageResult> {
    const content = JSON.stringify(message);
    await this.writeToMailbox(to, content);
    return { success: true, message: `Sent ${message.type} to ${to}`, recipient: to };
  }

  async broadcastMessage(message: string, summary?: string): Promise<SendMessageResult> {
    // 广播到所有mailbox
    for (const [agentId] of this.mailboxes) {
      await this.writeToMailbox(agentId, message, summary);
    }
    return { success: true, message: 'Broadcast sent' };
  }
}
