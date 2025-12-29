/**
 * 命令接口
 * 
 * 实现命令模式，支持撤销/重做功能
 */

/**
 * 命令接口
 */
export interface Command {
  /**
   * 执行命令
   */
  execute(): void;

  /**
   * 撤销命令
   */
  undo(): void;

  /**
   * 重做命令（默认调用 execute）
   */
  redo(): void;

  /**
   * 尝试合并命令（可选）
   * 
   * @param other 另一个命令
   * @returns 是否成功合并
   */
  merge?(other: Command): boolean;

  /**
   * 获取命令描述（可选，用于调试）
   */
  getDescription?(): string;
}

/**
 * 抽象命令基类
 */
export abstract class BaseCommand implements Command {
  abstract execute(): void;
  abstract undo(): void;

  redo(): void {
    this.execute();
  }

  merge?(other: Command): boolean {
    return false;
  }

  getDescription?(): string {
    return this.constructor.name;
  }
}

