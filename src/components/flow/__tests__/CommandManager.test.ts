/**
 * CommandManager 测试
 */

import { BaseCommand, type Command } from '../core/commands/Command';
import { CommandManager } from '../core/commands/CommandManager';

class TestCommand extends BaseCommand {
  private executed = false;
  private undone = false;

  execute(): void {
    this.executed = true;
    this.undone = false;
  }

  undo(): void {
    this.executed = false;
    this.undone = true;
  }

  isExecuted(): boolean {
    return this.executed;
  }

  isUndone(): boolean {
    return this.undone;
  }
}

describe('CommandManager', () => {
  let commandManager: CommandManager;

  beforeEach(() => {
    commandManager = new CommandManager({ maxSize: 5 });
  });

  it('应该执行命令', () => {
    const command = new TestCommand();
    commandManager.execute(command);

    expect(command.isExecuted()).toBe(true);
    expect(commandManager.size()).toBe(1);
  });

  it('应该撤销命令', () => {
    const command = new TestCommand();
    commandManager.execute(command);

    const result = commandManager.undo();

    expect(result).toBe(true);
    expect(command.isUndone()).toBe(true);
  });

  it('应该重做命令', () => {
    const command = new TestCommand();
    commandManager.execute(command);
    commandManager.undo();

    const result = commandManager.redo();

    expect(result).toBe(true);
    expect(command.isExecuted()).toBe(true);
  });

  it('应该检查是否可以撤销', () => {
    expect(commandManager.canUndo()).toBe(false);

    const command = new TestCommand();
    commandManager.execute(command);

    expect(commandManager.canUndo()).toBe(true);
  });

  it('应该检查是否可以重做', () => {
    const command = new TestCommand();
    commandManager.execute(command);

    expect(commandManager.canRedo()).toBe(false);

    commandManager.undo();
    expect(commandManager.canRedo()).toBe(true);
  });

  it('应该清空历史记录', () => {
    const command = new TestCommand();
    commandManager.execute(command);
    commandManager.clear();

    expect(commandManager.size()).toBe(0);
    expect(commandManager.canUndo()).toBe(false);
  });

  it('应该限制历史记录大小', () => {
    for (let i = 0; i < 10; i++) {
      commandManager.execute(new TestCommand());
    }

    expect(commandManager.size()).toBeLessThanOrEqual(5);
  });

  it('应该在执行新命令时删除重做历史', () => {
    commandManager.execute(new TestCommand());
    commandManager.execute(new TestCommand());
    commandManager.undo();

    expect(commandManager.canRedo()).toBe(true);

    commandManager.execute(new TestCommand());
    expect(commandManager.canRedo()).toBe(false);
  });

  it('应该合并命令', () => {
    class MergeableCommand extends BaseCommand {
      public value: number;

      constructor(value: number) {
        super();
        this.value = value;
      }

      execute(): void {}
      undo(): void {}

      merge(other: Command): boolean {
        if (other instanceof MergeableCommand) {
          this.value = other.value;
          return true;
        }
        return false;
      }
    }

    const cmd1 = new MergeableCommand(1);
    const cmd2 = new MergeableCommand(2);

    commandManager.execute(cmd1);
    commandManager.execute(cmd2);

    // 应该合并，所以只有一个命令
    expect(commandManager.size()).toBe(1);
    expect(cmd1.value).toBe(2);
  });
});

