/** FileMailbox — 跨进程文件系统邮箱实现（依赖注入 fs） */

import type { Mailbox, MailboxMessage, StructuredMessage } from '../types/mailbox';
import { DEFAULT_MESSAGE_ID_PREFIX } from '../constants';

/**
 * 文件读取依赖注入接口 — 宿主注入文件系统读取能力
 *
 * 参考 Claude Code 的 teammateMailbox.ts: ai-coordinator 不实现 fs 读写，仅定义接口。
 * 宿主环境（CLI、IDE）实现此接口提供实际文件读写能力。
 */
export interface FileMailboxReader {
  /** 读取文件内容 */
  readFile(path: string): Promise<string | null>;
  /** 列出目录中的文件 */
  listFiles(dirPath: string): Promise<string[]>;
  /** 检查文件是否存在 */
  exists(path: string): Promise<boolean>;
}

/**
 * 文件写入依赖注入接口 — 宿主注入文件系统写入能力
 *
 * 参考 Claude Code 的 writeToMailbox(): 使用文件锁防止跨进程并发写入冲突。
 */
export interface FileMailboxWriter {
  /** 写入文件内容 */
  writeFile(path: string, content: string): Promise<void>;
  /** 删除文件 */
  deleteFile(path: string): Promise<void>;
  /** 确保目录存在 */
  ensureDir(dirPath: string): Promise<void>;
}

/**
 * 文件锁依赖注入接口（可选，跨进程安全写入）
 *
 * 参考 Claude Code 的文件锁机制: 跨进程环境下，多个 Worker 可能同时写入同一 inbox 文件， 文件锁防止并发冲突。单进程环境下可不提供（InMemoryMailbox
 * 已安全）。
 */
export interface FileMailboxLocker {
  /** 获取文件锁 — 返回 unlock 函数 */
  lock(path: string): Promise<() => void>;
}

/** FileMailbox 配置选项 */
export interface FileMailboxOptions {
  /** 邮箱根目录 (如 ~/.claude/teams/{teamName}/inboxes) */
  readonly rootDir: string;
  /** 文件读取器依赖注入 */
  readonly fileReader: FileMailboxReader;
  /** 文件写入器依赖注入 */
  readonly fileWriter: FileMailboxWriter;
  /** 文件锁接口（可选） */
  readonly fileLocker?: FileMailboxLocker;
}

/**
 * FileMailbox — 跨进程文件系统邮箱实现
 *
 * 参考 Claude Code 的 teammateMailbox.ts: 每个 Worker 有一个 inbox 文件: {rootDir}/{workerName}.json inbox
 * 文件是 JSON 数组格式，存储 MailboxMessage 列表。
 *
 * 设计特点:
 *
 * - 依赖注入: 文件读写/锁定由宿主注入（与 PermissionBubbleHandler 的 Mailbox 模式一致）
 * - 文件格式: 每个 inbox 是 JSON 数组，存储待接收消息
 * - 写入安全: 有 FileMailboxLocker 时，写入前锁定文件防止并发冲突
 * - 广播实现: 写入所有已注册的 inbox 文件
 *
 * 与 InMemoryMailbox 的对比:
 *
 * - InMemoryMailbox: 单进程内通信，不需要文件锁
 * - FileMailbox: 跨进程通信，需要文件锁 + 依赖注入 fs
 */
export class FileMailbox implements Mailbox {
  private readonly options: FileMailboxOptions;
  /** 已注册的接收者名称列表（用于广播） */
  private readonly recipients = new Set<string>();

  constructor(options: FileMailboxOptions) {
    this.options = options;
  }

  /** 注册接收者 — 确保 inbox 文件存在 */
  async registerRecipient(name: string): Promise<void> {
    this.recipients.add(name);
    const inboxPath = this.getInboxPath(name);
    if (!(await this.options.fileReader.exists(inboxPath))) {
      await this.options.fileWriter.ensureDir(this.options.rootDir);
      await this.options.fileWriter.writeFile(inboxPath, '[]');
    }
  }

  async send(message: MailboxMessage): Promise<void> {
    if (message.to === '*') {
      // 广播 — 投递给所有已注册接收者（排除发送者）
      for (const name of this.recipients) {
        if (name !== message.from) {
          await this.appendMessage(name, message);
        }
      }
    } else {
      // 一对一投递
      await this.appendMessage(message.to, message);
    }
  }

  async receive(recipientName: string): Promise<MailboxMessage[]> {
    const inboxPath = this.getInboxPath(recipientName);

    // 使用文件锁读取 + 清空（如果提供）
    const unlock = this.options.fileLocker ? await this.options.fileLocker.lock(inboxPath) : null;

    try {
      const content = await this.options.fileReader.readFile(inboxPath);
      if (!content) return [];

      let messages: MailboxMessage[];
      try {
        messages = JSON.parse(content);
      } catch {
        // JSON 解析失败 → 返回空列表，不清空文件（保护数据）
        return [];
      }

      // 清空 inbox（读取后弹出）
      await this.options.fileWriter.writeFile(inboxPath, '[]');
      return messages;
    } finally {
      unlock?.();
    }
  }

  async broadcast(
    from: string,
    content: string | StructuredMessage,
    summary?: string
  ): Promise<void> {
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
    const inboxPath = this.getInboxPath(recipientName);
    const content = await this.options.fileReader.readFile(inboxPath);
    if (!content) return false;
    try {
      const messages = JSON.parse(content);
      return messages.length > 0;
    } catch {
      return false;
    }
  }

  async clear(recipientName: string): Promise<void> {
    const inboxPath = this.getInboxPath(recipientName);
    const unlock = this.options.fileLocker ? await this.options.fileLocker.lock(inboxPath) : null;

    try {
      await this.options.fileWriter.writeFile(inboxPath, '[]');
    } finally {
      unlock?.();
    }
  }

  async destroy(): Promise<void> {
    // 删除所有 inbox 文件
    const files = await this.options.fileReader.listFiles(this.options.rootDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await this.options.fileWriter.deleteFile(`${this.options.rootDir}/${file}`);
      }
    }
    this.recipients.clear();
  }

  /** 获取 inbox 文件路径 */
  private getInboxPath(recipientName: string): string {
    return `${this.options.rootDir}/${recipientName}.json`;
  }

  /** 向 inbox 文件追加消息 */
  private async appendMessage(recipientName: string, message: MailboxMessage): Promise<void> {
    const inboxPath = this.getInboxPath(recipientName);

    // 确保目录存在
    await this.options.fileWriter.ensureDir(this.options.rootDir);

    const unlock = this.options.fileLocker ? await this.options.fileLocker.lock(inboxPath) : null;

    try {
      const content = await this.options.fileReader.readFile(inboxPath);
      let messages: MailboxMessage[] = [];
      if (content) {
        try {
          messages = JSON.parse(content);
        } catch {
          // 解析失败 → 从空数组开始（保护数据）
          messages = [];
        }
      }
      messages.push(message);
      await this.options.fileWriter.writeFile(inboxPath, JSON.stringify(messages));
    } finally {
      unlock?.();
    }
  }
}
