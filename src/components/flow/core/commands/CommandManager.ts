/**
 * 命令管理器
 * 
 * 管理命令历史，支持撤销/重做
 */

import type { Command } from './Command';

/**
 * 命令管理器选项
 */
export interface CommandManagerOptions {
  /** 最大历史记录数量 */
  maxSize?: number;
  /** 是否启用命令合并 */
  enableMerge?: boolean;
}

/**
 * 命令管理器
 */
export class CommandManager {
  /** 命令历史 */
  private history: Command[] = [];
  
  /** 当前指针位置 */
  private currentIndex = -1;
  
  /** 配置选项 */
  private options: Required<CommandManagerOptions>;

  constructor(options: CommandManagerOptions = {}) {
    this.options = {
      maxSize: options.maxSize || 50,
      enableMerge: options.enableMerge !== false,
    };
  }

  /**
   * 执行命令
   * 
   * @param command 要执行的命令
   */
  execute(command: Command): void {
    // 尝试合并命令
    if (this.options.enableMerge && this.currentIndex >= 0) {
      const lastCommand = this.history[this.currentIndex];
      if (lastCommand.merge && lastCommand.merge(command)) {
        // 合并成功，不添加新命令
        return;
      }
    }

    // 执行命令
    command.execute();

    // 删除当前指针之后的所有命令
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 添加新命令
    this.history.push(command);
    this.currentIndex++;

    // 限制历史记录大小
    if (this.history.length > this.options.maxSize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  /**
   * 撤销命令
   * 
   * @returns 是否成功撤销
   */
  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    const command = this.history[this.currentIndex];
    command.undo();
    this.currentIndex--;
    return true;
  }

  /**
   * 重做命令
   * 
   * @returns 是否成功重做
   */
  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    this.currentIndex++;
    const command = this.history[this.currentIndex];
    command.redo();
    return true;
  }

  /**
   * 检查是否可以撤销
   * 
   * @returns 是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * 检查是否可以重做
   * 
   * @returns 是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * 获取历史记录大小
   * 
   * @returns 历史记录数量
   */
  size(): number {
    return this.history.length;
  }

  /**
   * 获取当前位置
   * 
   * @returns 当前指针位置
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * 获取历史记录（用于调试）
   * 
   * @returns 命令描述列表
   */
  getHistory(): string[] {
    return this.history.map((cmd, index) => {
      const desc = cmd.getDescription ? cmd.getDescription() : cmd.constructor.name;
      const marker = index === this.currentIndex ? ' <-' : '';
      return `${index}: ${desc}${marker}`;
    });
  }
}

