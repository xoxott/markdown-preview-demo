/**
 * PermissionQueueOps 工厂 — UI 解耦的权限队列操作实现
 *
 * 参考 Claude Code 的 createPermissionQueueOps:
 *
 * 将 React setState dispatch 包装为 PermissionQueueOps 接口， 使用 functional setState (queue => ...) 避免
 * stale closure 问题。
 *
 * 也提供 InMemoryPermissionQueueOps — 测试/非 UI 环境的内存实现。
 */

import type { PermissionQueueItem, PermissionQueueOps } from '../types/permission-racing';

/**
 * 创建 React setState 桥接的 PermissionQueueOps
 *
 * @param setQueue React 的 setState dispatch 函数
 * @returns PermissionQueueOps 接口实现
 *
 *   使用示例:
 *
 *   ```ts
 *   const [queue, setQueue] = useState<PermissionQueueItem[]>([]);
 *   const queueOps = createPermissionQueueOps(setQueue);
 *   ```
 */
export function createPermissionQueueOps(
  setQueue: (updater: (queue: PermissionQueueItem[]) => PermissionQueueItem[]) => void
): PermissionQueueOps {
  return {
    push(item: PermissionQueueItem): void {
      setQueue(queue => [...queue, item]);
    },

    remove(toolUseID: string): void {
      setQueue(queue => queue.filter(item => item.toolUseID !== toolUseID));
    },

    update(toolUseID: string, patch: Partial<PermissionQueueItem>): void {
      setQueue(queue =>
        queue.map(item => (item.toolUseID === toolUseID ? { ...item, ...patch } : item))
      );
    }
  };
}

/**
 * InMemoryPermissionQueueOps — 内存实现（测试/非 UI 环境）
 *
 * 直接操作内存数组，不依赖 React setState。 适用于测试、headless agent、Web PermissionBridge 等场景。
 */
export class InMemoryPermissionQueueOps implements PermissionQueueOps {
  private readonly queue: PermissionQueueItem[] = [];

  push(item: PermissionQueueItem): void {
    this.queue.push(item);
  }

  remove(toolUseID: string): void {
    const index = this.queue.findIndex(item => item.toolUseID === toolUseID);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  update(toolUseID: string, patch: Partial<PermissionQueueItem>): void {
    const index = this.queue.findIndex(item => item.toolUseID === toolUseID);
    if (index !== -1) {
      Object.assign(this.queue[index], patch);
    }
  }

  /** 获取当前队列（测试用） */
  getItems(): readonly PermissionQueueItem[] {
    return this.queue;
  }

  /** 队列长度（测试用） */
  get size(): number {
    return this.queue.length;
  }
}
